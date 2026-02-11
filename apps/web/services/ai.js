import { api } from '../lib/api';

/**
 * 已登录用户 AI 对话（找灵感等）
 * @param {Array<{ role: string, content: string }>} messages 历史消息
 * @param {string} content 本轮用户输入
 */
export async function chat(messages, content) {
  const data = await api.post('/ai/chat', { messages: messages || [], content: content || '' });
  return data;
}

/**
 * 解析 SSE 流：按 \n\n 切分事件，支持跨 read 缓冲，避免事件被截断。
 * data 为后端 JSON 编码的字符串时用 JSON.parse 还原，否则原样传给 onChunk。
 * 仅在所有事件处理完后、且 done 或收到 [DONE] 时调用一次 onComplete。
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
    buffer = events.pop() ?? ''; // 最后一段可能不完整，留到下次

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
    reader.read()
      .then(({ done, value }) => {
        if (done) {
          if (buffer.trim()) processChunk('');
          finish();
          return;
        }
        processChunk(decoder.decode(value, { stream: true }));
        read();
      })
      .catch(err => onError && onError(err));
  }

  read();
}

/**
 * 已登录用户 AI 对话（流式返回）。模型由服务端配置决定，不传 model。
 * @param {Array<{ role: string, content: string }>} messages 历史消息
 * @param {string} content 本轮用户输入
 * @param {function} onChunk 接收流式数据的回调
 * @param {function} onComplete 流结束的回调
 * @param {function} onError 发生错误的回调
 */
export function streamChat(messages, content, onChunk, onComplete, onError) {
  if (typeof window === 'undefined') {
    onError && onError(new Error('Cannot use streamChat on server'));
    return;
  }

  const url = (process.env.NEXT_PUBLIC_API_BASE || '/api') + '/ai/chat/stream';
  const token = localStorage.getItem('token') || '';

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      messages: messages || [],
      content: content || ''
    })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      parseSSEStream(reader, decoder, onChunk, onComplete, onError);
    })
    .catch(error => onError && onError(error));
}

/**
 * 将当前对话保存到灵感库
 * @param {string} [title] 可选标题
 * @param {Array<{ role: string, content: string }>} messages 对话消息列表
 */
export async function addInspiration(title, messages) {
  return api.post('/inspirations', { title: title || null, messages: messages || [] });
}

const PERSONA_SESSION_KEY = 'persona_session_id';

/**
 * 获取或生成分身对话 sessionId（存 sessionStorage）
 */
export function getOrCreatePersonaSessionId() {
  if (typeof window === 'undefined') return null;
  let id = sessionStorage.getItem(PERSONA_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `s${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem(PERSONA_SESSION_KEY, id);
  }
  return id;
}

/**
 * 分身对话（无需 JWT）。sessionId 通过 X-Session-Id 传递，若后端返回新 sessionId 需保存。
 */
export async function personaChat(authorId, postId, messages, content, sessionId) {
  const headers = sessionId ? { 'X-Session-Id': sessionId } : {};
  const res = await api.post(
    '/ai/persona/chat',
    { authorId, postId: postId || null, messages: messages || [], content: content || '' },
    headers
  );
  if (res?.sessionId && typeof window !== 'undefined') {
    sessionStorage.setItem(PERSONA_SESSION_KEY, res.sessionId);
  }
  return res;
}

/**
 * 分身对话（流式返回，无需 JWT）。模型由服务端配置决定，不传 model。
 * @param {number} authorId 作者 ID
 * @param {number} postId 文章 ID
 * @param {Array<{ role: string, content: string }>} messages 历史消息
 * @param {string} content 本轮用户输入
 * @param {string} sessionId 会话 ID
 * @param {function} onChunk 接收流式数据的回调
 * @param {function} onComplete 流结束的回调
 * @param {function} onError 发生错误的回调
 */
export function streamPersonaChat(authorId, postId, messages, content, sessionId, onChunk, onComplete, onError) {
  if (typeof window === 'undefined') {
    onError && onError(new Error('Cannot use streamPersonaChat on server'));
    return;
  }

  const url = (process.env.NEXT_PUBLIC_API_BASE || '/api') + '/ai/persona/chat/stream';
  const headers = sessionId ? { 'X-Session-Id': sessionId } : {};

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify({
      authorId,
      postId: postId || null,
      messages: messages || [],
      content: content || ''
    })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      parseSSEStream(reader, decoder, onChunk, onComplete, onError);
    })
    .catch(error => onError && onError(error));
}

/**
 * 获取可用的AI模型列表（根据用户权限）
 */
export async function getModels() {
  const data = await api.get('/ai/models');
  return data;
}
