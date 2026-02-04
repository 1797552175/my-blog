'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, BookOpenIcon, TrashIcon } from '@heroicons/react/24/outline';
import { list, getById, deleteById } from '../services/inspirations';

const PAGE_SIZE = 10;

export default function InspirationBrowser() {
  const [open, setOpen] = useState(true);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await list(page, PAGE_SIZE);
        if (!cancelled) {
          setItems(res?.content ?? []);
          setTotalPages(res?.totalPages ?? 0);
          setTotalElements(res?.totalElements ?? 0);
        }
      } catch (err) {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page]);

  async function loadDetail(id) {
    if (detailId === id && detail) return;
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const data = await getById(id);
      setDetail(data);
    } catch (err) {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteById(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (detailId === id) {
        setDetailId(null);
        setDetail(null);
      }
    } catch (err) {
      alert(err?.data?.error ?? err?.message ?? '删除失败');
    } finally {
      setDeleteConfirmId(null);
    }
  }

  function formatDate(instant) {
    if (!instant) return '';
    const d = new Date(instant);
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <BookOpenIcon className="h-5 w-5 text-indigo-500" />
          浏览灵感
        </span>
        {open ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
      </button>
      {open && (
        <div className="border-t border-zinc-200 dark:border-zinc-700 p-4">
          {loading ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">加载中…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">暂无灵感，去首页用「AI 找灵感」保存一条吧。</p>
          ) : (
            <div className="space-y-2">
              <ul className="space-y-1 max-h-[280px] overflow-y-auto">
                {items.map((item) => (
                  <li key={item.id} className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => loadDetail(item.id)}
                      className={`flex-1 min-w-0 text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                        detailId === item.id
                          ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-100'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <span className="font-medium block truncate">{item.title || '（无标题）'}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(item.createdAt)}</span>
                    </button>
                    {deleteConfirmId === item.id ? (
                      <span className="flex gap-0.5 shrink-0 text-xs">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          确认
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-zinc-500 px-1.5 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          取消
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(item.id);
                        }}
                        className="shrink-0 p-1 rounded text-zinc-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100"
                        aria-label="删除"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    共 {totalElements} 条
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn btn-ghost py-1 px-2 text-xs"
                      disabled={page <= 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      上一页
                    </button>
                    <span className="text-xs self-center text-zinc-500 dark:text-zinc-400">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost py-1 px-2 text-xs"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
              {detailId && (
                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                  {detailLoading ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">加载详情…</p>
                  ) : detail ? (
                    <div className="space-y-2 max-h-[240px] overflow-y-auto rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3 text-sm">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {detail.title || '（无标题）'} · {formatDate(detail.createdAt)}
                      </p>
                      {(detail.messages || []).map((m, i) => (
                        <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">
                            {m.role === 'user' ? '你' : 'AI'}
                          </span>
                          <div className="whitespace-pre-wrap break-words text-zinc-700 dark:text-zinc-300">
                            {m.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
