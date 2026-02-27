'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getStoryById,
} from '../../../../../services/stories';
import {
  createBranchPoint,
  updateBranchPoint,
  deleteBranchPoint,
} from '../../../../../services/storySeeds';
import { isAuthed } from '../../../../../services/auth';
import { useToast } from '../../../../../components/Toast';

export default function BranchesPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const { addToast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [seed, setSeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingBranchPoint, setEditingBranchPoint] = useState(null);
  const [editAnchorText, setEditAnchorText] = useState('');
  const [editOptions, setEditOptions] = useState([]);

  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isAuthed());
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const s = await getStoryById(id);
      setSeed(s);
    } catch (err) {
      setError(err?.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isMounted) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/me/stories/' + id + '/branches');
      return;
    }
    load();
  }, [router, id, load, isAuthenticated, isMounted]);

  async function handleAddBranchPoint() {
    if (!id) return;
    setError(null);
    try {
      const points = seed?.branchPoints ?? [];
      await createBranchPoint(id, {
        sortOrder: points.length + 1,
        anchorText: '',
        options: [
          { label: '选项 A', sortOrder: 1, influenceNotes: '', plotHint: '' }, 
          { label: '选项 B', sortOrder: 2, influenceNotes: '', plotHint: '' }
        ],
      });
      addToast('已添加分支点');
      await load();
    } catch (err) {
      setError(err?.message ?? '添加失败');
    }
  }

  function startEditBranchPoint(bp) {
    setEditingBranchPoint(bp.id);
    setEditAnchorText(bp.anchorText || '');
    setEditOptions((bp.options ?? []).map(opt => ({
      id: opt.id,
      label: opt.label,
      influenceNotes: opt.influenceNotes || '',
      plotHint: opt.plotHint || '',
    })));
  }

  async function handleSaveBranchPoint(bp) {
    if (!id) return;
    setError(null);
    try {
      await updateBranchPoint(id, bp.id, {
        anchorText: editAnchorText,
        options: editOptions.map((opt, index) => ({
          id: opt.id,
          label: opt.label,
          sortOrder: index + 1,
          influenceNotes: opt.influenceNotes,
          plotHint: opt.plotHint,
        })),
      });
      addToast('已保存');
      setEditingBranchPoint(null);
      await load();
    } catch (err) {
      setError(err?.message ?? '保存失败');
    }
  }

  function cancelEditBranchPoint() {
    setEditingBranchPoint(null);
    setEditAnchorText('');
    setEditOptions([]);
  }

  function addOption() {
    setEditOptions([...editOptions, { label: '', influenceNotes: '', plotHint: '' }]);
  }

  function updateOption(index, field, value) {
    const newOptions = [...editOptions];
    newOptions[index][field] = value;
    setEditOptions(newOptions);
  }

  function removeOption(index) {
    if (editOptions.length <= 1) {
      addToast('至少需要一个选项');
      return;
    }
    const newOptions = editOptions.filter((_, i) => i !== index);
    setEditOptions(newOptions);
  }

  async function handleDeleteBranchPoint(branchPointId) {
    if (!confirm('确定删除该分支点及其选项？')) return;
    try {
      await deleteBranchPoint(id, branchPointId);
      addToast('已删除');
      await load();
    } catch (err) {
      setError(err?.message ?? '删除失败');
    }
  }

  if (loading || !seed) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3" />
          <div className="h-32 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
      </div>
    );
  }

  const branchPoints = seed.branchPoints ?? [];

  return (
    <div className="max-w-3xl mx-auto p-6" style={{ width: '80%' }}>
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/me/stories/${id}/edit`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          ← {seed.title}
        </Link>
        <Link href={`/me/stories/${id}/settings`} className="text-sm text-zinc-500 hover:underline">设定</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">分支点与选项</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        读者在阅读到这些节点时可选择不同选项，AI 将根据选项续写。
      </p>

      {error ? (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      ) : null}

      <div className="mb-4">
        <button type="button" className="btn" onClick={handleAddBranchPoint}>
          添加分支点
        </button>
      </div>

      <div className="space-y-6">
        {branchPoints.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl">
            暂无分支点，点击上方「添加分支点」创建。
          </div>
        ) : (
          branchPoints.map((bp, i) => (
            <div key={bp.id} className="card p-4">
              {editingBranchPoint === bp.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      分支点摘要
                    </label>
                    <textarea
                      value={editAnchorText}
                      onChange={(e) => setEditAnchorText(e.target.value)}
                      className="input w-full min-h-[60px] text-sm"
                      placeholder="描述当前剧情节点..."
                      maxLength={500}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      选项设置
                    </label>
                    <div className="space-y-3">
                      {editOptions.map((opt, j) => (
                        <div key={j} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">选项 {j + 1}</span>
                            {editOptions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeOption(j)}
                                className="btn btn-xs btn-ghost text-red-600 dark:text-red-400"
                              >
                                删除
                              </button>
                            )}
                          </div>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={opt.label}
                              onChange={(e) => updateOption(j, 'label', e.target.value)}
                              className="input w-full text-sm"
                              placeholder="选项文案"
                              maxLength={200}
                            />
                            <input
                              type="text"
                              value={opt.plotHint}
                              onChange={(e) => updateOption(j, 'plotHint', e.target.value)}
                              className="input w-full text-sm"
                              placeholder="剧情提示（供读者查看）"
                              maxLength={500}
                            />
                            <textarea
                              value={opt.influenceNotes}
                              onChange={(e) => updateOption(j, 'influenceNotes', e.target.value)}
                              className="input w-full min-h-[60px] text-sm"
                              placeholder="影响描述（供AI使用）"
                              maxLength={1000}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addOption}
                      className="btn btn-sm btn-ghost mt-2"
                    >
                      + 添加选项
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveBranchPoint(bp)}
                      className="btn btn-sm"
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditBranchPoint}
                      className="btn btn-sm btn-ghost"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">第 {i + 1} 处分支点</h3>
                      <button
                        type="button"
                        onClick={() => startEditBranchPoint(bp)}
                        className="btn btn-xs btn-ghost text-indigo-600 dark:text-indigo-400"
                      >
                        编辑
                      </button>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      摘要：{bp.anchorText || '（未填）'}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {(bp.options ?? []).map((opt, j) => (
                        <li key={opt.id} className="p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">选项 {j + 1}：{opt.label}</span>
                            {opt.selectionCount > 0 && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
                                {opt.selectionCount}人选择
                              </span>
                            )}
                          </div>
                          {opt.plotHint ? (
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">
                              💡 {opt.plotHint}
                            </p>
                          ) : null}
                          {opt.influenceNotes ? (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {opt.influenceNotes}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost text-red-600 dark:text-red-400 shrink-0"
                    onClick={() => handleDeleteBranchPoint(bp.id)}
                  >
                    删除
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
