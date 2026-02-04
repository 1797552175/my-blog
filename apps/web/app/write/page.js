'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { createPost, updatePost, getPostById } from '../../services/posts';
import { isAuthed } from '../../services/auth';
import InspirationBrowser from '../../components/InspirationBrowser';

export default function WritePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [title, setTitle] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [published, setPublished] = useState(true);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadEdit, setLoadEdit] = useState(!!editId);
  const [error, setError] = useState(null);

  const loadPost = useCallback(async () => {
    if (!editId) return;
    setError(null);
    try {
      const post = await getPostById(editId);
      setTitle(post.title);
      setContentMarkdown(post.contentMarkdown);
      setPublished(post.published);
      setTags(Array.isArray(post.tags) ? [...post.tags] : []);
    } catch (err) {
      setError(err?.data?.error || err?.message || '加载文章失败');
    } finally {
      setLoadEdit(false);
    }
  }, [editId]);

  useEffect(() => {
    if (!isAuthed()) {
      router.replace('/login?next=/write');
      return;
    }
    if (editId) loadPost();
  }, [router, editId, loadPost]);

  function addTag() {
    const t = tagInput.trim().slice(0, 64);
    if (!t || tags.includes(t)) {
      setTagInput('');
      return;
    }
    setTags([...tags, t]);
    setTagInput('');
  }

  function removeTag(t) {
    setTags(tags.filter((x) => x !== t));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // 提交时把输入框里未按回车添加的标签一并带上，避免只填了标签没按回车就点保存导致 tags 为空
    const pendingTag = tagInput.trim().slice(0, 64);
    const finalTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags;
    try {
      const payload = { title, contentMarkdown, published, tags: finalTags };
      if (editId) {
        await updatePost(editId, payload);
        router.push(`/me/posts`);
      } else {
        const post = await createPost(payload);
        router.push(`/posts/${post.slug}`);
      }
      router.refresh();
    } catch (err) {
      setError(err?.data?.error || err?.message || (editId ? '更新失败' : '创建失败'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
      <div className="card p-6">
        <h1 className="text-2xl font-bold mb-1">{editId ? '编辑文章' : '写文章'}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">内容支持 Markdown，右侧为实时预览。标签可自由输入，回车添加。</p>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {String(error)}
          </div>
        ) : null}

        {loadEdit ? (
          <div className="text-sm text-zinc-500 dark:text-zinc-400">加载中…</div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="label">标题</label>
              <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
            </div>
            <div>
              <label className="label">标签</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-200 dark:bg-zinc-700 px-3 py-1 text-sm"
                  >
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="hover:text-red-600" aria-label={`移除 ${t}`}>
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="input flex-1 min-w-[120px] max-w-[200px]"
                  placeholder="输入后回车添加"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      addTag();
                    }
                  }}
                  autoComplete="off"
                />
              </div>
            </div>
            <div>
              <label className="label">内容（Markdown）</label>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-1">
                <textarea
                  className="input min-h-[280px] lg:min-h-[320px] font-mono text-sm resize-y"
                  value={contentMarkdown}
                  onChange={(e) => setContentMarkdown(e.target.value)}
                  required
                  placeholder="在此输入 Markdown…"
                />
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4 min-h-[280px] lg:min-h-[320px] overflow-auto">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2">实时预览</p>
                  <div className="prose prose-sm dark:prose-invert max-w-none min-h-[240px]">
                    {contentMarkdown.trim() ? (
                      <ReactMarkdown>{contentMarkdown}</ReactMarkdown>
                    ) : (
                      <p className="text-zinc-400 dark:text-zinc-500 italic">输入内容后将在此显示预览</p>
                    )}
                  </div>
                </div>
              </div>
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
                {loading ? '提交中…' : editId ? '保存' : '发布'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => router.push(editId ? '/me/posts' : '/posts')}>
                取消
              </button>
            </div>
          </form>
        )}
      </div>
      </div>
      <aside className="w-full lg:w-80 flex-shrink-0">
        <InspirationBrowser />
      </aside>
    </div>
  );
}
