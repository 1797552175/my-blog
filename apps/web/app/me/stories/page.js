'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { listMyStories, deleteStory, getMyTags } from '../../../services/stories';
import { isAuthed } from '../../../services/auth';
import { LoadingList } from '../../../lib/loading';

export default function MyStoriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter') || 'all';
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [stories, setStories] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isAuthed());
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await listMyStories({ filter, page: 0, size: 50 });
      setStories(res.content || []);
    } catch (err) {
      setError(err?.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const loadTags = useCallback(async () => {
    try {
      const tagList = await getMyTags();
      setTags(Array.isArray(tagList) ? tagList : []);
    } catch {
      setTags([]);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/me/stories');
      return;
    }
    loadTags();
  }, [router, loadTags, isAuthenticated, isMounted]);

  useEffect(() => {
    if (!isMounted || !isAuthenticated) {
      return;
    }
    load();
  }, [load, isAuthenticated, isMounted]);

  async function onDelete(id, title) {
    if (!confirm(`确定要删除「${title}」吗？`)) return;
    try {
      await deleteStory(id);
      await load();
    } catch (err) {
      setError(err?.message ?? '删除失败');
    }
  }

  const getPageTitle = () => {
    if (filter === 'completed') return '我的已完成小说';
    if (filter === 'interactive') return '我的待续写小说';
    return '我的小说';
  };

  const filteredStories = selectedTag
    ? stories.filter(s => s.tags?.includes(selectedTag))
    : stories;

  return (
    <div className="max-w-4xl mx-auto p-6" style={{ width: '80%' }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{getPageTitle()}</h1>
        <Link className="btn" href="/write">
          写小说
        </Link>
      </div>

      {/* 筛选标签 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Link 
          href="/me/stories" 
          className={`px-3 py-1 rounded-full text-sm ${
            filter === 'all'
              ? 'bg-indigo-600 text-white' 
              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
          }`}
        >
          全部
        </Link>
        <Link 
          href="/me/stories?filter=completed" 
          className={`px-3 py-1 rounded-full text-sm ${
            filter === 'completed'
              ? 'bg-indigo-600 text-white' 
              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
          }`}
        >
          已完成
        </Link>
        <Link 
          href="/me/stories?filter=interactive" 
          className={`px-3 py-1 rounded-full text-sm ${
            filter === 'interactive'
              ? 'bg-indigo-600 text-white' 
              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
          }`}
        >
          待续写
        </Link>
      </div>

      {/* 标签筛选 */}
      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">按标签：</span>
          <button
            type="button"
            onClick={() => setSelectedTag(null)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${selectedTag === null ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600'}`}
          >
            全部
          </button>
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTag(t)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${selectedTag === t ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600'}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center justify-between gap-4">
          <span>{String(error)}</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => load()}>重试</button>
        </div>
      ) : null}

      <div className="card">
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {loading ? (
            <LoadingList items={3} />
          ) : filteredStories.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 dark:text-zinc-400">
              还没有小说，<Link href="/write" className="text-indigo-600 dark:text-indigo-400 hover:underline">写第一篇</Link>。
            </div>
          ) : (
            filteredStories.map((story) => (
              <div key={story.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/me/stories/${story.id}/edit`} className="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline">
                      {story.title}
                    </Link>
                    {!story.isCompleted && (
                      <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs">
                        待续写
                      </span>
                    )}
                    {story.isCompleted && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                        已完成
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {story.storySummary || '暂无简介'} · {story.published ? '已发布' : '草稿'}
                  </p>
                  {story.tags && story.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {story.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!story.isCompleted && (
                    <>
                      <Link href={`/me/stories/${story.id}/branches`} className="btn btn-sm btn-ghost">分支</Link>
                      <Link href={`/me/stories/${story.id}/settings`} className="btn btn-sm btn-ghost">设定</Link>
                      <Link href={`/me/stories/${story.id}/pull-requests`} className="btn btn-sm btn-ghost">PR</Link>
                    </>
                  )}
                  <Link href={`/me/stories/${story.id}/edit`} className="btn btn-sm btn-ghost">编辑</Link>
                  <Link href={`/stories/${story.slug}`} className="btn btn-sm btn-ghost">预览</Link>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost text-red-600 dark:text-red-400"
                    onClick={() => onDelete(story.id, story.title)}
                  >
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
