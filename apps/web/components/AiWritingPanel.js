'use client';

import { useState, useRef, useEffect } from 'react';
import {
  SparklesIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { streamAiWrite, WRITING_TYPES, WRITING_TYPE_LABELS } from '../services/aiWriting';

const WORD_COUNT_OPTIONS = [
  { value: 500, label: '约500字' },
  { value: 1000, label: '约1000字' },
  { value: 2000, label: '约2000字' },
  { value: 3000, label: '约3000字' },
];

export default function AiWritingPanel({
  storyId,
  chapterId,
  currentContent,
  selectedText,
  onInsert,
  onReplace,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState(WRITING_TYPES.CONTINUE);
  const [prompt, setPrompt] = useState('');
  const [wordCount, setWordCount] = useState(1000);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [generatingStage, setGeneratingStage] = useState(''); // 生成阶段：'analyzing' | 'generating' | 'polishing' | 'completing'
  const [progress, setProgress] = useState(0); // 进度百分比
  const abortControllerRef = useRef(null);

  // 根据选中文本自动选择类型
  useEffect(() => {
    if (selectedText && selectedText.length > 10) {
      setType(WRITING_TYPES.REWRITE);
    } else {
      setType(WRITING_TYPES.CONTINUE);
    }
  }, [selectedText]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleGenerate = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setGeneratedContent('');
    setShowResult(true);
    setProgress(0);
    setGeneratingStage('analyzing');

    const params = {
      storyId,
      chapterId,
      type,
      content: currentContent,
      prompt: prompt.trim() || undefined,
      selectedText: selectedText || undefined,
      wordCount: type === WRITING_TYPES.CONTINUE || type === WRITING_TYPES.EXPAND ? wordCount : undefined,
    };

    streamAiWrite(
      params,
      (chunk) => {
        setGeneratedContent((prev) => prev + chunk);
        setGeneratingStage((prevStage) => {
          if (prevStage === 'analyzing') {
            setProgress(30);
            return 'generating';
          }
          return prevStage;
        });
        setProgress((prev) => {
          if (prev < 90) {
            return Math.min(prev + 5, 90);
          }
          return prev;
        });
      },
      () => {
        setGeneratingStage('completing');
        setProgress(100);
        setTimeout(() => {
          setIsGenerating(false);
          setGeneratingStage('');
        }, 500);
      },
      (error) => {
        setIsGenerating(false);
        setGeneratingStage('');
        setProgress(0);
        setGeneratedContent((prev) => prev + '\n\n[生成失败：' + (error?.message || '未知错误') + ']');
      }
    );
  };

  const handleInsert = () => {
    if (generatedContent && onInsert) {
      onInsert(generatedContent);
      resetPanel();
    }
  };

  const handleReplace = () => {
    if (generatedContent && onReplace && selectedText) {
      onReplace(selectedText, generatedContent);
      resetPanel();
    }
  };

  const resetPanel = () => {
    setGeneratedContent('');
    setShowResult(false);
    setPrompt('');
  };

  const handleClose = () => {
    if (isGenerating && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    resetPanel();
    setIsOpen(false);
  };

  const getTypeDescription = () => {
    switch (type) {
      case WRITING_TYPES.CONTINUE:
        return '根据当前章节内容续写下文';
      case WRITING_TYPES.REWRITE:
        return selectedText ? '改写选中的文本内容' : '请输入要改写的文本';
      case WRITING_TYPES.EXPAND:
        return selectedText ? '对选中的文本进行扩写' : '请输入要扩写的文本';
      case WRITING_TYPES.POLISH:
        return selectedText ? '润色选中的文本' : '请输入要润色的文本';
      case WRITING_TYPES.CUSTOM:
        return '输入自定义指令让AI生成内容';
      default:
        return '';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-6 bottom-6 z-40 flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all hover:scale-105"
      >
        <SparklesIcon className="h-5 w-5" />
        <span className="font-medium">AI 辅助写作</span>
      </button>
    );
  }

  return (
    <div className="fixed right-6 bottom-6 z-50 w-96 max-h-[80vh] flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5" />
          <span className="font-semibold">AI 辅助写作</span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-white/20 rounded-full transition-colors"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 写作类型选择 */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            写作类型
          </label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(WRITING_TYPE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setType(key)}
                className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                  type === key
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-indigo-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {getTypeDescription()}
          </p>
        </div>

        {/* 选中文本提示 */}
        {selectedText && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">已选中文本</p>
            <p className="text-sm text-amber-800 dark:text-amber-300 line-clamp-3">
              {selectedText}
            </p>
          </div>
        )}

        {/* 字数选择（续写/扩写时显示） */}
        {(type === WRITING_TYPES.CONTINUE || type === WRITING_TYPES.EXPAND) && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              字数要求
            </label>
            <div className="flex gap-2 flex-wrap">
              {WORD_COUNT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setWordCount(option.value)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                    wordCount === option.value
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                      : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-indigo-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 自定义提示词 */}
        {type === WRITING_TYPES.CUSTOM && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              自定义指令
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例如：写一个主角遇到神秘老人的场景..."
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>
        )}

        {/* 额外提示词（可选） */}
        {type !== WRITING_TYPES.CUSTOM && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              补充要求（可选）
            </label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="添加额外的写作要求..."
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        )}

        {/* 生成按钮 */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-400 text-white rounded-lg font-medium transition-colors"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>生成中...</span>
            </>
          ) : (
            <>
              <SparklesIcon className="h-4 w-4" />
              <span>开始生成</span>
            </>
          )}
        </button>

        {/* 生成结果 */}
        {showResult && (
          <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">生成结果</span>
              {isGenerating && (
                <span className="text-xs text-indigo-600 dark:text-indigo-400 animate-pulse">
                  {generatingStage === 'analyzing' && '正在分析...'}
                  {generatingStage === 'generating' && '正在生成...'}
                  {generatingStage === 'completing' && '即将完成...'}
                </span>
              )}
            </div>
            
            {isGenerating && (
              <div className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-indigo-700 dark:text-indigo-300">生成进度</span>
                  <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">{progress}%</span>
                </div>
                <div className="h-2 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      progress >= 0 ? 'bg-indigo-500 text-white' : 'bg-indigo-200 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-400'
                    }`}>
                      {progress > 0 ? '✓' : '1'}
                    </div>
                    <span className={progress > 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-500 dark:text-zinc-400'}>
                      分析上下文
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      progress >= 30 ? 'bg-indigo-500 text-white' : 'bg-indigo-200 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-400'
                    }`}>
                      {progress >= 30 ? '✓' : '2'}
                    </div>
                    <span className={progress >= 30 ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-500 dark:text-zinc-400'}>
                      生成内容
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      progress >= 100 ? 'bg-indigo-500 text-white' : 'bg-indigo-200 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-400'
                    }`}>
                      {progress >= 100 ? '✓' : '3'}
                    </div>
                    <span className={progress >= 100 ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-500 dark:text-zinc-400'}>
                      完成
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="p-3 max-h-64 overflow-y-auto">
              {generatedContent ? (
                <div className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                  {generatedContent}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-zinc-400">
                  <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mr-2" />
                  正在思考...
                </div>
              )}
            </div>
            {/* 操作按钮 */}
            {generatedContent && !isGenerating && (
              <div className="flex gap-2 p-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                <button
                  onClick={handleInsert}
                  className="flex-1 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  插入到末尾
                </button>
                {selectedText && (
                  <button
                    onClick={handleReplace}
                    className="flex-1 px-3 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                  >
                    替换选中
                  </button>
                )}
                <button
                  onClick={() => setGeneratedContent('')}
                  className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  清空
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
