'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { login } from '../../services/auth';

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = useMemo(() => sp.get('next') || '/', [sp]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ username, password });
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err?.data?.error || err?.message || '登录失败');
    } finally {
      setLoading(false);
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
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {String(error)}
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="label block mb-2">用户名</label>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
            </div>
            <div>
              <label className="label block mb-2">密码</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </div>
            <button className="btn w-full py-3" disabled={loading}>
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

