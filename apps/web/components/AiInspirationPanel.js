'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, SparklesIcon, PlusIcon } from '@heroicons/react/24/outline';
import { chat, addInspiration } from '../services/ai';

export default function AiInspirationPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  function openAddModal() {
    setAddTitle('');
    setAddError(null);
    setAddModalOpen(true);
  }

  async function onConfirmAdd() {
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
      setMessages([]);
    } catch (err) {
      setAddError(err?.data?.error ?? err?.message ?? '保存失败');
    } finally {
      setAddSaving(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-indigo-500" />
          AI 找灵感
        </span>
        {open ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
      </button>
      {open && (
        <div className="border-t border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
          <div className="min-h-[200px] max-h-[320px] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3 space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">输入问题，让 AI 帮你找写作灵感…</p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`text-sm ${m.role === 'user' ? 'text-right' : ''}`}
                >
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 mr-1">
                    {m.role === 'user' ? '你' : 'AI'}
                  </span>
                  <div
                    className={`inline-block max-w-[85%] rounded-lg px-3 py-2 whitespace-pre-wrap break-words ${
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
            {loading && (
              <div className="text-sm text-zinc-500 dark:text-zinc-400">AI 正在思考…</div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={onSend} className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="输入问题…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn" disabled={loading}>
              发送
            </button>
          </form>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <PlusIcon className="h-4 w-4" />
            添加到灵感库
          </button>
        </div>
      )}

      {/* 添加灵感弹窗 */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !addSaving && setAddModalOpen(false)}>
          <div className="card p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">保存到灵感库</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">为这条灵感选一个标题（可选）</p>
            <input
              type="text"
              className="input mb-4"
              placeholder="例如：关于时间管理的选题"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              maxLength={200}
            />
            {addError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{addError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn btn-ghost" onClick={() => setAddModalOpen(false)} disabled={addSaving}>
                取消
              </button>
              <button type="button" className="btn" onClick={onConfirmAdd} disabled={addSaving}>
                {addSaving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
