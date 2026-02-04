import Link from 'next/link';
import { listPosts } from '../../services/posts';
import PostsListWithPersona from './PostsListWithPersona';

export const dynamic = 'force-dynamic';

export default async function PostsPage({ searchParams: searchParamsProp }) {
  const searchParams = typeof searchParamsProp?.then === 'function' ? await searchParamsProp : searchParamsProp;
  const tag = searchParams?.tag ?? null;
  let posts = [];
  let error = null;

  try {
    const response = await listPosts({ page: 0, size: 10, tag: tag || undefined });
    posts = response?.content ?? [];
  } catch (err) {
    console.error('Failed to fetch posts:', err);
    const msg = err?.data?.error ?? err?.message ?? '';
    const status = err?.status;
    if (status) {
      error = `加载文章列表失败（${status}${msg ? `: ${msg}` : ''}），请检查后端是否已启动且地址正确。`;
    } else {
      error = msg ? `加载文章列表失败：${msg}。请确认后端已启动（如 http://localhost:8080）。` : '加载文章列表失败，请稍后重试。';
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">文章列表</h1>
      {tag ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          当前筛选：<span className="font-medium text-zinc-700 dark:text-zinc-200">{tag}</span>
          {' · '}
          <Link href="/posts" className="text-primary-600 hover:underline">清除</Link>
        </p>
      ) : null}

      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          <PostsListWithPersona posts={posts} tag={tag} error={error} />
        </div>
      )}
    </div>
  );
}