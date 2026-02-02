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
    <div className="max-w-md mx-auto">
      <div className="card p-6">
        <h1 className="text-2xl font-bold mb-1">注册</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">创建账号后即可登录写文章。</p>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {String(error)}
          </div>
        ) : null}

        {done ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            注册成功，正在跳转到登录页…
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="label">用户名</label>
            <input className="input mt-1" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </div>
          <div>
            <label className="label">邮箱</label>
            <input className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div>
            <label className="label">密码</label>
            <input className="input mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          </div>
          <button className="btn w-full" disabled={loading}>
            {loading ? '提交中…' : '注册'}
          </button>
        </form>

        <div className="mt-6 text-sm text-zinc-600 dark:text-zinc-300">
          已有账号？{' '}
          <Link className="text-primary-600 hover:underline" href="/login">
            去登录
          </Link>
        </div>
      </div>
    </div>
  );
}

