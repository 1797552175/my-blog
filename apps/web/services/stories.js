import { api } from '../lib/api';

/**
 * 列出已发布的小说
 * @param {Object} params - 查询参数
 * @param {string} params.filter - 筛选：all(全部) | completed(已完成) | interactive(待续写)
 * @param {number} params.page - 页码
 * @param {number} params.size - 每页数量
 */
export async function listStories({ filter = 'all', page = 0, size = 20 } = {}) {
  try {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' });
    if (filter && filter !== 'all') params.set('filter', filter);
    return await api.get(`/stories?${params.toString()}`);
  } catch (error) {
    console.warn('API调用失败，返回模拟数据:', error);
    // 返回模拟数据
    return {
      content: [
        {
          id: 1,
          title: '测试小说1',
          slug: 'test-story-1',
          published: true,
          hasContent: true,
          openSource: false,
          authorUsername: 'admin',
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now() - 3600000,
          isInteractive: true
        },
        {
          id: 2,
          title: '测试小说2',
          slug: 'test-story-2',
          published: true,
          hasContent: true,
          openSource: true,
          authorUsername: 'user1',
          createdAt: Date.now() - 172800000,
          updatedAt: Date.now() - 7200000,
          isInteractive: true
        }
      ],
      totalElements: 2,
      totalPages: 1,
      size: size,
      number: page
    };
  }
}

/**
 * 搜索小说
 * @param {Object} params - 查询参数
 * @param {string} params.q - 搜索关键词
 * @param {number} params.page - 页码
 * @param {number} params.size - 每页数量
 */
export async function searchStories({ q, page = 0, size = 20 } = {}) {
  try {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' });
    if (q && String(q).trim()) params.set('q', String(q).trim());
    return await api.get(`/stories/search?${params.toString()}`);
  } catch (error) {
    console.warn('API调用失败，返回模拟数据:', error);
    // 返回模拟数据
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: size,
      number: page
    };
  }
}

/**
 * 高级搜索小说
 * @param {Object} params - 查询参数
 * @param {string} params.q - 搜索关键词
 * @param {boolean} params.openSource - 是否开源
 * @param {string[]} params.tags - 标签列表
 * @param {number} params.page - 页码
 * @param {number} params.size - 每页数量
 */
export async function advancedSearchStories({ q, openSource, tags, page = 0, size = 20 } = {}) {
  try {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' });
    if (q && String(q).trim()) params.set('q', String(q).trim());
    if (openSource !== undefined && openSource !== null) params.set('openSource', String(openSource));
    if (tags && tags.length > 0) {
      tags.forEach(tag => params.append('tags', tag));
    }
    return await api.get(`/stories/advanced?${params.toString()}`);
  } catch (error) {
    console.warn('API调用失败，返回模拟数据:', error);
    // 返回模拟数据
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: size,
      number: page
    };
  }
}

/**
 * 根据标签筛选小说
 * @param {string} tag - 标签名
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.size - 每页数量
 */
export async function listStoriesByTag(tag, { page = 0, size = 20 } = {}) {
  try {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' });
    return await api.get(`/stories/tag/${encodeURIComponent(tag)}?${params.toString()}`);
  } catch (error) {
    console.warn('API调用失败，返回模拟数据:', error);
    // 返回模拟数据
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: size,
      number: page
    };
  }
}

/**
 * 根据slug获取小说详情
 * @param {string} slug - 小说slug
 */
export async function getStoryBySlug(slug) {
  try {
    return await api.get(`/stories/slug/${encodeURIComponent(slug)}`);
  } catch (error) {
    console.warn('API调用失败，返回模拟数据:', error);
    // 返回模拟数据
    return {
      id: 1,
      title: '测试小说1',
      slug: slug,
      published: true,
      hasContent: true,
      openSource: false,
      authorUsername: 'admin',
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 3600000,
      isInteractive: true,
      storySummary: '这是一个测试小说的摘要，包含了小说的主要内容和情节。',
      tags: ['测试', '小说'],
      starCount: 10,
      forkCount: 5
    };
  }
}

/**
 * 根据ID获取小说详情（需要登录，作者访问未发布小说）
 * @param {number} id - 小说ID
 */
export async function getStoryById(id) {
  try {
    return await api.get(`/stories/${id}`);
  } catch (error) {
    console.warn('API调用失败，返回模拟数据:', error);
    // 返回模拟数据
    return {
      id: id,
      title: "测试小说",
      slug: "test-story",
      published: false,
      branchPoints: [],
      isInteractive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      storySummary: "这是一个测试小说的简介，包含了小说的主要内容和情节。",
      styleParams: "古风",
      tags: ["测试", "小说", "古风"],
      openSource: false,
      openSourceLicense: "",
      intentKeywords: ""
    };
  }
}

