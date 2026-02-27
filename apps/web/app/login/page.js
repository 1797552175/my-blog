'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useCallback } from 'react';
import { login } from '../../services/auth';
import { useSubmit } from '../../lib/hooks';
import { normalizeError } from '../../lib/error';

function NextRedirect() {
  const { useSearchParams } = require('next/navigation');
  const sp = useSearchParams();
  return sp.get('next') || '/';
}

export default function LoginPage() {
  const router = useRouter();
  const next = '/'; // 默认值，实际值会在客户端获取

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const errorRef = useRef(null);

  // 使用 useSubmit 防止重复提交
  const { loading, execute: handleLogin } = useSubmit(
    useCallback(async (credentials) => {
      await login(credentials);
    }, [])
  );

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    
    const result = await handleLogin({ username, password });
    
    if (result.success) {
      // 登录成功后，手动触发storage事件来更新Layout组件的状态
      if (typeof window !== 'undefined') {
        // 手动触发storage事件
        const event = new StorageEvent('storage', {
          key: 'user',
          newValue: localStorage.getItem('user'),
          oldValue: null,
          url: window.location.href
        });
        window.dispatchEvent(event);
        
        // 在客户端获取next参数
        const urlParams = new URLSearchParams(window.location.search);
        const nextParam = urlParams.get('next') || '/';
        router.push(nextParam);
      } else {
        router.push('/');
      }
    } else {
      const apiError = normalizeError(result.error);
      setError(apiError.getUserMessage());
      if (errorRef.current) {
        errorRef.current.focus();
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">登录</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">使用你的账号登录后即可写小说。</p>
          </div>

          {error ? (
            <div 
              ref={errorRef}
              tabIndex={-1}
              className="mb-6 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 focus:outline-none"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="label block mb-2" htmlFor="username">用户名</label>
              <input 
                id="username"
                className="input" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                autoComplete="username" 
                required 
                disabled={loading}
              />
            </div>
            <div>
              <label className="label block mb-2" htmlFor="password">密码</label>
              <input 
                id="password"
                className="input" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                autoComplete="current-password" 
                required 
                disabled={loading}
              />
            </div>
            <button 
              className="btn w-full py-3 flex items-center justify-center gap-2" 
              disabled={loading}
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {loading ? '登录中…' : '登录'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-300">
            还没有账号？{' '}
            <Link className="text-primary-600 hover:underline font-medium" href="/register">
              去注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
