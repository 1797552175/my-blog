'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { isAuthed } from '../../../../services/auth';
import { getStoryById } from '../../../../services/stories';
import { createPrNovel } from '../../../../services/storyPrNovels';
import { useToast } from '../../../../components/Toast';

function CreatePrNovelForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storyId = searchParams?.get('storyId');
  const fromChapter = searchParams?.get('fromChapter');
  const { addToast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [story, setStory] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedChapter, setSelectedChapter] = useState(1);

  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isAuthed());
  }, []);

  useEffect(() => {
    if (!isMounted || !isAuthenticated || !storyId) return;
    loadStory();
  }, [isMounted, isAuthenticated, storyId]);

  useEffect(() => {
    if (fromChapter) {
      setSelectedChapter(parseInt(fromChapter) || 1);
    }
  }, [fromChapter]);

  async function loadStory() {
    setLoading(true);
    try {
      const data = await getStoryById(storyId);
      setStory(data);
      setTitle(`[续写] ${data.title}`);
      setSelectedChapter(data.chapterCount || 1);
    } catch (err) {
      console.error('加载失败:', err);
      addToast(err?.message ?? '加载小说失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!title.trim()) {
      addToast('请输入标题');
      return;
    }
    setSaving(true);
    try {
      const result = await createPrNovel({
        storyId: Number(storyId),
        title: title.trim(),
        description: description.trim() || null,
        fromChapterSortOrder: selectedChapter,
      });
      addToast('创建成功');
      router.push(`/me/pr-novels/${result.id}/edit`);
    } catch (err) {
      addToast(err?.message ?? '创建失败');
    } finally {
      setSaving(false);
    }
  }

  if (!isMounted || !isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">小说不存在</p>
        <Link href="/stories" className="btn btn-primary mt-4">
          返回小说列表
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* 面包屑 */}
      <nav className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400">
            首页
          </Link>
          <span>/</span>
          <Link href="/stories" className="hover:text-indigo-600 dark:hover:text-indigo-400">
            小说列表
          </Link>
          <span>/</span>
          <span className="text-gray-800 dark:text-gray-200 font-medium">创建PR</span>
        </div>
      </nav>

      {/* 标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          创建分支小说（PR）
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          从原小说的某个章节开始续写，创建你的分支故事
        </p>
      </div>

      {/* 原小说信息 */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">原小说</p>
            <Link
              href={`/stories/${story.slug}`}
              className="text-lg font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {story.title}
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              作者：{story.authorUsername} · {story.chapterCount || 0} 章
            </p>
          </div>
        </div>
      </div>

      {/* 表单 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              分支小说标题 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full"
              placeholder="给你的分支小说起个名字"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              从第几章开始续写 *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(parseInt(e.target.value) || 1)}
                className="input w-24"
                min={1}
                max={story.chapterCount || 1}
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                / {story.chapterCount || 0} 章
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              将继承原小说前 {selectedChapter} 章的内容和设定
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              描述（可选）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input w-full min-h-[100px]"
              placeholder="描述你的续写思路和亮点..."
              maxLength={2000}
            />
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              创建后你可以：
            </h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• 编辑和添加章节内容</li>
              <li>• 继承原小说前 {selectedChapter} 章的设定</li>
              <li>• 完成后提交给原作者审核</li>
              <li>• 审核通过后作为新的故事分支线</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <button onClick={handleCreate} disabled={saving} className="btn btn-primary flex-1">
              {saving ? '创建中...' : '创建分支小说'}
            </button>
            <Link href="/stories" className="btn btn-ghost">
              取消
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreatePrNovelPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    }>
      <CreatePrNovelForm />
    </Suspense>
  );
}
