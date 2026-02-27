'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateStory } from '../../../../../services/stories';
import { getStoryById } from '../../../../../services/stories';
import { useToast } from '../../../../../components/Toast';

export default function ManageStoryPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const { addToast } = useToast();
  const [title, setTitle] = useState('');
  const [storySummary, setStorySummary] = useState('');
  const [styleParams, setStyleParams] = useState('');
  const [tags, setTags] = useState('');
  const [openSource, setOpenSource] = useState(false);
  const [openSourceLicense, setOpenSourceLicense] = useState('');
  const [published, setPublished] = useState(false);
  const [intentKeywords, setIntentKeywords] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStory = async () => {
      try {
        setIsLoading(true);
        const storyId = parseInt(id);
        const story = await getStoryById(storyId);
        setTitle(story.title);
        setStorySummary(story.storySummary || '');
        setStyleParams(story.styleParams || '');
        setTags(story.tags ? story.tags.join(', ') : '');
        setOpenSource(story.openSource || false);
        setOpenSourceLicense(story.openSourceLicense || '');
        setPublished(story.published || false);
        setIntentKeywords(story.intentKeywords || '');
        setError(null);
      } catch (err) {
        setError('获取小说信息失败');
        console.error('Error fetching story:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStory();
  }, [id]);

  const onSaveStoryMeta = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      const storyId = parseInt(id);
      
      const updatedStory = await updateStory(storyId, {
        title,
        storySummary,
        styleParams,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        openSource,
        openSourceLicense,
        published,
        intentKeywords
      });
      
      addToast('小说信息更新成功', 'success');
      router.push(`/me/stories/${id}/edit`);
    } catch (err) {
      setError('更新小说信息失败');
      console.error('Error updating story:', err);
      addToast('更新失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-3 flex-wrap">
          <Link 
            href="/me/stories" 
            className="text-sm px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-all duration-200 transform hover:scale-105"
          >
            ← 我的小说
          </Link>
          <Link 
            href={`/me/stories/${id}/edit`} 
            className="text-sm px-4 py-2 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/50 transition-all duration-200 transform hover:scale-105"
          >
            ← 返回编辑
          </Link>
        </div>

        <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-8 transition-all duration-300 hover:shadow-xl">
          <h1 className="text-3xl font-bold mb-6 text-center text-zinc-800 dark:text-zinc-100">管理小说信息</h1>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <form onSubmit={onSaveStoryMeta} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                小说书名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                placeholder="给你的小说起个吸引人的名字"
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                小说简介
              </label>
              <textarea
                value={storySummary}
                onChange={(e) => setStorySummary(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 h-36 resize-none"
                placeholder="简要介绍你的小说，让读者了解故事梗概"
                maxLength={1000}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {storySummary.length}/1000
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                文风设定
              </label>
              <input
                type="text"
                value={styleParams}
                onChange={(e) => setStyleParams(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                placeholder="描述你想要的写作风格，例如：轻松幽默、严肃深沉、古风雅致等..."
                maxLength={2000}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                小说标签
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                placeholder="输入标签，用逗号分隔（例如：玄幻, 修仙, 热血）"
                maxLength={200}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                标签有助于读者找到你的小说
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>保存中...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>保存更改</span>
                  </>
                )}
              </button>
              <Link
                href={`/me/stories/${id}/edit`}
                className="px-6 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>取消</span>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
