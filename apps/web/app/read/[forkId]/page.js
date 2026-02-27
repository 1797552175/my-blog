'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getStorySeedBySlug } from '../../../services/storySeeds';
import { getFork, listCommits, choose, rollback, createPullRequest, listBookmarks, createBookmark, deleteBookmark, rollbackToBranchPoint } from '../../../services/readerForks';
import { listChaptersBySlug } from '../../../services/stories';
import { isAuthed } from '../../../services/auth';
import { api } from '../../../lib/api';
import { useToast } from '../../../components/Toast';

export default function ReadPage() {
  const router = useRouter();
  const params = useParams();
  const forkId = params?.forkId;
  const { addToast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [fork, setFork] = useState(null);
  const [seed, setSeed] = useState(null);
  const [authorChapters, setAuthorChapters] = useState([]); // 从第 N 章续写时，作者的前 N 章
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(true); // 默认展开章节目录
  const [showPRForm, setShowPRForm] = useState(false);
  const [prTitle, setPRTitle] = useState('');
  const [prDescription, setPRDescription] = useState('');
  const [prSubmitting, setPRSubmitting] = useState(false);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showBookmarkForm, setShowBookmarkForm] = useState(false);
  const [bookmarkName, setBookmarkName] = useState('');
  const [bookmarkNotes, setBookmarkNotes] = useState('');
  const [showRollbackPreview, setShowRollbackPreview] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState(null);
  const [showChapterList, setShowChapterList] = useState(false); // 章节目录显示状态
  const [showLastChapterHint, setShowLastChapterHint] = useState(false); // 是否显示最后一章提示
  const [showAIOptions, setShowAIOptions] = useState(false); // 是否显示AI选项
  const [aiOptions, setAIOptions] = useState([]); // AI生成的选项
  const [generatingAIOptions, setGeneratingAIOptions] = useState(false); // 是否正在生成AI选项
  const [generatingNextChapter, setGeneratingNextChapter] = useState(false); // 是否正在生成下一章
  const [generatedChapterContent, setGeneratedChapterContent] = useState(null); // AI生成的章节内容
  const [generatingStage, setGeneratingStage] = useState(''); // 生成阶段：'thinking' | 'writing' | 'polishing' | 'completing'
  const [generatingChapterNumber, setGeneratingChapterNumber] = useState(null); // 正在生成的章节号

  const load = useCallback(async () => {
    if (!forkId) return;
    setError(null);
    setLoading(true);
    try {
      const [f, cs, bm] = await Promise.all([
        getFork(forkId),
        listCommits(forkId),
        listBookmarks(forkId),
      ]);
      setFork(f);
      setCommits(Array.isArray(cs) ? cs : []);
      setBookmarks(Array.isArray(bm) ? bm : []);
      if (f?.storySeedSlug) {
        try {
          const s = await getStorySeedBySlug(f.storySeedSlug);
          setSeed(s);
        } catch {
          setSeed(null);
        }
      }
      
      // 加载作者章节：优先使用storySeedSlug，如果StorySeed存在则不需要加载章节
      if (f?.storySeedSlug && typeof f.storySeedSlug === 'string' && !seed) {
        try {
          const chList = await listChaptersBySlug(f.storySeedSlug, undefined);
          setAuthorChapters(Array.isArray(chList) ? chList : []);
        } catch (err) {
          console.error('加载章节失败:', err);
          setAuthorChapters([]);
        }
      } else {
        setAuthorChapters([]);
      }
    } catch (err) {
      console.error('加载失败:', err);
      setError(err?.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  }, [forkId]);

  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isAuthed());
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/read/' + forkId);
      return;
    }
    load();
  }, [router, forkId, load, isAuthenticated, isMounted]);

  const branchPoints = seed?.branchPoints ?? [];
  const nextBranchPointSortOrder = commits.length + 1;
  const nextBranchPoint = branchPoints.find((bp) => bp.sortOrder === nextBranchPointSortOrder) ?? branchPoints[nextBranchPointSortOrder - 1];
  const hasNextBranchPoint = nextBranchPoint != null;
  const hasSeedError = fork?.storySeedSlug && !seed && !loading;

  async function handleChoose(optionId) {
    if (!nextBranchPoint || choosing) return;
    setChoosing(true);
    setGeneratingChapterNumber(commits.length + 1);
    setGeneratingStage('thinking');
    setError(null);
    try {
      await choose(forkId, { branchPointId: nextBranchPoint.id, optionId });
      addToast('已生成新章节');
      await load();
    } catch (err) {
      setError(err?.message ?? '生成失败');
    } finally {
      setChoosing(false);
      setGeneratingChapterNumber(null);
      setGeneratingStage('');
    }
  }

  async function handleRollback(commitId) {
    if (!confirm('回退后将丢弃该章节之后的所有内容，确定吗？')) return;
    try {
      await rollback(forkId, commitId);
      addToast('已回退');
      setShowHistory(false);
      await load();
    } catch (err) {
      setError(err?.message ?? '回退失败');
    }
  }

  async function handleQuickRollback(branchPointSortOrder) {
    if (!confirm(`确定回退到第 ${branchPointSortOrder} 个分支点吗？之后的所有章节将被删除。`)) return;
    try {
      await rollbackToBranchPoint(forkId, branchPointSortOrder);
      addToast('已回退');
      await load();
    } catch (err) {
      setError(err?.message ?? '回退失败');
    }
  }

  async function handleCreateBookmark() {
    try {
      const currentCommit = commits[currentChapterIndex - authorChapters.length];
      await createBookmark(forkId, {
        commitId: currentCommit?.id,
        chapterSortOrder: currentChapterIndex < authorChapters.length ? currentChapterIndex + 1 : null,
        bookmarkName: bookmarkName.trim() || null,
        notes: bookmarkNotes.trim() || null,
      });
      addToast('书签已创建');
      setShowBookmarkForm(false);
      setBookmarkName('');
      setBookmarkNotes('');
      await load();
    } catch (err) {
      setError(err?.message ?? '创建书签失败');
    }
  }

  async function handleDeleteBookmark(bookmarkId) {
    if (!confirm('确定删除这个书签吗？')) return;
    try {
      await deleteBookmark(forkId, bookmarkId);
      addToast('书签已删除');
      await load();
    } catch (err) {
      setError(err?.message ?? '删除书签失败');
    }
  }

  async function handleJumpToBookmark(bookmark) {
    if (bookmark.chapterSortOrder) {
      setCurrentChapterIndex(bookmark.chapterSortOrder - 1);
    } else if (bookmark.commitId) {
      const commitIndex = commits.findIndex(c => c.id === bookmark.commitId);
      if (commitIndex !== -1) {
        setCurrentChapterIndex(authorChapters.length + commitIndex);
      }
    }
  }

  async function handleSubmitPR(e) {
    e.preventDefault();
    if (!fork?.storySeedId || !forkId) return;
    setPRSubmitting(true);
    setError(null);
    try {
      await createPullRequest(fork.storySeedId, {
        forkId: Number(forkId),
        fromCommitId: commits.length > 0 ? commits[commits.length - 1].id : null,
        title: prTitle.trim() || null,
        description: prDescription.trim() || null,
      });
      addToast('已提交给作者');
      setShowPRForm(false);
      setPRTitle('');
      setPRDescription('');
    } catch (err) {
      setError(err?.message ?? '提交失败');
    } finally {
      setPRSubmitting(false);
    }
  }

  async function handleQuickSubmitPR() {
    if (!fork?.storySeedId || !forkId) return;
    if (commits.length === 0) {
      addToast('请先阅读一些章节再提交PR');
      return;
    }
    
    const lastCommit = commits[commits.length - 1];
    const autoTitle = `续写建议：第 ${lastCommit.sortOrder} 章后的剧情`;
    const autoDescription = `我阅读了《${fork?.storySeedTitle || seed?.title}》，在第 ${lastCommit.sortOrder} 章后选择「${lastCommit.optionLabel}」继续阅读，共阅读了 ${commits.length} 个章节。\n\n我的续写路径：\n${commits.map(c => `- 第 ${c.sortOrder} 章：${c.optionLabel}`).join('\n')}`;
    
    setPRTitle(autoTitle);
    setPRDescription(autoDescription);
    setShowPRForm(true);
  }

  function generatePRPreview() {
    if (commits.length === 0) return null;
    
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <h4 className="text-sm font-semibold mb-2">PR 预览</h4>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">标题：</span>
            <span className="text-zinc-600 dark:text-zinc-400">{prTitle || '（未填写）'}</span>
          </div>
          <div>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">说明：</span>
            <div className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap mt-1">
              {prDescription || '（未填写）'}
            </div>
          </div>
          <div>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">包含章节：</span>
            <span className="text-zinc-600 dark:text-zinc-400">{commits.length} 章</span>
          </div>
          <div>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">最后章节：</span>
            <span className="text-zinc-600 dark:text-zinc-400">第 {commits[commits.length - 1].sortOrder} 章</span>
          </div>
        </div>
      </div>
    );
  }

  async function handleGenerateAIOptions() {
    setGeneratingAIOptions(true);
    setError(null);
    try {
      const currentChapterContent = currentChapterIndex < authorChapters.length 
        ? authorChapters[currentChapterIndex]?.contentMarkdown 
        : commits[currentChapterIndex - authorChapters.length]?.contentMarkdown;
      
      const currentChapterTitle = currentChapterIndex < authorChapters.length
        ? authorChapters[currentChapterIndex]?.title
        : `第 ${commits[currentChapterIndex - authorChapters.length]?.sortOrder} 章`;
      
      const prompt = `根据以下章节内容，生成3-4个不同的故事发展方向选项，每个选项应该简洁明了，不超过20个字：

章节标题：${currentChapterTitle}
章节内容：${currentChapterContent?.substring(0, 500)}...

请以JSON格式返回，格式如下：
[
  {"id": 1, "label": "选项1", "description": "简短描述"},
  {"id": 2, "label": "选项2", "description": "简短描述"},
  {"id": 3, "label": "选项3", "description": "简短描述"}
]`;

      const data = await api.post('/ai/generate-options', { prompt });
      setAIOptions(data.options || []);
      setShowAIOptions(true);
    } catch (err) {
      setError(err?.message ?? '生成选项失败');
    } finally {
      setGeneratingAIOptions(false);
    }
  }

  async function handleSelectAIOption(option) {
    setGeneratingNextChapter(true);
    setError(null);
    try {
      const currentChapterContent = currentChapterIndex < authorChapters.length 
        ? authorChapters[currentChapterIndex]?.contentMarkdown 
        : commits[currentChapterIndex - authorChapters.length]?.contentMarkdown;
      
      const currentChapterTitle = currentChapterIndex < authorChapters.length
        ? authorChapters[currentChapterIndex]?.title
        : `第 ${commits[currentChapterIndex - authorChapters.length]?.sortOrder} 章`;
      
      const prompt = `根据以下章节内容和选择的方向，生成下一章的内容：

章节标题：${currentChapterTitle}
章节内容：${currentChapterContent}

选择的发展方向：${option.label}
方向描述：${option.description}

请生成一个完整的章节内容，字数在500-1000字之间，保持故事连贯性。`;

      const data = await api.post('/ai/generate-chapter', { prompt });
      setGeneratedChapterContent(data.content || '');
      setShowAIOptions(false);
    } catch (err) {
      setError(err?.message ?? '生成章节失败');
    } finally {
      setGeneratingNextChapter(false);
    }
  }

  if (loading || !fork) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3" />
          <div className="h-64 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6" style={{ width: '80%' }}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/stories" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          ← 故事库
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setShowChapterList(!showChapterList)}
          >
            {showChapterList ? '收起目录' : '章节目录'}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? '收起历史' : '版本历史'}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setShowBookmarks(!showBookmarks)}
          >
            {showBookmarks ? '收起书签' : '我的书签'}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setShowBookmarkForm(!showBookmarkForm)}
          >
            {showBookmarkForm ? '取消添加' : '添加书签'}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleQuickSubmitPR}
          >
            快速提交PR
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setShowPRForm(!showPRForm)}
          >
            {showPRForm ? '取消提交' : '自定义提交'}
          </button>
          <Link href={`/stories/${fork?.storySeedSlug}`} className="btn btn-sm btn-ghost">
            故事详情
          </Link>
        </div>
      </div>

      {error ? (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      ) : null}

      {hasSeedError ? (
        <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
          <p className="font-medium mb-2">加载故事失败</p>
          <p className="text-sm mb-3">无法加载故事内容，请稍后重试。</p>
          <button
            type="button"
            className="btn btn-sm"
            onClick={load}
          >
            重试
          </button>
        </div>
      ) : null}

      {showPRForm ? (
        <form onSubmit={handleSubmitPR} className="mb-6 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 space-y-3">
          <h3 className="text-sm font-semibold">提交分支给原作者（Pull Request）</h3>
          <input
            type="text"
            value={prTitle}
            onChange={(e) => setPRTitle(e.target.value)}
            className="input w-full"
            placeholder="PR 标题（可选）"
            maxLength={200}
          />
          <textarea
            value={prDescription}
            onChange={(e) => setPRDescription(e.target.value)}
            className="input w-full min-h-[80px] text-sm"
            placeholder="说明（可选）"
          />
          {generatePRPreview()}
          <div className="flex gap-2">
            <button type="submit" className="btn btn-sm" disabled={prSubmitting}>
              {prSubmitting ? '提交中…' : '提交'}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowPRForm(false)}>
              取消
            </button>
          </div>
        </form>
      ) : null}

      {showBookmarkForm ? (
        <form onSubmit={(e) => { e.preventDefault(); handleCreateBookmark(); }} className="mb-6 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 space-y-3">
          <h3 className="text-sm font-semibold">添加书签</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">当前章节：第 {currentChapterIndex + 1} 章</p>
          <input
            type="text"
            value={bookmarkName}
            onChange={(e) => setBookmarkName(e.target.value)}
            className="input w-full"
            placeholder="书签名称（可选）"
            maxLength={200}
          />
          <textarea
            value={bookmarkNotes}
            onChange={(e) => setBookmarkNotes(e.target.value)}
            className="input w-full min-h-[60px] text-sm"
            placeholder="备注（可选）"
            maxLength={500}
          />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-sm">
              保存书签
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setShowBookmarkForm(false); setBookmarkName(''); setBookmarkNotes(''); }}>
              取消
            </button>
          </div>
        </form>
      ) : null}

      {showBookmarks && bookmarks.length > 0 ? (
        <div className="mb-6 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <h3 className="text-sm font-semibold mb-2">我的书签</h3>
          <ul className="space-y-2">
            {bookmarks.map((b) => (
              <li key={b.id} className="p-3 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        type="button"
                        onClick={() => handleJumpToBookmark(b)}
                        className="text-left font-medium text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                      >
                        {b.bookmarkName || b.commitTitle || '未命名书签'}
                      </button>
                    </div>
                    {b.notes ? (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 line-clamp-2">{b.notes}</p>
                    ) : null}
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {new Date(b.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost text-red-600 dark:text-red-400 shrink-0"
                    onClick={() => handleDeleteBookmark(b.id)}
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : showBookmarks && bookmarks.length === 0 ? (
        <div className="mb-6 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-center text-sm text-zinc-500 dark:text-zinc-400">
          暂无书签，点击上方「添加书签」创建。
        </div>
      ) : null}

      {showHistory && commits.length > 0 ? (
        <div className="mb-6 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">版本历史</h3>
            <div className="flex gap-2">
              {commits.length > 0 && (
                <button
                  type="button"
                  className="btn btn-xs btn-ghost text-indigo-600 dark:text-indigo-400"
                  onClick={() => handleQuickRollback(commits.length - 1)}
                >
                  快速回退到上一个分支点
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {commits.map((c, index) => (
              <div key={c.id} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">第 {c.sortOrder} 章</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      选择：{c.optionLabel ?? '—'}
                    </span>
                  </div>
                  {c.contentMarkdown && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-1">
                      {c.contentMarkdown.substring(0, 80)}...
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost text-indigo-600 dark:text-indigo-400 shrink-0"
                  onClick={() => handleRollback(c.id)}
                >
                  回退
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 章节导航 */}
      <div className="mb-8">
        {/* 章节目录 - 现在通过顶部按钮控制显示 */}
        {showChapterList && (
          <div className="mb-6 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
            <h3 className="text-sm font-semibold mb-3">章节目录</h3>
            <ul className="space-y-2">
              {authorChapters.map((ch, index) => (
                <li key={ch.id}>
                  <button
                    type="button"
                    onClick={() => setCurrentChapterIndex(index)}
                    className={`text-left w-full px-3 py-1.5 rounded ${currentChapterIndex === index ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700/50'}`}
                  >
                    {ch.title}
                  </button>
                </li>
              ))}
              {commits.map((c, index) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setCurrentChapterIndex(authorChapters.length + index)}
                    className={`text-left w-full px-3 py-1.5 rounded ${currentChapterIndex === authorChapters.length + index ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700/50'}`}
                  >
                    第 {c.sortOrder} 章{/* 这里可以添加章节标题逻辑 */}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 当前章节内容 */}
        <div className="mb-8">
          {choosing && generatingChapterNumber ? (
            <div className="p-8 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-indigo-100 dark:bg-indigo-900/40">
                  <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
                  正在生成第 {generatingChapterNumber} 章
                </h3>
                <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-4">
                  AI 正在为你创作精彩内容，请稍候...
                </p>
                <div className="max-w-md mx-auto space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      generatingStage === 'thinking' || generatingStage === 'writing' || generatingStage === 'polishing' || generatingStage === 'completing'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-indigo-200 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-400'
                    }`}>
                      {generatingStage === 'thinking' || generatingStage === 'writing' || generatingStage === 'polishing' || generatingStage === 'completing' ? '✓' : '1'}
                    </div>
                    <span className={generatingStage === 'thinking' ? 'font-medium text-indigo-800 dark:text-indigo-200' : 'text-zinc-600 dark:text-zinc-400'}>
                      正在思考剧情发展...
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      generatingStage === 'writing' || generatingStage === 'polishing' || generatingStage === 'completing'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-indigo-200 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-400'
                    }`}>
                      {generatingStage === 'writing' || generatingStage === 'polishing' || generatingStage === 'completing' ? '✓' : '2'}
                    </div>
                    <span className={generatingStage === 'writing' ? 'font-medium text-indigo-800 dark:text-indigo-200' : 'text-zinc-600 dark:text-zinc-400'}>
                      正在撰写章节内容...
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      generatingStage === 'polishing' || generatingStage === 'completing'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-indigo-200 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-400'
                    }`}>
                      {generatingStage === 'polishing' || generatingStage === 'completing' ? '✓' : '3'}
                    </div>
                    <span className={generatingStage === 'polishing' ? 'font-medium text-indigo-800 dark:text-indigo-200' : 'text-zinc-600 dark:text-zinc-400'}>
                      正在润色完善...
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      generatingStage === 'completing'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-indigo-200 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-400'
                    }`}>
                      {generatingStage === 'completing' ? '✓' : '4'}
                    </div>
                    <span className={generatingStage === 'completing' ? 'font-medium text-indigo-800 dark:text-indigo-200' : 'text-zinc-600 dark:text-zinc-400'}>
                      即将完成...
                    </span>
                  </div>
                </div>
                <div className="mt-6 max-w-md mx-auto">
                  <div className="h-2 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 dark:bg-indigo-400 animate-pulse transition-all duration-1000" style={{ width: '60%' }} />
                  </div>
                </div>
              </div>
            </div>
          ) : authorChapters.length > 0 || commits.length > 0 ? (
            currentChapterIndex < authorChapters.length ? (
              <div>
                <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-4">{authorChapters[currentChapterIndex]?.title || '未命名章节'}</h2>
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{authorChapters[currentChapterIndex]?.contentMarkdown ?? ''}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div>
                {commits[currentChapterIndex - authorChapters.length]?.optionLabel ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">你的选择：{commits[currentChapterIndex - authorChapters.length].optionLabel}</p>
                ) : null}
                <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-4">第 {commits[currentChapterIndex - authorChapters.length]?.sortOrder} 章</h2>
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{commits[currentChapterIndex - authorChapters.length]?.contentMarkdown ?? ''}</ReactMarkdown>
                </div>
              </div>
            )
          ) : (
            <div className="p-6 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 text-center text-zinc-500 dark:text-zinc-400">
              暂无章节内容
            </div>
          )}
        </div>

        {/* 章节导航按钮 */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentChapterIndex(prev => Math.max(0, prev - 1))}
            disabled={currentChapterIndex === 0}
            className="btn btn-sm disabled:opacity-50"
          >
            ← 上一章
          </button>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {currentChapterIndex + 1} / {authorChapters.length + commits.length}
          </span>
          <button
            type="button"
            onClick={() => setCurrentChapterIndex(prev => Math.min(authorChapters.length + commits.length - 1, prev + 1))}
            disabled={currentChapterIndex === authorChapters.length + commits.length - 1}
            className="btn btn-sm disabled:opacity-50"
          >
            下一章 →
          </button>
        </div>
      </div>

      {/* 最后一章提示和AI生成选项 */}
      {currentChapterIndex === authorChapters.length + commits.length - 1 && (
        <div className="mb-6 p-6 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-indigo-800 dark:text-indigo-200 mb-2">这是最后一章</h3>
            <p className="text-sm text-indigo-600 dark:text-indigo-400">想要继续阅读吗？AI可以为你生成后续故事发展的选项</p>
          </div>
          {!showAIOptions && !generatedChapterContent && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleGenerateAIOptions}
                disabled={generatingAIOptions}
                className="btn btn-primary"
              >
                {generatingAIOptions ? '生成中…' : '生成故事发展选项'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI生成的选项 */}
      {showAIOptions && aiOptions.length > 0 && (
        <div className="mb-6 card p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">选择故事发展方向</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">请选择一个选项，AI 将为你生成下一章内容：</p>
          </div>
          <div className="space-y-3">
            {aiOptions.map((option, index) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelectAIOption(option)}
                disabled={generatingNextChapter}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  generatingNextChapter
                    ? 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 opacity-50 cursor-not-allowed'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                      {option.label}
                    </p>
                    {option.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {option.description}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowAIOptions(false)}
              className="btn btn-sm btn-ghost"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* AI生成的章节内容 */}
      {generatedChapterContent && (
        <div className="mb-6 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">AI生成的下一章</h3>
            <button
              type="button"
              onClick={() => {
                setGeneratedChapterContent(null);
                setShowAIOptions(false);
              }}
              className="btn btn-sm btn-ghost"
            >
              关闭
            </button>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown>{generatedChapterContent}</ReactMarkdown>
          </div>
          <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ 注意：AI生成的内容仅供预览，不会保存到数据库中。如果您喜欢这个内容，可以手动复制保存。
            </p>
          </div>
        </div>
      )}

      {hasNextBranchPoint ? (
        <div className="card p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">接下来会发生什么？</h3>
            {nextBranchPoint.anchorText ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">{nextBranchPoint.anchorText}</p>
            ) : null}
            <p className="text-sm text-zinc-600 dark:text-zinc-300">请选择一个选项，AI 将为你续写：</p>
          </div>
          <div className="space-y-3">
            {(nextBranchPoint.options ?? []).map((opt, index) => {
              const totalSelections = (nextBranchPoint.options ?? []).reduce((sum, o) => sum + (o.selectionCount || 0), 0);
              const selectionPercentage = totalSelections > 0 ? Math.round((opt.selectionCount || 0) / totalSelections * 100) : 0;
              const isPopular = selectionPercentage >= 50;
              
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    choosing
                      ? 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 opacity-50 cursor-not-allowed'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                  }`}
                  disabled={choosing}
                  onClick={() => handleChoose(opt.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-zinc-800 dark:text-zinc-200">
                          {choosing ? '生成中…' : opt.label}
                        </p>
                        {isPopular && !choosing && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300">
                            热门
                          </span>
                        )}
                      </div>
                      {opt.plotHint ? (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">
                          💡 {opt.plotHint}
                        </p>
                      ) : null}
                      {opt.influenceNotes ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                          {opt.influenceNotes}
                        </p>
                      ) : null}
                      {totalSelections > 0 && !choosing && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all"
                              style={{ width: `${selectionPercentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                            {selectionPercentage}% ({opt.selectionCount || 0}人选择)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
