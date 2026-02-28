'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getMe, updateProfile, changePassword } from '../../../services/user';
import { isAuthed } from '../../../services/auth';
import { getModels } from '../../../services/ai';

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [personaPrompt, setPersonaPrompt] = useState('');
  const [personaEnabled, setPersonaEnabled] = useState(true);
  const [personaSaving, setPersonaSaving] = useState(false);
  const [personaError, setPersonaError] = useState(null);
  const [personaSuccess, setPersonaSuccess] = useState(false);

  const [defaultAiModel, setDefaultAiModel] = useState('gpt-4o-mini');
  const [modelSaving, setModelSaving] = useState(false);
  const [modelError, setModelError] = useState(null);
  const [modelSuccess, setModelSuccess] = useState(false);

  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isAuthed());
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/me/settings');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getMe();
        if (!cancelled) {
          setProfile(data);
          setEmail(data.email || '');
          setIsAdmin(data.admin ?? false);
          setPersonaPrompt(data.personaPrompt ?? '');
          setPersonaEnabled(data.personaEnabled ?? true);
          setDefaultAiModel(data.defaultAiModel ?? 'gpt-4o-mini');
        }
      } catch (err) {
        if (!cancelled) setProfileError(err?.message ?? '加载失败');
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router, isAuthenticated, isMounted]);

  useEffect(() => {
    if (!isMounted || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getModels();
        if (!cancelled) {
          setModels(data);
        }
      } catch (err) {
        if (!cancelled) setModelsError(err?.message ?? '加载失败');
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isMounted, isAuthenticated]);

  async function onSaveProfile(e) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setProfileSaving(true);
    try {
      const data = await updateProfile({ email: email.trim() || undefined });
      setProfile(data);
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(err?.message ?? '保存失败');
    } finally {
      setProfileSaving(false);
    }
  }

  async function onSavePersona(e) {
    e.preventDefault();
    setPersonaError(null);
    setPersonaSuccess(false);
    setPersonaSaving(true);
    try {
      const data = await updateProfile({ personaPrompt: personaPrompt.trim() || undefined, personaEnabled });
      setProfile(data);
      setPersonaSuccess(true);
    } catch (err) {
      setPersonaError(err?.message ?? '保存失败');
    } finally {
      setPersonaSaving(false);
    }
  }

  async function onChangePassword(e) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
    } catch (err) {
      setPasswordError(err?.message ?? '修改失败');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function onSaveModel(e) {
    e.preventDefault();
    setModelError(null);
    setModelSuccess(false);
    setModelSaving(true);
    try {
      const data = await updateProfile({ defaultAiModel });
      setProfile(data);
      setModelSuccess(true);
    } catch (err) {
      setModelError(err?.message ?? '保存失败');
    } finally {
      setModelSaving(false);
    }
  }

  if (!isMounted || !isAuthenticated) return null;
  if (profileLoading) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="card p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">加载中…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 py-12">
      <div className="max-w-xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">账号设置</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">管理你的个人资料与密码</p>
        </div>

        {/* 个人资料 */}
        <div className="mb-8 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">个人资料</h2>
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            
            {profileError ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 transition-all duration-300">
                {String(profileError)}
              </div>
            ) : null}
            {profileSuccess ? (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300 transition-all duration-300">
                资料已保存
              </div>
            ) : null}
            
            <form className="space-y-5" onSubmit={onSaveProfile}>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">用户名</label>
                <input 
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 cursor-not-allowed"
                  value={profile?.username ?? ''} 
                  readOnly 
                  disabled 
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">用户名不可修改</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">邮箱</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={128}
                  placeholder="your@email.com"
                />
              </div>
              
              <button 
                type="submit" 
                className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-all duration-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={profileSaving}
              >
                {profileSaving ? '保存中…' : '保存资料'}
              </button>
            </form>
          </div>
        </div>

        {/* AI 分身设定 */}
        {isAdmin && (
          <div className="mb-8 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden transition-all duration-300 hover:shadow-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">AI 分身设定</h2>
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">开启后，读者可在小说列表与小说详情页与你的 AI 分身对话。下方提示词会注入分身人格。</p>
              
              {personaError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 transition-all duration-300">
                  {String(personaError)}
                </div>
              ) : null}
              {personaSuccess ? (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300 transition-all duration-300">
                  分身设定已保存
                </div>
              ) : null}
              
              <form className="space-y-5" onSubmit={onSavePersona}>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">分身提示词（可选）</label>
                  <textarea
                    className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 min-h-[120px] resize-y"
                    value={personaPrompt}
                    onChange={(e) => setPersonaPrompt(e.target.value)}
                    placeholder="例如：用简洁、温和的语气回答；偏好技术类话题。"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    id="personaEnabled"
                    type="checkbox"
                    className="h-5 w-5 rounded border-zinc-300 text-primary-600 focus:ring-2 focus:ring-primary-500 transition-all duration-300"
                    checked={personaEnabled}
                    onChange={(e) => setPersonaEnabled(e.target.checked)}
                  />
                  <label htmlFor="personaEnabled" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    开启 AI 分身（读者可与「你」对话）
                  </label>
                </div>
                
                <button 
                  type="submit" 
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all duration-300 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={personaSaving}
                >
                  {personaSaving ? '保存中…' : '保存分身设定'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* AI 模型选择 */}
        {isAdmin && (
          <div className="mb-8 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden transition-all duration-300 hover:shadow-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">AI 模型选择</h2>
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
              
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">选择默认使用的 AI 模型，用于对话和生成内容。</p>
              
              {modelError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 transition-all duration-300">
                  {String(modelError)}
                </div>
              ) : null}
              {modelSuccess ? (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300 transition-all duration-300">
                  模型设置已保存
                </div>
              ) : null}
              {modelsError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 transition-all duration-300">
                  {String(modelsError)}
                </div>
              ) : null}
              
              <form className="space-y-5" onSubmit={onSaveModel}>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">默认 AI 模型</label>
                  {modelsLoading ? (
                    <div className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400">
                      加载中…
                    </div>
                  ) : (
                    <select
                      className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300"
                      value={defaultAiModel}
                      onChange={(e) => setDefaultAiModel(e.target.value)}
                    >
                      {models.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.provider}) - {model.description}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                <button 
                  type="submit" 
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={modelSaving}
                >
                  {modelSaving ? '保存中…' : '保存模型设置'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 修改密码 */}
        <div className="mb-8 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">修改密码</h2>
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            
            {passwordError ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 transition-all duration-300">
                {String(passwordError)}
              </div>
            ) : null}
            {passwordSuccess ? (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300 transition-all duration-300">
                密码已修改
              </div>
            ) : null}
            
            <form className="space-y-5" onSubmit={onChangePassword}>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">当前密码</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">新密码</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  maxLength={72}
                  required
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">6～72 个字符</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">确认新密码</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-300 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={passwordSaving}
              >
                {passwordSaving ? '提交中…' : '修改密码'}
              </button>
            </form>
          </div>
        </div>

        {/* 返回链接 */}
        <div className="text-center">
          <Link 
            href="/me/stories" 
            className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors duration-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回我的小说
          </Link>
        </div>
      </div>
    </div>
  );
}
