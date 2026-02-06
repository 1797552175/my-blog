'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { register } from '../../services/auth';

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ username, email, password });
      setDone(true);
      setTimeout(() => router.push('/login'), 600);
    } catch (err) {
      setError(err?.data?.error || err?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">注册</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">创建账号后即可登录写小说。</p>
          </div>

          {error ? (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {String(error)}
            </div>
          ) : null}

          {done ? (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              注册成功，正在跳转到登录页…
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="label block mb-2">用户名</label>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
            </div>
            <div>
              <label className="label block mb-2">邮箱</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            <div>
              <label className="label block mb-2">密码</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
            </div>
            <button className="btn w-full py-3" disabled={loading}>
              {loading ? '提交中…' : '注册'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-300">
            已有账号？{' '}
            <Link className="text-primary-600 hover:underline font-medium" href="/login">
              去登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

