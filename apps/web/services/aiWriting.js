import { api } from '../lib/api';

/**
 * AI写作类型
 */
export const WRITING_TYPES = {
  CONTINUE: 'continue',
  REWRITE: 'rewrite',
  EXPAND: 'expand',
  POLISH: 'polish',
  CUSTOM: 'custom',
};

/**
 * AI写作类型标签
 */
export const WRITING_TYPE_LABELS = {
  [WRITING_TYPES.CONTINUE]: '续写',
  [WRITING_TYPES.REWRITE]: '改写',
  [WRITING_TYPES.EXPAND]: '扩写',
  [WRITING_TYPES.POLISH]: '润色',
  [WRITING_TYPES.CUSTOM]: '自定义',
};

/**
 * AI辅助写作（非流式）
 * @param {Object} params - 写作参数
 * @param {number} params.storyId - 小说ID
 * @param {number} [params.chapterId] - 章节ID
 * @param {string} params.type - 写作类型
 * @param {string} [params.content] - 当前内容
 * @param {string} [params.prompt] - 自定义提示
 * @param {string} [params.selectedText] - 选中的文本
 * @param {number} [params.wordCount] - 字数要求
 */
export async function aiWrite(params) {
  console.log('DEBUG: calling aiWrite, params=', params);
  const data = await api.post('/ai-writing', params);
  
  // 打印调试信息
  if (data?.debugInfo) {
    console.group('DEBUG: aiWrite result - AI调试信息');
    console.log('小说ID:', data.debugInfo.storyId);
    console.log('写作类型:', data.debugInfo.type);
    if (data.debugInfo.aiLogs) {
      console.group('AI调用日志');
      
      // 先显示基本信息
      Object.entries(data.debugInfo.aiLogs).forEach(([key, value]) => {
        if (!key.startsWith('AI-FullContext')) {
          console.log(`${key}:`, value);
        }
      });
      
      // 显示完整上下文（支持分段）
      if (data.debugInfo.aiLogs['AI-FullContext']) {
        console.log('%c【AI完整上下文】', 'color: #0066cc; font-weight: bold;');
        console.log(data.debugInfo.aiLogs['AI-FullContext']);
      } else if (data.debugInfo.aiLogs['AI-FullContext-Segments']) {
        // 分段显示
        const segmentCount = parseInt(data.debugInfo.aiLogs['AI-FullContext-Segments']);
        const totalLength = data.debugInfo.aiLogs['AI-FullContext-Length'];
        console.log('%c【AI完整上下文】', 'color: #0066cc; font-weight: bold;');
        console.log(`总长度: ${totalLength} 字符，共 ${segmentCount} 段`);
        
        for (let i = 1; i <= segmentCount; i++) {
          const partKey = `AI-FullContext-Part${i}`;
          if (data.debugInfo.aiLogs[partKey]) {
            console.log(`--- 第 ${i}/${segmentCount} 段 ---`);
            console.log(data.debugInfo.aiLogs[partKey]);
          }
        }
      }
      
      console.groupEnd();
    }
    console.groupEnd();
  }
  
  return data;
}

/**
 * 解析SSE流
 */
function parseSSEStream(reader, decoder, onChunk, onComplete, onError) {
  let buffer = '';
  let completed = false;

  function finish() {
    if (completed) return;
    completed = true;
    onComplete && onComplete();
  }

  function processChunk(text) {
    buffer += text;
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const raw of events) {
      const line = raw.trim();
      if (!line.startsWith('data: ')) continue;
      const data = line.substring(6);
      if (data === '[DONE]') {
        finish();
        return;
      }
      if (data === '[ERROR]') {
        completed = true;
        onError && onError(new Error('Stream error'));
        return;
      }
      try {
        const content = data.startsWith('"') ? JSON.parse(data) : data;
        // 确保 content 是字符串
        const contentStr = typeof content === 'string' ? content : String(content ?? '');
        onChunk && onChunk(contentStr);
      } catch {
        // 确保 data 是字符串
        const dataStr = typeof data === 'string' ? data : String(data ?? '');
        onChunk && onChunk(dataStr);
      }
    }
  }

  function read() {
    reader
      .read()
      .then(({ done, value }) => {
        if (done) {
          if (buffer.trim()) processChunk('');
          finish();
          return;
        }
        processChunk(decoder.decode(value, { stream: true }));
        read();
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
          return;
        }
        onError && onError(err);
      });
  }

  read();
}

