'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createForkBySlug, checkForkExists } from '../services/readerForks';
import { starStory, getStoryBySlug } from '../services/stories';
import { isAuthed, getCurrentUser } from '../services/auth';
import { createPrNovel } from '../services/storyPrNovels';

export default function AddToReadsButton({ slug, isInteractive, storyId, chapterCount }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [showPrModal, setShowPrModal] = useState(false);
  const [prChapter, setPrChapter] = useState(1);
  const [prDescription, setPrDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const authStatus = isAuthed();
    setAuthenticated(authStatus);
    
    if (authStatus) {
      checkForkExists(slug).then(exists => {
        setAdded(exists);
      }).catch(err => {
        console.error('检查阅读状态失败:', err);
      });
    }
  }, [slug, isInteractive]);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!authenticated) {
      router.push('/login?next=/stories/' + encodeURIComponent(slug));
      return;
    }

    if (added) {
      router.push('/me/reads');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const exists = await checkForkExists(slug);
      if (exists) {
        setAdded(true);
        router.push('/me/reads');
        return;
      }

      const fork = await createForkBySlug(slug);
      
      if (fork && fork.storyId) {
        try {
          await starStory(fork.storyId);
        } catch (starError) {
          console.warn('星标失败，但不影响阅读:', starError);
        }
      }
      
      setAdded(true);
      router.push('/read/' + fork.id);
    } catch (err) {
      setError(err?.message || '添加失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePrClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!authenticated) {
      router.push('/login?next=/me/pr-novels/create?storyId=' + storyId);
      return;
    }
    setShowPrModal(true);
    setPrChapter(chapterCount || 1);
    setPrDescription('');
  };

  const handlePrSubmit = async () => {
    if (!storyId) return;
    
    setCreating(true);
    try {
      const result = await createPrNovel({
        storyId: Number(storyId),
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

  if (!isClient || !isInteractive) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          onClick={handleClick}
          disabled={loading}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            added
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-amber-500 text-white hover:bg-amber-600'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? '处理中...' : added ? '已在阅读列表' : '添加到我的阅读'}
        </button>
        <button
          onClick={handlePrClick}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
        >
          创建PR
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

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
