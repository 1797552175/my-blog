'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createStory } from '../services/stories';
import { useToast } from './Toast';

const STYLE_PRESETS = [
  { id: 'xuanhuan', name: '玄幻修仙', desc: '东方玄幻、修真成仙、法宝灵根' },
  { id: 'wuxia', name: '武侠江湖', desc: '快意恩仇、门派纷争、侠骨柔情' },
  { id: 'scifi', name: '科幻未来', desc: '星际探索、人工智能、未来世界' },
  { id: 'fantasy', name: '奇幻魔法', desc: '西方奇幻、魔法大陆、种族纷争' },
  { id: 'romance', name: '言情甜宠', desc: '都市爱情、甜宠治愈、虐恋情深' },
  { id: 'suspense', name: '悬疑推理', desc: '烧脑推理、层层反转、真相揭秘' },
  { id: 'history', name: '历史架空', desc: '穿越历史、权谋斗争、王朝兴衰' },
  { id: 'modern', name: '都市现实', desc: '职场奋斗、生活百态、现实主义' },
];

const TONE_OPTIONS = [
  { id: 'light', name: '轻松明快', desc: '节奏轻快，适合休闲阅读' },
  { id: 'steady', name: '稳健扎实', desc: '节奏适中，注重细节描写' },
  { id: 'intense', name: '紧张刺激', desc: '节奏紧凑，情节跌宕起伏' },
  { id: 'dark', name: '深沉厚重', desc: '节奏缓慢，深度思考人生' },
];

const VIEWPOINT_OPTIONS = [
  { id: 'first', name: '第一人称', desc: '我视角，代入感强' },
  { id: 'third', name: '第三人称', desc: '他/她视角，全知或限知' },
];

const LICENSE_OPTIONS = [
  { id: '', name: '不开源', desc: '仅作者可编辑，其他用户无法Fork' },
  { id: 'MIT', name: 'MIT License', desc: '最宽松，允许商用、修改、分发，需保留版权声明' },
  { id: 'GPL-3.0', name: 'GPL-3.0', desc: '传染性开源，衍生作品必须开源' },
  { id: 'CC-BY-SA-4.0', name: 'CC BY-SA 4.0', desc: '署名-相同方式共享，适合创意作品' },
  { id: 'CC-BY-NC-SA-4.0', name: 'CC BY-NC-SA 4.0', desc: '署名-非商业性使用-相同方式共享' },
  { id: 'Apache-2.0', name: 'Apache License 2.0', desc: '允许商用，提供专利授权保护' },
];

/**
 * 从 option 或 inspiration 解析出的预填数据，与 NovelOptionItem 结构一致
 */
function getInitialFormState(initialValues) {
  const o = initialValues || {};
  return {
    title: o.title || '',
    storySummary: o.storySummary || '',
    tags: Array.isArray(o.tags) ? [...o.tags] : [],
    selectedStyle: o.styleId || '',
    customStyle: o.customStyle || '',
    selectedTone: o.toneId || 'steady',
    selectedViewpoint: o.viewpointId || 'third',
    aiPrompt: o.aiPrompt || '',
    selectedLicense: 'MIT', // 默认 MIT
  };
}

function generateStyleParams(selectedStyle, customStyle, selectedTone, selectedViewpoint) {
  const stylePreset = STYLE_PRESETS.find(s => s.id === selectedStyle);
  const tone = TONE_OPTIONS.find(t => t.id === selectedTone);
  const viewpoint = VIEWPOINT_OPTIONS.find(v => v.id === selectedViewpoint);
  const parts = [];
  if (stylePreset) parts.push(stylePreset.name);
  if (customStyle?.trim()) parts.push(customStyle.trim());
  if (tone) parts.push(tone.name);
  if (viewpoint) parts.push(viewpoint.name);
  return parts.join('、');
}

