export class ApiError extends Error {
  constructor(message, code, status, fields = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage() {
    // 根据状态码返回友好的错误消息
    if (this.status === 401) {
      return '登录已过期，请重新登录';
    }
    if (this.status === 403) {
      return '您没有权限执行此操作';
    }
    if (this.status === 404) {
      return '请求的资源不存在';
    }
    if (this.status === 429) {
      return '请求过于频繁，请稍后再试';
    }
    if (this.status >= 500) {
      return '服务器繁忙，请稍后再试';
    }

    // 根据错误代码返回特定消息
    const codeMessages = {
      'NETWORK_ERROR': '网络连接失败，请检查网络设置',
      'TIMEOUT': '请求超时，请稍后重试',
      'INVALID_TOKEN': '登录状态无效，请重新登录',
      'USER_NOT_FOUND': '用户不存在',
      'INVALID_PASSWORD': '密码错误',
      'USERNAME_EXISTS': '用户名已被注册',
      'EMAIL_EXISTS': '邮箱已被注册',
      'VALIDATION_ERROR': '输入信息有误，请检查',
      'RATE_LIMIT': '操作过于频繁，请稍后再试',
    };

    if (this.code && codeMessages[this.code]) {
      return codeMessages[this.code];
    }

    // 返回原始消息或默认消息
    return this.message || '操作失败，请稍后重试';
  }

  /**
   * 是否是网络错误
   */
  isNetworkError() {
    return this.code === 'NETWORK_ERROR' || 
           this.message?.includes('network') ||
           this.message?.includes('fetch');
  }

  /**
   * 是否需要重新登录
   */
  needsReLogin() {
    return this.status === 401 || 
           this.code === 'INVALID_TOKEN' ||
           this.code === 'TOKEN_EXPIRED';
  }
}

export function normalizeError(err) {
  if (err instanceof ApiError) {
    return err;
  }

  const message = extractErrorMessage(err);
  const code = extractErrorCode(err);
  const status = err?.status ?? null;
  const fields = err?.data?.fields ?? null;

  return new ApiError(message, code, status, fields);
}

function extractErrorMessage(err) {
  if (typeof err === 'string') {
    return err;
  }
  if (err?.data?.error) {
    return err.data.error;
  }
  if (err?.message) {
    return err.message;
  }
  if (err?.data?.message) {
    return err.data.message;
  }
  if (err?.status) {
    return `http_${err.status}`;
  }
  return '请求失败，请稍后重试';
}

function extractErrorCode(err) {
  if (err?.data?.code) {
    return err.data.code;
  }
  if (err?.code) {
    return err.code;
  }
  return null;
}

/**
 * 全局错误处理器 - 用于统一处理 API 错误
 * @param {Error} error - 错误对象
 * @param {Object} options - 配置选项
 * @param {Function} options.showToast - 显示 toast 的函数
 * @param {Function} options.onUnauthorized - 401 时的回调
 * @param {boolean} options.silent - 是否静默处理（不显示提示）
 * @returns {ApiError} 标准化的错误对象
 */
export function handleApiError(error, options = {}) {
  const { showToast, onUnauthorized, silent = false } = options;
  
  const apiError = normalizeError(error);
  
  // 如果需要重新登录
  if (apiError.needsReLogin() && onUnauthorized) {
    onUnauthorized();
    return apiError;
  }
  
  // 显示错误提示
  if (!silent && showToast) {
    showToast(apiError.getUserMessage(), 'error');
  }
  
  return apiError;
}
