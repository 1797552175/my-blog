import Link from 'next/link';
import { searchPosts } from '../../services/posts';
import SearchForm from '../../components/SearchForm';

export const dynamic = 'force-dynamic';

const SUMMARY_LEN = 120;

function excerpt(md, maxLen = SUMMARY_LEN) {
  if (!md) return '';
  const text = String(md)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

export default async function SearchPage({ searchParams }) {
  const q = searchParams?.q ?? '';
  let posts = [];
  let error = null;

  if (q && String(q).trim()) {
    try {
      const response = await searchPosts({ q: q.trim(), page: 0, size: 20 });
      posts = response.content || [];
    } catch (err) {
      console.error('Search failed:', err);
      error = '搜索失败，请稍后重试。';
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6" style={{ width: '80%' }}>
      <h1 className="text-3xl font-bold mb-6">搜索</h1>
      <SearchForm defaultValue={q} className="mb-8" />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : !q || !String(q).trim() ? (
        <p className="text-zinc-500 dark:text-zinc-400">输入关键词搜索已发布文章（标题或正文）。</p>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-300 mb-2">没有找到与「{q}」相关的结果。</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">换几个词试试，或去文章列表逛逛。</p>
          <Link href="/posts" className="btn">去文章列表</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">共 {posts.length} 条结果</p>
          {posts.map((post) => (
            <div key={post.id} className="border-b border-zinc-200 dark:border-zinc-700 pb-4">
              <Link href={`/posts/${post.slug}`}>
                <h2 className="text-xl font-semibold text-primary-600 hover:underline">{post.title}</h2>
              </Link>
              <p className="text-zinc-600 dark:text-zinc-300 mt-1 text-sm">
                {excerpt(post.contentMarkdown, SUMMARY_LEN)}
              </p>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                {new Date(post.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
