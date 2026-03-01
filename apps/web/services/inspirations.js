import { api } from '../lib/api';

/**
 * 分页获取当前用户的灵感列表
 */
export async function list(page = 0, size = 10) {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' });
  return api.get(`/inspirations?${params.toString()}`);
}

/**
 * 按 ID 获取单条灵感详情（含完整对话与 optionSnapshot，用于快速创作预填）
 */
export async function getById(id) {
  return api.get(`/inspirations/${id}`);
}

/**
 * 删除灵感（仅作者可删，级联删除 inspiration_messages）
 */
export async function deleteById(id) {
  return api.del(`/inspirations/${id}`);
}
