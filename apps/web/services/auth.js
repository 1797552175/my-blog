import { api } from '../lib/api';

/** 短信场景：LOGIN_REGISTER | RESET_PASSWORD | BIND_PHONE | VERIFY_PHONE | CHANGE_PHONE */
export async function sendSms(phone, scene) {
  await api.post('/auth/sms/send', { phone, scene });
}

export async function register({ username, email, password, phone, smsCode }) {
  return api.post('/auth/register', { username, email, password, phone, smsCode });
}

export async function login({ username, password }) {
  const data = await api.post('/auth/login', { username, password });
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({ username: data.username }));
  }
  return data;
}

export async function smsLogin({ phone, code }) {
  const data = await api.post('/auth/sms/login', { phone, code });
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({ username: data.username }));
  }
  return data;
}

export async function resetPasswordRequest(phone) {
  await api.post('/auth/password/reset-request', { phone });
}

export async function resetPassword({ phone, code, newPassword }) {
  await api.post('/auth/password/reset', { phone, code, newPassword });
}

export async function bindPhone({ phone, code }) {
  return api.put('/auth/me/phone', { phone, code });
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