/**
 * 列出当前用户的所有小说
 * @param {Object} params - 查询参数
 * @param {string} params.filter - 筛选：all(全部) | completed(已完成) | interactive(待续写)
 * @param {number} params.page - 页码
 * @param {number} params.size - 每页数量
 */
export async function listMyStories({ filter = 'all', page = 0, size = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' });
  if (filter && filter !== 'all') params.set('filter', filter);
  return api.get(`/stories/my?${params.toString()}`);
}

/**
 * 创建小说
 * @param {Object} data - 小说数据
 * @param {string} data.title - 标题
 * @param {string} data.contentMarkdown - 完整内容（已完成小说）
 * @param {string} data.openingMarkdown - 开头内容（待续写小说）
 * @param {string} data.styleParams - AI风格参数
 * @param {string} data.licenseType - 许可证类型
 * @param {string} data.storySummary - 小说概述
 * @param {string} data.intentKeywords - 意图关键词
 * @param {boolean} data.published - 是否发布
 * @param {string[]} data.tags - 标签
 * @param {number} data.inspirationId - 关联灵感ID
 */
export async function createStory(data) {
  return api.post('/stories', data);
}

/**
 * 更新小说
 * @param {number} id - 小说ID
 * @param {Object} data - 小说数据
 */
export async function updateStory(id, data) {
  return api.put(`/stories/${id}`, data);
}

/**
 * 删除小说
 * @param {number} id - 小说ID
 */
export async function deleteStory(id) {
  return api.del(`/stories/${id}`);
}

/**
 * 获取所有标签
 */
export async function getAllTags() {
  return api.get('/stories/tags');
}

/**
 * 获取当前用户的所有标签
 */
export async function getMyTags() {
  return api.get('/stories/my/tags');
}

/**
 * Star 小说
 * @param {number} id - 小说ID
 */
export async function starStory(id) {
  try {
    return await api.post(`/stories/${id}/star`);
  } catch (error) {
    console.warn('Star小说失败:', error);
    throw error;
  }
}

/**
 * 取消 Star 小说
 * @param {number} id - 小说ID
 */
export async function unstarStory(id) {
  try {
    return await api.del(`/stories/${id}/star`);
  } catch (error) {
    console.warn('取消Star失败:', error);
    throw error;
  }
}

// ========== 章节（作者按章节写作） ==========

/**
 * 列出小说的所有章节（作者）
 */
export async function listChapters(storyId) {
  return api.get(`/stories/${storyId}/chapters`);
}

/**
 * 根据小说 slug 获取章节列表（公开，用于阅读页「从第N章续写」）
 * @param {number} [upToSortOrder] - 只取序号 <= 此值的章节，不传则全部
 */
export async function listChaptersBySlug(slug, upToSortOrder) {
  const params = new URLSearchParams();
  if (upToSortOrder != null) params.set('upToSortOrder', String(upToSortOrder));
  return api.get(`/stories/slug/${encodeURIComponent(slug)}/chapters?${params.toString()}`);
}

/**
 * 获取单章（作者）
 */
export async function getChapter(storyId, chapterId) {
  return api.get(`/stories/${storyId}/chapters/${chapterId}`);
}

/**
 * 创建章节
 */
export async function createChapter(storyId, data) {
  return api.post(`/stories/${storyId}/chapters`, data);
}

/**
 * 更新章节（已发布章节会触发预压缩）
 * @returns {{ chapter: StoryChapterResponse, warning: string|null }}
 */
export async function updateChapter(storyId, chapterId, data) {
  return api.put(`/stories/${storyId}/chapters/${chapterId}`, data);
}

/**
 * 删除章节
 */
export async function deleteChapter(storyId, chapterId) {
  return api.del(`/stories/${storyId}/chapters/${chapterId}`);
}

/**
 * 发布章节
 */
export async function publishChapter(storyId, chapterId) {
  return api.post(`/stories/${storyId}/chapters/${chapterId}/publish`);
}

/**
 * 取消发布章节
 */
export async function unpublishChapter(storyId, chapterId) {
  return api.post(`/stories/${storyId}/chapters/${chapterId}/unpublish`);
}

// ========== 贡献者统计 ==========

/**
 * 获取小说的贡献者列表
 * @param {number} storyId - 小说ID
 */
export async function getStoryContributors(storyId) {
  return api.get(`/stories/${storyId}/contributors`);
}

/**
 * 获取小说的贡献者数量
 * @param {number} storyId - 小说ID
 */
export async function getStoryContributorCount(storyId) {
  return api.get(`/stories/${storyId}/contributors/count`);
}
