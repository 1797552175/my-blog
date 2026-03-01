'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { isAuthed } from '../../../../../services/auth';
import { getPrNovel, listPrChapters, updatePrNovel, addPrChapter, updatePrChapter, deletePrChapter } from '../../../../../services/storyPrNovels';
import { useToast } from '../../../../../components/Toast';

export default function PrNovelEditPage() {
  const router = useRouter();
  const params = useParams();
  const prNovelId = params?.prNovelId;
  const { addToast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prNovel, setPrNovel] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterSortOrder, setNewChapterSortOrder] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingChapterId, setDeletingChapterId] = useState(null);

  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isAuthed());
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/me/pr-novels/' + prNovelId + '/edit');
      return;
    }
    loadData();
  }, [router, prNovelId, isAuthenticated, isMounted]);

  async function loadData() {
    setLoading(true);
    try {
      const [novelData, chaptersData] = await Promise.all([
        getPrNovel(prNovelId),
        listPrChapters(prNovelId),
      ]);
      setPrNovel(novelData);
      const ch = Array.isArray(chaptersData) ? chaptersData : [];
      ch.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(ch);
      setNewChapterSortOrder(ch.length + 1);
      if (ch.length > 0 && !selectedChapterId) {
        setSelectedChapterId(ch[0].id);
        setChapterTitle(ch[0].title || '');
        setChapterContent(ch[0].contentMarkdown || '');
      }
    } catch (err) {
      addToast(err?.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectChapter(chapterId) {
    // 保存当前章节
    if (selectedChapterId && selectedChapterId !== chapterId) {
      await handleSaveChapter(selectedChapterId);
    }
    setSelectedChapterId(chapterId);
    const ch = chapters.find(c => c.id === chapterId);
    if (ch) {
      setChapterTitle(ch.title || '');
      setChapterContent(ch.contentMarkdown || '');
    }
  }

  async function handleSaveChapter(chapterId = selectedChapterId) {
    if (!chapterId) return;
    setSaving(true);
    try {
      const ch = chapters.find(c => c.id === chapterId);
      if (!ch) return;
      
      await updatePrChapter(prNovelId, chapterId, {
        title: chapterTitle,
        contentMarkdown: chapterContent,
        sortOrder: ch.sortOrder,
      });
      
      // 刷新章节列表
      const chaptersData = await listPrChapters(prNovelId);
      const chList = Array.isArray(chaptersData) ? chaptersData : [];
      chList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(chList);
      
      addToast('章节已保存');
    } catch (err) {
      addToast(err?.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateChapter() {
    if (!newChapterTitle.trim()) {
      addToast('请输入章节标题');
      return;
    }
    setSaving(true);
    try {
      await addPrChapter(prNovelId, {
        title: newChapterTitle.trim(),
        sortOrder: newChapterSortOrder,
        contentMarkdown: '',
      });
      setShowAddModal(false);
      setNewChapterTitle('');
      await loadData();
      addToast('章节已创建');
    } catch (err) {
      addToast(err?.message ?? '创建失败');
    } finally {
      setSaving(false);
    }
  }

  function openDeleteModal(chapterId) {
    setDeletingChapterId(chapterId);
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
    setDeletingChapterId(null);
  }

  async function confirmDeleteChapter() {
    if (!deletingChapterId) return;
    try {
      await deletePrChapter(prNovelId, deletingChapterId);
      if (selectedChapterId === deletingChapterId) {
        setSelectedChapterId(null);
        setChapterTitle('');
        setChapterContent('');
      }
      await loadData();
      addToast('章节已删除');
    } catch (err) {
      addToast(err?.message ?? '删除失败');
    } finally {
      closeDeleteModal();
    }
  }

  const selectedChapter = chapters.find(ch => ch.id === selectedChapterId);

  if (!isMounted || !isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!prNovel) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">分支小说不存在</p>
      </div>
    );
  }

  if (prNovel.status !== 'draft' && prNovel.status !== 'rejected') {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">该分支小说已提交或已通过，无法编辑</p>
        <Link href={`/me/pr-novels/${prNovelId}`} className="btn btn-primary mt-4">
          查看详情
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 面包屑和标题 */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400">
            首页
          </Link>
          <span>/</span>
          <Link href="/me/pr-novels" className="hover:text-indigo-600 dark:hover:text-indigo-400">
            我的PR
          </Link>
          <span>/</span>
          <span className="text-gray-800 dark:text-gray-200 font-medium">编辑</span>
        </nav>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            {prNovel.title}
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          原小说：{prNovel.storyTitle} · 从第 {prNovel.fromChapterSortOrder} 章开始分支
        </p>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧章节列表 */}
        <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full btn btn-primary btn-sm"
            >
              + 添加章节
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chapters.map((chapter, index) => (
              <button
                key={chapter.id}
                onClick={() => handleSelectChapter(chapter.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedChapterId === chapter.id
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">第{index + 1}章</span>
                  <span className="truncate flex-1">{chapter.title}</span>
                </div>
              </button>
            ))}
            {chapters.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">
                暂无章节
              </p>
            )}
          </div>
        </div>

        {/* 右侧编辑器 */}
        <div className="flex-1 flex flex-col">
          {selectedChapter ? (
            <>
              {/* 编辑器头部 */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  className="flex-1 bg-transparent border-none focus:outline-none text-lg font-medium text-gray-800 dark:text-gray-200"
                  placeholder="章节标题"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSaveChapter()}
                    disabled={saving}
                    className="btn btn-primary btn-sm"
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                  <button
                    onClick={() => openDeleteModal(selectedChapterId)}
                    className="btn btn-ghost btn-sm text-red-600"
                  >
                    删除
                  </button>
                </div>
              </div>

              {/* 编辑器主体 */}
              <div className="flex-1 flex overflow-hidden">
                <textarea
                  value={chapterContent}
                  onChange={(e) => setChapterContent(e.target.value)}
                  className="flex-1 p-4 resize-none bg-transparent border-none focus:outline-none text-gray-700 dark:text-gray-300 leading-relaxed"
                  placeholder="开始写作..."
                />
              </div>

              {/* 底部信息 */}
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400">
                {chapterContent.length} 字符
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              选择左侧章节开始编辑
            </div>
          )}
        </div>
      </div>

      {/* 添加章节弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">添加章节</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  章节序号
                </label>
                <input
                  type="number"
                  value={newChapterSortOrder}
                  onChange={(e) => setNewChapterSortOrder(parseInt(e.target.value) || 1)}
                  className="input w-full"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  章节标题
                </label>
                <input
                  type="text"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  className="input w-full"
                  placeholder="请输入章节标题"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateChapter}
                disabled={saving}
                className="btn btn-primary flex-1"
              >
                {saving ? '创建中...' : '创建'}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-ghost"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除章节确认弹窗 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 transform transition-all">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                删除章节
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                确定要删除这个章节吗？此操作不可恢复，章节内容将被永久删除。
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={closeDeleteModal}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={confirmDeleteChapter}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? '删除中...' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
