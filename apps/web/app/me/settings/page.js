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
    if (!isAuthed()) {
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
          setPersonaPrompt(data.personaPrompt ?? '');
          setPersonaEnabled(data.personaEnabled ?? true);
          setDefaultAiModel(data.defaultAiModel ?? 'gpt-4o-mini');
        }
      } catch (err) {
        if (!cancelled) setProfileError(err?.data?.error || err?.message || '加载失败');
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!isAuthed()) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getModels();
        if (!cancelled) {
          setModels(data);
        }
      } catch (err) {
        if (!cancelled) setModelsError(err?.data?.error || err?.message || '加载模型列表失败');
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
      setProfileError(err?.data?.error || err?.message || '保存失败');
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
      setPersonaError(err?.data?.error ?? err?.message ?? '保存失败');
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
      setPasswordError(err?.data?.error || err?.message || '修改失败');
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
      setModelError(err?.data?.error || err?.message || '保存失败');
    } finally {
      setModelSaving(false);
    }
  }

  if (!isAuthed()) return null;
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
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">账号设置</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">管理你的个人资料与密码。</p>
      </div>

      {/* 个人资料 */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">个人资料</h2>
        {profileError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {String(profileError)}
          </div>
        ) : null}
        {profileSuccess ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            资料已保存
          </div>
        ) : null}
        <form className="space-y-4" onSubmit={onSaveProfile}>
          <div>
            <label className="label">用户名</label>
            <input className="input mt-1 bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed" value={profile?.username ?? ''} readOnly disabled />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">用户名不可修改</p>
          </div>
          <div>
            <label className="label">邮箱</label>
            <input
              type="email"
              className="input mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={128}
              placeholder="your@email.com"
            />
          </div>
          <button type="submit" className="btn" disabled={profileSaving}>
            {profileSaving ? '保存中…' : '保存资料'}
          </button>
        </form>
      </div>

      {/* AI 分身设定 */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">AI 分身设定</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">开启后，读者可在小说列表与小说详情页与你的 AI 分身对话。下方提示词会注入分身人格。</p>
        {personaError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {String(personaError)}
          </div>
        ) : null}
        {personaSuccess ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            分身设定已保存
          </div>
        ) : null}
        <form className="space-y-4" onSubmit={onSavePersona}>
          <div>
            <label className="label">分身提示词（可选）</label>
            <textarea
              className="input mt-1 min-h-[100px] resize-y"
              value={personaPrompt}
              onChange={(e) => setPersonaPrompt(e.target.value)}
              placeholder="例如：用简洁、温和的语气回答；偏好技术类话题。"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              id="personaEnabled"
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-400/50"
              checked={personaEnabled}
              onChange={(e) => setPersonaEnabled(e.target.checked)}
            />
            <label htmlFor="personaEnabled" className="text-sm text-zinc-700 dark:text-zinc-200">
              开启 AI 分身（读者可与「你」对话）
            </label>
          </div>
          <button type="submit" className="btn" disabled={personaSaving}>
            {personaSaving ? '保存中…' : '保存分身设定'}
          </button>
        </form>
      </div>

      {/* AI 模型选择 */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">AI 模型选择</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">选择默认使用的 AI 模型，用于对话和生成内容。</p>
        {modelError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {String(modelError)}
          </div>
        ) : null}
        {modelSuccess ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            模型设置已保存
          </div>
        ) : null}
        {modelsError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {String(modelsError)}
          </div>
        ) : null}
        <form className="space-y-4" onSubmit={onSaveModel}>
          <div>
            <label className="label">默认 AI 模型</label>
            {modelsLoading ? (
              <div className="input mt-1 bg-zinc-100 dark:bg-zinc-800 p-2">加载中…</div>
            ) : (
              <select
                className="input mt-1"
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
          <button type="submit" className="btn" disabled={modelSaving}>
            {modelSaving ? '保存中…' : '保存模型设置'}
          </button>
        </form>
      </div>

      {/* 修改密码 */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">修改密码</h2>
        {passwordError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {String(passwordError)}
          </div>
        ) : null}
        {passwordSuccess ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            密码已修改
          </div>
        ) : null}
        <form className="space-y-4" onSubmit={onChangePassword}>
          <div>
            <label className="label">当前密码</label>
            <input
              type="password"
              className="input mt-1"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="label">新密码</label>
            <input
              type="password"
              className="input mt-1"
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
            <label className="label">确认新密码</label>
            <input
              type="password"
              className="input mt-1"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <button type="submit" className="btn" disabled={passwordSaving}>
            {passwordSaving ? '提交中…' : '修改密码'}
          </button>
        </form>
      </div>

      <div className="text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/me/posts" className="text-primary-600 dark:text-primary-400 hover:underline">← 返回我的小说</Link>
      </div>
    </div>
  );
}
