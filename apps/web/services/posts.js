import { api } from '../lib/api';

export async function listPosts({ page = 0, size = 10 } = {}) {
  return api.get(`/posts?page=${page}&size=${size}&sort=createdAt,desc`);
}

export async function getPostBySlug(slug) {
  return api.get(`/posts/slug/${encodeURIComponent(slug)}`);
}

export async function listMyPosts({ page = 0, size = 10 } = {}) {
  return api.get(`/posts/me?page=${page}&size=${size}&sort=createdAt,desc`);
}

export async function createPost({ title, contentMarkdown, published }) {
  return api.post('/posts', { title, contentMarkdown, published });
}

export async function updatePost(id, { title, contentMarkdown, published }) {
  return api.put(`/posts/${id}`, { title, contentMarkdown, published });
}

export async function deletePost(id) {
  return api.del(`/posts/${id}`);
}
