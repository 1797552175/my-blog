'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getStoryBySlug } from '../../../../services/stories';
import { createForkBySlug, checkForkExists } from '../../../../services/readerForks';
import { isAuthed } from '../../../../services/auth';

export default function StoryReadEntryPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug;
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasFork, setHasFork] = useState(false);
  const hasForkedRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isAuthed());
  }, []);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const s = await getStoryBySlug(slug);
        setStory(s);
      } catch (err) {
        setError(err?.message ?? '加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    if (!story || loading || error || hasForkedRef.current) return;
    if (!isMounted || !isAuthenticated) {
      router.replace('/login?next=/stories/' + encodeURIComponent(slug) + '/read');
      return;
    }
    
    (async () => {
      try {
        const exists = await checkForkExists(slug);
        if (exists) {
          const forks = await fetch('/api/reader-forks/me').then(r => r.json());
          const existingFork = forks.find(f => f.storySeedSlug === slug);
          if (existingFork && !cancelled) {
            router.replace('/read/' + existingFork.id);
            return;
          }
        }
        
        setHasFork(false);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message ?? '检查阅读记录失败');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [story, loading, error, router, slug]);

  const handleCreateFork = async () => {
    hasForkedRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const fork = await createForkBySlug(slug);
      router.replace('/read/' + fork.id);
    } catch (err) {
      setError(err?.message ?? '创建阅读副本失败');
      setLoading(false);
      hasForkedRef.current = false;
    }
  };

  if (loading || !story) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3" />
          <div className="h-32 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Link href={`/stories/${slug}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4 block">
          ← 返回故事
        </Link>
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!hasFork) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Link href={`/stories/${slug}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4 block">
          ← 返回故事
        </Link>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="mb-6">
            <div className="text-6xl mb-4">📚</div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              {story.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              还没有添加到你的阅读列表
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
              💡 阅读提示
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              这是一本互动小说，需要先添加到你的阅读列表才能开始阅读。添加后，AI 会根据你的选择续写故事，让故事按照你的意愿发展。
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={handleCreateFork}
              disabled={loading}
              className="px-6 py-3 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '处理中...' : '添加到我的阅读'}
            </button>
            <Link
              href={`/stories/${slug}`}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              返回详情
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 text-center">
      <p className="text-zinc-500 dark:text-zinc-400">正在进入阅读…</p>
    </div>
  );
}
