'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createForkBySlug } from '../services/readerForks';

/**
 * 故事详情页上的「开始阅读」区域：从开头 或 从第 N 章续写
 */
export default function StartReadFromChapter({ slug, chapters = [], isInteractive }) {
  const router = useRouter();
  const [starting, setStarting] = useState(null); // fromChapterSortOrder 正在请求时

  async function startFromChapter(fromChapterSortOrder) {
    if (starting != null) return;
    setStarting(fromChapterSortOrder);
    try {
      const fork = await createForkBySlug(slug, fromChapterSortOrder ?? undefined);
      router.push('/read/' + fork.id);
    } catch (err) {
      setStarting(null);
      alert(err?.message ?? '开始阅读失败');
    }
  }

  const hasChapters = Array.isArray(chapters) && chapters.length > 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">开始阅读</h2>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => startFromChapter(null)}
          disabled={starting !== null}
          className="btn bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30 px-6 py-3"
        >
          {starting === null ? '从开头续写' : '正在进入…'}
        </button>
        {hasChapters && chapters.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => startFromChapter(ch.sortOrder)}
            disabled={starting !== null}
            className="btn bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 px-4 py-2"
          >
            {starting === ch.sortOrder ? '正在进入…' : `从第 ${ch.sortOrder} 章续写`}
          </button>
        ))}
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        选择从开头或某一章开始，AI 将在后续分支点为你续写专属剧情。
      </p>
    </div>
  );
}
