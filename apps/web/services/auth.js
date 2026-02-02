import { api } from '../lib/api';

export async function register({ username, email, password }) {
  return api.post('/auth/register', { username, email, password });
}

export async function login({ username, password }) {
  const data = await api.post('/auth/login', { username, password });
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({ username: data.username }));
  }
  return data;
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function isAuthed() {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('token'));
}
