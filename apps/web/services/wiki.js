import { api } from '../lib/api';

// ========== Wiki 页面 ==========

/**
 * 获取小说的所有 Wiki 页面
 * @param {number} storyId - 小说ID
 */
export async function getWikiPages(storyId) {
  return api.get(`/stories/${storyId}/wiki/pages`);
}

/**
 * 获取单个 Wiki 页面
 * @param {number} storyId - 小说ID
 * @param {string} slug - 页面标识
 */
export async function getWikiPage(storyId, slug) {
  return api.get(`/stories/${storyId}/wiki/pages/${slug}`);
}

/**
 * 创建 Wiki 页面（仅作者）
 * @param {number} storyId - 小说ID
 * @param {Object} data - 页面数据
 */
export async function createWikiPage(storyId, data) {
  return api.post(`/stories/${storyId}/wiki/pages`, data);
}

/**
 * 更新 Wiki 页面（仅作者）
 * @param {number} storyId - 小说ID
 * @param {string} slug - 页面标识
 * @param {Object} data - 页面数据
 */
export async function updateWikiPage(storyId, slug, data) {
  return api.put(`/stories/${storyId}/wiki/pages/${slug}`, data);
}

/**
 * 删除 Wiki 页面（仅作者）
 * @param {number} storyId - 小说ID
 * @param {string} slug - 页面标识
 */
export async function deleteWikiPage(storyId, slug) {
  return api.del(`/stories/${storyId}/wiki/pages/${slug}`);
}

// ========== 角色档案 ==========

/**
 * 获取小说的所有角色
 * @param {number} storyId - 小说ID
 */
export async function getWikiCharacters(storyId) {
  return api.get(`/stories/${storyId}/wiki/characters`);
}

/**
 * 获取单个角色
 * @param {number} storyId - 小说ID
 * @param {string} name - 角色名称
 */
export async function getWikiCharacter(storyId, name) {
  return api.get(`/stories/${storyId}/wiki/characters/${encodeURIComponent(name)}`);
}

/**
 * 创建角色（仅作者）
 * @param {number} storyId - 小说ID
 * @param {Object} data - 角色数据
 */
export async function createWikiCharacter(storyId, data) {
  return api.post(`/stories/${storyId}/wiki/characters`, data);
}

/**
 * 更新角色（仅作者）
 * @param {number} storyId - 小说ID
 * @param {string} name - 角色名称
 * @param {Object} data - 角色数据
 */
export async function updateWikiCharacter(storyId, name, data) {
  return api.put(`/stories/${storyId}/wiki/characters/${encodeURIComponent(name)}`, data);
}

/**
 * 删除角色（仅作者）
 * @param {number} storyId - 小说ID
 * @param {string} name - 角色名称
 */
export async function deleteWikiCharacter(storyId, name) {
  return api.del(`/stories/${storyId}/wiki/characters/${encodeURIComponent(name)}`);
}

// ========== 时间线事件 ==========

/**
 * 获取小说的所有时间线事件
 * @param {number} storyId - 小说ID
 */
export async function getWikiTimeline(storyId) {
  return api.get(`/stories/${storyId}/wiki/timeline`);
}

/**
 * 创建时间线事件（仅作者）
 * @param {number} storyId - 小说ID
 * @param {Object} data - 事件数据
 */
export async function createWikiTimelineEvent(storyId, data) {
  return api.post(`/stories/${storyId}/wiki/timeline`, data);
}

/**
 * 更新时间线事件（仅作者）
 * @param {number} storyId - 小说ID
 * @param {number} eventId - 事件ID
 * @param {Object} data - 事件数据
 */
export async function updateWikiTimelineEvent(storyId, eventId, data) {
  return api.put(`/stories/${storyId}/wiki/timeline/${eventId}`, data);
}

/**
 * 删除时间线事件（仅作者）
 * @param {number} storyId - 小说ID
 * @param {number} eventId - 事件ID
 */
export async function deleteWikiTimelineEvent(storyId, eventId) {
  return api.del(`/stories/${storyId}/wiki/timeline/${eventId}`);
}
