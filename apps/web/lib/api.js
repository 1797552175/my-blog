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

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      cache: options.cache ?? 'no-store',
    });

    const text = await res.text();
    const data = text ? safeJson(text) : null;

    // 检查 AI 调试响应头并输出到控制台
    if (!isServer) {
      const aiDebugHeaders = {};
      const aiFullContext = {};
      
      res.headers.forEach((value, key) => {
        if (key.toLowerCase().startsWith('x-ai-debug-')) {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('fullcontext')) {
            // 提取完整上下文
            const match = key.match(/x-ai-debug-log-(\d+)-(.+)/i);
            if (match) {
              aiFullContext[match[2]] = value;
            }
          } else {
            aiDebugHeaders[key] = value;
          }
        }
      });
      
      if (Object.keys(aiDebugHeaders).length > 0 || Object.keys(aiFullContext).length > 0) {
        console.group('[AI Debug]', options.method || 'GET', path);
        
        // 显示基本信息
        if (Object.keys(aiDebugHeaders).length > 0) {
          console.log('调试信息:', aiDebugHeaders);
        }
        
        // 显示完整上下文
        if (Object.keys(aiFullContext).length > 0) {
          console.group('AI 完整上下文');
          Object.entries(aiFullContext).forEach(([key, value]) => {
            console.log(`%c${key}`, 'color: #0066cc; font-weight: bold;');
            console.log(value);
          });
          console.groupEnd();
        }
        
        console.log('请求体:', options.body ? JSON.parse(options.body) : null);
        console.log('响应数据:', data);
        console.groupEnd();
      }
    }

    if (!res.ok) {
      const message = typeof data === 'object' && data?.error ? data.error : `http_${res.status}`;
      const error = new ApiError(message, data?.code ?? null, res.status, data?.fields ?? null);
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    // 如果是 ApiError，直接抛出
    if (err instanceof ApiError) {
      throw err;
    }
    // 网络错误或其他异常
    throw new ApiError('网络请求失败，请检查网络连接', 'NETWORK_ERROR', null, null);
  }
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
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
};

/**
 * 创建带有自动错误处理的 API 请求钩子
 * @param {Function} showToast - 显示 toast 的函数
 * @param {Function} onUnauthorized - 401 时的回调（如跳转到登录页）
 */
export function createApiClient(showToast, onUnauthorized) {
  const handleRequest = async (method, path, body, options = {}) => {
    try {
      const result = await api[method](path, body, options);
      return { data: result, error: null };
    } catch (error) {
      const apiError = normalizeError(error);
      
      // 处理 401 未授权
      if (apiError.needsReLogin() && onUnauthorized) {
        onUnauthorized();
        return { data: null, error: apiError };
      }
      
      // 显示错误提示（除非设置了 silent: true）
      if (!options.silent && showToast) {
        showToast(apiError.getUserMessage(), 'error');
      }
      
      return { data: null, error: apiError };
    }
  };

  return {
    get: (path, options) => handleRequest('get', path, null, options),
    post: (path, body, options) => handleRequest('post', path, body, options),
    put: (path, body, options) => handleRequest('put', path, body, options),
    patch: (path, body, options) => handleRequest('patch', path, body, options),
    del: (path, options) => handleRequest('del', path, null, options),
  };
}
