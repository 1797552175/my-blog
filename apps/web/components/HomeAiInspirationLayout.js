'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SparklesIcon,
  BookOpenIcon,
  TrashIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { streamNovelOptions, saveOptionAsInspiration } from '../services/ai';
import { list as listInspirations, getById, deleteById } from '../services/inspirations';
import { useToast } from './Toast';
import QuickCreateNovelModal from './QuickCreateNovelModal';

const PAGE_SIZE = 10;

function formatListDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const today = now.toDateString() === d.toDateString();
  if (today) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.toDateString() === d.toDateString()) return '昨天';
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

const QUICK_PROMPTS = [
  { label: '我想写修仙/都市…', text: '我想写修仙逆袭类小说，能给我几个开篇方案吗？' },
  { label: '我还没想好，让 AI 帮我想', text: '我还没想好写什么，你可以从类型、主角、冲突里帮我想想，给我几个方向。' },
];

/** 判断是否为单条 option JSON（含 title） */
function parseOneOptionLine(line) {
  if (!line || !line.trim()) return null;
  const s = line.trim();
  if (!s.startsWith('{')) return null;
  try {
    const o = JSON.parse(s);
    if (o && typeof o.title === 'string') return o;
  } catch (_) {}
  return null;
}

/**
 * 从流式缓冲解析：后端卡片式为 3 行 option JSON + 空行 + 引导文案。
 * 返回 { options: [...], guidance: string }，options 最多 3 个，逐行解析出的。
 */
function parseStreamNovelOptions(buffer) {
  const options = [];
  let guidance = '';
  const lines = buffer.split('\n');
  let i = 0;
  for (; i < lines.length && options.length < 3; i++) {
    const opt = parseOneOptionLine(lines[i]);
    if (opt) options.push(opt);
    else break;
  }
  // 跳过空行（第 4 行）
  if (i < lines.length && lines[i].trim() === '') i++;
  guidance = lines.slice(i).join('\n').trim();
  return { options, guidance };
}

