'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStoryEditor } from '../hooks/useStoryEditor';
import { useToast } from './Toast';

/**
 * 通用的故事编辑器组件
 * 支持普通小说和 PR Novel 的编辑
 */
export default function StoryEditor({
  mode, // 'story' | 'prNovel'
  id,
  api,
  title: initialTitle,
  breadcrumbs,
  showAiPanel = false,
  AiPanelComponent,
  extraTabs = [],
  renderExtraInfo,
}) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('chapters');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterSortOrder, setNewChapterSortOrder] = useState(1);

  const {
    loading,
    saving,
    data,
    chapters,
    selectedChapterId,
    chapterTitle,
    chapterContent,
    error,
    contentTextareaRef,
    setChapterTitle,
    setChapterContent,
    load,
    selectChapter,
    saveChapter,
    createChapter,
    deleteChapter,
    updateInfo,
  } = useStoryEditor({
    mode,
    id,
    api,
    onError: (err) => addToast(err?.message ?? '操作失败'),
    onSuccess: (msg) => addToast(msg),
  });

  useEffect(() => {
    if (id) {
      load();
    }
  }, [id, load]);

  useEffect(() => {
    setNewChapterSortOrder(chapters.length + 1);
  }, [chapters.length]);

  const handleSave = async () => {
    await saveChapter();
  };

  const handleCreateChapter = async () => {
    if (!newChapterTitle.trim()) {
      addToast('请输入章节标题');
      return;
    }
    await createChapter({
      title: newChapterTitle.trim(),
      sortOrder: newChapterSortOrder,
      contentMarkdown: '',
    });
    setShowAddModal(false);
    setNewChapterTitle('');
  };

  const handleDelete = async (chapterId) => {
    if (!confirm('确定要删除这个章节吗？')) return;
    await deleteChapter(chapterId);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={load} className="btn btn-primary">重试</button>
        </div>
      </div>
    );
  }

  const selectedChapter = chapters.find(ch => ch.id === selectedChapterId);

  return (
    <div className="h-full flex flex-col">
      {/* 面包屑和标题 */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        {breadcrumbs}
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            {data?.title || initialTitle || '编辑'}
          </h1>
          {renderExtraInfo?.(data)}
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="px-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('chapters')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'chapters'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            章节管理 ({chapters.length})
          </button>
          {extraTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 内容区域 */}
      {activeTab === 'chapters' && (
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
                  onClick={() => selectChapter(chapter.id)}
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
                      onClick={handleSave}
                      disabled={saving}
                      className="btn btn-primary btn-sm"
                    >
                      {saving ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={() => handleDelete(selectedChapterId)}
                      className="btn btn-ghost btn-sm text-red-600"
                    >
                      删除
                    </button>
                  </div>
                </div>

                {/* 编辑器主体 */}
                <div className="flex-1 flex overflow-hidden">
                  <textarea
                    ref={contentTextareaRef}
                    value={chapterContent}
                    onChange={(e) => setChapterContent(e.target.value)}
                    className="flex-1 p-4 resize-none bg-transparent border-none focus:outline-none text-gray-700 dark:text-gray-300 leading-relaxed"
                    placeholder="开始写作..."
                  />
                  {showAiPanel && AiPanelComponent && (
                    <div className="w-80 border-l border-gray-200 dark:border-gray-700">
                      <AiPanelComponent />
                    </div>
                  )}
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
      )}

      {/* 其他 Tab 内容 */}
      {extraTabs.map(tab => (
        activeTab === tab.key && (
          <div key={tab.key} className="flex-1 overflow-auto p-6">
            {tab.content}
          </div>
        )
      ))}

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
    </div>
  );
}
