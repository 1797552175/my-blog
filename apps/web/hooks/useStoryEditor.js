'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 通用的故事编辑器 Hook
 * 支持普通小说和 PR Novel 的编辑
 * 
 * @param {Object} options
 * @param {string} options.mode - 'story' | 'prNovel'
 * @param {string|number} options.id - storyId 或 prNovelId
 * @param {Object} options.api - API 方法集合
 * @param {Function} options.onError - 错误处理回调
 * @param {Function} options.onSuccess - 成功处理回调
 */
export function useStoryEditor({ mode, id, api, onError, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [error, setError] = useState(null);
  
  const contentTextareaRef = useRef(null);

  // 加载数据
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [itemData, chaptersData] = await Promise.all([
        api.getItem(id),
        api.listChapters(id).catch(() => []),
      ]);
      setData(itemData);
      const ch = Array.isArray(chaptersData) ? chaptersData : [];
      ch.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(ch);
      if (ch.length > 0 && !selectedChapterId) {
        setSelectedChapterId(ch[0].id);
        setChapterTitle(ch[0].title || '');
        setChapterContent(ch[0].contentMarkdown || '');
      }
    } catch (err) {
      setError(err?.message ?? '加载失败');
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [id, api, onError, selectedChapterId]);

  // 选择章节
  const selectChapter = useCallback(async (chapterId) => {
    // 先保存当前章节
    if (selectedChapterId && selectedChapterId !== chapterId) {
      await saveChapter(selectedChapterId);
    }
    setSelectedChapterId(chapterId);
    const ch = chapters.find(c => c.id === chapterId);
    if (ch) {
      setChapterTitle(ch.title || '');
      setChapterContent(ch.contentMarkdown || '');
    }
  }, [selectedChapterId, chapters]);

  // 保存章节
  const saveChapter = useCallback(async (chapterId = selectedChapterId) => {
    if (!chapterId) return;
    setSaving(true);
    try {
      const ch = chapters.find(c => c.id === chapterId);
      if (!ch) return;
      
      await api.updateChapter(id, chapterId, {
        title: chapterTitle,
        contentMarkdown: chapterContent,
        sortOrder: ch.sortOrder,
      });
      
      // 刷新章节列表
      const chaptersData = await api.listChapters(id);
      const chList = Array.isArray(chaptersData) ? chaptersData : [];
      chList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setChapters(chList);
      
      onSuccess?.('章节已保存');
    } catch (err) {
      onError?.(err);
    } finally {
      setSaving(false);
    }
  }, [id, selectedChapterId, chapterTitle, chapterContent, chapters, api, onError, onSuccess]);

  // 创建章节
  const createChapter = useCallback(async (chapterData) => {
    setSaving(true);
    try {
      await api.createChapter(id, chapterData);
      await load();
      onSuccess?.('章节已创建');
    } catch (err) {
      onError?.(err);
    } finally {
      setSaving(false);
    }
  }, [id, api, load, onError, onSuccess]);

  // 删除章节
  const deleteChapter = useCallback(async (chapterId) => {
    try {
      await api.deleteChapter(id, chapterId);
      if (selectedChapterId === chapterId) {
        setSelectedChapterId(null);
        setChapterTitle('');
        setChapterContent('');
      }
      await load();
      onSuccess?.('章节已删除');
    } catch (err) {
      onError?.(err);
    }
  }, [id, selectedChapterId, api, load, onError, onSuccess]);

  // 更新基本信息
  const updateInfo = useCallback(async (info) => {
    setSaving(true);
    try {
      await api.updateItem(id, info);
      await load();
      onSuccess?.('保存成功');
    } catch (err) {
      onError?.(err);
    } finally {
      setSaving(false);
    }
  }, [id, api, load, onError, onSuccess]);

  return {
    loading,
    saving,
    data,
    chapters,
    selectedChapterId,
    chapterTitle,
    chapterContent,
    error,
    contentTextareaRef,
    setChapterTitle,
    setChapterContent,
    load,
    selectChapter,
    saveChapter,
    createChapter,
    deleteChapter,
    updateInfo,
  };
}