export default function QuickCreateNovelModal({ open, onClose, initialValues, onSuccess }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tagInput, setTagInput] = useState('');

  const [title, setTitle] = useState('');
  const [storySummary, setStorySummary] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedStyle, setSelectedStyle] = useState('');
  const [customStyle, setCustomStyle] = useState('');
  const [selectedTone, setSelectedTone] = useState('steady');
  const [selectedViewpoint, setSelectedViewpoint] = useState('third');
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedLicense, setSelectedLicense] = useState('MIT');

  useEffect(() => {
    if (open && initialValues) {
      const s = getInitialFormState(initialValues);
      setTitle(s.title);
      setStorySummary(s.storySummary);
      setTags(s.tags);
      setSelectedStyle(s.selectedStyle);
      setCustomStyle(s.customStyle);
      setSelectedTone(s.selectedTone);
      setSelectedViewpoint(s.selectedViewpoint);
      setAiPrompt(s.aiPrompt);
      setSelectedLicense(s.selectedLicense);
      setStep(1);
      setError(null);
      setTagInput('');
    }
  }, [open, initialValues]);

  function addTag() {
    const t = tagInput.trim().slice(0, 20);
    if (!t || tags.includes(t) || tags.length >= 5) {
      setTagInput('');
      return;
    }
    setTags([...tags, t]);
    setTagInput('');
  }

  function removeTag(t) {
    setTags(tags.filter(x => x !== t));
  }

  function validateStep1() {
    if (!title.trim()) {
      setError('请填写小说书名');
      return false;
    }
    if (title.trim().length < 2) {
      setError('书名至少需要2个字符');
      return false;
    }
    if (!storySummary.trim()) {
      setError('请填写小说简介');
      return false;
    }
    setError(null);
    return true;
  }

  function validateStep2() {
    if (!selectedStyle && !customStyle.trim()) {
      setError('请选择或填写小说类型');
      return false;
    }
    setError(null);
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (step === 1) {
      if (validateStep1()) setStep(2);
      return;
    }
    if (step === 2) {
      if (validateStep2()) setStep(3);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const styleParams = generateStyleParams(selectedStyle, customStyle, selectedTone, selectedViewpoint);
      const story = await createStory({
        title: title.trim(),
        storySummary: storySummary.trim(),
        styleParams: styleParams || null,
        tags,
        published: false,
        openSource: selectedLicense !== '',
        openSourceLicense: selectedLicense || null,
      });
      addToast('小说创建成功！', 'success');
      onClose();
      if (onSuccess) onSuccess(story);
      router.push(`/me/stories/${story.id}/edit?autoGenerateFirstChapter=1`);
    } catch (err) {
      setError(err?.message ?? '创建失败');
      addToast(err?.message ?? '创建失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto" onClick={() => !loading && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">快速创作小说</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">确认信息后创建，将自动跳转编辑页并生成第一章</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">小说书名 *</label>
                <input type="text" className="input w-full" value={title} onChange={e => setTitle(e.target.value)} placeholder="给你的小说起个名字" maxLength={200} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">小说简介 *</label>
                <textarea className="input w-full min-h-[100px]" value={storySummary} onChange={e => setStorySummary(e.target.value)} placeholder="简要介绍故事背景与主线" maxLength={2000} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">标签（可选，最多5个）</label>
                <div className="flex gap-2 flex-wrap items-center">
                  <input type="text" className="input flex-1 min-w-0" placeholder="输入后回车添加" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} maxLength={20} />
                  <button type="button" onClick={addTag} className="btn btn-ghost" disabled={!tagInput.trim() || tags.length >= 5}>添加</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 text-sm text-indigo-700 dark:text-indigo-300">
                      {t}
                      <button type="button" onClick={() => removeTag(t)} className="hover:text-red-600">×</button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={onClose} className="btn btn-ghost mr-2">取消</button>
                <button type="submit" className="btn">下一步：AI 创作设定</button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">小说类型</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {STYLE_PRESETS.map(s => (
                    <button key={s.id} type="button" onClick={() => setSelectedStyle(s.id)} className={`p-2 rounded-lg border text-left text-sm ${selectedStyle === s.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-zinc-200 dark:border-zinc-700'}`}>
                      {s.name}
                    </button>
                  ))}
                </div>
                <input type="text" className="input w-full mt-2" placeholder="自定义类型（可选）" value={customStyle} onChange={e => setCustomStyle(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">叙事节奏</label>
                <div className="flex flex-wrap gap-2">
                  {TONE_OPTIONS.map(t => (
                    <button key={t.id} type="button" onClick={() => setSelectedTone(t.id)} className={`p-2 rounded-lg border text-sm ${selectedTone === t.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-zinc-200 dark:border-zinc-700'}`}>{t.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">叙事视角</label>
                <div className="flex gap-2">
                  {VIEWPOINT_OPTIONS.map(v => (
                    <button key={v.id} type="button" onClick={() => setSelectedViewpoint(v.id)} className={`flex-1 p-2 rounded-lg border text-sm ${selectedViewpoint === v.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-zinc-200 dark:border-zinc-700'}`}>{v.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">AI 补充提示（可选）</label>
                <textarea className="input w-full min-h-[80px]" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="更多创作风格说明" maxLength={500} />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setStep(1)} className="btn btn-ghost">上一步</button>
                <button type="submit" className="btn">下一步：开源设置</button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">开源协议（默认 MIT）</label>
                <div className="space-y-2">
                  {LICENSE_OPTIONS.map(l => (
                    <label key={l.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${selectedLicense === l.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-zinc-200 dark:border-zinc-700'}`}>
                      <input type="radio" name="license" value={l.id} checked={selectedLicense === l.id} onChange={e => setSelectedLicense(e.target.value)} />
                      <div>
                        <div className="font-medium text-sm">{l.name}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{l.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setStep(2)} className="btn btn-ghost">上一步</button>
                <button type="submit" className="btn" disabled={loading}>{loading ? '创建中…' : '创建并去写第一章'}</button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
