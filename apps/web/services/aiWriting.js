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
  const data = await api.post('/ai-writing', params);
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
        onChunk && onChunk(content);
      } catch {
        onChunk && onChunk(data);
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
      .catch((err) => onError && onError(err));
  }

  read();
}

/**
 * AI辅助写作（流式）
 * @param {Object} params - 写作参数
 * @param {function} onChunk - 接收流式数据的回调
 * @param {function} onComplete - 流结束的回调
 * @param {function} onError - 发生错误的回调
 */
export function streamAiWrite(params, onChunk, onComplete, onError) {
  if (typeof window === 'undefined') {
    onError && onError(new Error('Cannot use streamAiWrite on server'));
    return;
  }

  const url = (process.env.NEXT_PUBLIC_API_BASE || '/api') + '/ai-writing/stream';
  const token = localStorage.getItem('token') || '';

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify(params),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      parseSSEStream(reader, decoder, onChunk, onComplete, onError);
    })
    .catch((error) => onError && onError(error));
}
