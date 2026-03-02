'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { resetPasswordRequest, resetPassword } from '../../services/auth';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: 输入手机号并获取验证码  2: 输入验证码和新密码
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [smsCooldown, setSmsCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const errorRef = useRef(null);

  useEffect(() => {
    if (smsCooldown <= 0) return;
    const t = setInterval(() => setSmsCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [smsCooldown]);

  async function onSendCode(e) {
    e.preventDefault();
    const p = phone.replace(/\s/g, '');
    if (!/^1[3-9]\d{9}$/.test(p)) {
      setError('请输入正确的手机号');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await resetPasswordRequest(p);
      setSmsCooldown(60);
      setStep(2);
    } catch (err) {
      setError(err?.message ?? '发送验证码失败');
      if (errorRef.current) errorRef.current.focus();
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('密码至少 8 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ phone: phone.replace(/\s/g, ''), code: smsCode, newPassword });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError(err?.message ?? '重置失败');
      if (errorRef.current) errorRef.current.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">重置密码</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {step === 1 ? '输入已绑定账号的手机号，我们将发送验证码' : '输入验证码并设置新密码'}
            </p>
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
          {success ? (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
              密码已重置，正在跳转到登录页…
            </div>
          ) : null}

          {step === 1 ? (
            <form className="space-y-5" onSubmit={onSendCode}>
              <div>
                <label className="label block mb-2" htmlFor="fp-phone">手机号</label>
                <div className="flex gap-2">
                  <input
                    id="fp-phone"
                    className="input flex-1"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="11 位手机号"
                    maxLength={11}
                    required
                  />
                  <button
                    type="submit"
                    className="btn whitespace-nowrap px-4"
                    disabled={smsCooldown > 0 || loading}
                  >
                    {smsCooldown > 0 ? `${smsCooldown}秒后重发` : '获取验证码'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={onSubmit}>
              <div>
                <label className="label block mb-2" htmlFor="fp-code">短信验证码</label>
                <input
                  id="fp-code"
                  className="input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 位验证码"
                  maxLength={6}
                  required
                />
              </div>
              <div>
                <label className="label block mb-2" htmlFor="fp-new">新密码</label>
                <input
                  id="fp-new"
                  className="input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="至少 8 位"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label className="label block mb-2" htmlFor="fp-confirm">确认新密码</label>
                <input
                  id="fp-confirm"
                  className="input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                  required
                />
              </div>
              <button className="btn w-full py-3" disabled={loading}>
                {loading ? '提交中…' : '确认重置'}
              </button>
              <div className="text-center">
                <button type="button" className="text-sm text-zinc-500 hover:underline" onClick={() => setStep(1)}>
                  更换手机号
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-300">
            <Link className="text-primary-600 hover:underline font-medium" href="/login">
              返回登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
