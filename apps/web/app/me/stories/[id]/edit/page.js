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
  publishChapter,
  unpublishChapter,
} from '../../../../../services/stories';
import { isAuthed } from '../../../../../services/auth';
import { useToast } from '../../../../../components/Toast';
import AiWritingPanel from '../../../../../components/AiWritingPanel';
import { streamAiWrite, WRITING_TYPE_FROM_SETTING, generateDirectionOptions } from '../../../../../services/aiWriting';
import * as inspirationsService from '../../../../../services/inspirations';
import { SparklesIcon } from '@heroicons/react/24/outline';

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
  const [isEditingMainTitle, setIsEditingMainTitle] = useState(false);
  const [mainTitleInput, setMainTitleInput] = useState('');
  const [chapterFilter, setChapterFilter] = useState('published'); // 'all', 'published', 'draft'
  const contentTextareaRef = useRef(null);
  const [generatingBySetting, setGeneratingBySetting] = useState(false);
  const bySettingAbortRef = useRef(null);
  const bySettingAccumulatedRef = useRef('');
  const originalTitleBeforeGenerateRef = useRef('');
  const originalContentBeforeGenerateRef = useRef('');
  const [showDirectionModal, setShowDirectionModal] = useState(false);
  const [directionOptions, setDirectionOptions] = useState([]);
  const [loadingDirectionOptions, setLoadingDirectionOptions] = useState(false);
  /** 智能续写模式：有值表示「续写当前章」（前文到 sortOrder-1），无值表示「续写下一章」 */
  const smartContinueNextChapterSortOrderRef = useRef(null);
  const [selectedChapterIds, setSelectedChapterIds] = useState([]);
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [inspirations, setInspirations] = useState([]);
  const [loadingInspirations, setLoadingInspirations] = useState(false);
  
  // 跟踪原始章节内容，用于判断是否有变更
  const [originalChapterTitle, setOriginalChapterTitle] = useState('');
  const [originalChapterContent, setOriginalChapterContent] = useState('');

  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isAuthed());
  }, []);

  // 页面离开前自动保存
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (selectedChapterId) {
        // 使用同步请求确保保存完成
        autoSaveChapter();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [selectedChapterId, chapterTitle, chapterContent, chapters]);

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
      const result = await updateChapter(id, chapter.id, {
        title: formattedTitle,
        contentMarkdown: chapter.contentMarkdown,
      });
      if (result?.warning) {
        addToast(result.warning);
      }
      const chList = await listChapters(id);
      let updatedChapters = Array.isArray(chList) ? chList : [];
      updatedChapters.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(updatedChapters);
      if (selectedChapterId === chapter.id) {
        setChapterTitle(formattedTitle);
      }
      setEditingChapterId(null);
      setEditingChapterTitle('');
      if (!result?.warning) {
        addToast('章节标题已更新');
      }
    } catch (err) {
      setError(err?.message ?? '保存失败');
    }
  };

  // 取消编辑章节标题
  const cancelEditChapterTitle = () => {
    setEditingChapterId(null);
    setEditingChapterTitle('');
  };

  // 开始编辑主标题（内容区域上方的章节标题）
  const startEditMainTitle = () => {
    if (!selectedChapterId) return;
    const currentChapter = chapters.find(ch => ch.id === selectedChapterId);
    if (!currentChapter) return;
    
    // 提取标题中的内容部分（去掉「第xxx章」前缀）
    const chapterPrefix = `第${currentChapter.sortOrder}章`;
    let titleContent = currentChapter.title || '';
    if (titleContent.startsWith(chapterPrefix)) {
      titleContent = titleContent.substring(chapterPrefix.length).trim();
    }
    setMainTitleInput(titleContent);
    setIsEditingMainTitle(true);
  };

  // 保存主标题编辑
  const saveMainTitle = async () => {
    if (!selectedChapterId) return;
    const currentChapter = chapters.find(ch => ch.id === selectedChapterId);
    if (!currentChapter) return;
    
    try {
      const formattedTitle = formatChapterTitle(currentChapter.sortOrder, mainTitleInput);
      const result = await updateChapter(id, currentChapter.id, {
        title: formattedTitle,
        contentMarkdown: currentChapter.contentMarkdown,
      });
      if (result?.warning) {
        addToast(result.warning);
      }
      const chList = await listChapters(id);
      let updatedChapters = Array.isArray(chList) ? chList : [];
      updatedChapters.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(updatedChapters);
      setChapterTitle(formattedTitle);
      setIsEditingMainTitle(false);
      setMainTitleInput('');
      if (!result?.warning) {
        addToast('章节标题已更新');
      }
    } catch (err) {
      setError(err?.message ?? '保存失败');
    }
  };

  // 取消主标题编辑
  const cancelEditMainTitle = () => {
    setIsEditingMainTitle(false);
    setMainTitleInput('');
  };

  // 发布章节
  const handlePublishChapter = async (chapterId) => {
    try {
      const storyId = parseInt(id);
      
      // 获取当前章节信息
      const chapterToPublish = chapters.find(ch => ch.id === chapterId);
      if (!chapterToPublish) {
        throw new Error('章节不存在');
      }
      
      // 计算已发布章节数量，确定新的 sortOrder
      const publishedChapters = chapters.filter(ch => ch.published);
      const newSortOrder = publishedChapters.length + 1;
      
      // 先更新章节标题（添加序号）和 sortOrder
      const formattedTitle = formatChapterTitle(newSortOrder, chapterToPublish.title);
      await updateChapter(storyId, chapterId, {
        title: formattedTitle,
        contentMarkdown: chapterToPublish.contentMarkdown,
        sortOrder: newSortOrder,
      });
      
      // 然后发布章节（会触发预压缩，失败时返回 warning）
      const publishRes = await publishChapter(storyId, chapterId);
      if (publishRes?.warning) {
        addToast(publishRes.warning);
      }

      const chList = await listChapters(storyId);
      let updatedChapters = Array.isArray(chList) ? chList : [];
      updatedChapters.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(updatedChapters);

      // 如果当前正在编辑这个章节，更新标题显示
      if (selectedChapterId === chapterId) {
        setChapterTitle(formattedTitle);
      }

      addToast('章节已发布');
    } catch (err) {
      setError(err?.message ?? '发布失败');
    }
  };

  // 取消发布章节
  const handleUnpublishChapter = async (chapterId) => {
    try {
      const storyId = parseInt(id);
      await unpublishChapter(storyId, chapterId);
      const chList = await listChapters(storyId);
      let updatedChapters = Array.isArray(chList) ? chList : [];
      updatedChapters.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(updatedChapters);
      addToast('章节已取消发布');
    } catch (err) {
      setError(err?.message ?? '取消发布失败');
    }
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

  // 自动保存当前章节（仅在内容有变更时触发）
  const autoSaveChapter = async () => {
    if (!selectedChapterId) return;
    
    // 检查内容是否有变更
    const hasTitleChanged = chapterTitle !== originalChapterTitle;
    const hasContentChanged = chapterContent !== originalChapterContent;
    
    if (!hasTitleChanged && !hasContentChanged) {
      console.log('DEBUG: 章节内容无变更，跳过自动保存');
      return;
    }
    
    try {
      const storyId = parseInt(id);
      const currentChapter = chapters.find(ch => ch.id === selectedChapterId);
      if (!currentChapter) return;
      
      const sortOrder = currentChapter?.sortOrder || 1;
      // 草稿章节不添加序号前缀，已发布章节添加序号
      const formattedTitle = currentChapter.published 
        ? formatChapterTitle(sortOrder, chapterTitle)
        : chapterTitle;
      
      await updateChapter(storyId, selectedChapterId, {
        title: formattedTitle,
        contentMarkdown: chapterContent,
      });
      
      // 更新原始内容
      setOriginalChapterTitle(formattedTitle);
      setOriginalChapterContent(chapterContent);
      
      // 静默保存，不显示提示
      const chList = await listChapters(storyId);
      let updatedChapters = Array.isArray(chList) ? chList : [];
      updatedChapters.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(updatedChapters);
      
      console.log('DEBUG: 自动保存成功，章节ID=', selectedChapterId);
    } catch (err) {
      console.error('自动保存失败:', err);
    }
  };

  // 切换章节时自动保存
  const handleSelectChapter = async (chapterId) => {
    // 如果当前有选中的章节，先自动保存
    if (selectedChapterId && selectedChapterId !== chapterId) {
      await autoSaveChapter();
    }
    setSelectedChapterId(chapterId);
  };

  useEffect(() => {
    if (chapters.length === 0) return;
    const ch = chapters.find((c) => c.id === selectedChapterId);
    if (ch) {
      setChapterTitle(ch.title ?? '');
      setChapterContent(ch.contentMarkdown ?? '');
      // 更新原始内容
      setOriginalChapterTitle(ch.title ?? '');
      setOriginalChapterContent(ch.contentMarkdown ?? '');
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
      
      console.log('DEBUG: calling updateChapter, storyId=', storyId, 'chapterId=', selectedChapterId);
      const result = await updateChapter(storyId, selectedChapterId, {
        title: formattedTitle,
        contentMarkdown: chapterContent,
      });
      
      // 详细打印结果，包含AI调试信息
      console.group('DEBUG: updateChapter result');
      console.log('章节信息:', result?.chapter);
      console.log('警告信息:', result?.warning || '无');
      if (result?.debugInfo) {
        console.group('AI调试信息');
        console.log('章节ID:', result.debugInfo.chapterId);
        console.log('发布状态:', result.debugInfo.published);
        console.log('内容长度:', result.debugInfo.contentLength);
        if (result.debugInfo.aiLogs) {
          console.group('AI调用日志');
          
          // 先显示基本信息
          Object.entries(result.debugInfo.aiLogs).forEach(([key, value]) => {
            if (!key.startsWith('AI-FullContext')) {
              console.log(`${key}:`, value);
            }
          });
          
          // 显示完整上下文（支持分段）
          if (result.debugInfo.aiLogs['AI-FullContext']) {
            console.log('%c【AI完整上下文】', 'color: #0066cc; font-weight: bold;');
            console.log(result.debugInfo.aiLogs['AI-FullContext']);
          } else if (result.debugInfo.aiLogs['AI-FullContext-Segments']) {
            // 分段显示
            const segmentCount = parseInt(result.debugInfo.aiLogs['AI-FullContext-Segments']);
            const totalLength = result.debugInfo.aiLogs['AI-FullContext-Length'];
            console.log('%c【AI完整上下文】', 'color: #0066cc; font-weight: bold;');
            console.log(`总长度: ${totalLength} 字符，共 ${segmentCount} 段`);
            
            for (let i = 1; i <= segmentCount; i++) {
              const partKey = `AI-FullContext-Part${i}`;
              if (result.debugInfo.aiLogs[partKey]) {
                console.log(`--- 第 ${i}/${segmentCount} 段 ---`);
                console.log(result.debugInfo.aiLogs[partKey]);
              }
            }
          }
          
          console.groupEnd();
        }
        console.groupEnd();
      }
      console.groupEnd();
      
      if (result?.warning) {
        addToast(result.warning);
      } else {
        addToast('章节已保存');
      }
      
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
      
      // 如果当前有选中的章节，先自动保存
      if (selectedChapterId) {
        await autoSaveChapter();
      }
      
      let newSortOrder;
      let newChapterTitle;
      
      // 根据当前筛选按钮决定添加逻辑
      if (chapterFilter === 'published') {
        // 当前在已发布选项，在已发布章节最后添加
        const publishedChapters = chapters.filter(ch => ch.published);
        newSortOrder = publishedChapters.length + 1;
        newChapterTitle = `第${newSortOrder}章`;
      } else {
        // 当前在草稿选项，添加草稿
        newSortOrder = chapters.length + 1;
        newChapterTitle = '草稿';
      }
      
      const requestData = {
        title: newChapterTitle,
        contentMarkdown: '',
        sortOrder: newSortOrder,
        published: chapterFilter === 'published', // 已发布选项下直接发布
      };
      console.log('DEBUG Frontend: chapterFilter=', chapterFilter, 'requestData=', requestData);
      const newCh = await createChapter(storyId, requestData);
      console.log('DEBUG Frontend: created chapter=', newCh);
      const chList = await listChapters(storyId);
      let updatedChapters = Array.isArray(chList) ? chList : [];
      // 按照 sortOrder 升序排序
      updatedChapters.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(updatedChapters);
      setSelectedChapterId(newCh.id);
      setChapterTitle(newCh.title ?? newChapterTitle);
      setChapterContent(newCh.contentMarkdown ?? '');
      addToast(chapterFilter === 'published' ? '已添加章节' : '已添加草稿');
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
          }).catch(() => {});
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

  // 智能续写：先弹窗选故事走向，再根据系统 prompt + 选项生成标题+正文
  // nextChapterSortOrder：有值表示重写当前章（前文到该章前一章），无值表示续写下一章
  async function openSmartContinueModal(nextChapterSortOrder = null) {
    if (!id) return;
    smartContinueNextChapterSortOrderRef.current = nextChapterSortOrder;
    setShowDirectionModal(true);
    setLoadingDirectionOptions(true);
    setDirectionOptions([]);
    setError(null);
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
  }

  // 智能续写下一章：同「添加章节」——先保存当前、若当前为草稿则发布，再新增一章（第N章、已发布），再打开选项弹窗
  async function prepareAndOpenSmartContinueNext() {
    if (!id) return;
    const storyId = parseInt(id);
    setError(null);
    setAddingChapter(true);
    try {
      if (selectedChapterId) {
        await autoSaveChapter();
      }
      let list = [...chapters];
      const currentCh = selectedChapterId ? list.find(ch => ch.id === selectedChapterId) : null;
      if (currentCh?.published === false) {
        await publishChapter(storyId, currentCh.id);
        const afterPublish = await listChapters(storyId);
        list = Array.isArray(afterPublish) ? afterPublish : [];
        list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setChapters(list);
      }
      const publishedChapters = list.filter(ch => ch.published);
      const newSortOrder = publishedChapters.length + 1;
      const newChapterTitle = `第${newSortOrder}章`;
      const newCh = await createChapter(storyId, {
        title: newChapterTitle,
        contentMarkdown: '',
        sortOrder: newSortOrder,
        published: true,
      });
      const chList = await listChapters(storyId);
      let updatedChapters = Array.isArray(chList) ? chList : [];
      updatedChapters.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(updatedChapters);
      setSelectedChapterId(newCh.id);
      setChapterTitle(newCh.title ?? newChapterTitle);
      setChapterContent(newCh.contentMarkdown ?? '');
      setAddingChapter(false);
      await openSmartContinueModal();
    } catch (e) {
      setAddingChapter(false);
      addToast(e?.message ?? '操作失败');
    }
  }

  async function handleWriteBySetting(selectedOption) {
    if (!id || generatingBySetting) return;
    setShowDirectionModal(false);
    setError(null);
    bySettingAccumulatedRef.current = '';
    const nextChapterSortOrder = smartContinueNextChapterSortOrderRef.current ?? undefined;
    let targetChapterId = selectedChapterId;
    let targetSortOrder = 1;

    try {
      const storyId = parseInt(id);
      // 重写当前章：写入已选中的已发布章节，不创建新章
      if (nextChapterSortOrder != null && selectedChapterId) {
        const cur = chapters.find(ch => ch.id === selectedChapterId);
        if (cur) {
          targetChapterId = cur.id;
          targetSortOrder = cur.sortOrder ?? 1;
        }
      } else if (nextChapterSortOrder == null && selectedChapterId) {
        // 续写下一章：章节已在 prepareAndOpenSmartContinueNext 中创建并选中
        const cur = chapters.find(ch => ch.id === selectedChapterId);
        targetChapterId = selectedChapterId;
        targetSortOrder = cur?.sortOrder ?? 1;
      } else if (chapters.length === 0) {
        setAddingChapter(true);
        const newCh = await createChapter(storyId, {
          title: '草稿',
          contentMarkdown: '',
          sortOrder: 1,
          published: false,
        });
        const chList = await listChapters(storyId);
        let updatedChapters = Array.isArray(chList) ? chList : [];
        updatedChapters.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setChapters(updatedChapters);
        setSelectedChapterId(newCh.id);
        targetChapterId = newCh.id;
        targetSortOrder = newCh.sortOrder ?? 1;
        setAddingChapter(false);
      } else {
        setAddingChapter(true);
        const newSortOrder = chapters.length + 1;
        const newCh = await createChapter(storyId, {
          title: '草稿',
          contentMarkdown: '',
          sortOrder: newSortOrder,
          published: false,
        });
        const chList = await listChapters(storyId);
        let updatedChapters = Array.isArray(chList) ? chList : [];
        updatedChapters.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setChapters(updatedChapters);
        setSelectedChapterId(newCh.id);
        targetChapterId = newCh.id;
        targetSortOrder = newCh.sortOrder ?? newSortOrder;
        setAddingChapter(false);
      }

      // 保存生成前的原始内容
      originalTitleBeforeGenerateRef.current = chapterTitle;
      originalContentBeforeGenerateRef.current = chapterContent;
      
      setChapterTitle('');
      setChapterContent('');
      setGeneratingBySetting(true);
      bySettingAbortRef.current = new AbortController();

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
          updateChapter(storyId, targetChapterId, {
            title: formattedTitle,
            contentMarkdown: parsedBody,
          }).then(() => {
            listChapters(storyId).then(chList => {
              let updatedChapters = Array.isArray(chList) ? chList : [];
              updatedChapters.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
              setChapters(updatedChapters);
            });
          }).catch(() => {});
          setGeneratingBySetting(false);
        },
        (err) => {
          setGeneratingBySetting(false);
          if (err?.message !== '已取消') {
            setError(err?.message ?? '生成失败');
            addToast(err?.message ?? '生成失败');
          }
        },
        bySettingAbortRef.current.signal
      );
    } catch (err) {
      setGeneratingBySetting(false);
      setError(err?.message ?? '生成失败');
      addToast(err?.message ?? '生成失败');
    }
  }

  function cancelWriteBySetting() {
    if (bySettingAbortRef.current) {
      bySettingAbortRef.current.abort();
      bySettingAbortRef.current = null;
    }
    // 恢复生成前的原始内容
    setChapterTitle(originalTitleBeforeGenerateRef.current);
    setChapterContent(originalContentBeforeGenerateRef.current);
    setGeneratingBySetting(false);
    addToast('已取消生成，已恢复原文');
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
        <div className="flex items-center justify-between gap-4 mb-4">
          {isEditingMainTitle ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <input
                type="text"
                value={mainTitleInput}
                onChange={(e) => setMainTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveMainTitle();
                  if (e.key === 'Escape') cancelEditMainTitle();
                }}
                onBlur={saveMainTitle}
                className="input w-96 text-xl font-bold py-1 px-3"
                placeholder="输入章节标题"
                autoFocus
              />
            </div>
          ) : (
            <h1
              className="text-2xl font-bold min-w-0 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group flex items-center gap-2"
              onClick={startEditMainTitle}
              title="点击编辑章节标题"
            >
              {selectedChapterId ? (
                (() => {
                  const currentCh = chapters.find(ch => ch.id === selectedChapterId);
                  if (!currentCh) return chapterTitle;
                  if (currentCh.published) return chapterTitle;
                  const match = chapterTitle.match(/^第\d+章\s*(.*)$/);
                  return match ? match[1] : chapterTitle;
                })()
              ) : '编辑小说'}
              {selectedChapterId && (
                <span className="text-sm text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  ✏️
                </span>
              )}
            </h1>
          )}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {generatingBySetting ? (
              <button
                type="button"
                className="btn btn-sm bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                onClick={cancelWriteBySetting}
              >
                取消生成
              </button>
            ) : (() => {
              const publishedChapters = chapters.filter(ch => ch.published);
              const nextChapterNumber = publishedChapters.length === 0 ? 1 : Math.max(0, ...publishedChapters.map(ch => ch.sortOrder ?? 0)) + 1;
              const currentChapter = selectedChapterId ? chapters.find(ch => ch.id === selectedChapterId) : null;
              const showRewriteCurrent = currentChapter?.published === true;
              return (
                <>
                  {showRewriteCurrent && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-base font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm"
                      onClick={() => openSmartContinueModal(currentChapter.sortOrder)}
                    >
                      <SparklesIcon className="w-5 h-5 flex-shrink-0" aria-hidden />
                      智能重写第{currentChapter.sortOrder}章
                    </button>
                  )}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-base font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm"
                    onClick={prepareAndOpenSmartContinueNext}
                  >
                    <SparklesIcon className="w-5 h-5 flex-shrink-0" aria-hidden />
                    智能续写第{nextChapterNumber}章
                  </button>
                </>
              );
            })()}
            <span
              className="cursor-help text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-sm w-5 h-5 rounded-full border border-zinc-300 dark:border-zinc-600 flex items-center justify-center flex-shrink-0"
              title="用设定写：仅根据本小说的标题、简介、风格、角色与术语设定生成内容，不依赖当前章节。与「AI 辅助写作」的区别是后者会结合前文与当前章续写。"
            >
              ?
            </span>
          </div>
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
                    {loading ? '保存中…' : (
                      selectedChapterId ? (
                        // 查找选中的章节
                        chapters.find(ch => ch.id === selectedChapterId)?.published 
                          ? '更新章节'
                          : '存草稿'
                      ) : '存草稿'
                    )}
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
                  {addingChapter ? '添加中…' : (chapterFilter === 'published' ? '+ 添加章节' : '+ 添加草稿')}
                </button>

                {/* 章节筛选选项 */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    className={`btn btn-xs ${chapterFilter === 'published' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setChapterFilter('published')}
                  >
                    已发布
                  </button>
                  <button
                    type="button"
                    className={`btn btn-xs ${chapterFilter === 'draft' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setChapterFilter('draft')}
                  >
                    草稿
                  </button>
                </div>

                <ul className="space-y-1 overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                  {chapters
                    .filter(ch => {
                      if (chapterFilter === 'published') return ch.published;
                      if (chapterFilter === 'draft') return !ch.published;
                      return true;
                    })
                    .map((ch) => (
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
                            onClick={() => handleSelectChapter(ch.id)}
                            className={`text-left flex-1 truncate text-sm ${selectedChapterId === ch.id
                              ? 'text-indigo-800 dark:text-indigo-200'
                              : 'text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {/* 草稿章节不显示序号，只显示标题内容 */}
                            {ch.published 
                              ? (ch.title || '未命名')
                              : (() => {
                                  // 提取标题内容（去掉序号前缀）
                                  const match = (ch.title || '').match(/^第\d+章\s*(.*)$/);
                                  return match ? match[1] : (ch.title || '未命名');
                                })()
                            }
                          </button>
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            {/* 发布/取消发布按钮 */}
                            {!ch.published && (
                              <button
                                type="button"
                                onClick={() => handlePublishChapter(ch.id)}
                                className="text-xs px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 rounded transition-colors"
                                title="发布章节"
                              >
                                发布
                              </button>
                            )}
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
