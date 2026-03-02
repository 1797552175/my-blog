'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useCallback, useEffect } from 'react';
import { login, smsLogin, sendSms } from '../../services/auth';
import { useSubmit } from '../../lib/hooks';
import { normalizeError } from '../../lib/error';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState('password'); // 'password' | 'sms'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsCooldown, setSmsCooldown] = useState(0);
  const [smsSending, setSmsSending] = useState(false);
  const [error, setError] = useState(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (smsCooldown <= 0) return;
    const t = setInterval(() => setSmsCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [smsCooldown]);

  const { loading, execute: handleLogin } = useSubmit(
    useCallback(async (credentials) => {
      await login(credentials);
    }, [])
  );
  const { loading: smsLoading, execute: handleSmsLogin } = useSubmit(
    useCallback(async (payload) => {
      await smsLogin(payload);
    }, [])
  );

  function onAuthSuccess() {
    if (typeof window !== 'undefined') {
      const event = new StorageEvent('storage', {
        key: 'user',
        newValue: localStorage.getItem('user'),
        oldValue: null,
        url: window.location.href
      });
      window.dispatchEvent(event);
      const urlParams = new URLSearchParams(window.location.search);
      router.push(urlParams.get('next') || '/');
    } else {
      router.push('/');
    }
  }

  async function onSubmitPassword(e) {
    e.preventDefault();
    setError(null);
    const result = await handleLogin({ username, password });
    if (result.success) onAuthSuccess();
    else {
      setError(normalizeError(result.error).getUserMessage());
      if (errorRef.current) errorRef.current.focus();
    }
  }

  async function onSendSms() {
    const p = phone.replace(/\s/g, '');
    if (!/^1[3-9]\d{9}$/.test(p)) {
      setError('请输入正确的手机号');
      return;
    }
    setError(null);
    setSmsSending(true);
    try {
      await sendSms(p, 'LOGIN_REGISTER');
      setSmsCooldown(60);
    } catch (err) {
      setError(err?.message ?? '发送验证码失败');
    } finally {
      setSmsSending(false);
    }
  }

  async function onSubmitSms(e) {
    e.preventDefault();
    setError(null);
    const result = await handleSmsLogin({ phone: phone.replace(/\s/g, ''), code: smsCode });
    if (result.success) onAuthSuccess();
    else {
      setError(normalizeError(result.error).getUserMessage());
      if (errorRef.current) errorRef.current.focus();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">登录</h1>
          </div>

          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-600 p-0.5 mb-6">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'password' ? 'bg-primary-600 text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
              onClick={() => { setTab('password'); setError(null); }}
            >
              密码登录
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'sms' ? 'bg-primary-600 text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
              onClick={() => { setTab('sms'); setError(null); }}
            >
              验证码登录
            </button>
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

          {tab === 'password' ? (
            <form className="space-y-5" onSubmit={onSubmitPassword}>
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
              <div className="text-right">
                <Link href="/forgot-password" className="text-sm text-primary-600 hover:underline">忘记密码？</Link>
              </div>
              <button className="btn w-full py-3 flex items-center justify-center gap-2" disabled={loading}>
                {loading && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {loading ? '登录中…' : '登录'}
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={onSubmitSms}>
              <div>
                <label className="label block mb-2" htmlFor="login-phone">手机号</label>
                <div className="flex gap-2">
                  <input
                    id="login-phone"
                    className="input flex-1"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="11 位手机号"
                    maxLength={11}
                    required
                  />
                  <button type="button" className="btn whitespace-nowrap px-4" onClick={onSendSms} disabled={smsCooldown > 0 || smsLoading || smsSending}>
                    {smsSending ? '发送中…' : smsCooldown > 0 ? `${smsCooldown}秒后重发` : '获取验证码'}
                  </button>
                </div>
              </div>
              <div>
                <label className="label block mb-2" htmlFor="login-code">短信验证码</label>
                <input
                  id="login-code"
                  className="input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 位验证码"
                  maxLength={6}
                  required
                  disabled={smsLoading}
                />
              </div>
              <button className="btn w-full py-3 flex items-center justify-center gap-2" disabled={smsLoading}>
                {smsLoading && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {smsLoading ? '登录中…' : '验证码登录'}
              </button>
            </form>
          )}

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
