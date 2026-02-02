'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPost } from '../../services/posts';
import { isAuthed } from '../../services/auth';

export default function WritePage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [published, setPublished] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthed()) {
      router.replace('/login?next=/write');
    }
  }, [router]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const post = await createPost({ title, contentMarkdown, published });
      router.push(`/posts/${post.slug}`);
      router.refresh();
    } catch (err) {
      setError(err?.data?.error || err?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-6">
        <h1 className="text-2xl font-bold mb-1">写文章</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">内容支持 Markdown（目前先以纯文本形式展示）。</p>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {String(error)}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="label">标题</label>
            <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
          </div>
          <div>
            <label className="label">内容（Markdown）</label>
            <textarea className="input mt-1 min-h-[240px]" value={contentMarkdown} onChange={(e) => setContentMarkdown(e.target.value)} required />
          </div>
          <div className="flex items-center gap-3">
            <input
              id="published"
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-400/50"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            <label htmlFor="published" className="text-sm text-zinc-700 dark:text-zinc-200">
              立即发布（未勾选则为草稿）
            </label>
          </div>
          <div className="flex gap-3">
            <button className="btn" disabled={loading}>
              {loading ? '提交中…' : '发布'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => router.push('/posts')}>
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

