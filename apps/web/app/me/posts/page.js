'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { listMyPosts, listMyPostTags, deletePost } from '../../../services/posts';
import { isAuthed } from '../../../services/auth';

export default function MyPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (tag = null) => {
    setError(null);
    setLoading(true);
    try {
      const res = await listMyPosts({ page: 0, size: 20, tag: tag || undefined });
      setPosts(res.content || []);
    } catch (err) {
      setError(err?.data?.error || err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthed()) {
      router.replace('/login?next=/me/posts');
      return;
    }
    (async () => {
      try {
        const tagList = await listMyPostTags();
        setTags(Array.isArray(tagList) ? tagList : []);
      } catch {
        setTags([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!isAuthed()) return;
    load(selectedTag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTag]);

  async function onDelete(id) {
    if (!confirm('确定要删除这篇文章吗？')) return;
    try {
      await deletePost(id);
      await load(selectedTag);
    } catch (err) {
      alert(err?.data?.error || err?.message || '删除失败');
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">我的文章</h1>
        <Link className="btn" href="/write">
          写文章
        </Link>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {String(error)}
        </div>
      ) : null}

      {tags.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">按标签：</span>
          <button
            type="button"
            onClick={() => setSelectedTag(null)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${selectedTag === null ? 'bg-primary-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600'}`}
          >
            全部
          </button>
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTag(t)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${selectedTag === t ? 'bg-primary-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600'}`}
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}

      <div className="card">
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {loading ? (
            <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">加载中…</div>
          ) : posts.length === 0 ? (
            <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">还没有文章，去写一篇吧。</div>
          ) : (
            posts.map((p) => (
              <div key={p.id} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link className="font-medium text-primary-600 hover:underline truncate" href={`/posts/${p.slug}`}>
                      {p.title}
                    </Link>
                    {!p.published ? (
                      <span className="text-xs rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        草稿
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      更新于 {new Date(p.updatedAt || p.createdAt).toLocaleString()}
                    </span>
                    {Array.isArray(p.tags) && p.tags.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {p.tags.map((t) => (
                          <span key={t} className="text-xs rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-zinc-600 dark:text-zinc-300">
                            {t}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link className="btn btn-ghost" href={`/write?edit=${p.id}`}>
                    编辑
                  </Link>
                  <button className="btn btn-ghost" onClick={() => onDelete(p.id)}>
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

