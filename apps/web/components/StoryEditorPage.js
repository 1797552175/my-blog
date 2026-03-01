'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { isAuthed } from '../services/auth';
import { useToast } from './Toast';
import { useChapterManagement } from '../hooks/useChapterManagement';
import ChapterList from './ChapterList';
import ChapterEditor from './ChapterEditor';
import TemplateModal from './TemplateModal';
import AiWritingPanel from './AiWritingPanel';
import { streamAiWrite, WRITING_TYPE_FROM_SETTING, generateDirectionOptions } from '../services/aiWriting';
import * as inspirationsService from '../services/inspirations';
import { SparklesIcon } from '@heroicons/react/24/outline';

export default function StoryEditorPage({ mode, breadcrumbs, extraNavLinks }) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const id = params?.id;
  const { addToast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedText, setSelectedText] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDirectionModal, setShowDirectionModal] = useState(false);
  const [directionOptions, setDirectionOptions] = useState([]);
  const [loadingDirectionOptions, setLoadingDirectionOptions] = useState(false);
  const [generatingBySetting, setGeneratingBySetting] = useState(false);
  const [inspirations, setInspirations] = useState([]);
  const [loadingInspirations, setLoadingInspirations] = useState(false);
  const [smartContinueNextChapterSortOrder, setSmartContinueNextChapterSortOrder] = useState(null);
  const [showRewriteCurrent, setShowRewriteCurrent] = useState(false);

  const bySettingAbortRef = useRef(null);
  const bySettingAccumulatedRef = useRef('');
  const originalTitleBeforeGenerateRef = useRef('');
  const hasSelectedInitialChapterRef = useRef(false);
  const originalContentBeforeGenerateRef = useRef('');
  const autoGenerateFirstChapterDoneRef = useRef(false);

  const handleError = useCallback((err) => {
    console.log('[StoryEditorPage] handleError:', err?.message);
  }, []);

  const handleSuccess = useCallback((msg) => {
    console.log('[StoryEditorPage] handleSuccess:', msg);
  }, []);

  const {
    loading,
    saving,
    addingChapter,
    setAddingChapter,
    data,
    chapters,
    setChapters,
    selectedChapterId,
    setSelectedChapterId,
    chapterTitle,
    chapterContent,
    error,
    contentTextareaRef,
    editingChapterId,
    editingChapterTitle,
    setEditingChapterTitle,
    isEditingMainTitle,
    mainTitleInput,
    chapterFilter,
    selectedChapterIds,
    showBatchActions,
    setChapterTitle,
    setChapterContent,
    setChapterFilter,
    setSelectedChapterIds,
    setShowBatchActions,
    setMainTitleInput,
    load,
    selectChapter,
    saveChapter,
    createChapter,
    deleteChapter,
    publishChapter,
    unpublishChapter,
    startEditChapterTitle,
    saveEditChapterTitle,
    cancelEditChapterTitle,
    startEditMainTitle,
    saveMainTitle,
    cancelEditMainTitle,
    toggleChapterSelection,
    toggleSelectAll,
    handleBatchDelete,
    autoSaveChapter,
    formatChapterTitle,
    api,
  } = useChapterManagement({
    mode,
    id,
    onError: handleError,
    onSuccess: handleSuccess,
  });

  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isAuthed());
  }, []);

  useEffect(() => {
    console.log('[StoryEditorPage] auth useEffect triggered, isMounted:', isMounted, 'isAuthenticated:', isAuthenticated);
    if (!isMounted) return;
    if (!isAuthenticated) {
      const path = mode === 'prNovel' ? `/me/pr-novels/${id}/edit` : `/me/stories/${id}/edit`;
      router.replace(`/login?next=${path}`);
      return;
    }
    console.log('[StoryEditorPage] calling load()');
    load();
  }, [router, id, mode, isMounted, isAuthenticated, load]);

  useEffect(() => {
    if (selectedChapterId) {
      const currentChapter = chapters.find(ch => ch.id === selectedChapterId);
      setShowRewriteCurrent(currentChapter?.published === true);
    }
  }, [selectedChapterId, chapters]);

  // 加载完成后，如果没有选中章节，自动选择第一个
  useEffect(() => {
    console.log('[StoryEditorPage] select chapter useEffect triggered, loading:', loading, 'chapters.length:', chapters.length, 'selectedChapterId:', selectedChapterId, 'hasSelected:', hasSelectedInitialChapterRef.current);
    if (!loading && chapters.length > 0 && !selectedChapterId) {
      console.log('[StoryEditorPage] selecting first chapter:', chapters[0].id);
      hasSelectedInitialChapterRef.current = true;
      selectChapter(chapters[0].id);
    }
  }, [loading, chapters.length, selectedChapterId]); // 监听 loading、chapters.length 和 selectedChapterId

  // 从首页快速创作跳转带 ?autoGenerateFirstChapter=1 时，自动根据设定生成第一章（需在 load 完成且无章节时触发）
  useEffect(() => {
    if (!id || loading || mode !== 'story') return;
    const flag = searchParams.get('autoGenerateFirstChapter') === '1';
    if (!flag || autoGenerateFirstChapterDoneRef.current) return;
    // 必须等 data 已加载（说明 load 已跑过），避免在 load 前误触发
    if (data == null) return;
    if (chapters.length > 0) {
      autoGenerateFirstChapterDoneRef.current = true;
      router.replace(pathname || `/me/stories/${id}/edit`, { scroll: false });
      return;
    }
    autoGenerateFirstChapterDoneRef.current = true;
    handleWriteBySetting(null);
    router.replace(pathname || `/me/stories/${id}/edit`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅首次加载后触发一次
  }, [id, loading, mode, data, chapters.length, searchParams, pathname, router]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (selectedChapterId) {
        autoSaveChapter();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [selectedChapterId, autoSaveChapter]);

  const handleTextSelection = () => {
    const textarea = contentTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start !== end) {
        setSelectedText(chapterContent.substring(start, end));
      } else {
        setSelectedText('');
      }
    }
  };

  const handleAiInsert = (content) => {
    setChapterContent((prev) => prev + '\n\n' + content);
    addToast('已插入到章节末尾', 'success');
  };

  const handleAiReplace = (oldText, newText) => {
    setChapterContent((prev) => prev.replace(oldText, newText));
    setSelectedText('');
    addToast('已替换选中文本', 'success');
  };

  const applyTemplate = (template) => {
    if (!selectedChapterId) {
      addToast('请先选择一个章节');
      return;
    }
    const templateContent = template.content.replace('{{chapterTitle}}', chapterTitle);
    setChapterContent(templateContent);
    setShowTemplateModal(false);
    addToast('已应用模板');
  };

  const loadInspirations = async () => {
    try {
      setLoadingInspirations(true);
      const response = await inspirationsService.list(0, 10);
      setInspirations(response.content || []);
    } catch (error) {
      console.error('获取灵感列表失败:', error);
      setInspirations([]);
    } finally {
      setLoadingInspirations(false);
    }
  };

  const createChapterFromInspiration = async (inspiration) => {
    try {
      setAddingChapter(true);
      
      const newSortOrder = 1;
      const newChapterTitle = `第${newSortOrder}章`;
      
      const newCh = await api.createChapter({
        title: newChapterTitle,
        contentMarkdown: `# ${newChapterTitle}\n\n${inspiration.content || ''}`,
        sortOrder: newSortOrder,
      });
      
      await load();
      
      setSelectedChapterId(newCh.id);
      setChapterTitle(newCh.title ?? newChapterTitle);
      setChapterContent(newCh.contentMarkdown ?? '');
      
      addToast('已从灵感创建章节');
    } catch (err) {
      addToast('创建章节失败，请重试');
    } finally {
      setAddingChapter(false);
    }
  };

  const openSmartContinueModal = async (nextChapterSortOrder = null) => {
    if (!id) return;
    setSmartContinueNextChapterSortOrder(nextChapterSortOrder);
    setShowDirectionModal(true);
    setLoadingDirectionOptions(true);
    setDirectionOptions([]);
    try {
      const contextUpTo = nextChapterSortOrder != null && nextChapterSortOrder > 0 ? nextChapterSortOrder - 1 : null;
      const opts = await generateDirectionOptions(parseInt(id), contextUpTo);
      setDirectionOptions(Array.isArray(opts) ? opts : []);
    } catch (e) {
      addToast(e?.message ?? '获取选项失败');
      setDirectionOptions([]);
    } finally {
      setLoadingDirectionOptions(false);
    }
  };

  const prepareAndOpenSmartContinueNext = async () => {
    if (!id) return;
    const storyId = parseInt(id);
    setAddingChapter(true);
    try {
      if (selectedChapterId) {
        await autoSaveChapter();
      }
      let list = [...chapters];
      const currentCh = selectedChapterId ? list.find(ch => ch.id === selectedChapterId) : null;
      if (currentCh?.published === false) {
        await api.publishChapter(currentCh.id);
        const afterPublish = await api.listChapters();
        list = Array.isArray(afterPublish) ? afterPublish : [];
        list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      }
      const publishedChapters = list.filter(ch => ch.published);
      const newSortOrder = publishedChapters.length + 1;
      const newChapterTitle = `第${newSortOrder}章`;
      const newCh = await api.createChapter({
        title: newChapterTitle,
        contentMarkdown: '',
        sortOrder: newSortOrder,
        published: true,
      });
      // 直接更新章节列表，避免调用 load() 导致页面闪烁
      const chaptersData = await api.listChapters();
      const chList = Array.isArray(chaptersData) ? chaptersData : [];
      chList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(chList);
      setSelectedChapterId(newCh.id);
      setChapterTitle(newCh.title ?? newChapterTitle);
      setChapterContent(newCh.contentMarkdown ?? '');
      setAddingChapter(false);
      await openSmartContinueModal();
    } catch (e) {
      setAddingChapter(false);
      addToast(e?.message ?? '操作失败');
    }
  };

  const handleWriteBySetting = async (selectedOption) => {
    if (!id || generatingBySetting) return;
    setShowDirectionModal(false);
    const nextChapterSortOrder = smartContinueNextChapterSortOrder ?? undefined;
    let targetChapterId = selectedChapterId;
    let targetSortOrder = 1;

    try {
      const storyId = parseInt(id);
      if (nextChapterSortOrder != null && selectedChapterId) {
        const cur = chapters.find(ch => ch.id === selectedChapterId);
        if (cur) {
          targetChapterId = cur.id;
          targetSortOrder = cur.sortOrder ?? 1;
        }
      } else if (nextChapterSortOrder == null && selectedChapterId) {
        const cur = chapters.find(ch => ch.id === selectedChapterId);
        targetChapterId = selectedChapterId;
        targetSortOrder = cur?.sortOrder ?? 1;
      } else if (chapters.length === 0) {
        setAddingChapter(true);
        const newCh = await api.createChapter({
          title: '草稿',
          contentMarkdown: '',
          sortOrder: 1,
          published: false,
        });
        await load();
        setSelectedChapterId(newCh.id);
        targetChapterId = newCh.id;
        targetSortOrder = newCh.sortOrder ?? 1;
        setAddingChapter(false);
      } else {
        setAddingChapter(true);
        const newSortOrder = chapters.length + 1;
        const newCh = await api.createChapter({
          title: '草稿',
          contentMarkdown: '',
          sortOrder: newSortOrder,
          published: false,
        });
        await load();
        setSelectedChapterId(newCh.id);
        targetChapterId = newCh.id;
        targetSortOrder = newCh.sortOrder ?? newSortOrder;
        setAddingChapter(false);
      }

      originalTitleBeforeGenerateRef.current = chapterTitle;
      originalContentBeforeGenerateRef.current = chapterContent;
      
      // 创建新的 AbortController 用于取消请求
      bySettingAbortRef.current = new AbortController();
      
      setChapterTitle('');
      setChapterContent('');
      setGeneratingBySetting(true);
      bySettingAccumulatedRef.current = '';

      const streamParams = {
        storyId,
        type: WRITING_TYPE_FROM_SETTING,
        wordCount: 1000,
        selectedDirectionTitle: selectedOption?.title ?? null,
        selectedDirectionDescription: selectedOption?.description ?? null,
      };
      if (nextChapterSortOrder != null) streamParams.nextChapterSortOrder = nextChapterSortOrder;

      streamAiWrite(
        streamParams,
        (chunk) => {
          const text = typeof chunk === 'string' ? chunk : (chunk?.content ?? String(chunk));
          bySettingAccumulatedRef.current += text;
          setChapterContent(prev => prev + text);
        },
        () => {
          const full = bySettingAccumulatedRef.current.trim();
          const blankIdx = full.indexOf('\n\n');
          let parsedTitle = blankIdx >= 0 ? full.slice(0, blankIdx).trim().replace(/^\s*\n?/, '').split('\n')[0]?.trim() || '' : (full.split('\n')[0]?.trim() || '');
          parsedTitle = parsedTitle.replace(/^#\s*/, '').replace(/^第[一二三四五六七八九十百千\d]+章\s*/, '').trim();
          if (!parsedTitle) parsedTitle = '未命名';
          const parsedBody = blankIdx >= 0 ? full.slice(blankIdx + 2).trim() : full.slice(full.indexOf('\n') >= 0 ? full.indexOf('\n') + 1 : 0).replace(/^\s*\n?/, '').trim();
          const formattedTitle = formatChapterTitle(targetSortOrder, parsedTitle);
          setChapterTitle(formattedTitle);
          setChapterContent(parsedBody);
          api.updateChapter(targetChapterId, {
            title: formattedTitle,
            contentMarkdown: parsedBody,
          }).then(() => {
            api.listChapters().then(chList => {
              let updatedChapters = Array.isArray(chList) ? chList : [];
              updatedChapters.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            });
          }).catch(() => {});
          setGeneratingBySetting(false);
        },
        (err) => {
          setGeneratingBySetting(false);
          if (err?.message !== '已取消') {
            addToast(err?.message ?? '生成失败');
          }
        },
        bySettingAbortRef.current?.signal
      );
    } catch (err) {
      setGeneratingBySetting(false);
      addToast(err?.message ?? '生成失败');
    }
  };

  const cancelWriteBySetting = () => {
    if (bySettingAbortRef.current) {
      bySettingAbortRef.current.abort();
      bySettingAbortRef.current = null;
    }
    setChapterTitle(originalTitleBeforeGenerateRef.current);
    setChapterContent(originalContentBeforeGenerateRef.current);
    setGeneratingBySetting(false);
    addToast('已取消生成，已恢复原文');
  };

  const onAddChapter = async () => {
    if (!id) return;
    const storyId = parseInt(id);
    
    if (selectedChapterId) {
      await autoSaveChapter();
    }
    
    let newSortOrder;
    let newChapterTitle;
    
    if (chapterFilter === 'published') {
      const publishedChapters = chapters.filter(ch => ch.published);
      newSortOrder = publishedChapters.length + 1;
      newChapterTitle = `第${newSortOrder}章`;
    } else {
      newSortOrder = chapters.length + 1;
      newChapterTitle = '草稿';
    }
    
    await createChapter({
      title: newChapterTitle,
      contentMarkdown: '',
      sortOrder: newSortOrder,
      published: chapterFilter === 'published',
    });
  };

  if (!isMounted || !isAuthenticated) {
    return null;
  }

  if (loading) {
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
    <div className="mx-auto p-2" style={{ width: '99%' }}>
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {breadcrumbs}
        {extraNavLinks}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 flex-row">
        <ChapterEditor
          chapters={chapters}
          selectedChapterId={selectedChapterId}
          chapterTitle={chapterTitle}
          chapterContent={chapterContent}
          loading={loading}
          saving={saving}
          addingChapter={addingChapter}
          generatingBySetting={generatingBySetting}
          contentTextareaRef={contentTextareaRef}
          isEditingMainTitle={isEditingMainTitle}
          mainTitleInput={mainTitleInput}
          showRewriteCurrent={showRewriteCurrent}
          onSaveChapter={(e) => { e.preventDefault(); saveChapter(); }}
          onAddChapter={onAddChapter}
          onChapterTitleChange={setChapterTitle}
          onChapterContentChange={setChapterContent}
          onStartEditMainTitle={startEditMainTitle}
          onSaveMainTitle={saveMainTitle}
          onCancelEditMainTitle={cancelEditMainTitle}
          onMainTitleInputChange={setMainTitleInput}
          onTextSelection={handleTextSelection}
          onPrepareAndOpenSmartContinueNext={prepareAndOpenSmartContinueNext}
          onOpenSmartContinueModal={openSmartContinueModal}
          onCancelWriteBySetting={cancelWriteBySetting}
          onShowTemplateModal={() => setShowTemplateModal(true)}
          onLoadInspirations={loadInspirations}
          onCreateChapterFromInspiration={createChapterFromInspiration}
          inspirations={inspirations}
          loadingInspirations={loadingInspirations}
          mode={mode}
          data={data}
        />

        <ChapterList
          chapters={chapters}
          selectedChapterId={selectedChapterId}
          chapterFilter={chapterFilter}
          showBatchActions={showBatchActions}
          selectedChapterIds={selectedChapterIds}
          editingChapterId={editingChapterId}
          editingChapterTitle={editingChapterTitle}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={setSidebarOpen}
          onSelectChapter={selectChapter}
          onAddChapter={onAddChapter}
          onPublishChapter={publishChapter}
          onDeleteChapter={deleteChapter}
          onEditChapterTitle={setEditingChapterTitle}
          onSaveEditChapterTitle={(ch) => saveEditChapterTitle(ch)}
          onCancelEditChapterTitle={cancelEditChapterTitle}
          onToggleBatchActions={setShowBatchActions}
          onToggleChapterSelection={toggleChapterSelection}
          onToggleSelectAll={toggleSelectAll}
          onBatchDelete={handleBatchDelete}
          onSetChapterFilter={setChapterFilter}
          onShowTemplateModal={() => setShowTemplateModal(true)}
          addingChapter={addingChapter}
          mode={mode}
        />
      </div>

      {showDirectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDirectionModal(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 border border-zinc-200 dark:border-zinc-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">选择故事走向</h3>
            {loadingDirectionOptions ? (
              <p className="text-zinc-500 dark:text-zinc-400">加载中…</p>
            ) : directionOptions.length === 0 ? (
              <div className="space-y-2">
                <p className="text-zinc-500 dark:text-zinc-400">暂无选项，可直接生成。</p>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-primary" onClick={() => handleWriteBySetting(null)}>直接生成</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowDirectionModal(false)}>取消</button>
                </div>
              </div>
            ) : (
              <>
                <ul className="space-y-3 mb-4">
                  {directionOptions.map((opt, idx) => (
                    <li key={idx}>
                      <button
                        type="button"
                        className="w-full text-left p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        onClick={() => handleWriteBySetting(opt)}
                      >
                        <span className="font-medium block mb-1">{opt.title}</span>
                        {opt.description && <span className="text-sm text-zinc-500 dark:text-zinc-400">{opt.description}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-ghost" onClick={openSmartContinueModal} disabled={loadingDirectionOptions}>换一换</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowDirectionModal(false)}>取消</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showTemplateModal && (
        <TemplateModal
          show={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onApplyTemplate={applyTemplate}
          chapterTitle={chapterTitle}
        />
      )}

      {selectedChapterId && data && mode !== 'prNovel' && (
        <AiWritingPanel
          storyId={data.id}
          chapterId={selectedChapterId}
          currentContent={chapterContent}
          selectedText={selectedText}
          onInsert={handleAiInsert}
          onReplace={handleAiReplace}
        />
      )}
    </div>
  );
}
