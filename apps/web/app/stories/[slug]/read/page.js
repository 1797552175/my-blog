'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getStoryBySlug, getStoryChapters } from '../../../../services/stories';
import { createForkBySlug, checkForkExists } from '../../../../services/readerForks';
import { createPrNovel } from '../../../../services/storyPrNovels';
import { isAuthed } from '../../../../services/auth';
import { api } from '../../../../lib/api';

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
  
  // PR 弹窗状态
  const [showPrModal, setShowPrModal] = useState(false);
  const [prChapter, setPrChapter] = useState(1);
  const [prDescription, setPrDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [chapterCount, setChapterCount] = useState(0);

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
        // 获取章节数
        try {
          const chapters = await getStoryChapters(slug);
          setChapterCount(chapters?.length || 0);
          setPrChapter(chapters?.length || 1);
        } catch {
          setChapterCount(0);
          setPrChapter(1);
        }
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
          const forks = await api.get('/reader-forks/me');
          const existingFork = forks.find(f => f.storySeedSlug === slug);
          if (existingFork && !cancelled) {
            router.replace('/read/' + existingFork.id);
            return;
          }
        }
        
        setHasFork(false);
      } catch (err) {
        if (!cancelled) {
          console.error('检查阅读记录失败:', err);
          // 如果是认证错误，跳转到登录页
          if (err?.status === 401 || err?.status === 403 || err?.message?.includes('401') || err?.message?.includes('403')) {
            router.replace('/login?next=/stories/' + encodeURIComponent(slug) + '/read');
            return;
          }
          setError(err?.message ?? '检查阅读记录失败');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [story, loading, error, router, slug, isMounted, isAuthenticated]);

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

  const handlePrClick = () => {
    if (!isAuthenticated) {
      router.push('/login?next=/me/pr-novels/create?storyId=' + story?.id);
      return;
    }
    setShowPrModal(true);
    setPrDescription('');
  };

  const handlePrSubmit = async () => {
    if (!story?.id) return;
    
    setCreating(true);
    try {
      await createPrNovel({
        storyId: Number(story.id),
        title: `[续写] 第${prChapter}章后`,
        description: prDescription.trim() || null,
        fromChapterSortOrder: prChapter,
      });
      setShowPrModal(false);
      // 跳转到我的PR页面
      router.push('/me/pr-novels');
    } catch (err) {
      setError(err?.message || '创建失败');
    } finally {
      setCreating(false);
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

  if (error && !showPrModal) {
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

          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={handleCreateFork}
              disabled={loading}
              className="px-6 py-3 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '处理中...' : '添加到我的阅读'}
            </button>
            <button
              onClick={handlePrClick}
              className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              提交PR
            </button>
            <Link
              href={`/stories/${slug}`}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              返回详情
            </Link>
          </div>
        </div>

        {/* PR 创建弹窗 */}
        {showPrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
              <h3 className="text-lg font-semibold mb-4">创建小说分支（PR）</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  从第几章开始续写？
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={prChapter}
                    onChange={(e) => setPrChapter(parseInt(e.target.value) || 1)}
                    className="input w-20"
                    min={1}
                    max={chapterCount || 1}
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    / {chapterCount || 0} 章
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  分支描述
                </label>
                <textarea
                  value={prDescription}
                  onChange={(e) => setPrDescription(e.target.value)}
                  className="input w-full min-h-[80px] text-sm"
                  placeholder="描述你的续写思路和亮点..."
                  maxLength={500}
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
                  {prDescription.length}/500
                </p>
              </div>

              <div className="flex gap-2 mb-4">
                <button 
                  onClick={handlePrSubmit} 
                  disabled={creating}
                  className="btn btn-primary flex-1"
                >
                  {creating ? '创建中...' : '创建并添加到我的阅读'}
                </button>
                <button 
                  onClick={() => setShowPrModal(false)} 
                  className="btn btn-ghost"
                  disabled={creating}
                >
                  取消
                </button>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <h4 className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  创建后你可以：
                </h4>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-0.5">
                  <li>• 编辑和添加章节内容</li>
                  <li>• 继承原小说前 {prChapter} 章的设定</li>
                  <li>• 完成后提交给原作者审核</li>
                  <li>• 审核通过后作为新的故事分支线</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 text-center">
      <p className="text-zinc-500 dark:text-zinc-400">正在进入阅读…</p>
    </div>
  );
}
