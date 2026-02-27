'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getStorySeedById } from '../../../../../services/storySeeds';
import { listPullRequests, updatePullRequestStatus } from '../../../../../services/readerForks';
import { isAuthed } from '../../../../../services/auth';
import { useToast } from '../../../../../components/Toast';

export default function StoryPullRequestsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const { addToast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [seed, setSeed] = useState(null);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isAuthed());
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const [s, list] = await Promise.all([
        getStorySeedById(id).catch(() => null),
        listPullRequests(id).catch(() => []),
      ]);
      setSeed(s);
      setPrs(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isMounted) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/me/stories/' + id + '/pull-requests');
      return;
    }
    load();
  }, [router, id, load, isAuthenticated, isMounted]);

  async function handleUpdateStatus(prId, status) {
    try {
      await updatePullRequestStatus(prId, { status });
      addToast(status === 'merged' ? '已合并' : '已关闭');
      await load();
    } catch (err) {
      setError(err?.message ?? '操作失败');
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3" />
          <div className="h-32 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6" style={{ width: '80%' }}>
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/me/stories/${id}/edit`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          ← {seed?.title ?? '故事'}
        </Link>
        <Link href={`/me/stories/${id}/branches`} className="text-sm text-zinc-500 hover:underline">分支</Link>
        <Link href={`/me/stories/${id}/settings`} className="text-sm text-zinc-500 hover:underline">设定</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">收到的 Pull Request</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        读者可将自己的分支提交给你，你可选择合并或关闭。
      </p>

      {error ? (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      ) : null}

      <div className="card divide-y divide-zinc-200 dark:divide-zinc-800">
        {prs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 dark:text-zinc-400">
            暂无 Pull Request
          </div>
        ) : (
          prs.map((pr) => (
            <div key={pr.id} className="p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                {pr.title || `PR #${pr.id}`}
              </h3>
              {pr.description ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{pr.description}</p>
              ) : null}
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                状态：{pr.status} · fork #{pr.forkId}
                {pr.fromCommitId ? ` · 从章节 #${pr.fromCommitId}` : ''}
              </p>
              {pr.status === 'open' ? (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm bg-green-600 text-white hover:bg-green-700"
                    onClick={() => handleUpdateStatus(pr.id, 'merged')}
                  >
                    合并
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleUpdateStatus(pr.id, 'closed')}
                  >
                    关闭
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
