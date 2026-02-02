'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { listMyPosts, deletePost } from '../../../services/posts';
import { isAuthed } from '../../../services/auth';

export default function MyPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await listMyPosts({ page: 0, size: 20 });
      setPosts(res.content || []);
    } catch (err) {
      setError(err?.data?.error || err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthed()) {
      router.replace('/login?next=/me/posts');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function onDelete(id) {
    if (!confirm('确定要删除这篇文章吗？')) return;
    try {
      await deletePost(id);
      await load();
    } catch (err) {
      alert(err?.data?.error || err?.message || '删除失败');
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">我的文章</h1>
        <Link className="btn" href="/write">
          写文章
        </Link>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {String(error)}
        </div>
      ) : null}

      <div className="card">
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {loading ? (
            <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">加载中…</div>
          ) : posts.length === 0 ? (
            <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">还没有文章，去写一篇吧。</div>
          ) : (
            posts.map((p) => (
              <div key={p.id} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link className="font-medium text-primary-600 hover:underline truncate" href={`/posts/${p.slug}`}>
                      {p.title}
                    </Link>
                    {!p.published ? (
                      <span className="text-xs rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        草稿
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    更新于 {new Date(p.updatedAt || p.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button className="btn btn-ghost" onClick={() => onDelete(p.id)}>
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

