import { api } from '../lib/api';

export async function listPublishedStorySeeds({ page = 0, size = 10 } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' });
  return api.get(`/story-seeds?${params.toString()}`);
}

export async function getStorySeedBySlug(slug) {
  return api.get(`/story-seeds/slug/${encodeURIComponent(slug)}`);
}

export async function listMyStorySeeds({ page = 0, size = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' });
  return api.get(`/story-seeds/me?${params.toString()}`);
}

export async function getStorySeedById(id) {
  return api.get(`/story-seeds/${id}`);
}

export async function createStorySeed({ title, openingMarkdown, styleParams, licenseType, published }) {
  return api.post('/story-seeds', {
    title,
    openingMarkdown,
    styleParams: styleParams || null,
    licenseType: licenseType || null,
    published: published ?? false,
  });
}

export async function updateStorySeed(id, { title, openingMarkdown, styleParams, licenseType, published }) {
  return api.put(`/story-seeds/${id}`, {
    title,
    openingMarkdown,
    styleParams: styleParams || null,
    licenseType: licenseType || null,
    published: published ?? false,
  });
}

export async function deleteStorySeed(id) {
  return api.del(`/story-seeds/${id}`);
}

export async function createBranchPoint(storyId, { sortOrder, anchorText, options }) {
  return api.post(`/stories/${storyId}/branch-points`, {
    sortOrder,
    anchorText: anchorText || null,
    options: options || [],
  });
}

export async function updateBranchPoint(storyId, branchPointId, { sortOrder, anchorText, options }) {
  return api.put(`/stories/${storyId}/branch-points/${branchPointId}`, {
    sortOrder,
    anchorText: anchorText || null,
    options: options || [],
  });
}

export async function deleteBranchPoint(storyId, branchPointId) {
  return api.del(`/stories/${storyId}/branch-points/${branchPointId}`);
}

export async function listCharacters(storyId) {
  return api.get(`/stories/${storyId}/characters`);
}

export async function createCharacter(storyId, { name, description, sortOrder }) {
  return api.post(`/stories/${storyId}/characters`, { name, description: description || null, sortOrder });
}

export async function updateCharacter(storyId, characterId, { name, description, sortOrder }) {
  return api.put(`/stories/${storyId}/characters/${characterId}`, { name, description: description || null, sortOrder });
}

export async function deleteCharacter(storyId, characterId) {
  return api.del(`/stories/${storyId}/characters/${characterId}`);
}

export async function listTerms(storyId) {
  return api.get(`/stories/${storyId}/terms`);
}

export async function createTerm(storyId, { termType, name, definition, sortOrder }) {
  return api.post(`/stories/${storyId}/terms`, { termType, name, definition: definition || null, sortOrder });
}

export async function updateTerm(storyId, termId, { termType, name, definition, sortOrder }) {
  return api.put(`/stories/${storyId}/terms/${termId}`, { termType, name, definition: definition || null, sortOrder });
}

export async function deleteTerm(storyId, termId) {
  return api.del(`/stories/${storyId}/terms/${termId}`);
}

export async function getReadme(storyId) {
  const res = await api.get(`/stories/${storyId}/readme`);
  return res?.contentMarkdown ?? '';
}

export async function putReadme(storyId, contentMarkdown) {
  const res = await api.put(`/stories/${storyId}/readme`, { contentMarkdown: contentMarkdown ?? '' });
  return res?.contentMarkdown ?? '';
}

// AI参数相关API - 暂时禁用，后端可能没有实现
export async function getAiParams(storyId) {
  const res = await api.get(`/stories/${storyId}/ai-params`).catch(() => null);
  return res ?? {
    writingStyle: '',
    tone: '',
    narrativePerspective: '',
    targetAudience: '',
    genreTags: '',
    bannedWords: '',
    preferredPhrases: '',
    storyConstraints: '',
  };
}

export async function putAiParams(storyId, params) {
  return api.put(`/stories/${storyId}/ai-params`, {
    writingStyle: params.writingStyle || null,
    tone: params.tone || null,
    narrativePerspective: params.narrativePerspective || null,
    targetAudience: params.targetAudience || null,
    genreTags: params.genreTags || null,
    bannedWords: params.bannedWords || null,
    preferredPhrases: params.preferredPhrases || null,
    storyConstraints: params.storyConstraints || null,
  }).catch(() => null);
}
