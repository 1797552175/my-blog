'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { isAuthed } from '../../../../services/auth';
import { getPrNovel, listPrChapters, deletePrNovel, submitPr } from '../../../../services/storyPrNovels';
import { useToast } from '../../../../components/Toast';

export default function PrNovelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const prNovelId = params?.prNovelId;
  const { addToast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitDescription, setSubmitDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isAuthed());
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/me/pr-novels/' + prNovelId);
      return;
    }
    loadData();
  }, [router, prNovelId, isAuthenticated, isMounted]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemData, chaptersData] = await Promise.all([
        getPrNovel(prNovelId),
        listPrChapters(prNovelId).catch(() => []),
      ]);
      setData(itemData);
      const ch = Array.isArray(chaptersData) ? chaptersData : [];
      ch.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(ch);
    } catch (err) {
      addToast(err?.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  }, [prNovelId, addToast]);

  const handleDelete = useCallback(async () => {
    if (!confirm('确定要删除这个分支小说吗？此操作不可恢复。')) return;
    try {
      await deletePrNovel(prNovelId);
      addToast('已删除');
      router.push('/me/pr-novels');
    } catch (err) {
      addToast(err?.message ?? '删除失败');
    }
  }, [prNovelId, addToast, router]);

  const handleSubmit = useCallback(async () => {
    if (!submitTitle.trim()) {
      addToast('请输入提交标题');
      return;
    }
    setSubmitting(true);
    try {
      await submitPr({
        prNovelId: Number(prNovelId),
        title: submitTitle.trim(),
        description: submitDescription.trim() || null,
      });
      addToast('已提交审核');
      setShowSubmitModal(false);
      loadData();
    } catch (err) {
      addToast(err?.message ?? '提交失败');
    } finally {
      setSubmitting(false);
    }
  }, [prNovelId, submitTitle, submitDescription, addToast, loadData]);

  function getStatusBadge(status) {
    const statusMap = {
      'draft': { label: '草稿', className: 'bg-gray-100 text-gray-700' },
      'submitted': { label: '已提交', className: 'bg-yellow-100 text-yellow-700' },
      'approved': { label: '已通过', className: 'bg-green-100 text-green-700' },
      'rejected': { label: '已拒绝', className: 'bg-red-100 text-red-700' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  }

  const currentChapter = chapters[currentChapterIndex];

  if (!isMounted || !isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">内容不存在</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 面包屑 */}
      <nav className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400">
            首页
          </Link>
          <span>/</span>
          <Link href="/me/pr-novels" className="hover:text-indigo-600 dark:hover:text-indigo-400">
            我的PR
          </Link>
          <span>/</span>
          <span className="text-gray-800 dark:text-gray-200 font-medium">详情</span>
        </div>
      </nav>

      {/* 标题区域 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            {data.title}
          </h1>
          {getStatusBadge(data.status)}
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          原小说：
          <Link
            href={`/stories/${data.storySlug}`}
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {data.storyTitle}
          </Link>
          {' · '}从第 {data.fromChapterSortOrder} 章开始分支
        </p>
        {data.description && (
          <p className="text-gray-600 dark:text-gray-400 mt-2">{data.description}</p>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {data.status === 'draft' && (
          <>
            <Link href={`/me/pr-novels/${prNovelId}/edit`} className="btn btn-primary">
              编辑
            </Link>
            <button onClick={() => setShowSubmitModal(true)} className="btn btn-ghost">
              提交审核
            </button>
            <button onClick={handleDelete} className="btn btn-ghost text-red-600 dark:text-red-400">
              删除
            </button>
          </>
        )}
        {data.status === 'rejected' && (
          <Link href={`/me/pr-novels/${prNovelId}/edit`} className="btn btn-primary">
            修改后重新提交
          </Link>
        )}
      </div>

      {/* 章节导航 */}
      {chapters.length > 0 && (
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            {chapters.map((ch, index) => (
              <button
                key={ch.id}
                onClick={() => setCurrentChapterIndex(index)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  currentChapterIndex === index
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {ch.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 章节内容 */}
      {currentChapter ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            {currentChapter.title}
          </h2>
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown>
              {currentChapter.contentMarkdown || '*暂无内容*'}
            </ReactMarkdown>
          </div>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            字数：{currentChapter.wordCount || 0}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500 dark:text-gray-400">
          暂无章节内容
        </div>
      )}

      {/* 提交审核弹窗 */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSubmitModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">提交审核</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  标题 *
                </label>
                <input
                  type="text"
                  value={submitTitle}
                  onChange={(e) => setSubmitTitle(e.target.value)}
                  className="input w-full"
                  placeholder="例如：续写建议：第X章后的剧情"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  说明（可选）
                </label>
                <textarea
                  value={submitDescription}
                  onChange={(e) => setSubmitDescription(e.target.value)}
                  className="input w-full min-h-[100px]"
                  placeholder="描述你的续写思路和亮点..."
                  maxLength={2000}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn btn-primary flex-1"
              >
                {submitting ? '提交中...' : '提交'}
              </button>
              <button onClick={() => setShowSubmitModal(false)} className="btn btn-ghost">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
