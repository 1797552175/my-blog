'use client';

import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { excerpt } from '../lib/utils';

export default function HomePostList({ posts, loading, error, onRetry, title = '小说种子推荐' }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm p-6">
      <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-4">{title}</h2>
      {loading ? (
        <div className="text-center py-8">
          <p className="text-zinc-500 dark:text-zinc-400">加载中...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">加载失败，点击重试</p>
          <button onClick={onRetry} className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            重试
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">暂无小说</p>
          <Link href="/write" className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            去写第一篇
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
              <div key={post.id} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <h3 className="font-medium text-zinc-800 dark:text-zinc-200 mb-2 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                  {post.tags && post.tags.length > 0 ? post.tags.join(' · ') : '未分类'} · {new Date(post.createdAt).toLocaleDateString('zh-CN')}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-3 mb-3">
                  {excerpt(post.contentMarkdown || post.openingMarkdown, 100)}
                </p>
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>作者：{post.author?.username ?? post.authorUsername ?? '匿名'}</span>
                  <Link href={`/stories/${post.slug}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    阅读更多
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link href="/stories" className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              查看更多小说种子
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}