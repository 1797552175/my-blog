'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  getStoryById,
  updateStory,
  listChapters,
  createChapter,
  updateChapter,
  deleteChapter,
} from '../../../../../services/stories';
import { isAuthed } from '../../../../../services/auth';
import { useToast } from '../../../../../components/Toast';
import AiWritingPanel from '../../../../../components/AiWritingPanel';
import * as inspirationsService from '../../../../../services/inspirations';

export default function EditStoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const { addToast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [story, setStory] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [title, setTitle] = useState('');
  const [storySummary, setStorySummary] = useState('');
  const [styleParams, setStyleParams] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [intentKeywords, setIntentKeywords] = useState('');
  const [tags, setTags] = useState('');
  const [published, setPublished] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadStory, setLoadStory] = useState(!!id);
  const [error, setError] = useState(null);
  const [addingChapter, setAddingChapter] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState('');
  const contentTextareaRef = useRef(null);
  const [selectedChapterIds, setSelectedChapterIds] = useState([]);
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [inspirations, setInspirations] = useState([]);
  const [loadingInspirations, setLoadingInspirations] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isAuthed());
  }, []);

  // 格式化章节标题，确保以「第xxx章」开头
  const formatChapterTitle = (sortOrder, title) => {
    const chapterPrefix = `第${sortOrder}章`;
    if (!title || title.trim() === '') {
      return chapterPrefix;
    }
    // 如果标题已经包含正确的章节前缀，直接返回
    if (title.trim().startsWith(chapterPrefix)) {
      return title.trim();
    }
    // 否则，添加章节前缀
    return `${chapterPrefix} ${title.trim()}`;
  };

  // 开始编辑章节标题
  const startEditChapterTitle = (chapter) => {
    setEditingChapterId(chapter.id);
    // 提取标题中的内容部分（去掉「第xxx章」前缀）
    const chapterPrefix = `第${chapter.sortOrder}章`;
    let titleContent = chapter.title || '';
    if (titleContent.startsWith(chapterPrefix)) {
      titleContent = titleContent.substring(chapterPrefix.length).trim();
    }
    setEditingChapterTitle(titleContent);
  };

  // 保存章节标题编辑
  const saveEditChapterTitle = async (chapter) => {
    try {
      const formattedTitle = formatChapterTitle(chapter.sortOrder, editingChapterTitle);
      await updateChapter(id, chapter.id, {
        title: formattedTitle,
        contentMarkdown: chapter.contentMarkdown,
      });
      const chList = await listChapters(id);
      let updatedChapters = Array.isArray(chList) ? chList : [];
      // 按照 sortOrder 升序排序
      updatedChapters.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(updatedChapters);
      // 如果当前选中的是编辑的章节，更新编辑区域的标题
      if (selectedChapterId === chapter.id) {
        setChapterTitle(formattedTitle);
      }
      setEditingChapterId(null);
      setEditingChapterTitle('');
      addToast('章节标题已更新');
    } catch (err) {
      setError(err?.message ?? '保存失败');
    }
  };

  // 取消编辑章节标题
  const cancelEditChapterTitle = () => {
    setEditingChapterId(null);
    setEditingChapterTitle('');
  };

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const storyId = parseInt(id);
      const [s, chList] = await Promise.all([
        getStoryById(storyId),
        listChapters(storyId).catch(() => []),
      ]);
      setStory(s);
      setTitle(s.title ?? '');
      setStorySummary(s.storySummary ?? '');
      setStyleParams(s.styleParams ?? '');
      setLicenseType(s.licenseType ?? '');
      setIntentKeywords(s.intentKeywords ?? '');
      setTags(s.tags?.join(', ') ?? '');
      setPublished(s.published ?? false);
      setIsCompleted(s.isCompleted ?? false);
      let ch = Array.isArray(chList) ? chList : [];
      
      // 按照 sortOrder 升序排序
      ch.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      
      setChapters(ch);
      if (ch.length > 0) {
        const keep = ch.some((c) => c.id === selectedChapterId);
        const first = keep ? ch.find((c) => c.id === selectedChapterId) : ch[0];
        if (!keep) {
          setSelectedChapterId(first.id);
        }
        setChapterTitle(first.title ?? '');
        setChapterContent(first.contentMarkdown ?? '');
      } else {
        // 没有章节时，清除选中的章节
        setSelectedChapterId(null);
        setChapterTitle('');
        setChapterContent('');
      }
    } catch (err) {
      setError(err?.message ?? '加载失败');
    } finally {
      setLoadStory(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isMounted) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/me/stories/' + id + '/edit');
      return;
    }
    load();
  }, [router, id, load, isAuthenticated, isMounted]);

  useEffect(() => {
    if (chapters.length === 0) return;
    const ch = chapters.find((c) => c.id === selectedChapterId);
    if (ch) {
      setChapterTitle(ch.title ?? '');
      setChapterContent(ch.contentMarkdown ?? '');
    }
  }, [selectedChapterId, chapters]);

  async function onSaveStoryMeta(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const storyId = parseInt(id);
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      await updateStory(storyId, {
        title: title.trim(),
        contentMarkdown: null,
        openingMarkdown: null,
        storySummary: storySummary.trim() || null,
        styleParams: styleParams.trim() || null,
        licenseType: licenseType.trim() || null,
        intentKeywords: intentKeywords.trim() || null,
        published,
        tags: tagList,
      });
      addToast('已保存');
    } catch (err) {
      setError(err?.message ?? '保存失败');
    } finally {
      setLoading(false);
    }
  }

  async function onSaveChapter(e) {
    e.preventDefault();
    if (!selectedChapterId) return;
    setError(null);
    setLoading(true);
    try {
      const storyId = parseInt(id);
      // 找到当前章节的 sortOrder
      const currentChapter = chapters.find(ch => ch.id === selectedChapterId);
      const sortOrder = currentChapter?.sortOrder || 1;
      
      // 格式化章节标题
      const formattedTitle = formatChapterTitle(sortOrder, chapterTitle);
      
      await updateChapter(storyId, selectedChapterId, {
        title: formattedTitle,
        contentMarkdown: chapterContent,
      });
      addToast('章节已保存');
      const chList = await listChapters(storyId);
      let updatedChapters = Array.isArray(chList) ? chList : [];
      // 按照 sortOrder 升序排序
      updatedChapters.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(updatedChapters);
      // 更新当前编辑的章节标题
      setChapterTitle(formattedTitle);
    } catch (err) {
      setError(err?.message ?? '保存失败');
    } finally {
      setLoading(false);
    }
  }

  async function onAddChapter() {
    setError(null);
    setAddingChapter(true);
    try {
      const storyId = parseInt(id);
      const newSortOrder = chapters.length + 1;
      const newChapterTitle = `第${newSortOrder}章`;
      
      const newCh = await createChapter(storyId, {
        title: newChapterTitle,
        contentMarkdown: '',
        sortOrder: newSortOrder,
      });
      const chList = await listChapters(storyId);
      let updatedChapters = Array.isArray(chList) ? chList : [];
      // 按照 sortOrder 升序排序
      updatedChapters.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(updatedChapters);
      setSelectedChapterId(newCh.id);
      setChapterTitle(newCh.title ?? newChapterTitle);
      setChapterContent(newCh.contentMarkdown ?? '');
      addToast('已添加章节');
    } catch (err) {
      setError(err?.message ?? '添加失败');
    } finally {
      setAddingChapter(false);
    }
  }

  async function onDeleteChapter(chapterId) {
    if (!confirm('确定删除该章节？')) return;
    setError(null);
    try {
      const storyId = parseInt(id);
      await deleteChapter(storyId, chapterId);
      const chList = await listChapters(storyId);
      let updatedChapters = Array.isArray(chList) ? chList : [];
      // 按照 sortOrder 升序排序
      updatedChapters.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      
      // 更新章节标题，确保序号正确
      for (let i = 0; i < updatedChapters.length; i++) {
        const chapter = updatedChapters[i];
        const expectedTitle = `第${i + 1}章`;
        // 检查当前标题是否包含正确的章节前缀
        if (!chapter.title || !chapter.title.startsWith(expectedTitle)) {
          // 提取标题中的内容部分（去掉旧的章节前缀）
          let titleContent = chapter.title || '';
          const oldPrefixMatch = titleContent.match(/^第\d+章/);
          if (oldPrefixMatch) {
            titleContent = titleContent.substring(oldPrefixMatch[0].length).trim();
          }
          // 生成新的标题
          const newTitle = titleContent ? `${expectedTitle} ${titleContent}` : expectedTitle;
          // 更新章节标题
          await updateChapter(storyId, chapter.id, {
            title: newTitle,
            contentMarkdown: chapter.contentMarkdown,
          });
          // 更新本地章节数据
          chapter.title = newTitle;
        }
      }
      
      setChapters(updatedChapters);
      if (selectedChapterId === chapterId) {
        const next = updatedChapters[0];
        setSelectedChapterId(next?.id ?? null);
        setChapterTitle(next?.title ?? '');
        setChapterContent(next?.contentMarkdown ?? '');
      }
      addToast('已删除');
    } catch (err) {
      setError(err?.message ?? '删除失败');
    }
  }

  // 处理文本选择
  function handleTextSelection() {
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
  }

  // AI写作：插入到末尾
  function handleAiInsert(content) {
    setChapterContent((prev) => prev + '\n\n' + content);
    addToast('已插入到章节末尾', 'success');
  }

  // AI写作：替换选中文本
  function handleAiReplace(oldText, newText) {
    setChapterContent((prev) => prev.replace(oldText, newText));
    setSelectedText('');
    addToast('已替换选中文本', 'success');
  }

  // 批量操作：选择/取消选择章节
  function toggleChapterSelection(chapterId) {
    setSelectedChapterIds(prev => 
      prev.includes(chapterId) 
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  }

  // 批量操作：全选/取消全选
  function toggleSelectAll() {
    if (selectedChapterIds.length === chapters.length) {
      setSelectedChapterIds([]);
    } else {
      setSelectedChapterIds(chapters.map(ch => ch.id));
    }
  }

  // 批量操作：删除选中章节
  async function handleBatchDelete() {
    if (selectedChapterIds.length === 0) {
      addToast('请先选择要删除的章节');
      return;
    }
    if (!confirm(`确定删除选中的 ${selectedChapterIds.length} 个章节？`)) return;
    
    setError(null);
    try {
      const storyId = parseInt(id);
      await Promise.all(selectedChapterIds.map(chapterId => deleteChapter(storyId, chapterId)));
      const chList = await listChapters(storyId);
      let updatedChapters = Array.isArray(chList) ? chList : [];
      updatedChapters.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(updatedChapters);
      setSelectedChapterIds([]);
      setShowBatchActions(false);
      if (updatedChapters.length > 0) {
        setSelectedChapterId(updatedChapters[0].id);
        setChapterTitle(updatedChapters[0].title ?? '');
        setChapterContent(updatedChapters[0].contentMarkdown ?? '');
      } else {
        setSelectedChapterId(null);
        setChapterTitle('');
        setChapterContent('');
      }
      addToast(`已删除 ${selectedChapterIds.length} 个章节`);
    } catch (err) {
      setError(err?.message ?? '批量删除失败');
    }
  }

  // 模板功能：应用模板
  function applyTemplate(template) {
    if (!selectedChapterId) {
      addToast('请先选择一个章节');
      return;
    }
    const templateContent = template.content.replace('{{chapterTitle}}', chapterTitle);
    setChapterContent(templateContent);
    setShowTemplateModal(false);
    addToast('已应用模板');
  }

  // 获取灵感列表
  async function loadInspirations() {
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
  }

  // 从灵感创建章节
  async function createChapterFromInspiration(inspiration) {
    try {
      setAddingChapter(true);
      
      // 生成章节标题
      const storyId = parseInt(id);
      const newSortOrder = 1;
      const newChapterTitle = `第${newSortOrder}章`;
      
      // 创建章节
      const newCh = await createChapter(storyId, {
        title: newChapterTitle,
        contentMarkdown: `# ${newChapterTitle}\n\n${inspiration.content || ''}`,
        sortOrder: newSortOrder,
      });
      
      // 重新加载章节列表
      const chList = await listChapters(storyId);
      let updatedChapters = Array.isArray(chList) ? chList : [];
      updatedChapters.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(updatedChapters);
      
      // 选中新创建的章节
      setSelectedChapterId(newCh.id);
      setChapterTitle(newCh.title ?? newChapterTitle);
      setChapterContent(newCh.contentMarkdown ?? '');
      
      addToast('已从灵感创建章节');
    } catch (err) {
      setError(err?.message ?? '创建章节失败');
      addToast('创建章节失败，请重试');
    } finally {
      setAddingChapter(false);
    }
  }

  if (loadStory) {
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
          <Link href="/me/stories" className="text-sm px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors">
            ← 我的小说
          </Link>
          {!isCompleted && (
            <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-full px-2 py-1">
              <Link href={`/me/stories/${id}/branches`} className="text-sm px-2 py-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700/50 transition-colors">分支</Link>
              <Link href={`/me/stories/${id}/settings`} className="text-sm px-2 py-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700/50 transition-colors">设定</Link>
              <Link href={`/me/stories/${id}/pull-requests`} className="text-sm px-2 py-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700/50 transition-colors">PR</Link>
              <Link href={`/me/stories/${id}/manage`} className="text-sm px-2 py-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700/50 transition-colors">管理</Link>
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold mb-4">{selectedChapterId ? chapterTitle : '编辑小说'}</h1>

        {error ? (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        ) : null}

        <div className="flex gap-2 flex-row">
          {/* 当前章节编辑 */}
          <main className="flex-1 min-w-0">
            {chapters.length === 0 ? (
              <div className="h-screen flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800">
                <div className="w-full max-w-2xl">
                  <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-8 mb-8">
                    <div className="mb-6 text-6xl flex justify-center">📝</div>
                    <h2 className="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">还没有章节</h2>
                    <p className="text-zinc-600 dark:text-zinc-400 mb-8">
                      开始创作你的小说吧！选择下方方式创建第一章。
                    </p>
                    
                    <div className="space-y-4">
                      <button
                        type="button"
                        className="btn bg-indigo-600 text-white text-lg px-8 py-4 w-full rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
                        onClick={onAddChapter}
                        disabled={addingChapter}
                      >
                        {addingChapter ? '创建中…' : '手动创建第一章'}
                      </button>
                      
                      <div className="space-y-3">
                        <button
                          type="button"
                          className="btn btn-ghost text-lg px-8 py-4 w-full border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                          onClick={loadInspirations}
                          disabled={loadingInspirations}
                        >
                          {loadingInspirations ? '加载中…' : '从灵感库创建'}
                        </button>
                        
                        {inspirations.length > 0 && (
                          <div className="mt-4 space-y-3 max-h-80 overflow-y-auto p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                            <h3 className="font-medium text-zinc-700 dark:text-zinc-300 mb-3">灵感列表</h3>
                            {inspirations.map((inspiration) => (
                              <div 
                                key={inspiration.id} 
                                className="p-4 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors border border-zinc-100 dark:border-zinc-700"
                                onClick={() => createChapterFromInspiration(inspiration)}
                              >
                                <h4 className="font-medium text-zinc-800 dark:text-zinc-200 mb-2">
                                  {inspiration.title || '未命名灵感'}
                                </h4>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
                                  {inspiration.content || '无内容'}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {inspirations.length === 0 && loadingInspirations === false && (
                          <div className="mt-4 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 text-center">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              灵感库为空，快去首页获取灵感吧！
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : selectedChapterId ? (
              <form onSubmit={onSaveChapter} className="space-y-4 h-screen flex flex-col">
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-end mb-1 flex-shrink-0">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      选中文本后可使用AI改写/扩写/润色
                    </span>
                  </div>
                  <textarea
                    ref={contentTextareaRef}
                    value={chapterContent}
                    onChange={(e) => setChapterContent(e.target.value)}
                    onSelect={handleTextSelection}
                    onMouseUp={handleTextSelection}
                    onKeyUp={handleTextSelection}
                    className="input w-full h-full min-h-[calc(100vh-200px)] font-mono text-sm"
                    placeholder="输入章节内容..."
                  />
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button type="submit" className="btn bg-indigo-600 text-white" disabled={loading}>
                    {loading ? '保存中…' : '存草稿'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={onSaveStoryMeta} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    小说书名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input w-full text-lg"
                    placeholder="给你的小说起个吸引人的名字"
                    maxLength={200}
                  />
                  <p className="mt-1 text-xs text-zinc-500">{title.length}/200 字符</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    小说简介 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={storySummary}
                    onChange={(e) => setStorySummary(e.target.value)}
                    className="input w-full min-h-[120px]"
                    placeholder="简要介绍你的小说故事背景、主线剧情，帮助AI理解你的创作意图..."
                    maxLength={2000}
                  />
                  <p className="mt-1 text-xs text-zinc-500">{storySummary.length}/2000 字符</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    文风设定
                  </label>
                  <textarea
                    value={styleParams}
                    onChange={(e) => setStyleParams(e.target.value)}
                    className="input w-full min-h-[80px]"
                    placeholder="描述你想要的写作风格，例如：轻松幽默、严肃深沉、古风雅致等..."
                    maxLength={2000}
                  />
                  <p className="mt-1 text-xs text-zinc-500">{styleParams.length}/2000 字符</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    标签
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="input w-full"
                    placeholder="用逗号分隔，例如：科幻,冒险,悬疑"
                  />
                  <p className="mt-1 text-xs text-zinc-500">用逗号分隔多个标签</p>
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="btn bg-indigo-600 text-white" disabled={loading}>
                    {loading ? '保存中…' : '保存'}
                  </button>
                </div>
              </form>
            )}
          </main>

          {/* 章节目录 */}
          <aside className={`${sidebarOpen ? 'w-72' : 'w-10'} shrink-0 transition-all duration-300 flex justify-end`}>
            {sidebarOpen ? (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3 h-screen sticky top-0 w-full">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">章节目录</h2>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost"
                      onClick={() => setShowBatchActions(!showBatchActions)}
                      title="批量操作"
                    >
                      ☰
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost"
                      onClick={() => setShowTemplateModal(true)}
                      title="模板"
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setSidebarOpen(false)}
                    >
                      ◀
                    </button>
                  </div>
                </div>

                {showBatchActions && (
                  <div className="mb-3 p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedChapterIds.length === chapters.length && chapters.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4"
                        />
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">
                          已选择 {selectedChapterIds.length} / {chapters.length} 个章节
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        onClick={() => setShowBatchActions(false)}
                      >
                        ✕
                      </button>
                    </div>
                    {selectedChapterIds.length > 0 && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn btn-xs btn-danger"
                          onClick={handleBatchDelete}
                        >
                          删除选中
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-sm w-full mb-3"
                  onClick={onAddChapter}
                  disabled={addingChapter}
                >
                  {addingChapter ? '添加中…' : '+ 添加章节'}
                </button>

                <ul className="space-y-1 overflow-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                  {chapters.map((ch) => (
                    <li 
                      key={ch.id} 
                      className="relative w-full"
                    >
                      {showBatchActions && (
                        <input
                          type="checkbox"
                          checked={selectedChapterIds.includes(ch.id)}
                          onChange={() => toggleChapterSelection(ch.id)}
                          className="absolute top-3 left-3 w-4 h-4 z-10"
                        />
                      )}
                      {editingChapterId === ch.id ? (
                        // 编辑模式
                        <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                          <input
                            type="text"
                            value={editingChapterTitle}
                            onChange={(e) => setEditingChapterTitle(e.target.value)}
                            className="input text-sm flex-1"
                            placeholder="输入章节标题"
                            autoFocus
                            onBlur={() => saveEditChapterTitle(ch)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') saveEditChapterTitle(ch);
                              if (e.key === 'Escape') cancelEditChapterTitle();
                            }}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="text-green-600 dark:text-green-400 hover:underline text-sm"
                              onClick={() => saveEditChapterTitle(ch)}
                            >
                              保存
                            </button>
                            <button
                              type="button"
                              className="text-zinc-500 dark:text-zinc-400 hover:underline text-sm"
                              onClick={cancelEditChapterTitle}
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        // 显示模式
                        <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <button
                            type="button"
                            onClick={() => setSelectedChapterId(ch.id)}
                            className={`text-left flex-1 truncate text-sm ${selectedChapterId === ch.id
                              ? 'text-indigo-800 dark:text-indigo-200'
                              : 'text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {ch.title || '未命名'}
                          </button>
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            {!published && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPublished(true);
                                  onSaveStoryMeta(new Event('submit'));
                                }}
                                className="text-xs px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 rounded transition-colors"
                                title="发布小说"
                              >
                                发布
                              </button>
                            )}
                            {published && (
                              <span className="text-xs px-2 py-1 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded">
                                已发布
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => startEditChapterTitle(ch)}
                              className="p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-sm transition-colors"
                              title="编辑标题"
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteChapter(ch.id)}
                              className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-sm transition-colors"
                              title="删除章节"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <button
                type="button"
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-2 h-10 w-10 sticky top-0 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
                onClick={() => setSidebarOpen(true)}
                title="展开章节目录"
              >
                ▶
              </button>
            )}
          </aside>
        </div>

        {/* 模板模态框 */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">章节模板</h3>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="btn btn-sm btn-ghost"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'standard', name: '标准章节', content: '# {{chapterTitle}}\n\n在这里编写章节内容...\n\n## 剧情发展\n\n## 人物对话\n\n## 场景描写' },
                  { id: 'dialogue', name: '对话为主', content: '# {{chapterTitle}}\n\n**人物A**：\n\n**人物B**：\n\n（动作描写）\n\n**人物A**：' },
                  { id: 'action', name: '动作场景', content: '# {{chapterTitle}}\n\n（场景描写）\n\n**动作描述**：\n\n**结果**：\n\n（后续发展）' },
                  { id: 'climax', name: '高潮章节', content: '# {{chapterTitle}}\n\n## 冲突升级\n\n## 关键转折\n\n## 高潮时刻\n\n## 后果影响' },
                ].map(template => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left transition-all"
                  >
                    <h4 className="font-medium text-zinc-800 dark:text-zinc-200 mb-2">{template.name}</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-3">
                      {template.content}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI写作面板 */}
        {selectedChapterId && story && (
          <AiWritingPanel
            storyId={story.id}
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
