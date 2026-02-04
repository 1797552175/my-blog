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
import { chat } from '../services/ai';
import { list as listInspirations, getById, deleteById } from '../services/inspirations';

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
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const [inspirations, setInspirations] = useState([]);
  const [inspirationsPage, setInspirationsPage] = useState(0);
  const [inspirationsTotalPages, setInspirationsTotalPages] = useState(0);
  const [inspirationsTotalElements, setInspirationsTotalElements] = useState(0);
  const [inspirationsLoading, setInspirationsLoading] = useState(false);
  const [selectedInspirationId, setSelectedInspirationId] = useState(null);
  const [selectedInspiration, setSelectedInspiration] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const loadInspirations = useCallback(async (page = 0) => {
    setInspirationsLoading(true);
    try {
      const res = await listInspirations(page, PAGE_SIZE);
      setInspirations(res?.content ?? []);
      setInspirationsTotalPages(res?.totalPages ?? 0);
      setInspirationsTotalElements(res?.totalElements ?? 0);
    } catch {
      setInspirations([]);
    } finally {
      setInspirationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInspirations(inspirationsPage);
  }, [inspirationsPage, loadInspirations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  async function onSend(e) {
    e.preventDefault();
    const text = (input || '').trim();
    if (!text || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await chat(history, text);
      const content = res?.content ?? '';
      setMessages((prev) => [...prev, { role: 'assistant', content }]);
    } catch (err) {
      const msg = err?.data?.error ?? err?.message ?? '请求失败';
      setMessages((prev) => [...prev, { role: 'assistant', content: `[错误] ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  const centerPanel = (
    <div className="flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-950/50 min-w-0">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-center">
            <SparklesIcon className="h-12 w-12 text-indigo-400 dark:text-indigo-500 mb-4" />
            <p className="text-lg text-zinc-600 dark:text-zinc-400">今天有什么可以帮到你？</p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">输入问题，与 AI 一起找写作灵感</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap break-words ${
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
                <div className="rounded-2xl px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-500">
                  AI 正在思考…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 md:p-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          <div className="flex gap-2">
            <form onSubmit={onSend} className="flex gap-2 flex-1">
              <textarea
                className="input min-h-[44px] max-h-32 py-2.5 resize-none"
                placeholder="给 AI 发送消息"
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
              <button type="submit" className="btn shrink-0 self-end" disabled={loading}>
                发送
              </button>
            </form>
          </div>
          <button
            type="button"
            onClick={handleNewThinking}
            className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            开启新的思考
          </button>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Ctrl+J 清空当前上下文</p>
        </div>
      </div>
    </div>
  );

  const rightSidebar = (onCloseDrawer) => (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 min-w-0">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
          <BookOpenIcon className="h-5 w-5 text-indigo-500" />
          灵感区
        </h2>
        {onCloseDrawer && (
          <button
            type="button"
            onClick={onCloseDrawer}
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
          ) : inspirations.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 py-2">暂无灵感</p>
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
            <p className="text-sm text-zinc-400 dark:text-zinc-500">点击左侧灵感查看详情</p>
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
          href="/write"
          className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          开始创作
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] flex flex-col lg:flex-row rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
      <section className="flex-1 flex flex-col min-w-0 relative">
        <div className="lg:hidden flex items-center gap-2 p-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setRightOpen(true)}
            className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="灵感区"
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
  );
}
