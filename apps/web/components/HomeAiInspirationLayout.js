'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  SparklesIcon,
  BookOpenIcon,
  TrashIcon,
  ChevronRightIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { streamChat, addInspiration } from '../services/ai';
import { list as listInspirations, getById, deleteById } from '../services/inspirations';
import { listPosts, listMyPosts } from '../services/posts';
import HomePostList from './HomePostList';
import { useToast } from './Toast';

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

export default function HomeAiInspirationLayout() {
  const { addToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

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

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [myPostsLoading, setMyPostsLoading] = useState(false);
  const [myPostsError, setMyPostsError] = useState(null);

  // 保存到灵感库相关状态
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState(null);

  const loadInspirations = useCallback(async (page = 0) => {
    setInspirationsLoading(true);
    setInspirationsError(null);
    try {
      const res = await listInspirations(page, PAGE_SIZE);
      setInspirations(res?.content ?? []);
      setInspirationsTotalPages(res?.totalPages ?? 0);
      setInspirationsTotalElements(res?.totalElements ?? 0);
    } catch (error) {
      console.error('加载灵感列表失败:', error);
      setInspirations([]);
      setInspirationsError(error?.message || '加载失败');
    } finally {
      setInspirationsLoading(false);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostsError(null);
    try {
      const res = await listPosts({ page: 0, size: 6 });
      setPosts(res?.content ?? []);
    } catch (error) {
      console.error('加载热门小说失败:', error);
      setPosts([]);
      setPostsError(error?.message || '加载失败');
    } finally {
      setPostsLoading(false);
    }
  }, []);

  const loadMyPosts = useCallback(async () => {
    setMyPostsLoading(true);
    setMyPostsError(null);
    try {
      const res = await listMyPosts({ page: 0, size: 2 });
      setMyPosts(res?.content ?? []);
    } catch (error) {
      console.error('加载我的小说失败:', error);
      setMyPosts([]);
      setMyPostsError(error?.message || '加载失败');
    } finally {
      setMyPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInspirations(inspirationsPage);
  }, [inspirationsPage, loadInspirations]);

  useEffect(() => {
    loadPosts();
    loadMyPosts();
  }, [loadPosts, loadMyPosts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (rightOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [rightOpen]);

  const handleNewThinking = useCallback(() => {
    setMessages([]);
    setRightOpen(false);
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        handleNewThinking();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNewThinking]);

  async function loadDetail(id) {
    if (selectedInspirationId === id && selectedInspiration) return;
    setSelectedInspirationId(id);
    setSelectedInspiration(null);
    setDetailLoading(true);
    try {
      const data = await getById(id);
      setSelectedInspiration(data);
    } catch {
      setSelectedInspiration(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDeleteInspiration(id) {
    try {
      await deleteById(id);
      setInspirations((prev) => prev.filter((i) => i.id !== id));
      if (selectedInspirationId === id) {
        setSelectedInspirationId(null);
        setSelectedInspiration(null);
      }
    } catch (err) {
      alert(err?.data?.error ?? err?.message ?? '删除失败');
    } finally {
      setDeleteConfirmId(null);
    }
  }

  async function handleSaveToInspiration() {
    if (addSaving) return;
    setAddError(null);
    setAddSaving(true);
    try {
      const msgs = messages.map((m) => ({ role: m.role, content: m.content }));
      if (msgs.length === 0) {
        setAddError('当前没有对话内容，先与 AI 聊几句再添加。');
        setAddSaving(false);
        return;
      }
      await addInspiration(addTitle.trim() || null, msgs);
      setAddModalOpen(false);
      // 刷新灵感列表
      loadInspirations(inspirationsPage);
      // 可选：清空当前对话或保留
      // 这里选择保留对话，让用户可以继续基于当前对话进行创作
    } catch (err) {
      setAddError(err?.data?.error ?? err?.message ?? '保存失败');
    } finally {
      setAddSaving(false);
    }
  }

  function onSend(e) {
    e.preventDefault();
    const text = (input || '').trim();
    if (!text || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '' }]);
    setLoading(true);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const model = 'gpt-4o-mini';
    streamChat(history, text, model, (chunk) => {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant')
          next[next.length - 1] = { ...last, content: last.content + chunk };
        return next;
      });
    }, () => {
      setLoading(false);
    }, (err) => {
      setLoading(false);
      const msg = err?.message ?? '请求失败';
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant')
          next[next.length - 1] = { ...last, content: last.content || `[错误] ${msg}` };
        return next;
      });
      addToast(msg, 'error', 3000);
    });
  }

  const centerPanel = (
    <div className="flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-950/50 min-w-0">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {messages.length === 0 ? (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
              <SparklesIcon className="h-12 w-12 text-indigo-400 dark:text-indigo-500 mb-4" />
              <p className="text-lg text-zinc-600 dark:text-zinc-400">欢迎回来，今天想写点什么？</p>
              {inspirationsTotalElements > 0 && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">你有 {inspirationsTotalElements} 条灵感，选一条开始写吧</p>
              )}
              {inspirationsTotalElements === 0 && (
                <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">输入问题，与 AI 一起找小说灵感并存入灵感库</p>
              )}
              <div className="mt-4">
                <Link href="/write" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                  直接去写小说
                </Link>
              </div>
            </div>
            
            {/* 示例对话 */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 bg-white dark:bg-zinc-900/50">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">创作示例</h3>
              <div className="space-y-4">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl px-5 py-3.5 whitespace-pre-wrap break-words shadow-sm bg-indigo-600 text-white">
                    <p className="text-xs opacity-80 mb-1">用户</p>
                    <p className="text-sm">我想写一个关于未来世界的科幻小说，能给我一些灵感吗？</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-5 py-3.5 whitespace-pre-wrap break-words shadow-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200">
                    <p className="text-xs opacity-80 mb-1">AI</p>
                    <p className="text-sm">未来世界科幻小说灵感：

1. 记忆交易市场：在2150年，人类可以买卖记忆，主角是一名记忆经纪人，发现了一个能改变世界的记忆。

2. 时间裂缝修复者：特殊部门负责修复时间线上的异常，主角在一次任务中发现了时间本身的秘密。

3. 意识上传后的社会：大部分人类已经将意识上传到数字世界，少数坚持保留肉身的人类形成了地下反抗组织。

4. 外星遗迹探索：在月球背面发现的外星技术改变了人类文明，但也带来了未知的危险。

5. 基因编辑的伦理困境：基因编辑技术普及后，社会分化为不同基因等级的群体，主角试图打破这种不平等。</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 快速开始提示 */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 bg-zinc-50 dark:bg-zinc-800/50">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">快速开始</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setInput('我想写一个奇幻小说，能给我一些灵感吗？');
                    setTimeout(() => textareaRef.current?.focus(), 10);
                  }}
                  className="text-left p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm transition-colors"
                >
                  奇幻小说灵感
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setInput('如何构建一个吸引人的小说主角？');
                    setTimeout(() => textareaRef.current?.focus(), 10);
                  }}
                  className="text-left p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm transition-colors"
                >
                  主角构建技巧
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setInput('我需要一个悬疑小说的剧情大纲');
                    setTimeout(() => textareaRef.current?.focus(), 10);
                  }}
                  className="text-left p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm transition-colors"
                >
                  悬疑剧情大纲
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setInput('如何描写一个感人的爱情场景？');
                    setTimeout(() => textareaRef.current?.focus(), 10);
                  }}
                  className="text-left p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm transition-colors"
                >
                  爱情场景描写
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-3.5 whitespace-pre-wrap break-words shadow-sm ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  <p className="text-xs opacity-80 mb-1">{m.role === 'user' ? '你' : 'AI'}</p>
                  <p className="text-sm">{m.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-5 py-3.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-500 shadow-sm">
                  AI 正在思考…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <div className="flex flex-col gap-2">
          <div className="flex gap-3">
            <form onSubmit={onSend} className="flex gap-3 flex-1">
              <textarea
                ref={textareaRef}
                className="input min-h-[52px] max-h-32 py-3 px-4 resize-none rounded-xl border-zinc-200 dark:border-zinc-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="给 AI 发送消息，按 Enter 发送，Shift+Enter 换行"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSend(e);
                  }
                }}
                disabled={loading}
                rows={1}
              />
              <button type="submit" className="btn shrink-0 self-end py-3 px-5 rounded-xl font-medium" disabled={loading}>
                发送
              </button>
            </form>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleNewThinking}
                className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                <SparklesIcon className="h-4 w-4" />
                开启新的思考
              </button>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAddTitle('');
                    setAddError(null);
                    setAddModalOpen(true);
                  }}
                  className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                >
                  <BookOpenIcon className="h-4 w-4" />
                  保存到灵感库
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Ctrl+J 清空上下文</p>
          </div>
        </div>
      </div>
    </div>
  );

  const rightSidebar = (onCloseDrawer) => (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 min-w-0">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
          <BookOpenIcon className="h-5 w-5 text-indigo-500" />
          灵感库
        </h2>
        {onCloseDrawer && (
          <button
            type="button"
            onClick={onCloseDrawer}
            className="p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="关闭"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 p-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">灵感列表</p>
          {inspirationsLoading ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 py-2">加载中…</p>
          ) : inspirationsError ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">加载失败，点击重试</p>
              <div className="border border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg p-3 text-center">
                <button 
                  type="button" 
                  onClick={() => loadInspirations(inspirationsPage)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  重试
                </button>
              </div>
            </div>
          ) : inspirations.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">暂无灵感</p>
              <div className="border border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg p-3 text-center">
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2">开始与 AI 对话，获取创作灵感</p>
                <button 
                  type="button" 
                  onClick={() => setRightOpen(false)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  去对话获取灵感
                </button>
              </div>
              <div className="text-xs text-zinc-400 dark:text-zinc-500">
                <p className="mb-1">灵感示例：</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-1">
                    <span className="text-xs">•</span>
                    <span>科幻小说世界观设定</span>
                  </li>
                  <li className="flex items-center gap-1">
                    <span className="text-xs">•</span>
                    <span>奇幻小说魔法系统</span>
                  </li>
                  <li className="flex items-center gap-1">
                    <span className="text-xs">•</span>
                    <span>悬疑小说剧情大纲</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <ul className="space-y-1 max-h-[180px] overflow-y-auto">
              {inspirations.map((item) => (
                <li key={item.id} className="group flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadDetail(item.id)}
                    className={`flex-1 min-w-0 text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                      selectedInspirationId === item.id
                        ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-100'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span className="block truncate">{item.title || '（无标题）'}</span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">{formatListDate(item.createdAt)}</span>
                  </button>
                  {deleteConfirmId === item.id ? (
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteInspiration(item.id)}
                        className="text-xs text-red-600 dark:text-red-400 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        确认
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-xs text-zinc-500 px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(item.id);
                      }}
                      className="shrink-0 p-1.5 rounded text-zinc-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100"
                      aria-label="删除"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {inspirationsTotalPages > 1 && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <span className="text-xs text-zinc-500">共 {inspirationsTotalElements} 条</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="btn btn-ghost py-1 px-2 text-xs"
                  disabled={inspirationsPage <= 0}
                  onClick={() => setInspirationsPage((p) => Math.max(0, p - 1))}
                >
                  上一页
                </button>
                <span className="text-xs self-center text-zinc-500">
                  {inspirationsPage + 1} / {inspirationsTotalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost py-1 px-2 text-xs"
                  disabled={inspirationsPage >= inspirationsTotalPages - 1}
                  onClick={() => setInspirationsPage((p) => Math.min(inspirationsTotalPages - 1, p + 1))}
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">选中灵感详情</p>
          {!selectedInspirationId ? (
            <div className="space-y-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
              <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">灵感详情</h4>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                从左侧选择一个灵感，查看详细内容
              </p>
              <div className="border border-dashed border-zinc-300 dark:border-zinc-600 rounded p-3 text-center">
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  灵感可以帮助你：
                </p>
                <ul className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 space-y-1">
                  <li className="flex items-center gap-1 justify-center">
                    <span>•</span>
                    <span>保存创作思路</span>
                  </li>
                  <li className="flex items-center gap-1 justify-center">
                    <span>•</span>
                    <span>整理故事脉络</span>
                  </li>
                  <li className="flex items-center gap-1 justify-center">
                    <span>•</span>
                    <span>快速开始创作</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : detailLoading ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">加载中…</p>
          ) : selectedInspiration ? (
            <div className="space-y-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3 text-sm">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {selectedInspiration.title || '（无标题）'} · {formatListDate(selectedInspiration.createdAt)}
              </p>
              {(selectedInspiration.messages || []).map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">{m.role === 'user' ? '你' : 'AI'}</span>
                  <div className="whitespace-pre-wrap break-words text-zinc-700 dark:text-zinc-300">{m.content}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 p-3 border-t border-zinc-200 dark:border-zinc-800">
        <Link
          href={selectedInspirationId ? `/write?inspiration=${selectedInspirationId}` : '/write'}
          className={`flex items-center gap-1 text-sm hover:underline ${selectedInspirationId ? 'text-indigo-700 dark:text-indigo-300 font-medium' : 'text-indigo-600 dark:text-indigo-400'}`}
        >
          {selectedInspirationId ? '从本灵感开始创作' : '开始创作'}
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col space-y-6">
      {/* 主要内容区域 */}
      <div className="flex flex-col lg:flex-row rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm h-[90vh] min-h-[650px]">
        <section className="flex-1 flex flex-col min-w-0 relative">
          <div className="lg:hidden flex items-center gap-2 p-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <button
              type="button"
              onClick={() => setRightOpen(true)}
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="灵感库"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          </div>
          {centerPanel}
        </section>
        <aside className="hidden lg:flex lg:w-[320px] lg:shrink-0 lg:flex-col h-full">
          {rightSidebar()}
        </aside>
        {rightOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setRightOpen(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-[320px] max-w-[85vw] shadow-xl">
              {rightSidebar(() => setRightOpen(false))}
            </div>
          </div>
        )}
      </div>
      
      {/* 我的小说 */}
      {myPostsError ? (
        <HomePostList 
          posts={myPosts} 
          loading={myPostsLoading} 
          error={myPostsError}
          onRetry={loadMyPosts}
          title="你的小说"
        />
      ) : myPosts.length > 0 && (
        <HomePostList 
          posts={myPosts} 
          loading={myPostsLoading} 
          title="你的小说"
        />
      )}
      
      {/* 热门小说推荐 */}
      <HomePostList 
        posts={posts} 
        loading={postsLoading} 
        error={postsError}
        onRetry={loadPosts}
        title="热门小说推荐" 
      />
      
      {/* 保存到灵感库弹窗 */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !addSaving && setAddModalOpen(false)}>
          <div className="card p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">保存到灵感库</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">为这条灵感选一个标题（可选）</p>
            <input
              type="text"
              className="input mb-4"
              placeholder="例如：关于未来世界的科幻小说灵感"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              maxLength={200}
            />
            {addError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{addError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn btn-ghost" onClick={() => !addSaving && setAddModalOpen(false)} disabled={addSaving}>
                取消
              </button>
              <button type="button" className="btn" onClick={handleSaveToInspiration} disabled={addSaving}>
                {addSaving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
