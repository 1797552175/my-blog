'use client';

import { useEffect, useState } from 'react';
import { listComments, createComment } from '../services/comments';
import { isAuthed } from '../services/auth';

export default function CommentSection({ postId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestUrl, setGuestUrl] = useState('');
  const [content, setContent] = useState('');
  const loggedIn = typeof window !== 'undefined' && isAuthed();

  async function loadComments() {
    setError(null);
    setLoading(true);
    try {
      const res = await listComments(postId, { page: 0, size: 50 });
      setComments(res.content || []);
    } catch (err) {
      setError(err?.data?.error || err?.message || '加载评论失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function onSubmit(e) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    if (!loggedIn && (!guestName.trim() || !guestEmail.trim())) {
      setError('请填写昵称和邮箱');
      return;
    }
    setError(null);
    setSubmitLoading(true);
    try {
      await createComment(postId, {
        guestName: guestName.trim() || undefined,
        guestEmail: guestEmail.trim() || undefined,
        guestUrl: guestUrl.trim() || undefined,
        content: text,
      });
      setContent('');
      setGuestName('');
      setGuestEmail('');
      setGuestUrl('');
      await loadComments();
    } catch (err) {
      setError(err?.data?.error || err?.message || '发送失败');
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <section className="mt-8 border-t border-zinc-200 dark:border-zinc-700 pt-6">
      <h2 className="text-lg font-semibold mb-4">评论</h2>
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {String(error)}
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-3 mb-6">
        {!loggedIn ? (
          <>
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[160px]">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">昵称 *</label>
                <input
                  className="input w-full"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                  maxLength={64}
                  placeholder="昵称"
                />
              </div>
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">邮箱 *</label>
                <input
                  type="email"
                  className="input w-full"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                  maxLength={128}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">网址（选填）</label>
              <input
                type="url"
                className="input w-full"
                value={guestUrl}
                onChange={(e) => setGuestUrl(e.target.value)}
                maxLength={512}
                placeholder="https://..."
              />
            </div>
          </>
        ) : null}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">评论内容 *</label>
          <textarea
            className="input w-full min-h-[80px]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            maxLength={2000}
            placeholder="写下你的评论…"
          />
        </div>
        <button type="submit" className="btn" disabled={submitLoading}>
          {submitLoading ? '发送中…' : '发送'}
        </button>
      </form>
      {loading ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">加载评论中…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">暂无评论，来抢沙发吧。</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="border-b border-zinc-100 dark:border-zinc-800 pb-4 last:border-0">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{c.authorName}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(c.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">
                {c.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
