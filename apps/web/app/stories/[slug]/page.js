'use client';

import Link from 'next/link';
import { notFound, useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getStoryBySlug, listChaptersBySlug, getStoryContributors } from '../../../services/stories';

export default function StoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : params?.slug?.[0];
  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [contributors, setContributors] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) {
      router.push('/404');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const storyData = await getStoryBySlug(slug);
        const chaptersData = await listChaptersBySlug(slug).catch(() => []);
        const contributorsData = await getStoryContributors(storyData.id).catch(() => []);

        if (!storyData || !storyData.published) {
          router.push('/404');
          return;
        }

        setStory(storyData);
        setChapters(chaptersData);
        setContributors(contributorsData);
      } catch (err) {
        setError('加载失败');
        router.push('/404');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return null;
  }

  const hasContent = story.hasContent;
  const isForkable = story.isForkable;
  const hasChapters = Array.isArray(chapters) && chapters.length > 0;
  const hasContributors = Array.isArray(contributors) && contributors.length > 0;

  // 计算总字数
  const totalWordCount = contributors.reduce((sum, c) => sum + (c.wordCount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
      {/* 顶部导航栏 */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href="/stories" 
            className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">返回小说库</span>
          </Link>
        </div>
      </nav>

      {/* 主要内容区 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 小说封面和信息卡片 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden mb-8">
          <div className="px-6 pb-6">
            {/* 标题区域 */}
            <div className="mb-6">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
                {story.title}
              </h1>
              
              {/* 作者和标签 */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium">{story.authorUsername}</span>
                </div>
                
                {story.openSource && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    开源 {story.openSourceLicense || ''}
                  </span>
                )}
                
                {hasContent && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    有内容
                  </span>
                )}
              </div>

              {/* 统计信息 */}
              <div className="flex flex-wrap gap-6 text-sm mb-4">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-semibold text-slate-900 dark:text-white">{story.starCount || 0}</span>
                  <span>收藏</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="font-semibold text-slate-900 dark:text-white">{story.forkCount || 0}</span>
                  <span>分支</span>
                </div>
                {hasContributors && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="font-semibold text-slate-900 dark:text-white">{contributors.length}</span>
                    <span>贡献者</span>
                  </div>
                )}
                {hasChapters && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="font-semibold text-slate-900 dark:text-white">{chapters.length}</span>
                    <span>章节</span>
                  </div>
                )}
                {totalWordCount > 0 && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="font-semibold text-slate-900 dark:text-white">{totalWordCount.toLocaleString()}</span>
                    <span>字</span>
                  </div>
                )}
              </div>
            </div>

            {/* 标签 */}
            {story.tags && story.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {story.tags.map(tag => (
                  <span 
                    key={tag} 
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* 简介 */}
            {story.storySummary && (
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5 mb-6">
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  简介
                </h3>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {story.storySummary}
                </p>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/stories/${slug}/read`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                开始阅读
              </Link>
              
              {isForkable && (
                <Link
                  href={`/stories/${slug}/fork`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-green-500/25 active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Fork 这个世界
                </Link>
              )}

              <button
                onClick={() => {
                  window.location.href = `/me/pr-novels/create?storyId=${story.id}&fromChapter=${chapters.length || 1}`;
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/25 active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                创建 PR
              </button>
            </div>
          </div>
        </div>

        {/* 下方内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：章节列表 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 章节列表 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  章节列表
                </h2>
                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium">
                  共 {chapters.length} 章
                </span>
              </div>

              {hasChapters ? (
                <div className="space-y-3">
                  {chapters.map((chapter, index) => (
                    <Link
                      key={chapter.id}
                      href={`/stories/${slug}/read?chapter=${chapter.sortOrder}`}
                      className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all cursor-pointer"
                    >
                      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 rounded-lg text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-semibold transition-colors">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          {chapter.title}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          第 {chapter.sortOrder} 章
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center gap-1 text-sm text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          阅读
                          <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mb-2">暂无章节内容</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">等待作者更新...</p>
                </div>
              )}
            </div>

            {/* 等待创作提示 */}
            {!hasContent && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border-2 border-amber-200 dark:border-amber-700/50 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">✨</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-amber-900 dark:text-amber-300 mb-2">
                      等待创作
                    </h3>
                    <p className="text-amber-800 dark:text-amber-400">
                      这是一个开源小说，等待你来创作内容！Fork 这个项目，开始你的创作之旅。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 右侧：贡献者和其他信息 */}
          <div className="space-y-6">
            {/* 快捷操作 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">快捷操作</h3>
              <div className="space-y-3">
                <Link
                  href={`/stories/${slug}/manage`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                >
                  <div className="w-10 h-10 bg-zinc-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">管理章节</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">编辑小说内容</div>
                  </div>
                </Link>

                <Link
                  href={`/stories/${slug}/wiki`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                >
                  <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">百科资料</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">查看世界观设定</div>
                  </div>
                </Link>

                <Link
                  href={`/stories/${slug}/branches`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                >
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">分支图谱</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">探索故事分支</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* 贡献者列表 */}
            {hasContributors && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    贡献者
                  </h3>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    共 {totalWordCount.toLocaleString()} 字
                  </span>
                </div>
                
                <div className="space-y-3">
                  {contributors.slice(0, 5).map((contributor, index) => (
                    <div
                      key={contributor.userId}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 dark:text-white truncate">
                          {contributor.username}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {contributor.chapterCount}章 · {(contributor.wordCount || 0).toLocaleString()}字
                        </div>
                      </div>
                      {index === 0 && (
                        <span className="flex-shrink-0 text-lg" title="最多贡献">👑</span>
                      )}
                    </div>
                  ))}
                </div>
                
                {contributors.length > 5 && (
                  <button className="w-full mt-4 py-2 text-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors">
                    查看全部 {contributors.length} 位贡献者 →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}