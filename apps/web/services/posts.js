import { api } from '../lib/api';

export async function listPosts({ page = 0, size = 10, tag } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' });
  if (tag && tag.trim()) params.set('tag', tag.trim());
  return api.get(`/posts?${params.toString()}`);
}

export async function getPostBySlug(slug) {
  return api.get(`/posts/slug/${encodeURIComponent(slug)}`);
}

export async function listMyPosts({ page = 0, size = 10, tag } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' });
  if (tag && tag.trim()) params.set('tag', tag.trim());
  return api.get(`/posts/me?${params.toString()}`);
}

export async function listMyPostTags() {
  return api.get('/posts/me/tags');
}

export async function createPost({ title, contentMarkdown, published, tags, inspirationId }) {
  const body = { title, contentMarkdown, published, tags: tags || [] };
  if (inspirationId != null) body.inspirationId = inspirationId;
  return api.post('/posts', body);
}

export async function updatePost(id, { title, contentMarkdown, published, tags, inspirationId }) {
  const body = { title, contentMarkdown, published, tags: tags || [] };
  if (inspirationId !== undefined) body.inspirationId = inspirationId;
  return api.put(`/posts/${id}`, body);
}

export async function getPostById(id) {
  return api.get(`/posts/${id}`);
}

export async function getTags() {
  return api.get('/tags');
}

export async function searchPosts({ q, page = 0, size = 10 } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' });
  if (q && String(q).trim()) params.set('q', String(q).trim());
  return api.get(`/posts/search?${params.toString()}`);
}

export async function deletePost(id) {
  return api.del(`/posts/${id}`);
}
