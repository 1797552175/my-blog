import { api } from '../lib/api';

/**
 * 获取小说的完整分支树
 * @param {number} storyId - 小说ID
 */
export async function getBranchTree(storyId) {
  return api.get(`/stories/${storyId}/branches/tree`);
}

/**
 * 获取小说的主线
 * @param {number} storyId - 小说ID
 */
export async function getMainline(storyId) {
  return api.get(`/stories/${storyId}/branches/mainline`);
}

/**
 * 获取某个章节的子分支
 * @param {number} storyId - 小说ID
 * @param {number} chapterId - 章节ID
 */
export async function getChildBranches(storyId, chapterId) {
  return api.get(`/stories/${storyId}/branches/chapter/${chapterId}/children`);
}

/**
 * 获取某个章节的后代树
 * @param {number} storyId - 小说ID
 * @param {number} chapterId - 章节ID
 */
export async function getDescendantTree(storyId, chapterId) {
  return api.get(`/stories/${storyId}/branches/chapter/${chapterId}/descendants`);
}

/**
 * 获取某个章节的祖先链
 * @param {number} storyId - 小说ID
 * @param {number} chapterId - 章节ID
 */
export async function getAncestorChain(storyId, chapterId) {
  return api.get(`/stories/${storyId}/branches/chapter/${chapterId}/ancestors`);
}

/**
 * 获取某个作者的分支
 * @param {number} storyId - 小说ID
 * @param {number} authorId - 作者ID
 */
export async function getAuthorBranches(storyId, authorId) {
  return api.get(`/stories/${storyId}/branches/author/${authorId}`);
}

/**
 * 获取分支统计
 * @param {number} storyId - 小说ID
 */
export async function getBranchStats(storyId) {
  return api.get(`/stories/${storyId}/branches/stats`);
}
