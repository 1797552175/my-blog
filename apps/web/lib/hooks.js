'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * 用于防止表单重复提交的 hook
 * @param {Function} asyncFunction - 异步提交函数
 * @returns {Object} { loading, error, execute, reset }
 */
export function useSubmit(asyncFunction) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isSubmittingRef = useRef(false);

  const execute = useCallback(async (...args) => {
    // 防止重复提交
    if (isSubmittingRef.current) {
      return { success: false, error: new Error('正在提交中，请稍候') };
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFunction(...args);
      return { success: true, data: result, error: null };
    } catch (err) {
      setError(err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    isSubmittingRef.current = false;
  }, []);

  return { loading, error, execute, reset };
}

/**
 * 防抖 hook
 * @param {Function} callback - 需要防抖的函数
 * @param {number} delay - 防抖延迟（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function useDebounce(callback, delay = 300) {
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
}

/**
 * 节流 hook
 * @param {Function} callback - 需要节流的函数
 * @param {number} limit - 节流间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
export function useThrottle(callback, limit = 300) {
  const inThrottleRef = useRef(false);

  return useCallback((...args) => {
    if (!inThrottleRef.current) {
      callback(...args);
      inThrottleRef.current = true;
      setTimeout(() => {
        inThrottleRef.current = false;
      }, limit);
    }
  }, [callback, limit]);
}

/**
 * 网络状态监听 hook
 * @returns {Object} { isOnline, since }
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [since, setSince] = useState(Date.now());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const handleOnline = () => {
      setIsOnline(true);
      setSince(Date.now());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSince(Date.now());
    };

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [mounted]);

  return { isOnline, since };
}

/**
 * 本地存储 hook（带自动序列化）
 * @param {string} key - 存储键名
 * @param {*} initialValue - 初始值
 * @returns {Array} [value, setValue, remove]
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setStoredValue = useCallback((newValue) => {
    try {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      setValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error('useLocalStorage error:', error);
    }
  }, [key, value]);

  const removeValue = useCallback(() => {
    try {
      setValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('useLocalStorage remove error:', error);
    }
  }, [key, initialValue]);

  return [value, setStoredValue, removeValue];
}
