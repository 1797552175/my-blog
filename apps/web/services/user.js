import { api } from '../lib/api';

/**
 * 获取当前登录用户信息（需认证）
 */
export async function getMe() {
  return api.get('/auth/me');
}

/**
 * 更新当前用户资料（如邮箱、分身设定、默认AI模型）
 */
export async function updateProfile({ email, personaPrompt, personaEnabled, defaultAiModel }) {
  const body = {};
  if (email !== undefined) body.email = email || undefined;
  if (personaPrompt !== undefined) body.personaPrompt = personaPrompt === '' ? null : personaPrompt;
  if (personaEnabled !== undefined) body.personaEnabled = personaEnabled;
  if (defaultAiModel !== undefined) body.defaultAiModel = defaultAiModel === '' ? null : defaultAiModel;
  return api.put('/auth/me', body);
}

/**
 * 修改当前用户密码
 */
export async function changePassword({ currentPassword, newPassword }) {
  return api.put('/auth/me/password', { currentPassword, newPassword });
}
