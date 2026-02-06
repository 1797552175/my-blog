import Link from 'next/link';
import { listPosts, searchPosts } from '../../services/posts';
import PostsListWithPersona from './PostsListWithPersona';
import SearchForm from '../../components/SearchForm';

export const dynamic = 'force-dynamic';

export default async function PostsPage({ searchParams: searchParamsProp }) {
  const searchParams = typeof searchParamsProp?.then === 'function' ? await searchParamsProp : searchParamsProp;
  const tag = searchParams?.tag ?? null;
  const q = searchParams?.q ?? '';
  let posts = [];
  let error = null;
  let isSearch = false;

  try {
    if (q && String(q).trim()) {
      // 搜索模式
      isSearch = true;
      const response = await searchPosts({ q: q.trim(), page: 0, size: 10 });
      posts = response?.content ?? [];
    } else {
      // 热门小说列表模式
      const response = await listPosts({ page: 0, size: 10, tag: tag || undefined });
      posts = response?.content ?? [];
    }
  } catch (err) {
    console.error('Failed to fetch posts:', err);
    const msg = err?.data?.error ?? err?.message ?? '';
    const status = err?.status;
    if (status) {
      error = `加载失败（${status}${msg ? `: ${msg}` : ''}），请检查后端是否已启动且地址正确。`;
    } else {
      error = msg ? `加载失败：${msg}。请确认后端已启动（如 http://localhost:8080）。` : '加载失败，请稍后重试。';
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6" style={{ width: '80%' }}>
      <h1 className="text-3xl font-bold mb-6">{isSearch ? '搜索结果' : '热门小说'}</h1>
      
      {/* 搜索表单 */}
      <div className="mb-8">
        <SearchForm 
          defaultValue={q} 
          placeholder="搜索小说…" 
          className="max-w-md" 
        />
      </div>
      
      {tag ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          当前分类：<span className="font-medium text-zinc-700 dark:text-zinc-200">{tag}</span>
          {' · '}
          <Link href="/posts" className="text-primary-600 hover:underline">清除</Link>
        </p>
      ) : null}

      {isSearch && q && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          搜索关键词：<span className="font-medium text-zinc-700 dark:text-zinc-200">{q}</span>
          {' · '}
          <Link href="/posts" className="text-primary-600 hover:underline">清除</Link>
        </p>
      )}

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