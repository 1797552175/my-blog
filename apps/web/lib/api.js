const isServer = typeof window === 'undefined';
import { ApiError, normalizeError } from './error';

function getBaseUrl() {
  if (isServer) {
    const internal = process.env.INTERNAL_API_URL || 'http://localhost:8080';
    return internal.endsWith('/') ? `${internal}api` : `${internal}/api`;
  }
  return process.env.NEXT_PUBLIC_API_BASE || '/api';
}

async function request(path, options = {}) {
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (!isServer) {
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    cache: options.cache ?? 'no-store',
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message = typeof data === 'object' && data?.error ? data.error : `http_${res.status}`;
    const error = new ApiError(message, data?.code ?? null, res.status, data?.fields ?? null);
    error.data = data;
    throw error;
  }

  return data;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body, options = {}) => request(path, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
};
