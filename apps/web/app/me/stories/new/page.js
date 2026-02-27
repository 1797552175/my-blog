'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createStorySeed } from '../../../../services/storySeeds';
import { isAuthed } from '../../../../services/auth';
import { useToast } from '../../../../components/Toast';

export default function NewStorySeedPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [title, setTitle] = useState('');
  const [openingMarkdown, setOpeningMarkdown] = useState('');
  const [styleParams, setStyleParams] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isAuthed());
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/me/stories/new');
    }
  }, [router, isAuthenticated, isMounted]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await createStorySeed({
        title: title.trim(),
        openingMarkdown: openingMarkdown.trim(),
        styleParams: styleParams.trim() || null,
        licenseType: licenseType.trim() || null,
        published,
      });
      addToast('创建成功');
      router.push(`/me/stories/${res.id}/edit`);
    } catch (err) {
      setError(err?.message ?? '创建失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6" style={{ width: '80%' }}>
      <div className="mb-6">
        <Link href="/me/stories" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          ← 我的故事种子
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">创建故事种子</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        ) : null}

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input w-full"
            placeholder="故事标题"
            maxLength={200}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">开头正文（Markdown，建议 500～2000 字）</label>
          <textarea
            value={openingMarkdown}
            onChange={(e) => setOpeningMarkdown(e.target.value)}
            className="input w-full min-h-[200px] font-mono text-sm"
            placeholder="写下故事的开头…"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">风格参数（可选）</label>
          <input
            type="text"
            value={styleParams}
            onChange={(e) => setStyleParams(e.target.value)}
            className="input w-full"
            placeholder="如：悬疑、甜宠、热血、治愈、节奏快"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">许可类型（可选）</label>
          <input
            type="text"
            value={licenseType}
            onChange={(e) => setLicenseType(e.target.value)}
            className="input w-full"
            placeholder="如：all_rights_reserved、allow_derivative"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="published"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="rounded border-zinc-300 dark:border-zinc-600"
          />
          <label htmlFor="published" className="text-sm text-zinc-700 dark:text-zinc-300">发布后出现在故事库</label>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="submit" className="btn bg-indigo-600 text-white hover:bg-indigo-700" disabled={loading}>
            {loading ? '创建中…' : '创建'}
          </button>
          <Link href="/me/stories" className="btn btn-ghost">取消</Link>
        </div>
      </form>
    </div>
  );
}
