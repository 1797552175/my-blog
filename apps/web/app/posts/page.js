import Link from 'next/link';
import { listPosts } from '../../services/posts';

export const dynamic = 'force-dynamic';

function excerpt(md, maxLen = 160) {
  if (!md) return '暂无内容';
  const text = String(md)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

export default async function PostsPage() {
  let posts = [];
  let error = null;

  try {
    const response = await listPosts({ page: 0, size: 10 });
    posts = response.content || [];
  } catch (err) {
    console.error('Failed to fetch posts:', err);
    error = '加载文章列表失败，请稍后重试。';
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">文章列表</h1>
      
      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {posts.length === 0 ? (
            <p className="text-gray-600">暂无文章</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="border-b border-gray-200 pb-4">
                  <Link href={`/posts/${post.slug}`}>
                    <h2 className="text-xl font-semibold text-blue-600 hover:underline">
                      {post.title}
                    </h2>
                  </Link>
                  <p className="text-gray-600 mt-1">
                    {excerpt(post.contentMarkdown)}
                  </p>
                  <div className="text-sm text-gray-500 mt-2">
                    <span>发布于 {new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}