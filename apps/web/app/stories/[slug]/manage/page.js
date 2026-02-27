'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getStoryBySlug, listChaptersBySlug, createChapter, updateChapter, deleteChapter } from '../../../../services/stories';

export default function ChapterManagePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug;

  const [story, setStory] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 编辑状态
  const [editingChapter, setEditingChapter] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });

  // 新增状态
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ title: '', content: '', sortOrder: 1 });

  useEffect(() => {
    if (!slug) return;
    loadData();
  }, [slug]);

  async function loadData() {
    try {
      setLoading(true);
      const [storyData, chaptersData] = await Promise.all([
        getStoryBySlug(slug),
        listChaptersBySlug(slug)
      ]);
      setStory(storyData);
      setChapters(chaptersData || []);
    } catch (err) {
      setError('加载失败：' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(chapter) {
    setEditingChapter(chapter);
    setEditForm({
      title: chapter.title,
      content: chapter.content
    });
  }

  function cancelEdit() {
    setEditingChapter(null);
    setEditForm({ title: '', content: '' });
  }

  async function saveEdit() {
    if (!editForm.title.trim()) {
      alert('请输入章节标题');
      return;
    }
    try {
      await updateChapter(story.id, editingChapter.id, {
        title: editForm.title,
        content: editForm.content
      });
      await loadData();
      cancelEdit();
    } catch (err) {
      alert('保存失败：' + err.message);
    }
  }

  async function handleDelete(chapter) {
    if (!confirm(`确定要删除章节「${chapter.title}」吗？`)) return;
    try {
      await deleteChapter(story.id, chapter.id);
      await loadData();
    } catch (err) {
      alert('删除失败：' + err.message);
    }
  }

  function startAdd() {
    setShowAddForm(true);
    setAddForm({
      title: '',
      content: '',
      sortOrder: chapters.length + 1
    });
  }

  function cancelAdd() {
    setShowAddForm(false);
    setAddForm({ title: '', content: '', sortOrder: 1 });
  }

  async function saveAdd() {
    if (!addForm.title.trim()) {
      alert('请输入章节标题');
      return;
    }
    try {
      await createChapter(story.id, {
        title: addForm.title,
        content: addForm.content,
        sortOrder: addForm.sortOrder
      });
      await loadData();
      cancelAdd();
    } catch (err) {
      alert('创建失败：' + err.message);
    }
  }

  async function moveChapter(chapter, direction) {
    const currentIndex = chapters.findIndex(c => c.id === chapter.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= chapters.length) return;

    const targetChapter = chapters[newIndex];

    try {
      // 交换排序
      await updateChapter(story.id, chapter.id, { sortOrder: targetChapter.sortOrder });
      await updateChapter(story.id, targetChapter.id, { sortOrder: chapter.sortOrder });
      await loadData();
    } catch (err) {
      alert('移动失败：' + err.message);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">小说不存在</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link href={`/stories/${slug}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          ← 返回小说详情
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">章节管理：{story.title}</h1>
        <button
          onClick={startAdd}
          className="btn bg-indigo-600 text-white hover:bg-indigo-700"
        >
          + 新增章节
        </button>
      </div>

      {/* 新增章节表单 */}
      {showAddForm && (
        <div className="mb-6 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
          <h3 className="font-semibold mb-3">新增章节</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">章节标题</label>
              <input
                type="text"
                value={addForm.title}
                onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                placeholder="输入章节标题"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">章节序号</label>
              <input
                type="number"
                value={addForm.sortOrder}
                onChange={(e) => setAddForm({ ...addForm, sortOrder: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">章节内容</label>
              <textarea
                value={addForm.content}
                onChange={(e) => setAddForm({ ...addForm, content: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 h-40"
                placeholder="输入章节内容（支持 Markdown）"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveAdd}
                className="btn bg-green-600 text-white hover:bg-green-700"
              >
                保存
              </button>
              <button
                onClick={cancelAdd}
                className="btn bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 章节列表 */}
      <div className="space-y-3">
        {chapters.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 border border-dashed rounded-lg">
            暂无章节，点击上方按钮添加
          </div>
        ) : (
          chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
            >
              {editingChapter?.id === chapter.id ? (
                // 编辑模式
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">章节标题</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">章节内容</label>
                    <textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 h-40"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="btn bg-green-600 text-white hover:bg-green-700 text-sm"
                    >
                      保存
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="btn bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 text-sm"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                // 展示模式
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400 dark:text-zinc-500 w-8">第{chapter.sortOrder}章</span>
                      <h3 className="font-semibold">{chapter.title}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveChapter(chapter, 'up')}
                        disabled={index === 0}
                        className="p-1 text-zinc-400 hover:text-zinc-600 disabled:opacity-30"
                        title="上移"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveChapter(chapter, 'down')}
                        disabled={index === chapters.length - 1}
                        className="p-1 text-zinc-400 hover:text-zinc-600 disabled:opacity-30"
                        title="下移"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => startEdit(chapter)}
                        className="p-1 text-indigo-600 hover:text-indigo-800 ml-2"
                        title="编辑"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(chapter)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {chapter.content?.substring(0, 100) || '无内容'}...
                  </p>
                  <div className="mt-2 text-xs text-zinc-400">
                    创建于 {new Date(chapter.createdAt).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
