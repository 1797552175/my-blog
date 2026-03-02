'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAuthed } from '../../../services/auth';
import { listMyForks, deleteFork } from '../../../services/readerForks';
import { LoadingSkeleton } from '../../../lib/loading';
import { useToast } from '../../../components/Toast';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { BookOpenIcon, ChevronRightIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function MyReadsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [forks, setForks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null, forkId: null });

  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isAuthed());
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/me/reads');
      return;
    }
    loadMyForks();
  }, [router, isAuthenticated, isMounted]);

  const loadMyForks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMyForks();
      setForks(data || []);
    } catch (err) {
      setError(err?.message || '加载阅读记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (forkId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setConfirmDialog({
      open: true,
      title: '移除小说',
      message: '确定要移除这本小说吗？此操作不可恢复。',
      forkId: forkId,
      onConfirm: async () => {
        setDeletingId(forkId);
        try {
          await deleteFork(forkId);
          setForks(forks.filter(f => f.id !== forkId));
          addToast('移除成功', 'success');
        } catch (err) {
          addToast(err?.message || '移除失败', 'error');
        } finally {
          setDeletingId(null);
          setConfirmDialog({ open: false, title: '', message: '', onConfirm: null, forkId: null });
        }
      }
    });
  };

  if (!isMounted || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 面包屑 */}
        <nav className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              首页
            </Link>
            <ChevronRightIcon className="h-4 w-4" />
            <span className="text-gray-800 dark:text-gray-200 font-medium">我的阅读</span>
          </div>
        </nav>

        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">
            我的阅读
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            继续阅读你添加到阅读列表的小说，AI 会根据你的选择续写下一章
          </p>
          <div className="mt-4 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              <strong>阅读流程：</strong>在小说库中点击"添加到我的阅读"按钮 → 进入阅读页面 → 在分支点选择选项 → AI 根据你的选择生成新章节
            </p>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {error}
            <button 
              onClick={loadMyForks}
              className="ml-2 underline hover:no-underline"
            >
              重试
            </button>
          </div>
        )}

        {/* 加载中 */}
        {loading && (
          <div className="space-y-4">
            <LoadingSkeleton lines={3} />
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && forks.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <BookOpenIcon className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
              还没有阅读记录
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              去小说库选择互动小说，体验 AI 续写的乐趣吧
            </p>
            <Link 
              href="/stories?filter=interactive"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
            >
              去选小说
              <ChevronRightIcon className="h-5 w-5" />
            </Link>
          </div>
        )}

        {/* 阅读列表 */}
        {!loading && !error && forks.length > 0 && (
          <div className="space-y-4">
            {forks.map((fork) => (
              <div 
                key={fork.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      {fork.storySeedTitle || '未知小说'}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        上次阅读：{fork.updatedAt ? new Date(fork.updatedAt).toLocaleDateString('zh-CN') : '未知'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => handleDelete(fork.id, e)}
                      disabled={deletingId === fork.id}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      title="移除"
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">移除</span>
                    </button>
                    <Link
                      href={`/read/${fork.id}`}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
                    >
                      继续阅读
                      <ChevronRightIcon className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 底部提示 */}
        {!loading && forks.length > 0 && (
          <div className="mt-8 text-center">
            <Link 
              href="/stories?filter=interactive"
              className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
            >
              发现更多互动小说 →
            </Link>
          </div>
        )}

        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="确认移除"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog({ open: false, title: '', message: '', onConfirm: null, forkId: null })}
        />
      </div>
    </div>
  );
}
