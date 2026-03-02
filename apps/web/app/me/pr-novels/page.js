'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAuthed } from '../../../services/auth';
import { listMyPrNovels, listMySubmissions, listReceivedSubmissions } from '../../../services/storyPrNovels';
import { useToast } from '../../../components/Toast';
import { deletePrNovel } from '../../../services/storyPrNovels';
import { TrashIcon } from '@heroicons/react/24/outline';

export default function PrNovelsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('my-pr'); // my-pr, my-submissions, received
  const [loading, setLoading] = useState(true);
  const [myPrNovels, setMyPrNovels] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [receivedSubmissions, setReceivedSubmissions] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isAuthed());
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/me/pr-novels');
      return;
    }
    loadData();
  }, [router, isAuthenticated, isMounted, activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'my-pr') {
        const data = await listMyPrNovels();
        setMyPrNovels(Array.isArray(data) ? data : []);
      } else if (activeTab === 'my-submissions') {
        const data = await listMySubmissions();
        setMySubmissions(Array.isArray(data) ? data : []);
      } else if (activeTab === 'received') {
        const data = await listReceivedSubmissions();
        setReceivedSubmissions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('加载失败:', err);
      addToast(err?.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(novelId) {
    if (!confirm('确定要删除这个分支小说吗？此操作不可恢复。')) return;
    
    setDeletingId(novelId);
    try {
      await deletePrNovel(novelId);
      addToast('已删除');
      setMyPrNovels(myPrNovels.filter(n => n.id !== novelId));
    } catch (err) {
      addToast(err?.message ?? '删除失败');
    } finally {
      setDeletingId(null);
    }
  }

  function getStatusBadge(status) {
    const statusMap = {
      'draft': { label: '草稿', className: 'bg-gray-100 text-gray-700' },
      'submitted': { label: '已提交', className: 'bg-yellow-100 text-yellow-700' },
      'approved': { label: '已通过', className: 'bg-green-100 text-green-700' },
      'rejected': { label: '已拒绝', className: 'bg-red-100 text-red-700' },
      'pending': { label: '待审核', className: 'bg-yellow-100 text-yellow-700' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  }

  if (!isMounted || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 面包屑 */}
        <nav className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              首页
            </Link>
            <span>/</span>
            <span className="text-gray-800 dark:text-gray-200 font-medium">我的PR</span>
          </div>
        </nav>

        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">
            我的PR
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            管理你拉取的分支小说和提交的审核请求
          </p>
        </div>

        {/* Tab 切换 */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('my-pr')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'my-pr'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              我拉起的PR
            </button>
            <button
              onClick={() => setActiveTab('my-submissions')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'my-submissions'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              我提交的PR
            </button>
            <button
              onClick={() => setActiveTab('received')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'received'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              收到的PR
            </button>
          </nav>
        </div>

        {/* 内容区域 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 我拉起的PR */}
            {activeTab === 'my-pr' && (
              <>
                {myPrNovels.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <div className="mb-4">
                      <svg className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">暂无分支小说</h3>
                    <p className="mb-6 max-w-md mx-auto text-sm text-gray-600 dark:text-gray-400">
                      从其他小说创建分支，添加你自己的创意和情节
                    </p>
                    <Link href="/stories" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors">
                      去小说库
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                ) : (
                  myPrNovels.map((novel) => (
                    <div
                      key={novel.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                              {novel.title}
                            </h3>
                            {getStatusBadge(novel.status)}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            原小说：
                            <Link
                              href={`/stories/${novel.storySlug}`}
                              className="text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              {novel.storyTitle}
                            </Link>
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            从第 {novel.fromChapterSortOrder} 章开始 · {novel.chapterCount} 章 ·
                            创建于 {new Date(novel.createdAt).toLocaleDateString('zh-CN')}
                          </p>
                          {novel.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                              {novel.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {novel.status === 'draft' && (
                            <>
                              <Link
                                href={`/me/pr-novels/${novel.id}/edit`}
                                className="btn btn-sm btn-primary"
                              >
                                编辑
                              </Link>
                              <button
                                onClick={() => handleDelete(novel.id)}
                                disabled={deletingId === novel.id}
                                className="inline-flex items-center justify-center px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                title="删除"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <Link
                            href={`/me/pr-novels/${novel.id}`}
                            className="btn btn-sm btn-ghost"
                          >
                            查看
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* 我提交的PR */}
            {activeTab === 'my-submissions' && (
              <>
                {mySubmissions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <div className="mb-4">
                      <svg className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">暂无提交的PR</h3>
                    <p className="mb-6 max-w-md mx-auto text-sm text-gray-600 dark:text-gray-400">
                      完成你的分支小说后，提交给原作者审核
                    </p>
                    <Link href="/me/pr-novels" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                      查看我的分支
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                ) : (
                  mySubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                              {submission.title || submission.prNovelTitle}
                            </h3>
                            {getStatusBadge(submission.status)}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            目标小说：
                            <Link
                              href={`/stories/${submission.storySlug}`}
                              className="text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              {submission.storyTitle}
                            </Link>
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            提交于 {new Date(submission.submittedAt).toLocaleDateString('zh-CN')}
                          </p>
                          {submission.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                              {submission.description}
                            </p>
                          )}
                          {submission.reviewComment && (
                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                审核意见（{submission.reviewedByUsername}）：
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {submission.reviewComment}
                              </p>
                            </div>
                          )}
                        </div>
                        <Link
                          href={`/me/pr-novels/${submission.prNovelId}`}
                          className="btn btn-sm btn-ghost"
                        >
                          查看
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* 收到的PR */}
            {activeTab === 'received' && (
              <>
                {receivedSubmissions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <div className="mb-4">
                      <svg className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">暂无收到的PR</h3>
                    <p className="mb-6 max-w-md mx-auto text-sm text-gray-600 dark:text-gray-400">
                      其他用户可以从你的小说创建分支并提交审核
                    </p>
                    <Link href="/me/stories" className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors">
                      查看我的小说
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                ) : (
                  receivedSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                              {submission.title || submission.prNovelTitle}
                            </h3>
                            {getStatusBadge(submission.status)}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            提交者：{submission.submitterUsername}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            目标小说：
                            <Link
                              href={`/stories/${submission.storySlug}`}
                              className="text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              {submission.storyTitle}
                            </Link>
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            提交于 {new Date(submission.submittedAt).toLocaleDateString('zh-CN')}
                          </p>
                          {submission.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                              {submission.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {submission.status === 'pending' && (
                            <>
                              <button
                                onClick={() => {/* TODO: 打开审核弹窗 */}}
                                className="btn btn-sm btn-primary"
                              >
                                审核
                              </button>
                            </>
                          )}
                          <Link
                            href={`/me/pr-novels/${submission.prNovelId}`}
                            className="btn btn-sm btn-ghost"
                          >
                            查看
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
