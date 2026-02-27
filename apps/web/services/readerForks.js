import { api } from '../lib/api';

export async function createFork(storySeedId) {
  return api.post(`/story-seeds/${storySeedId}/fork`);
}

/**
 * 根据小说 slug 创建阅读副本
 * @param {string} slug - 小说 slug
 * @param {number} [fromChapterSortOrder] - 从第几章开始续写，不传则从开头
 */
export async function createForkBySlug(slug, fromChapterSortOrder) {
  return api.post(`/stories/slug/${encodeURIComponent(slug)}/fork`, {
    fromChapterSortOrder: fromChapterSortOrder ?? undefined,
  });
}

export async function listMyForks() {
  try {
    return await api.get('/reader-forks/me');
  } catch (error) {
    console.warn('API调用失败，返回模拟数据:', error);
    // 返回模拟数据
    return [];
  }
}

export async function checkForkExists(slug) {
  try {
    const forks = await listMyForks();
    return forks.some(fork => fork.storySeedSlug === slug);
  } catch (error) {
    console.error('检查阅读副本失败:', error);
    return false;
  }
}

export async function getFork(forkId) {
  return api.get(`/reader-forks/${forkId}`);
}

export async function listCommits(forkId) {
  return api.get(`/reader-forks/${forkId}/commits`);
}

export async function choose(forkId, { branchPointId, optionId }) {
  return api.post(`/reader-forks/${forkId}/choose`, { branchPointId, optionId });
}

export async function rollback(forkId, commitId) {
  return api.post(`/reader-forks/${forkId}/rollback`, { commitId });
}

export async function createPullRequest(storySeedId, { forkId, fromCommitId, title, description }) {
  return api.post(`/story-seeds/${storySeedId}/pull-requests`, {
    forkId,
    fromCommitId: fromCommitId ?? null,
    title: title || null,
    description: description || null,
  });
}

export async function listPullRequests(storySeedId) {
  return api.get(`/story-seeds/${storySeedId}/pull-requests`);
}

export async function getPullRequest(prId) {
  return api.get(`/story-pull-requests/${prId}`);
}

export async function updatePullRequestStatus(prId, { status }) {
  return api.patch(`/story-pull-requests/${prId}`, { status });
}

export async function listBookmarks(forkId) {
  return api.get(`/reader-forks/${forkId}/bookmarks`);
}

export async function createBookmark(forkId, { commitId, chapterSortOrder, bookmarkName, notes, sortOrder }) {
  return api.post(`/reader-forks/${forkId}/bookmarks`, {
    forkId,
    commitId,
    chapterSortOrder,
    bookmarkName,
    notes,
    sortOrder,
  });
}

export async function updateBookmark(forkId, bookmarkId, { commitId, chapterSortOrder, bookmarkName, notes, sortOrder }) {
  return api.put(`/reader-forks/${forkId}/bookmarks/${bookmarkId}`, {
    forkId,
    commitId,
    chapterSortOrder,
    bookmarkName,
    notes,
    sortOrder,
  });
}

export async function deleteBookmark(forkId, bookmarkId) {
  return api.del(`/reader-forks/${forkId}/bookmarks/${bookmarkId}`);
}

export async function rollbackToBranchPoint(forkId, branchPointSortOrder) {
  return api.post(`/reader-forks/${forkId}/rollback-to-branch-point`, { branchPointSortOrder });
}

export async function deleteFork(forkId) {
  return api.del(`/reader-forks/${forkId}`);
}
