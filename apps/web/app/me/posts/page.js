'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { listMyPosts, listMyPostTags, deletePost } from '../../../services/posts';
import { isAuthed } from '../../../services/auth';
import { LoadingList } from '../../../lib/loading';

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
      setError(err?.message ?? '加载失败');
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
    if (!confirm('确定要删除这篇小说吗？')) return;
    try {
      await deletePost(id);
      await load(selectedTag);
    } catch (err) {
      setError(err?.message ?? '删除失败');
    }
  }

  return (
    <div className="max-w-4xl mx-auto" style={{ width: '80%' }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">我的小说</h1>
        <Link className="btn" href="/write">
          写小说
        </Link>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center justify-between gap-4">
          <span>加载失败：{String(error)}</span>
          <button 
            className="btn btn-sm btn-ghost" 
            onClick={() => load(selectedTag)}
          >
            重试
          </button>
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
            <LoadingList items={3} />
          ) : posts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 mb-6">还没有小说，去写一篇吧</p>
              </div>
              <Link className="btn btn-primary px-6 py-3" href="/write">
                写第一篇
              </Link>
            </div>
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

