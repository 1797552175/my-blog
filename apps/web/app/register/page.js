'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { register, sendSms } from '../../services/auth';

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsCooldown, setSmsCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: '', color: '' });
  const errorRef = useRef(null);

  // 发送验证码倒计时
  useEffect(() => {
    if (smsCooldown <= 0) return;
    const t = setInterval(() => setSmsCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [smsCooldown]);

  async function onSendSms() {
    const p = phone.replace(/\s/g, '');
    if (!/^1[3-9]\d{9}$/.test(p)) {
      setError('请输入正确的手机号');
      return;
    }
    setError(null);
    try {
      await sendSms(p, 'LOGIN_REGISTER');
      setSmsCooldown(60);
    } catch (err) {
      setError(err?.message ?? '发送验证码失败');
    }
  }

  // 密码强度检测函数
  const checkPasswordStrength = (password) => {
    let score = 0;
    const hasLength = password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (hasLength) score++;
    if (hasLetter) score++;
    if (hasNumber) score++;
    
    const messages = ['非常弱', '弱', '中等', '强'];
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
    
    return {
      score,
      message: messages[score],
      color: colors[score],
      isValid: hasLength && hasLetter && hasNumber
    };
  };

  // 处理密码输入变化
  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(checkPasswordStrength(newPassword));
  };

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    
    // 前端验证密码强度
    if (!passwordStrength.isValid) {
      setError('密码必须包含字母和数字，长度至少8位');
      if (errorRef.current) {
        errorRef.current.focus();
      }
      return;
    }
    
    setLoading(true);
    try {
      await register({ username, password, phone: phone.replace(/\s/g, ''), smsCode });
      setDone(true);
      setTimeout(() => router.push('/login'), 600);
    } catch (err) {
      setError(err?.message ?? '注册失败');
      if (errorRef.current) {
        errorRef.current.focus();
      }
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
          </div>

          {error ? (
            <div 
              ref={errorRef}
              tabIndex={-1}
              className="mb-6 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 focus:outline-none"
              role="alert"
            >
              注册失败：{String(error)}
            </div>
          ) : null}

          {done ? (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
              注册成功，正在跳转到登录页…
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
              />
            </div>
            <div>
              <label className="label block mb-2" htmlFor="password">密码</label>
              <input 
                id="password"
                className="input" 
                type="password" 
                value={password} 
                onChange={handlePasswordChange} 
                autoComplete="new-password" 
                required 
              />
              {password && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>密码强度：</span>
                    <span className={`font-medium ${passwordStrength.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordStrength.message}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${passwordStrength.color} transition-all duration-300`}
                      style={{ width: `${(passwordStrength.score / 3) * 100}%` }}
                    ></div>
                  </div>
                  <div className={`text-xs mt-1 ${passwordStrength.isValid ? 'text-green-500' : 'text-red-500'}`}>
                    密码需包含：字母和数字，长度至少8位
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="label block mb-2" htmlFor="phone">手机号</label>
              <div className="flex gap-2">
                <input
                  id="phone"
                  className="input flex-1"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="11 位手机号"
                  maxLength={11}
                  required
                />
                <button
                  type="button"
                  className="btn whitespace-nowrap px-4"
                  onClick={onSendSms}
                  disabled={smsCooldown > 0 || loading}
                >
                  {smsCooldown > 0 ? `${smsCooldown}秒后重发` : '获取验证码'}
                </button>
              </div>
            </div>
            <div>
              <label className="label block mb-2" htmlFor="smsCode">短信验证码</label>
              <input
                id="smsCode"
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
            <button className="btn w-full py-3" disabled={loading}>
              {loading ? '注册中…' : '注册'}
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

