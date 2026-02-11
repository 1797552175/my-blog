'use client';

import { useState, useRef, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { streamPersonaChat, getOrCreatePersonaSessionId } from '../services/ai';

export default function PersonaChatPanel({
  authorId,
  authorUsername,
  postId = null,
  postTitle = null,
  open,
  onClose,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const sessionIdRef = useRef(null);

  useEffect(() => {
    sessionIdRef.current = getOrCreatePersonaSessionId();
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!open) return null;

  function onSend(e) {
    e.preventDefault();
    const text = (input || '').trim();
    if (!text || loading) return;
    setInput('');
    setError(null);
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '' }]);
    setLoading(true);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const sid = sessionIdRef.current || getOrCreatePersonaSessionId();
    streamPersonaChat(authorId, postId, history, text, sid, (chunk) => {
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
      setError(err?.message ?? '请求失败');
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant')
          next[next.length - 1] = { ...last, content: last.content || `[错误] ${err?.message ?? '请求失败'}` };
        return next;
      });
    });
  }

  const title = postTitle ? `与 ${authorUsername} 聊：${postTitle}` : `与 ${authorUsername} 对话`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 shadow-xl flex flex-col max-h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="关闭"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col p-4">
          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          <div className="flex-1 min-h-[200px] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3 space-y-3 mb-3">
            {messages.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">发送消息与作者的 AI 分身对话…</p>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 mr-1">
                    {m.role === 'user' ? '你' : authorUsername}
                  </span>
                  <div
                    className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                      m.role === 'user'
                        ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-100'
                        : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {loading && <p className="text-sm text-zinc-500 dark:text-zinc-400">正在回复…</p>}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={onSend} className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="输入消息…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn" disabled={loading}>
              发送
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
