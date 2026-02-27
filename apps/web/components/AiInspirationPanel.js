'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, SparklesIcon, PlusIcon } from '@heroicons/react/24/outline';
import { streamChat, addInspiration } from '../services/ai';
import { useSubmit } from '../lib/hooks';
import { normalizeError } from '../lib/error';

export default function AiInspirationPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamedContent]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const { loading: addSaving, error: addError, execute: executeAdd } = useSubmit(
    async () => {
      const msgs = messages.map((m) => ({ role: m.role, content: m.content }));
      if (msgs.length === 0) {
        throw new Error('当前没有对话内容，先与 AI 聊几句再添加。');
      }
      await addInspiration(addTitle.trim() || null, msgs);
    }
  );

  async function onSend(e) {
    e.preventDefault();
    const text = (input || '').trim();
    if (!text || streaming) return;
    
    setInput('');
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    setStreamedContent('');

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    
    // 创建 AbortController 用于取消请求
    abortControllerRef.current = new AbortController();

    streamChat(
      history,
      text,
      (chunk) => {
        // 接收流式数据
        setStreamedContent((prev) => prev + chunk);
      },
      () => {
        // 流结束
        setMessages((prev) => [...prev, { role: 'assistant', content: streamedContent || ' ' }]);
        setStreamedContent('');
        setStreaming(false);
        abortControllerRef.current = null;
      },
      (err) => {
        // 错误处理
        const apiError = normalizeError(err);
        const errorMsg = apiError.isNetworkError() 
          ? '网络连接失败，请检查网络后重试' 
          : `请求失败：${apiError.getUserMessage()}`;
        setMessages((prev) => [...prev, { role: 'assistant', content: `[错误] ${errorMsg}` }]);
        setStreamedContent('');
        setStreaming(false);
        abortControllerRef.current = null;
      }
    );
  }

  function openAddModal() {
    setAddTitle('');
    setAddModalOpen(true);
  }

  async function onConfirmAdd() {
    const result = await executeAdd();
    if (result.success) {
      setAddModalOpen(false);
      setMessages([]);
    }
  }

  // 渲染消息内容，支持流式内容显示
  const renderMessage = (m, index) => {
    const isLastAssistant = m.role === 'assistant' && 
                           index === messages.length - 1 && 
                           streaming && 
                           streamedContent;
    
    const displayContent = isLastAssistant ? streamedContent : m.content;

    return (
      <div
        key={index}
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
          {displayContent}
          {isLastAssistant && (
            <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-indigo-500" />
          AI 找小说灵感
        </span>
        {open ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
      </button>
      {open && (
        <div className="border-t border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
          <div className="min-h-[200px] max-h-[320px] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3 space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">输入问题，让 AI 帮你找小说灵感…</p>
            ) : (
              <>
                {messages.map((m, i) => renderMessage(m, i))}
                {/* 正在流式输出时的占位消息 */}
                {streaming && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="text-sm">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 mr-1">AI</span>
                    <div className="inline-block max-w-[85%] rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words">
                      {streamedContent}
                      <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse" />
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={onSend} className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder={streaming ? 'AI 正在回复中…' : '输入问题…'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={streaming}
            />
            <button 
              type="submit" 
              className="btn flex items-center gap-2" 
              disabled={streaming || !input.trim()}
            >
              {streaming ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  思考中
                </>
              ) : (
                '发送'
              )}
            </button>
          </form>
          <button
            type="button"
            onClick={openAddModal}
            disabled={streaming || messages.length === 0}
            className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
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
              disabled={addSaving}
            />
            {addError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{normalizeError(addError).getUserMessage()}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn btn-ghost" onClick={() => setAddModalOpen(false)} disabled={addSaving}>
                取消
              </button>
              <button type="button" className="btn flex items-center gap-2" onClick={onConfirmAdd} disabled={addSaving}>
                {addSaving && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {addSaving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
