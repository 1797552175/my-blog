'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

/**
 * 通用的故事阅读器组件
 * 支持普通小说和 PR Novel 的阅读
 */
export default function StoryReader({
  id,
  api,
  breadcrumbs,
  renderHeader,
  renderActions,
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [itemData, chaptersData] = await Promise.all([
        api.getItem(id),
        api.listChapters(id).catch(() => []),
      ]);
      setData(itemData);
      const ch = Array.isArray(chaptersData) ? chaptersData : [];
      ch.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(ch);
    } catch (err) {
      setError(err?.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id, api]);

  useEffect(() => {
    if (id) {
      load();
    }
  }, [id, load]);

  const currentChapter = chapters[currentChapterIndex];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button onClick={load} className="btn btn-primary mt-4">重试</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">内容不存在</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 面包屑 */}
      {breadcrumbs}

      {/* 标题区域 */}
      <div className="mb-6">
        {renderHeader?.(data)}
      </div>

      {/* 操作按钮 */}
      {renderActions?.(data)}

      {/* 章节导航 */}
      {chapters.length > 0 && (
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            {chapters.map((ch, index) => (
              <button
                key={ch.id}
                onClick={() => setCurrentChapterIndex(index)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  currentChapterIndex === index
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {ch.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 章节内容 */}
      {currentChapter ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            {currentChapter.title}
          </h2>
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown>
              {currentChapter.contentMarkdown || '*暂无内容*'}
            </ReactMarkdown>
          </div>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            字数：{currentChapter.wordCount || 0}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500 dark:text-gray-400">
          暂无章节内容
        </div>
      )}
    </div>
  );
}
