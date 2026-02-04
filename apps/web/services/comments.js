import { api } from '../lib/api';

export async function listComments(postId, { page = 0, size = 20 } = {}) {
  return api.get(`/posts/${postId}/comments?page=${page}&size=${size}&sort=createdAt,asc`);
}

export async function createComment(postId, { guestName, guestEmail, guestUrl, content }) {
  return api.post(`/posts/${postId}/comments`, {
    guestName: guestName || undefined,
    guestEmail: guestEmail || undefined,
    guestUrl: guestUrl || undefined,
    content,
  });
}
