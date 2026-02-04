import Link from 'next/link';
import { getPostBySlug } from '../../../services/posts';
import CommentSection from '../../../components/CommentSection';
import PostDetailPersona from './PostDetailPersona';

export const dynamic = 'force-dynamic';

export default async function PostDetailPage({ params }) {
  const { slug } = params;

  let post = null;
  let error = null;
  try {
    post = await getPostBySlug(slug);
  } catch (e) {
    error = '文章不存在或已下线。';
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card p-6">
          <h1 className="text-xl font-semibold mb-2">无法加载文章</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{error}</p>
          <div className="mt-4">
            <Link className="btn btn-ghost" href="/posts">返回文章列表</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
        <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>作者：{post.authorUsername}</span>
          <span className="mx-1">·</span>
          <span>{new Date(post.createdAt).toLocaleString()}</span>
          <PostDetailPersona
            authorId={post.authorId}
            authorUsername={post.authorUsername}
            authorPersonaEnabled={post.authorPersonaEnabled}
            postId={post.id}
            postTitle={post.title}
          />
        </div>
      </header>

      <div className="card p-6">
        <pre className="whitespace-pre-wrap break-words text-sm leading-6">{post.contentMarkdown}</pre>
      </div>

      <div className="mt-6">
        <Link className="btn btn-ghost" href="/posts">← 返回文章列表</Link>
      </div>

      <CommentSection postId={post.id} />
    </article>
  );
}

