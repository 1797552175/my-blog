import { api } from '../lib/api';

/**
 * 创建分支小说（拉取PR）
 * @param {Object} data
 * @param {number} data.storyId - 原小说ID
 * @param {string} data.title - 分支小说标题
 * @param {string} data.description - 分支小说描述
 * @param {number} data.fromChapterSortOrder - 从第几章开始分支
 */
export async function createPrNovel(data) {
  return api.post('/story-pr-novels', data);
}

/**
 * 获取我的分支小说列表
 */
export async function listMyPrNovels() {
  return api.get('/story-pr-novels/my');
}

/**
 * 获取分支小说详情
 * @param {number} prNovelId
 */
export async function getPrNovel(prNovelId) {
  return api.get(`/story-pr-novels/${prNovelId}`);
}

/**
 * 更新分支小说
 * @param {number} prNovelId
 * @param {Object} data
 * @param {string} data.title
 * @param {string} data.description
 */
export async function updatePrNovel(prNovelId, data) {
  return api.put(`/story-pr-novels/${prNovelId}`, data);
}

/**
 * 删除分支小说
 * @param {number} prNovelId
 */
export async function deletePrNovel(prNovelId) {
  return api.del(`/story-pr-novels/${prNovelId}`);
}

/**
 * 添加章节
 * @param {number} prNovelId
 * @param {Object} data
 * @param {number} data.sortOrder - 章节序号
 * @param {string} data.title - 章节标题
 * @param {string} data.contentMarkdown - 章节内容
 * @param {string} data.summary - 章节摘要
 */
export async function addPrChapter(prNovelId, data) {
  return api.post(`/story-pr-novels/${prNovelId}/chapters`, data);
}

/**
 * 获取章节列表
 * @param {number} prNovelId
 */
export async function listPrChapters(prNovelId) {
  return api.get(`/story-pr-novels/${prNovelId}/chapters`);
}

/**
 * 更新章节
 * @param {number} prNovelId
 * @param {number} chapterId
 * @param {Object} data
 */
export async function updatePrChapter(prNovelId, chapterId, data) {
  return api.put(`/story-pr-novels/${prNovelId}/chapters/${chapterId}`, data);
}

/**
 * 删除章节
 * @param {number} prNovelId
 * @param {number} chapterId
 */
export async function deletePrChapter(prNovelId, chapterId) {
  return api.del(`/story-pr-novels/${prNovelId}/chapters/${chapterId}`);
}

/**
 * 提交PR给作者审核
 * @param {Object} data
 * @param {number} data.prNovelId - 分支小说ID
 * @param {string} data.title - 提交标题
 * @param {string} data.description - 提交描述
 */
export async function submitPr(data) {
  return api.post('/story-pr-submissions', data);
}

/**
 * 获取我提交的PR列表
 */
export async function listMySubmissions() {
  return api.get('/story-pr-submissions/my');
}

/**
 * 获取收到的PR列表（作者用）
 */
export async function listReceivedSubmissions() {
  return api.get('/story-pr-submissions/received');
}

/**
 * 审核PR
 * @param {number} submissionId
 * @param {Object} data
 * @param {string} data.status - approved/rejected
 * @param {string} data.reviewComment - 审核意见
 */
export async function reviewPr(submissionId, data) {
  return api.post(`/story-pr-submissions/${submissionId}/review`, data);
}
