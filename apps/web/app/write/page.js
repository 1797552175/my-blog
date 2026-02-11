'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { createPost, updatePost, getPostById } from '../../services/posts';
import { getById } from '../../services/inspirations';
import { isAuthed } from '../../services/auth';
import InspirationBrowser from '../../components/InspirationBrowser';
import { LoadingSkeleton } from '../../lib/loading';
import { useToast } from '../../components/Toast';

export default function WritePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const editId = searchParams.get('edit');
  const inspirationId = searchParams.get('inspiration');

  const [title, setTitle] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [published, setPublished] = useState(true);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadEdit, setLoadEdit] = useState(!!editId);
  const [loadInspiration, setLoadInspiration] = useState(!!inspirationId && !editId);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [titleError, setTitleError] = useState('');
  const [contentError, setContentError] = useState('');
  
  // 初始值状态，用于检测是否有未保存的更改
  const [initialValues, setInitialValues] = useState({
    title: '',
    contentMarkdown: '',
    published: true,
    tags: []
  });
  
  // 检测表单是否有未保存的更改（不直接 sort 原数组，避免改变 state）
  const isDirty = title !== initialValues.title ||
    contentMarkdown !== initialValues.contentMarkdown ||
    published !== initialValues.published ||
    JSON.stringify([...tags].sort()) !== JSON.stringify([...initialValues.tags].sort());

  const loadPost = useCallback(async () => {
    if (!editId) return;
    setError(null);
    try {
      const post = await getPostById(editId);
      const postTags = Array.isArray(post.tags) ? [...post.tags] : [];
      setTitle(post.title);
      setContentMarkdown(post.contentMarkdown);
      setPublished(post.published);
      setTags(postTags);
      // 更新初始值，用于检测未保存的更改
      setInitialValues({
        title: post.title,
        contentMarkdown: post.contentMarkdown,
        published: post.published,
        tags: postTags
      });
    } catch (err) {
      setError(err?.message ?? '加载小说失败');
    } finally {
      setLoadEdit(false);
    }
  }, [editId]);

  const loadInspirationPrefill = useCallback(async () => {
    if (!inspirationId || editId) return;
    setError(null);
    try {
      const inspiration = await getById(inspirationId);
      let newTitle = '';
      let newContent = '';
      
      if (inspiration.title && inspiration.title.trim()) {
        newTitle = inspiration.title.trim();
        setTitle(newTitle);
      }
      const messages = inspiration.messages || [];
      const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
      if (lastAssistant && lastAssistant.content && lastAssistant.content.trim()) {
        newContent = `## 灵感摘要\n\n${lastAssistant.content.trim()}`;
        setContentMarkdown(newContent);
      }
      
      // 更新初始值，用于检测未保存的更改
      setInitialValues({
        title: newTitle,
        contentMarkdown: newContent,
        published: true,
        tags: []
      });
    } catch (err) {
      setError(err?.message ?? '加载灵感失败');
    } finally {
      setLoadInspiration(false);
    }
  }, [inspirationId, editId]);

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  useEffect(() => {
    if (!isAuthed()) {
      router.replace('/login?next=/write');
      return;
    }
    if (editId) loadPost();
    else if (inspirationId) {
      // 检查当前是否有用户输入内容
      const hasContent = title.trim() || contentMarkdown.trim();
      if (hasContent) {
        // 有内容时，弹出自定义确认对话框
        setConfirmAction(() => {
          return () => {
            loadInspirationPrefill();
          };
        });
        setShowConfirmModal(true);
      } else {
        // 无内容时，直接执行预填
        loadInspirationPrefill();
      }
    }
  }, [router, editId, inspirationId, loadPost, loadInspirationPrefill, searchParams]);

  // 处理未保存离开提示
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        // 取消默认行为
        e.preventDefault();
        // 设置返回值，触发浏览器的确认对话框
        e.returnValue = '';
      }
    };

    // 当有未保存的更改时，添加事件监听器
    if (isDirty) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    // 清理函数
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  function addTag() {
    const t = tagInput.trim().slice(0, 64);
    if (!t || tags.includes(t)) {
      setTagInput('');
      return;
    }
    setTags([...tags, t]);
    setTagInput('');
  }

  function removeTag(t) {
    setTags(tags.filter((x) => x !== t));
  }

  // 计算当前行号
  function updateCurrentLine(e) {
    const textarea = e.target;
    const cursorPosition = textarea.selectionStart;
    const text = textarea.value.substring(0, cursorPosition);
    const lineNumber = text.split('\n').length;
    setCurrentLine(lineNumber);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setTitleError('');
    setContentError('');
    
    // 表单校验
    if (!title.trim()) {
      setTitleError('标题为必填项');
      addToast('保存失败：请填写标题', 'error');
      return;
    }
    if (!contentMarkdown.trim()) {
      setContentError('正文为必填项');
      addToast('保存失败：请填写正文', 'error');
      return;
    }
    
    setLoading(true);
    // 提交时把输入框里未按回车添加的标签一并带上，避免只填了标签没按回车就点保存导致 tags 为空
    const pendingTag = tagInput.trim().slice(0, 64);
    const finalTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags;
    try {
      const payload = { title, contentMarkdown, published, tags: finalTags };
      if (editId) {
        await updatePost(editId, payload);
        // 提交成功后更新初始值，避免离开时再次提示
        setInitialValues({
          title,
          contentMarkdown,
          published,
          tags: finalTags
        });
        addToast('已保存，已返回我的小说', 'success');
        setTimeout(() => {
          router.push(`/me/posts`);
        }, 1000);
      } else {
        if (inspirationId) payload.inspirationId = Number(inspirationId);
        const post = await createPost(payload);
        // 提交成功后更新初始值，避免离开时再次提示
        setInitialValues({
          title,
          contentMarkdown,
          published,
          tags: finalTags
        });
        addToast('发布成功，正在跳转到文章', 'success');
        setTimeout(() => {
          router.push(`/posts/${post.slug}`);
        }, 1000);
      }
      router.refresh();
    } catch (err) {
      const errorMessage = err?.message ?? (editId ? '更新失败' : '创建失败');
      addToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }

  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState('sideBySide'); // 'sideBySide' or 'bottom'
  const [currentLine, setCurrentLine] = useState(1);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [titleCollapsed, setTitleCollapsed] = useState(false);
  const [tagsCollapsed, setTagsCollapsed] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  // 首次写小说引导：仅新建且未看过引导时显示
  const [showFirstTimeGuide, setShowFirstTimeGuide] = useState(false);
  const [inspirationDrawerOpen, setInspirationDrawerOpen] = useState(false);

  const isFirstVisit = !editId && !inspirationId && !loadEdit && !loadInspiration;
  useEffect(() => {
    if (typeof window === 'undefined' || !isFirstVisit) return;
    const seen = window.localStorage.getItem('writePageGuideSeen') === '1';
    if (!seen) setShowFirstTimeGuide(true);
  }, [isFirstVisit]);

  const dismissFirstTimeGuide = () => {
    if (typeof window !== 'undefined') window.localStorage.setItem('writePageGuideSeen', '1');
    setShowFirstTimeGuide(false);
  };

  // 用户一旦开始输入则不再显示引导（可选：同时标记为已看过）
  useEffect(() => {
    if (!showFirstTimeGuide) return;
    if (title.trim() || contentMarkdown.trim()) {
      if (typeof window !== 'undefined') window.localStorage.setItem('writePageGuideSeen', '1');
      setShowFirstTimeGuide(false);
    }
  }, [showFirstTimeGuide, title, contentMarkdown]);

  return (
    <>
      {zenMode ? (
        <div className="fixed inset-0 bg-white dark:bg-zinc-900 flex flex-col">
          {/* 标题区 */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center gap-4">
            <div className="flex items-center gap-4 flex-1">
              <Link 
                href="/me/posts" 
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                我的小说
              </Link>
              <input 
                className="input flex-1 max-w-3xl font-medium text-lg"
                style={{ 
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent'
                }}
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                required 
                maxLength={200} 
                placeholder="输入小说标题"
                disabled={loading}
              />
            </div>
            <div className="flex gap-2">
              <button 
                type="button" 
                className="btn btn-sm btn-ghost" 
                onClick={() => setZenMode(false)}
                disabled={loading}
              >
                退出专注模式
              </button>
            </div>
          </div>
          
          {/* 编辑区 */}
          <div className={`flex-1 p-6 overflow-auto ${loading ? 'opacity-70' : ''}`}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 pointer-events-none">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  提交中…
                </div>
              </div>
            )}
            <div className="max-w-3xl mx-auto">
              <textarea
                id="post-content-zen"
                className="w-full h-full min-h-[calc(100vh-120px)] font-serif text-base md:text-lg resize-none"
                style={{ 
                  lineHeight: '1.7', 
                  letterSpacing: '0.02em',
                  fontFamily: '"Noto Serif SC", "Source Han Serif SC", "Noto Serif", "SimSun", serif',
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent'
                }}
                value={contentMarkdown}
                onChange={(e) => {
                  setContentMarkdown(e.target.value);
                  if (contentError) setContentError('');
                }}
                onClick={updateCurrentLine}
                onKeyUp={updateCurrentLine}
                required
                placeholder="在此输入 Markdown…"
                disabled={loading}
                aria-invalid={!!contentError}
                aria-describedby={contentError ? 'content-error-zen' : undefined}
              />
              {/* 字数统计 */}
              <div className="mt-4 flex justify-between items-center text-sm text-zinc-500 dark:text-zinc-400">
                <span>当前行：{currentLine} | 字数统计：{contentMarkdown.length} 字符</span>
                {contentError && (
                  <span id="content-error-zen" className="text-red-600 dark:text-red-400">
                    {contentError}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* 悬浮保存按钮 */}
          <div className="fixed bottom-6 right-6">
            <button 
              type="submit" 
              className="btn btn-primary rounded-full shadow-lg px-6 py-3"
              disabled={loading}
              onClick={(e) => {
                e.preventDefault();
                onSubmit(e);
              }}
            >
              {loading ? (editId ? '保存中' : '发布中') : (editId ? '保存' : '发布')}
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-900">
          {/* 顶部紧凑信息条：移动端堆叠、触控区域 ≥44px */}
          <div className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 py-2 px-4 md:px-6">
            <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-2">
              <div className="flex flex-wrap items-center gap-2 md:gap-4 min-h-[44px]">
                <Link 
                  href="/me/posts" 
                  className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  我的小说
                </Link>
                <div className="flex items-center gap-2">
                  {titleCollapsed ? (
                    <button 
                      type="button" 
                      className="text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:text-primary-600 dark:hover:text-primary-400"
                      onClick={() => setTitleCollapsed(false)}
                    >
                      正在写：{title || '未命名小说'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input 
                        id="post-title"
                        className="input w-full max-w-2xl font-medium text-base"
                        style={{ 
                          border: 'none',
                          outline: 'none',
                          backgroundColor: 'transparent'
                        }}
                        value={title} 
                        onChange={(e) => {
                          setTitle(e.target.value);
                          if (titleError) setTitleError('');
                        }} 
                        required 
                        maxLength={200} 
                        placeholder="输入小说标题"
                        aria-invalid={!!titleError}
                        aria-describedby={titleError ? 'title-error' : undefined}
                      />
                      {titleError && (
                        <span id="title-error" className="text-xs text-red-600 dark:text-red-400">
                          {titleError}
                        </span>
                      )}
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{title.length}/200</span>
                      {title && (
                        <button 
                          type="button" 
                          className="btn btn-xs btn-ghost"
                          onClick={() => setTitleCollapsed(true)}
                        >
                          收起
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {tagsCollapsed ? (
                    <button 
                      type="button" 
                      className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400"
                      onClick={() => setTagsCollapsed(false)}
                    >
                      标签：{tags.length > 0 ? tags.join(', ') : '无'}
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 rounded-full bg-zinc-200 dark:bg-zinc-700 px-3 py-1 text-sm"
                        >
                          {t}
                          <button 
                            type="button" 
                            onClick={() => removeTag(t)} 
                            className="hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 rounded"
                            aria-label={`移除标签 ${t}`}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                removeTag(t);
                              }
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        className="input min-w-[120px]"
                        placeholder="输入回车添加标签"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            addTag();
                          }
                        }}
                        autoComplete="off"
                      />
                      {tags.length > 0 && (
                        <button 
                          type="button" 
                          className="btn btn-xs btn-ghost"
                          onClick={() => setTagsCollapsed(true)}
                        >
                          收起
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 min-h-[44px]">
                <button 
                  type="button" 
                  className="btn btn-sm btn-ghost min-h-[44px]" 
                  onClick={() => setZenMode(true)}
                >
                  专注模式
                </button>
              </div>
            </div>
          </div>

          {/* 主要内容区 */}
          <div className="flex-1 flex flex-col lg:flex-row pb-24">
            <main className="flex-1 py-4 px-4 md:px-6 min-w-0">
              <div className="max-w-4xl mx-auto">
                {/* 首次写小说引导 */}
                {showFirstTimeGuide && (
                  <div className="mb-4 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 px-4 py-3 text-sm text-primary-800 dark:text-primary-200 flex flex-wrap items-center justify-between gap-2">
                    <span>第一次写小说？可以从首页用 AI 找灵感，或直接在此填写标题开始创作。</span>
                    <div className="flex items-center gap-2">
                      <Link href="/" className="btn btn-sm" onClick={dismissFirstTimeGuide}>
                        从灵感开始
                      </Link>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={dismissFirstTimeGuide}>
                        知道了
                      </button>
                    </div>
                  </div>
                )}
                {error ? (
                  <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-200">
                    {String(error)}
                  </div>
                ) : null}

                {(loadEdit || loadInspiration) ? (
                  <LoadingSkeleton lines={3} />
                ) : (
                  <div className={`relative ${loading ? 'opacity-70' : ''}`}>
                    {loading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 pointer-events-none">
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          提交中…
                        </div>
                      </div>
                    )}
                    <form className="space-y-4" onSubmit={onSubmit}>
                      {/* 内容编辑区 */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-zinc-600 dark:text-zinc-300 hidden">内容（Markdown）</span>
                          <div className="flex items-center gap-2">
                            {showPreview && (
                              <select 
                                className="input input-sm"
                                value={previewMode}
                                onChange={(e) => setPreviewMode(e.target.value)}
                                disabled={loading}
                              >
                                <option value="sideBySide">并排预览</option>
                                <option value="bottom">下置预览</option>
                              </select>
                            )}
                            <button 
                              type="button" 
                              className="btn btn-sm btn-ghost" 
                              onClick={() => setShowPreview(!showPreview)}
                              disabled={loading}
                            >
                              {showPreview ? '隐藏预览' : '预览'}
                            </button>
                          </div>
                        </div>
                        
                        {showPreview ? (
                          previewMode === 'sideBySide' ? (
                            <div className="flex gap-4 min-h-[60vh]">
                              <div className="flex-1">
                                <textarea
                                className="input min-h-[70vh] font-serif text-base md:text-lg resize-y w-full"
                                style={{ 
                                  lineHeight: '1.7', 
                                  letterSpacing: '0.02em',
                                  fontFamily: '"Noto Serif SC", "Source Han Serif SC", "Noto Serif", "SimSun", serif'
                                }}
                                value={contentMarkdown}
                                onChange={(e) => setContentMarkdown(e.target.value)}
                                onClick={updateCurrentLine}
                                onKeyUp={updateCurrentLine}
                                required
                                placeholder="开始你的创作"
                                disabled={loading}
                              />
                              </div>
                              <div className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4 overflow-auto">
                                <div className="prose prose-base md:prose-lg dark:prose-invert max-w-none" style={{ 
                                  lineHeight: '1.7', 
                                  fontFamily: '"Noto Serif SC", "Source Han Serif SC", "Noto Serif", "SimSun", serif'
                                }}>
                                  {contentMarkdown.trim() ? (
                                    <ReactMarkdown>{contentMarkdown}</ReactMarkdown>
                                  ) : (
                                    <p className="text-zinc-400 dark:text-zinc-500 italic">输入内容后将在此显示预览</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <textarea
                                className="input min-h-[50vh] font-serif text-base md:text-lg resize-y w-full"
                                style={{ 
                                  lineHeight: '1.7', 
                                  letterSpacing: '0.02em',
                                  fontFamily: '"Noto Serif SC", "Source Han Serif SC", "Noto Serif", "SimSun", serif'
                                }}
                                value={contentMarkdown}
                                onChange={(e) => setContentMarkdown(e.target.value)}
                                onClick={updateCurrentLine}
                                onKeyUp={updateCurrentLine}
                                required
                                placeholder="开始你的创作"
                                disabled={loading}
                              />
                              <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4 overflow-auto min-h-[40vh]">
                                <div className="prose prose-base md:prose-lg dark:prose-invert max-w-none" style={{ 
                                  lineHeight: '1.7', 
                                  fontFamily: '"Noto Serif SC", "Source Han Serif SC", "Noto Serif", "SimSun", serif'
                                }}>
                                  {contentMarkdown.trim() ? (
                                    <ReactMarkdown>{contentMarkdown}</ReactMarkdown>
                                  ) : (
                                    <p className="text-zinc-400 dark:text-zinc-500 italic">输入内容后将在此显示预览</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        ) : (
                            <textarea
                              id="post-content"
                              className="input min-h-[70vh] font-serif text-base md:text-lg resize-y w-full"
                              style={{ 
                                lineHeight: '1.7', 
                                letterSpacing: '0.02em',
                                fontFamily: '"Noto Serif SC", "Source Han Serif SC", "Noto Serif", "SimSun", serif'
                              }}
                              value={contentMarkdown}
                              onChange={(e) => {
                                setContentMarkdown(e.target.value);
                                if (contentError) setContentError('');
                              }}
                              onClick={updateCurrentLine}
                              onKeyUp={updateCurrentLine}
                              required
                              placeholder="开始你的创作"
                              disabled={loading}
                              aria-invalid={!!contentError}
                              aria-describedby={contentError ? 'content-error' : undefined}
                            />
                          )}
                        {/* 字数统计 */}
                        <div className="mt-2 flex justify-between items-center text-sm text-zinc-500 dark:text-zinc-400">
                          <span>当前行：{currentLine} | 字数统计：{contentMarkdown.length} 字符</span>
                          {contentError && (
                            <span id="content-error" className="text-red-600 dark:text-red-400">
                              {contentError}
                            </span>
                          )}
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </main>
            
            {/* 右侧灵感侧边栏：桌面显示，移动端由抽屉替代 */}
            <aside className={`hidden lg:block lg:flex-shrink-0 transition-all duration-300 ease-in-out ${sidebarExpanded ? 'lg:w-80' : 'lg:w-16'} border-l border-zinc-200 dark:border-zinc-800`}>
              <div className="relative h-full">
                {!sidebarExpanded && (
                  <button 
                    type="button" 
                    className="absolute top-4 right-[-20px] z-10 bg-white dark:bg-zinc-800 rounded-full p-1.5 shadow-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    onClick={() => setSidebarExpanded(true)}
                    aria-label="展开灵感侧边栏"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-600 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {sidebarExpanded && (
                  <>
                    <button 
                      type="button" 
                      className="absolute top-4 right-2 z-10 bg-white dark:bg-zinc-800 rounded-full p-1.5 shadow-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                      onClick={() => setSidebarExpanded(false)}
                      aria-label="收起灵感侧边栏"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-600 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 13l-5 5-5-5m0 0l5-5-5-5" />
                      </svg>
                    </button>
                    <InspirationBrowser />
                  </>
                )}
                {!sidebarExpanded && (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 rotate-[-90deg] whitespace-nowrap">
                      灵感
                    </span>
                  </div>
                )}
              </div>
            </aside>

            {/* 移动端：灵感入口按钮，打开抽屉 */}
            <div className="lg:hidden fixed z-20 bottom-[5.5rem] right-4" style={{ right: 'max(1rem, env(safe-area-inset-right))' }}>
              <button
                type="button"
                className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                onClick={() => setInspirationDrawerOpen(true)}
                aria-label="打开灵感库"
              >
                <span className="text-sm font-medium">灵感</span>
              </button>
            </div>

            {/* 移动端灵感抽屉 */}
            {inspirationDrawerOpen && (
              <div className="lg:hidden fixed inset-0 z-50">
                <div className="absolute inset-0 bg-black/50 dark:bg-black/60" onClick={() => setInspirationDrawerOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-zinc-900 shadow-xl flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">灵感库</h2>
                    <button
                      type="button"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      onClick={() => setInspirationDrawerOpen(false)}
                      aria-label="关闭灵感库"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto">
                    <InspirationBrowser />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* 底部固定操作区：长文滚动时始终在视区内 */}
          <div className="fixed bottom-0 left-0 right-0 z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-800 py-3 px-4 md:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-h-[44px]">
                <input
                  id="published"
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 text-primary-600 focus:ring-primary-400/50"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                />
                <label htmlFor="published" className="text-sm text-zinc-700 dark:text-zinc-200 cursor-pointer select-none">
                  立即发布
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button 
                  type="button" 
                  className="btn btn-sm btn-ghost min-h-[44px] min-w-[44px] sm:min-w-0"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? '隐藏预览' : '预览'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-sm btn-ghost min-h-[44px] min-w-[44px] sm:min-w-0 hidden sm:inline-flex"
                  onClick={() => setZenMode(true)}
                >
                  专注模式
                </button>
                <button className="btn min-h-[44px] px-4" disabled={loading} onClick={onSubmit}>
                  {loading ? (editId ? '保存中' : '发布中') : (editId ? '保存' : '发布')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost min-h-[44px]"
                  title={editId ? '返回我的小说' : '返回列表'}
                  onClick={() => {
                    if (isDirty) {
                      setConfirmAction(() => {
                        return () => {
                          router.push(editId ? '/me/posts' : '/posts');
                        };
                      });
                      setShowConfirmModal(true);
                    } else {
                      router.push(editId ? '/me/posts' : '/posts');
                    }
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 自定义确认弹层 */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              确认操作
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              {inspirationId ? '当前内容将被替换，是否继续？' : `当前内容未保存，确定${editId ? '返回我的小说' : '返回列表'}？`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCancel}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirm}
              >
                {inspirationId ? '继续' : (editId ? '返回我的小说' : '返回列表')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
