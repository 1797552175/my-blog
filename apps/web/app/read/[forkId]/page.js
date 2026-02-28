'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getStorySeedBySlug } from '../../../services/storySeeds';
import { getFork, listCommits, choose, rollback, createPullRequest, listBookmarks, createBookmark, deleteBookmark, rollbackToBranchPoint, saveAiPreview, getAiPreview, deleteAiPreviewChapter, generateAiPreviewSummary } from '../../../services/readerForks';
import { listChaptersBySlug } from '../../../services/stories';
import { generateDirectionOptions, streamAiWrite } from '../../../services/aiWriting';
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
  const [showDirectionModal, setShowDirectionModal] = useState(false); // 是否显示方向选择弹窗
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // 是否显示删除确认弹窗
  const [deletingChapter, setDeletingChapter] = useState(null); // 正在删除的章节信息
  const [directionOptions, setDirectionOptions] = useState([]); // 故事走向选项
  const [loadingDirectionOptions, setLoadingDirectionOptions] = useState(false); // 是否正在加载选项
  const [aiPreviewChapters, setAiPreviewChapters] = useState([]); // AI预览章节列表
  const [generatingChapter, setGeneratingChapter] = useState(false); // 是否正在生成章节
  const [generatingStage, setGeneratingStage] = useState(''); // 生成阶段：'analyzing' | 'generating' | 'polishing' | 'completing'
  const [isProcessingSummary, setIsProcessingSummary] = useState(false); // 是否正在处理摘要
  const abortControllerRef = useRef(null); // 用于取消生成

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
      
      // 加载AI预览章节
      try {
        const previewData = await getAiPreview(forkId);
        if (previewData && Array.isArray(previewData.chapters)) {
          const chapters = previewData.chapters.map(ch => ({
            ...ch,
            isPreview: true,
          }));
          setAiPreviewChapters(chapters);
          
          // 检查是否有未生成摘要的章节
          const chaptersWithoutSummary = chapters.filter(ch => !ch.summary && ch.contentMarkdown);
          if (chaptersWithoutSummary.length > 0) {
            // 开始处理所有未生成摘要的章节
            setIsProcessingSummary(true);
            // 依次为每个章节生成摘要
            for (const ch of chaptersWithoutSummary) {
              try {
                await generateAiPreviewSummary(forkId, ch.chapterNumber);
              } catch (e) {
                console.error(`生成章节${ch.chapterNumber}摘要失败:`, e);
              }
            }
            // 刷新预览章节列表
            const updatedPreview = await getAiPreview(forkId);
            if (updatedPreview && Array.isArray(updatedPreview.chapters)) {
              setAiPreviewChapters(updatedPreview.chapters.map(ch => ({
                ...ch,
                isPreview: true,
              })));
            }
            setIsProcessingSummary(false);
          }
        }
      } catch (err) {
        console.error('加载AI预览章节失败:', err);
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

  // 打开方向选择弹窗
  async function openDirectionModal() {
    if (!fork?.storyId) {
      setError('无法获取小说信息，该阅读分支未关联小说');
      return;
    }
    setShowDirectionModal(true);
    setLoadingDirectionOptions(true);
    setDirectionOptions([]);
    setError(null);
    try {
      // 计算上下文范围：当前已读的所有章节
      const contextUpToSortOrder = currentChapterIndex < authorChapters.length 
        ? currentChapterIndex + 1 
        : authorChapters.length + commits.length;
      
      // 构建AI预览章节摘要列表（用于上下文）
      const aiPreviewSummaries = aiPreviewChapters.map(ch => ({
        chapterNumber: ch.chapterNumber,
        title: ch.title,
        summary: ch.summary || null,
      }));
      
      const opts = await generateDirectionOptions(fork.storyId, contextUpToSortOrder, aiPreviewSummaries);
      // generateDirectionOptions 已经返回了 options 数组
      setDirectionOptions(Array.isArray(opts) ? opts : []);
    } catch (e) {
      addToast(e?.message ?? '获取选项失败');
    } finally {
      setLoadingDirectionOptions(false);
    }
  }

  // 选择故事走向并生成章节
  async function handleSelectDirection(selectedOption) {
    if (!fork?.storyId || generatingChapter) return;
    setShowDirectionModal(false);
    setError(null);
    
    // 计算下一章的章节号
    const nextChapterNumber = authorChapters.length + commits.length + aiPreviewChapters.length + 1;
    const defaultTitle = `第${nextChapterNumber}章 ${selectedOption?.title || '续写'}`;
    
    // 立即创建一个空的预览章节（用于显示加载状态）
    const newPreviewChapter = {
      chapterNumber: nextChapterNumber,
      title: defaultTitle,
      contentMarkdown: '',
      summary: null,
      summaryGenerating: false,
      isPreview: true,
      isGenerating: true, // 标记正在生成
      createdAt: Date.now(),
    };
    
    // 添加到预览章节列表并立即跳转
    setAiPreviewChapters((prev) => [...prev, newPreviewChapter]);
    setCurrentChapterIndex(authorChapters.length + commits.length + aiPreviewChapters.length);
    
    // 开始生成
    setGeneratingChapter(true);
    setGeneratingStage('analyzing');
    
    // 创建 AbortController 用于取消请求
    abortControllerRef.current = new AbortController();
    
    // 构建AI预览章节摘要列表（用于上下文）
    const aiPreviewSummariesForContent = aiPreviewChapters.map(ch => ({
      chapterNumber: ch.chapterNumber,
      title: ch.title,
      summary: ch.summary || null,
    }));
    
    const params = {
      storyId: fork.storyId,
      type: 'from_setting',
      selectedDirectionTitle: selectedOption?.title || '',
      selectedDirectionDescription: selectedOption?.description || '',
      wordCount: 1000,
      aiPreviewSummaries: aiPreviewSummariesForContent,
    };

    let accumulatedContent = '';
    let generatedTitle = '';

    streamAiWrite(
      params,
      (chunk) => {
        // 确保 chunk 是字符串
        const chunkStr = typeof chunk === 'string' ? chunk : String(chunk ?? '');
        accumulatedContent += chunkStr;
        
        // 更新预览章节的内容（流式更新）
        setAiPreviewChapters((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].chapterNumber === nextChapterNumber) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              contentMarkdown: accumulatedContent,
            };
          }
          return updated;
        });
        
        setGeneratingStage((prev) => {
          if (prev === 'analyzing') return 'generating';
          return prev;
        });
      },
      async () => {
        setGeneratingStage('completing');
        
        // 从生成的内容中提取标题（第一行）
        const lines = accumulatedContent.split('\n');
        const firstLine = lines[0].trim();
        if (firstLine.startsWith('第') && firstLine.includes('章')) {
          generatedTitle = firstLine;
          accumulatedContent = lines.slice(1).join('\n').trim();
        } else {
          generatedTitle = defaultTitle;
        }
        
        // 保存到 Redis
        try {
          await saveAiPreview(forkId, {
            chapterNumber: nextChapterNumber,
            title: generatedTitle,
            contentMarkdown: accumulatedContent,
          });
          
          // 更新预览章节列表
          setAiPreviewChapters((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0 && updated[lastIndex].chapterNumber === nextChapterNumber) {
              updated[lastIndex] = {
                ...updated[lastIndex],
                title: generatedTitle,
                contentMarkdown: accumulatedContent,
                isGenerating: false,
                summaryGenerating: true,
              };
            }
            return updated;
          });
          
          addToast('章节生成完成');
          
          // 开始处理所有未生成摘要的章节
          setIsProcessingSummary(true);
          
          try {
            // 为当前章节生成摘要
            await generateAiPreviewSummary(forkId, nextChapterNumber);
            
            // 刷新预览章节列表以获取更新后的摘要
            const updatedPreview = await getAiPreview(forkId);
            if (updatedPreview && Array.isArray(updatedPreview.chapters)) {
              setAiPreviewChapters(updatedPreview.chapters.map(ch => ({
                ...ch,
                isPreview: true,
              })));
            }
          } catch (summaryErr) {
            console.error('摘要生成失败:', summaryErr);
            // 即使失败也解除阻塞，让用户可以继续操作
          } finally {
            setIsProcessingSummary(false);
          }
        } catch (err) {
          console.error('保存预览章节失败:', err);
          addToast('保存预览失败，但内容已生成');
        }
        
        setTimeout(() => {
          setGeneratingChapter(false);
          setGeneratingStage('');
        }, 500);
      },
      (error) => {
        setGeneratingChapter(false);
        setGeneratingStage('');
        setError(error?.message || '生成失败');
        addToast(error?.message || '生成失败');
        
        // 移除正在生成的章节
        setAiPreviewChapters((prev) => prev.filter(ch => ch.chapterNumber !== nextChapterNumber));
        // 跳转回上一章
        setCurrentChapterIndex(Math.max(0, authorChapters.length + commits.length + aiPreviewChapters.length - 1));
      },
      abortControllerRef.current.signal
    );
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
                    onClick={() => {
                      setCurrentChapterIndex(index);
                      setShowChapterList(false);
                    }}
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
                    onClick={() => {
                      setCurrentChapterIndex(authorChapters.length + index);
                      setShowChapterList(false);
                    }}
                    className={`text-left w-full px-3 py-1.5 rounded ${currentChapterIndex === authorChapters.length + index ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700/50'}`}
                  >
                    第 {c.sortOrder} 章
                  </button>
                </li>
              ))}
              {aiPreviewChapters.map((ch, index) => (
                <li key={`ai-preview-${ch.chapterNumber}`}>
                  <div className={`flex items-center justify-between rounded ${currentChapterIndex === authorChapters.length + commits.length + index ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700/50'}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentChapterIndex(authorChapters.length + commits.length + index);
                        setShowChapterList(false);
                      }}
                      className="text-left flex-1 px-3 py-1.5 flex items-center gap-2"
                    >
                      <span>{ch.title || `第${ch.chapterNumber}章`}</span>
                      <span className="px-1.5 py-0.5 text-xs rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">AI生成</span>
                    </button>
                    {index === aiPreviewChapters.length - 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingChapter({ index, chapterNumber: ch.chapterNumber, title: ch.title });
                          setShowDeleteConfirm(true);
                        }}
                        className="px-2 py-1 mr-2 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 当前章节内容 */}
        <div className="mb-8">
          {authorChapters.length > 0 || commits.length > 0 || aiPreviewChapters.length > 0 ? (
            currentChapterIndex < authorChapters.length ? (
              <div>
                <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-4">{authorChapters[currentChapterIndex]?.title || '未命名章节'}</h2>
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{typeof authorChapters[currentChapterIndex]?.contentMarkdown === 'string' ? authorChapters[currentChapterIndex].contentMarkdown : String(authorChapters[currentChapterIndex]?.contentMarkdown ?? '')}</ReactMarkdown>
                </div>
              </div>
            ) : currentChapterIndex < authorChapters.length + commits.length ? (
              <div>
                {commits[currentChapterIndex - authorChapters.length]?.optionLabel ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">你的选择：{commits[currentChapterIndex - authorChapters.length].optionLabel}</p>
                ) : null}
                <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-4">第 {commits[currentChapterIndex - authorChapters.length]?.sortOrder} 章</h2>
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{typeof commits[currentChapterIndex - authorChapters.length]?.contentMarkdown === 'string' ? commits[currentChapterIndex - authorChapters.length].contentMarkdown : String(commits[currentChapterIndex - authorChapters.length]?.contentMarkdown ?? '')}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 text-xs rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">AI生成</span>
                  {aiPreviewChapters[currentChapterIndex - authorChapters.length - commits.length]?.isGenerating && (
                    <span className="flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400">
                      <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-500 rounded-full animate-spin" />
                      生成中...
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-4">{aiPreviewChapters[currentChapterIndex - authorChapters.length - commits.length]?.title || 'AI生成章节'}</h2>
                {aiPreviewChapters[currentChapterIndex - authorChapters.length - commits.length]?.isGenerating && !aiPreviewChapters[currentChapterIndex - authorChapters.length - commits.length]?.contentMarkdown ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mb-4" />
                    <p className="text-zinc-500 dark:text-zinc-400">AI 正在创作中...</p>
                  </div>
                ) : (
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown>{typeof aiPreviewChapters[currentChapterIndex - authorChapters.length - commits.length]?.contentMarkdown === 'string' ? aiPreviewChapters[currentChapterIndex - authorChapters.length - commits.length].contentMarkdown : String(aiPreviewChapters[currentChapterIndex - authorChapters.length - commits.length]?.contentMarkdown ?? '')}</ReactMarkdown>
                  </div>
                )}
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
            {currentChapterIndex + 1} / {authorChapters.length + commits.length + aiPreviewChapters.length}
          </span>
          <button
            type="button"
            onClick={() => setCurrentChapterIndex(prev => Math.min(authorChapters.length + commits.length + aiPreviewChapters.length - 1, prev + 1))}
            disabled={currentChapterIndex === authorChapters.length + commits.length + aiPreviewChapters.length - 1}
            className="btn btn-sm disabled:opacity-50"
          >
            下一章 →
          </button>
        </div>
      </div>

      {/* 最后一章提示和AI生成选项 */}
      {currentChapterIndex === authorChapters.length + commits.length + aiPreviewChapters.length - 1 && !generatingChapter && (
        <div className="mb-6 p-6 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
              {aiPreviewChapters.length > 0 ? '想要继续阅读吗？' : '这是最后一章'}
            </h3>
            <p className="text-sm text-indigo-600 dark:text-indigo-400">
              AI可以为你生成后续故事发展的选项
            </p>
          </div>
          <div className="text-center">
            <button
              type="button"
              onClick={openDirectionModal}
              disabled={loadingDirectionOptions || isProcessingSummary}
              className="btn btn-primary"
            >
              {isProcessingSummary ? '正在处理摘要...' : loadingDirectionOptions ? '生成中…' : '生成故事发展选项'}
            </button>
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

      {/* 故事方向选择弹窗 */}
      {showDirectionModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" 
          onClick={() => setShowDirectionModal(false)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 border border-zinc-200 dark:border-zinc-700" 
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">选择故事走向</h3>
            {loadingDirectionOptions ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mr-2" />
                <span className="text-zinc-600 dark:text-zinc-400">正在生成选项...</span>
              </div>
            ) : directionOptions.length === 0 ? (
              <div className="text-center py-6 space-y-4">
                <p className="text-zinc-500 dark:text-zinc-400">暂无选项，可直接生成。</p>
                <div className="flex gap-2 justify-center">
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={() => handleSelectDirection(null)}
                  >
                    直接生成
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-ghost" 
                    onClick={() => setShowDirectionModal(false)}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  请选择一个故事发展方向，AI将为你生成下一章内容：
                </p>
                <ul className="space-y-3 mb-4">
                  {directionOptions.map((opt, index) => {
                    // 防御性处理：确保 title 和 description 是字符串
                    const title = typeof opt?.title === 'string' ? opt.title : String(opt?.title || '');
                    const description = typeof opt?.description === 'string' ? opt.description : String(opt?.description || '');
                    return (
                      <li key={index}>
                        <button
                          type="button"
                          className="w-full text-left p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                          onClick={() => handleSelectDirection(opt)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-zinc-800 dark:text-zinc-200">
                                {title}
                              </p>
                              {description && (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                  {description}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex gap-2 justify-center">
                  <button 
                    type="button" 
                    className="btn btn-ghost" 
                    onClick={openDirectionModal} 
                    disabled={loadingDirectionOptions}
                  >
                    换一换
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-ghost" 
                    onClick={() => setShowDirectionModal(false)}
                  >
                    取消
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && deletingChapter && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" 
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-sm w-full mx-4 border border-zinc-200 dark:border-zinc-700 overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-center text-zinc-800 dark:text-zinc-200 mb-2">
                删除AI生成章节
              </h3>
              <p className="text-sm text-center text-zinc-500 dark:text-zinc-400 mb-6">
                确定要删除「{deletingChapter.title || `第${deletingChapter.chapterNumber}章`}」吗？此操作无法撤销。
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingChapter(null);
                  }}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                  onClick={async () => {
                    try {
                      await deleteAiPreviewChapter(forkId, deletingChapter.chapterNumber);
                      setAiPreviewChapters((prev) => prev.filter((_, i) => i !== deletingChapter.index));
                      // 如果当前正在查看被删除的章节，跳转到上一章
                      if (currentChapterIndex >= authorChapters.length + commits.length + deletingChapter.index) {
                        setCurrentChapterIndex(Math.max(0, currentChapterIndex - 1));
                      }
                      addToast('已删除AI生成章节');
                    } catch (err) {
                      addToast(err?.message || '删除失败');
                    } finally {
                      setShowDeleteConfirm(false);
                      setDeletingChapter(null);
                    }
                  }}
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