/**
 * AI辅助写作（流式）
 * @param {Object} params - 写作参数
 * @param {function} onChunk - 接收流式数据的回调
 * @param {function} onComplete - 流结束的回调
 * @param {function} onError - 发生错误的回调
 * @param {AbortSignal} [signal] - 可选，用于取消请求
 */
export function streamAiWrite(params, onChunk, onComplete, onError, signal) {
  if (typeof window === 'undefined') {
    onError && onError(new Error('Cannot use streamAiWrite on server'));
    return;
  }

  // 打印调试信息（流式接口无法通过响应头返回调试信息，所以在请求前打印）
  console.group('DEBUG: streamAiWrite 请求参数');
  console.log('StoryId:', params.storyId);
  console.log('Type:', params.type);
  console.log('ChapterId:', params.chapterId);
  console.log('WordCount:', params.wordCount);
  console.log('SelectedDirectionTitle:', params.selectedDirectionTitle);
  console.log('SelectedDirectionDescription:', params.selectedDirectionDescription);
  console.log('提示：流式接口的完整AI上下文请查看后端日志');
  console.groupEnd();

  const url = (process.env.NEXT_PUBLIC_API_BASE || '/api') + '/ai-writing/stream';
  const token = localStorage.getItem('token') || '';

  const fetchOpts = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify(params),
  };
  if (signal) fetchOpts.signal = signal;

  fetch(url, fetchOpts)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      parseSSEStream(reader, decoder, onChunk, onComplete, onError);
    })
    .catch((err) => {
      if (err?.name === 'AbortError') {
        onError && onError(new Error('已取消'));
        return;
      }
      onError && onError(err);
    });
}

/** 仅根据设定生成的 type，用于「用设定写一段」入口 */
export const WRITING_TYPE_FROM_SETTING = 'from_setting';

/**
 * 生成 3 个故事走向选项（基于预压缩前文，无章节时仅用设定）
 * @param {number} storyId - 小说ID
 * @param {number|null} contextUpToSortOrder - 上下文范围
 * @param {Array|null} aiPreviewSummaries - AI预览章节摘要列表 [{chapterNumber, title, summary}]
 */
export async function generateDirectionOptions(storyId, contextUpToSortOrder = null, aiPreviewSummaries = null) {
  console.log('DEBUG: calling generateDirectionOptions, storyId=', storyId, 'contextUpToSortOrder=', contextUpToSortOrder, 'aiPreviewSummaries=', aiPreviewSummaries);
  const body = { storyId };
  if (contextUpToSortOrder != null && contextUpToSortOrder > 0) body.contextUpToSortOrder = contextUpToSortOrder;
  if (aiPreviewSummaries != null && aiPreviewSummaries.length > 0) body.aiPreviewSummaries = aiPreviewSummaries;
  const data = await api.post('/ai-writing/generate-direction-options', body);
  
  // 打印调试信息
  if (data?.debugInfo) {
    console.group('DEBUG: generateDirectionOptions result - AI调试信息');
    console.log('小说ID:', data.debugInfo.storyId);
    console.log('是否有历史:', data.debugInfo.hasHistory);
    if (data.debugInfo.aiLogs) {
      console.group('AI调用日志');
      
      // 先显示基本信息
      Object.entries(data.debugInfo.aiLogs).forEach(([key, value]) => {
        if (!key.startsWith('AI-FullContext')) {
          console.log(`${key}:`, value);
        }
      });
      
      // 显示完整上下文（支持分段）
      if (data.debugInfo.aiLogs['AI-FullContext']) {
        console.log('%c【AI完整上下文】', 'color: #0066cc; font-weight: bold;');
        console.log(data.debugInfo.aiLogs['AI-FullContext']);
      } else if (data.debugInfo.aiLogs['AI-FullContext-Segments']) {
        // 分段显示
        const segmentCount = parseInt(data.debugInfo.aiLogs['AI-FullContext-Segments']);
        const totalLength = data.debugInfo.aiLogs['AI-FullContext-Length'];
        console.log('%c【AI完整上下文】', 'color: #0066cc; font-weight: bold;');
        console.log(`总长度: ${totalLength} 字符，共 ${segmentCount} 段`);
        
        for (let i = 1; i <= segmentCount; i++) {
          const partKey = `AI-FullContext-Part${i}`;
          if (data.debugInfo.aiLogs[partKey]) {
            console.log(`--- 第 ${i}/${segmentCount} 段 ---`);
            console.log(data.debugInfo.aiLogs[partKey]);
          }
        }
      }
      
      console.groupEnd();
    }
    console.groupEnd();
  }
  
  return data?.options ?? [];
}
