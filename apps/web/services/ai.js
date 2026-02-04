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