/** 卡片式/非卡片式展示文案：最强噪音过滤（首尾符号、键名、全文键值对、null/true/false、JSON 转义还原） */
function stripLeadingNoise(str) {
  if (!str) return str;
  const JSON_KEY_NAMES = 'guidanceText|title|storySummary|options|tags|styleId|toneId|viewpointId|aiPrompt|customStyle|description|name|id';
  const LEADING_NOISE = /^[\s\{\}\[\]\"\,\:\\.;|#]+/;
  const TRAILING_NOISE = /[\s\{\}\[\]\"\,\:\\.;|#]+$/;
  const LEADING_JSON_KEY = new RegExp(`^\\s*\"?(${JSON_KEY_NAMES})\"?\\s*:\\s*\"?`, 'gi');
  const LITERAL_LEADING = /^\s*(null|true|false)\s*[,:\s]*/i;
  const LITERAL_TRAILING = /\s*[,:\s]*(null|true|false)\s*$/i;
  const KEY_VALUE_STRING = new RegExp(`\"(${JSON_KEY_NAMES})\"\\s*:\\s*\"(?:[^\"\\\\]|\\\\.)*\"`, 'gi');
  const KEY_VALUE_LITERAL = new RegExp(`\"(${JSON_KEY_NAMES})\"\\s*:\\s*(null|true|false)`, 'gi');

  let s = str.trim();
  s = s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
  let prev;
  do {
    prev = s;
    s = s.replace(KEY_VALUE_STRING, '').replace(KEY_VALUE_LITERAL, '');
    s = s.replace(LEADING_NOISE, '').replace(TRAILING_NOISE, '').trim();
    s = s.replace(LITERAL_LEADING, '').replace(LITERAL_TRAILING, '').trim();
    s = s.replace(LEADING_JSON_KEY, '');
  } while (s !== prev && prev.length > 0);

  s = s.replace(LEADING_NOISE, '').replace(TRAILING_NOISE, '').trim();
  s = s.replace(LITERAL_LEADING, '').replace(LITERAL_TRAILING, '').trim();
  s = s.replace(/\s*,\s*,\s*/g, ',').replace(/^[\s,]+|[\s,]+$/g, '').trim();
  return s;
}

/** 完成时若为旧版单 JSON 或非 NDJSON，用此兜底解析 */
function parseLegacyNovelOptions(raw) {
  if (!raw || !raw.trim()) return { guidanceText: '', options: null };
  let jsonStr = raw.trim();
  const codeBlock = /```(?:json)?\s*([\s\S]*?)```/i.exec(jsonStr);
  if (codeBlock) jsonStr = codeBlock[1].trim();
  if (!jsonStr.startsWith('{')) return { guidanceText: raw.trim(), options: null };
  try {
    const o = JSON.parse(jsonStr);
    const guidanceText = o.guidanceText != null ? String(o.guidanceText) : '';
    const options = Array.isArray(o.options) && o.options.length > 0 ? o.options : null;
    return { guidanceText, options };
  } catch {
    return { guidanceText: raw.trim(), options: null };
  }
}

export default function HomeAiInspirationLayout() {
  const { addToast } = useToast();
  const [messages, setMessages] = useState([]); // { role, content, options? }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const streamAccumulatedRef = useRef('');

  const [inspirations, setInspirations] = useState([]);
  const [inspirationsPage, setInspirationsPage] = useState(0);
  const [inspirationsTotalPages, setInspirationsTotalPages] = useState(0);
  const [inspirationsTotalElements, setInspirationsTotalElements] = useState(0);
  const [inspirationsLoading, setInspirationsLoading] = useState(false);
  const [inspirationsError, setInspirationsError] = useState(null);
  const [selectedInspirationId, setSelectedInspirationId] = useState(null);
  const [selectedInspiration, setSelectedInspiration] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateInitial, setQuickCreateInitial] = useState(null);
  const [savingOptionId, setSavingOptionId] = useState(null);
  const [streamingContent, setStreamingContent] = useState('');
  /** 流式过程中解析出的选项（卡片式时逐卡出现） */
  const [streamingOptions, setStreamingOptions] = useState([]);
  /** 缓冲是否像在生成 option JSON，用于非卡片式时不显示占位卡 */
  const [streamLikelyCardMode, setStreamLikelyCardMode] = useState(false);

  const loadInspirations = useCallback(async (page = 0) => {
    setInspirationsLoading(true);
    setInspirationsError(null);
    try {
      const res = await listInspirations(page, PAGE_SIZE);
      setInspirations(res?.content ?? []);
      setInspirationsTotalPages(res?.totalPages ?? 0);
      setInspirationsTotalElements(res?.totalElements ?? 0);
    } catch (error) {
      setInspirations([]);
      setInspirationsError(error?.message || '加载失败');
    } finally {
      setInspirationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInspirations(inspirationsPage);
  }, [inspirationsPage, loadInspirations]);

  useEffect(() => {
    if (!selectedInspirationId) {
      setSelectedInspiration(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    getById(selectedInspirationId)
      .then(data => { if (!cancelled) setSelectedInspiration(data); })
      .catch(() => { if (!cancelled) setSelectedInspiration(null); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedInspirationId]);

  function handleNewThinking() {
    setMessages([]);
    setInput('');
  }

  function onSend(e) {
    e.preventDefault();
    const text = (input || '').trim();
    if (!text || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setStreamingContent('');
    setStreamingOptions([]);
    setStreamLikelyCardMode(false);
    streamAccumulatedRef.current = '';
    const history = messages.map(m => ({ role: m.role, content: m.content || '' }));
    setMessages(prev => [...prev, { role: 'assistant', content: '', options: null }]);
    streamNovelOptions(
      text,
      history,
      (chunk) => {
        const s = typeof chunk === 'string' ? chunk : (chunk?.content ?? String(chunk ?? ''));
        streamAccumulatedRef.current += s;
        const raw = streamAccumulatedRef.current;
        const { options: parsedOpts, guidance: parsedGuidance } = parseStreamNovelOptions(raw);
        if (parsedOpts.length > 0) {
          setStreamLikelyCardMode(true);
          setStreamingOptions(parsedOpts);
          setStreamingContent(stripLeadingNoise(parsedGuidance));
        } else {
          const looksLikeJson = raw.trim().startsWith('{') || /"title"\s*:/.test(raw);
          setStreamLikelyCardMode(looksLikeJson);
          if (looksLikeJson) {
            setStreamingContent('正在生成第 1 个方案…');
          } else {
            setStreamingContent(stripLeadingNoise(raw));
          }
        }
      },
      () => {
        const raw = streamAccumulatedRef.current;
        const ndjson = parseStreamNovelOptions(raw);
        let guidanceText = '';
        let options = null;
        if (ndjson.options.length > 0) {
          guidanceText = stripLeadingNoise(ndjson.guidance);
          options = ndjson.options;
        } else {
          const legacy = parseLegacyNovelOptions(raw);
          guidanceText = stripLeadingNoise(legacy.guidanceText);
          options = legacy.options;
        }
        setMessages(m => {
          const next = [...m];
          if (next.length > 0 && next[next.length - 1].role === 'assistant') {
            next[next.length - 1] = { role: 'assistant', content: guidanceText, options: options || null };
          }
          return next;
        });
        setStreamingContent('');
        setStreamingOptions([]);
        setStreamLikelyCardMode(false);
        setLoading(false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      },
      (err) => {
        const msg = err?.message ?? '请求失败';
        setMessages(m => {
          const next = [...m];
          if (next.length > 0 && next[next.length - 1].role === 'assistant' && next[next.length - 1].content === '') {
            next[next.length - 1] = { role: 'assistant', content: `[错误] ${msg}`, options: null };
          } else {
            next.push({ role: 'assistant', content: `[错误] ${msg}`, options: null });
          }
          return next;
        });
        setStreamingContent('');
        setStreamingOptions([]);
        setStreamLikelyCardMode(false);
        setLoading(false);
        addToast(msg, 'error', 3000);
      }
    );
  }

  async function handleSaveOptionAsInspiration(option) {
    if (savingOptionId) return;
    setSavingOptionId(option?.title ?? 'opt');
    try {
      await saveOptionAsInspiration(option);
      addToast('已保存到灵感库');
      loadInspirations(inspirationsPage);
    } catch (err) {
      addToast(err?.data?.error ?? err?.message ?? '保存失败', 'error');
    } finally {
      setSavingOptionId(null);
    }
  }

  function openQuickCreate(optionOrInspiration) {
    if (typeof optionOrInspiration === 'object' && optionOrInspiration !== null && !optionOrInspiration.id) {
      setQuickCreateInitial(optionOrInspiration);
    } else if (typeof optionOrInspiration === 'object' && optionOrInspiration?.optionSnapshot) {
      try {
        const parsed = JSON.parse(optionOrInspiration.optionSnapshot);
        setQuickCreateInitial(parsed);
      } catch {
        setQuickCreateInitial({ title: optionOrInspiration.title, storySummary: '' });
      }
    } else {
      setQuickCreateInitial(null);
    }
    setQuickCreateOpen(true);
  }

  async function handleQuickCreateFromInspirationId(id) {
    try {
      const data = await getById(id);
      openQuickCreate(data);
    } catch (err) {
      addToast(err?.message ?? '加载灵感失败', 'error');
    }
  }

  function handleDeleteInspiration(id) {
    if (deleteConfirmId === id) {
      deleteById(id).then(() => {
        setInspirations(prev => prev.filter(i => i.id !== id));
        setInspirationsTotalElements(prev => Math.max(0, prev - 1));
        if (selectedInspirationId === id) {
          setSelectedInspirationId(null);
          setSelectedInspiration(null);
        }
        setDeleteConfirmId(null);
        addToast('已删除');
      }).catch(err => addToast(err?.message ?? '删除失败', 'error'));
    } else {
      setDeleteConfirmId(id);
    }
  }

  const conversationArea = (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      {messages.length === 0 ? (
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[280px] text-center">
          <SparklesIcon className="h-12 w-12 text-indigo-400 dark:text-indigo-500 mb-4" />
          <p className="text-lg text-zinc-600 dark:text-zinc-400">输入创作想法，AI 给你 3 个小说方案</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">选一个保存到灵感库，或直接快速创作</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {QUICK_PROMPTS.map(({ label, text }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setInput(text);
                  setTimeout(() => textareaRef.current?.focus(), 10);
                }}
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((m, i) => {
            const isLastAssistant = i === messages.length - 1 && m.role === 'assistant';
            const isCardMode = isLastAssistant && streamingOptions.length > 0;
            const optionsToShow = isCardMode ? streamingOptions : (m.options || []);
            const showCardButtons = m.role === 'assistant' && m.options && m.options.length > 0 && !streamingContent && !loading;
            const loadingNoCardsYet = isLastAssistant && loading && streamingOptions.length === 0;
            const displayContent = isLastAssistant && streamingContent
              ? streamingContent
              : (loadingNoCardsYet && streamLikelyCardMode ? '正在生成第 1 个方案…' : (m.content || ''));
            const showBubbleText = (displayContent || (isLastAssistant && loading));
            const showCardGrid = m.role === 'assistant' && (optionsToShow.length > 0 || (isLastAssistant && loading && streamLikelyCardMode));
            const placeholderCount = showCardGrid && loading && optionsToShow.length < 3 ? (3 - optionsToShow.length) : 0;
            return (
              <div key={i}>
                <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                    m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                  }`}>
                    <p className="text-xs opacity-80 mb-1">{m.role === 'user' ? '你' : 'AI'}</p>
                    {showBubbleText && (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {displayContent || (loading ? '正在生成…' : '')}
                      </p>
                    )}
                  </div>
                </div>
                {showCardGrid && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {optionsToShow.map((opt, j) => (
                      <div key={j} className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 p-4 shadow-sm">
                        <h4 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm mb-2 line-clamp-1">{opt.title || '未命名'}</h4>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 mb-3">{opt.storySummary || '无简介'}</p>
                        {showCardButtons && (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleSaveOptionAsInspiration(opt)} disabled={!!savingOptionId} className="btn btn-ghost text-xs py-1.5 px-2">
                              {savingOptionId === (opt?.title ?? 'opt') ? '保存中…' : '保存到灵感'}
                            </button>
                            <button type="button" onClick={() => openQuickCreate(opt)} className="btn text-xs py-1.5 px-2 bg-indigo-600 text-white hover:bg-indigo-700">
                              快速创作
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {placeholderCount > 0 && Array.from({ length: placeholderCount }, (_, k) => (
                      <div key={`ph-${k}`} className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4 shadow-sm animate-pulse">
                        <div className="h-4 bg-zinc-200 dark:bg-zinc-600 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-zinc-200 dark:bg-zinc-600 rounded w-full mb-1" />
                        <div className="h-3 bg-zinc-200 dark:bg-zinc-600 rounded w-5/6 mb-1" />
                        <div className="h-3 bg-zinc-200 dark:bg-zinc-600 rounded w-4/5 mt-2" />
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">第 {optionsToShow.length + k + 1} 个方案生成中…</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-500">
                AI 正在生成方案…
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );

  const inputArea = (
    <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <form onSubmit={onSend} className="flex gap-3">
        <textarea
          ref={textareaRef}
          className="input min-h-[52px] max-h-32 py-3 px-4 resize-none rounded-xl flex-1 border-zinc-200 dark:border-zinc-700"
          placeholder="输入创作想法，或让 AI 帮你想想写什么"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(e); } }}
          disabled={loading}
          rows={1}
        />
        <button type="submit" className="btn shrink-0 self-end py-3 px-5 rounded-xl" disabled={loading}>
          发送
        </button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {QUICK_PROMPTS.map(({ label, text }, idx) => (
          <button
            key={label}
            type="button"
            onClick={() => { setInput(text); setTimeout(() => textareaRef.current?.focus(), 10); }}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-700/40 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-800 text-[10px]">
              {idx === 0 ? '✨' : '💡'}
            </span>
            <span>{label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={handleNewThinking}
          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-zinc-800 dark:hover:text-zinc-200 hover:shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600"
        >
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 dark:bg-zinc-700 text-[10px] group-hover:bg-zinc-200 dark:group-hover:bg-zinc-600 transition-colors">
            🔄
          </span>
          <span>开启新的思考</span>
        </button>
      </div>
    </div>
  );

  const rightSidebarContent = (onCloseDrawer) => (
    <>
      <div className={`shrink-0 border-b border-zinc-200 dark:border-zinc-800 flex items-center ${rightCollapsed ? 'p-2 justify-center h-12' : 'p-3 justify-between gap-2'}`}>
        {!rightCollapsed && (
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
            <BookOpenIcon className="h-5 w-5 text-indigo-500" />
            灵感库
          </h2>
        )}
        <div className={`flex items-center ${rightCollapsed ? '' : 'gap-1'}`}>
          <button
            type="button"
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className={`rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 ${rightCollapsed ? 'p-1.5 hover:scale-110' : 'p-2'}`}
            aria-label={rightCollapsed ? '展开' : '收起'}
            title={rightCollapsed ? '展开灵感库' : '收起灵感库'}
          >
            {rightCollapsed ? <ChevronLeftIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
          </button>
          {!rightCollapsed && onCloseDrawer && (
            <button type="button" onClick={onCloseDrawer} className="p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="关闭">
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      {rightCollapsed ? (
        <div className="flex-1 flex flex-col items-center py-4 gap-3 overflow-y-auto">
          <button
            type="button"
            onClick={() => setRightCollapsed(false)}
            className="relative p-2 rounded-xl text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200 group"
            title="灵感库"
          >
            <BookOpenIcon className="h-5 w-5" />
            {inspirationsTotalElements > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-indigo-500 text-white rounded-full">
                {inspirationsTotalElements > 99 ? '99+' : inspirationsTotalElements}
              </span>
            )}
          </button>
          <div className="w-6 h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
          {inspirations.slice(0, 5).map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setRightCollapsed(false);
                setSelectedInspirationId(item.id);
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                selectedInspirationId === item.id
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title={item.title || '（无标题）'}
            >
              {idx + 1}
            </button>
          ))}
          {inspirations.length > 5 && (
            <button
              type="button"
              onClick={() => setRightCollapsed(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="查看更多"
            >
              +{inspirations.length - 5}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 p-2 overflow-y-auto">
            {inspirationsLoading ? (
              <p className="text-sm text-zinc-500 py-2">加载中…</p>
            ) : inspirationsError ? (
              <div>
                <p className="text-sm text-zinc-500">加载失败</p>
                <button type="button" onClick={() => loadInspirations(inspirationsPage)} className="text-xs text-indigo-600 hover:underline">重试</button>
              </div>
            ) : inspirations.length === 0 ? (
              <p className="text-sm text-zinc-500 py-2">暂无灵感，从对话中选方案保存</p>
            ) : (
              <ul className="space-y-1 max-h-[200px] overflow-y-auto">
                {inspirations.map(item => (
                  <li key={item.id} className="group flex items-center gap-2">
                    <button type="button" onClick={() => setSelectedInspirationId(item.id)} className={`flex-1 min-w-0 text-left rounded-lg px-3 py-2 text-sm ${selectedInspirationId === item.id ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-100' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}`}>
                      <span className="block truncate">{item.title || '（无标题）'}</span>
                      <span className="text-xs text-zinc-400">{formatListDate(item.createdAt)}</span>
                    </button>
                    <button type="button" onClick={() => handleQuickCreateFromInspirationId(item.id)} className="shrink-0 text-xs text-indigo-600 dark:text-indigo-400 hover:underline opacity-0 group-hover:opacity-100" title="快速创作">创作</button>
                    {deleteConfirmId === item.id ? (
                      <span className="flex gap-1 shrink-0">
                        <button type="button" onClick={() => handleDeleteInspiration(item.id)} className="text-xs text-red-600">确认</button>
                        <button type="button" onClick={() => setDeleteConfirmId(null)} className="text-xs text-zinc-500">取消</button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setDeleteConfirmId(item.id)} className="shrink-0 p-1.5 rounded text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100" aria-label="删除">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {inspirationsTotalPages > 1 && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 text-xs">
                <span className="text-zinc-500">{inspirationsTotalElements} 条</span>
                <div className="flex gap-1">
                  <button type="button" className="btn btn-ghost py-1 px-2" disabled={inspirationsPage <= 0} onClick={() => setInspirationsPage(p => Math.max(0, p - 1))}>上一页</button>
                  <span className="self-center text-zinc-500">{inspirationsPage + 1}/{inspirationsTotalPages}</span>
                  <button type="button" className="btn btn-ghost py-1 px-2" disabled={inspirationsPage >= inspirationsTotalPages - 1} onClick={() => setInspirationsPage(p => p + 1)}>下一页</button>
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            <p className="text-xs text-zinc-500 mb-2">选中灵感</p>
            {!selectedInspirationId ? (
              <p className="text-xs text-zinc-400">点击左侧一条查看</p>
            ) : detailLoading ? (
              <p className="text-sm text-zinc-500">加载中…</p>
            ) : selectedInspiration ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{selectedInspiration.title || '（无标题）'}</p>
                {selectedInspiration.optionSnapshot ? (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-4">已保存为小说方案，可快速创作</p>
                ) : (
                  (selectedInspiration.messages || []).slice(0, 3).map((mm, i) => (
                    <p key={i} className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{mm.content}</p>
                  ))
                )}
                <button type="button" onClick={() => handleQuickCreateFromInspirationId(selectedInspirationId)} className="btn text-sm py-2 w-full bg-indigo-600 text-white hover:bg-indigo-700 mt-2">
                  快速创作
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] min-h-[500px]">
      <div className="flex flex-1 min-h-0 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
        <section className="flex-1 flex flex-col min-w-0">
          <div className="lg:hidden flex items-center gap-2 p-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <button type="button" onClick={() => setRightOpen(true)} className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="灵感库">
              <Bars3Icon className="h-5 w-5" />
            </button>
          </div>
          {conversationArea}
          {inputArea}
        </section>
        <aside
          className={`hidden lg:flex flex-col border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all duration-300 ease-in-out overflow-hidden ${
            rightCollapsed ? 'w-14 shrink-0' : 'w-[320px] shrink-0'
          }`}
        >
          {rightSidebarContent()}
        </aside>
        {rightOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setRightOpen(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-[320px] max-w-[85vw] shadow-xl bg-white dark:bg-zinc-900 flex flex-col">
              {rightSidebarContent(() => setRightOpen(false))}
            </div>
          </div>
        )}
      </div>

      <QuickCreateNovelModal open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)} initialValues={quickCreateInitial} />
    </div>
  );
}
