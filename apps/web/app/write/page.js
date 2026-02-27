'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createStory } from '../../services/stories';
import { isAuthed } from '../../services/auth';
import { useToast } from '../../components/Toast';

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

export default function WritePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 基础信息
  const [title, setTitle] = useState('');
  const [storySummary, setStorySummary] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  // AI设定
  const [selectedStyle, setSelectedStyle] = useState('');
  const [customStyle, setCustomStyle] = useState('');
  const [selectedTone, setSelectedTone] = useState('steady');
  const [selectedViewpoint, setSelectedViewpoint] = useState('third');
  const [aiPrompt, setAiPrompt] = useState('');

  // 开源设置
  const [selectedLicense, setSelectedLicense] = useState('');

  // 状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: 基础信息, 2: AI设定, 3: 开源设置

  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isAuthed());
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/write');
    }
  }, [router, isAuthenticated, isMounted]);

  function addTag() {
    const t = tagInput.trim().slice(0, 20);
    if (!t) {
      setTagInput('');
      return;
    }
    if (tags.includes(t)) {
      addToast('该标签已存在', 'warning');
      setTagInput('');
      return;
    }
    if (tags.length >= 5) {
      addToast('最多添加5个标签', 'error');
      setTagInput('');
      return;
    }
    setTags([...tags, t]);
    setTagInput('');
  }

  function removeTag(t) {
    setTags(tags.filter((x) => x !== t));
  }

  function generateStyleParams() {
    const stylePreset = STYLE_PRESETS.find(s => s.id === selectedStyle);
    const tone = TONE_OPTIONS.find(t => t.id === selectedTone);
    const viewpoint = VIEWPOINT_OPTIONS.find(v => v.id === selectedViewpoint);

    const parts = [];
    if (stylePreset) parts.push(stylePreset.name);
    if (customStyle.trim()) parts.push(customStyle.trim());
    if (tone) parts.push(tone.name);
    if (viewpoint) parts.push(viewpoint.name);

    return parts.join('、');
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

  function nextStep() {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  }

  function prevStep() {
    setStep(step - 1);
    setError(null);
  }

  async function onSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const styleParams = generateStyleParams();
      const story = await createStory({
        title: title.trim(),
        storySummary: storySummary.trim(),
        styleParams: styleParams || null,
        tags: tags,
        published: false,
        openSource: selectedLicense !== '',
        openSourceLicense: selectedLicense || null,
      });

      addToast('小说创建成功！', 'success');
      router.push(`/me/stories/${story.id}/edit`);
    } catch (err) {
      setError(err?.message ?? '创建失败');
      addToast(err?.message ?? '创建失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-3xl mx-auto p-6">
        {/* 头部导航 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400">首页</Link>
            <span>/</span>
            <span>创建新小说</span>
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">创建新小说</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            填写基础信息和AI创作设定，开始你的创作之旅
          </p>
        </div>

        {/* 步骤指示器 */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
              }`}>
                1
              </div>
              <span className="text-sm font-medium">基础信息</span>
            </div>
            <div className={`flex-1 h-0.5 ${step >= 2 ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">AI创作设定</span>
            </div>
            <div className={`flex-1 h-0.5 ${step >= 3 ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 3 ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
              }`}>
                3
              </div>
              <span className="text-sm font-medium">开源设置</span>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* 步骤1：基础信息 */}
        {step === 1 && (
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
            <div className="space-y-6">
              {/* 书名 */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  小说书名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input w-full text-lg"
                  placeholder="给你的小说起个吸引人的名字"
                  maxLength={200}
                />
                <p className="mt-1 text-xs text-zinc-500">{title.length}/200 字符</p>
              </div>

              {/* 简介 */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  小说简介 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={storySummary}
                  onChange={(e) => setStorySummary(e.target.value)}
                  className="input w-full min-h-[120px]"
                  placeholder="简要介绍你的小说故事背景、主线剧情，帮助AI理解你的创作意图..."
                  maxLength={2000}
                />
                <p className="mt-1 text-xs text-zinc-500">{storySummary.length}/2000 字符</p>
              </div>

              {/* 标签 */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  标签 <span className="text-zinc-400 font-normal">（可选，最多5个）</span>
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 text-sm text-indigo-700 dark:text-indigo-300"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        className="hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder="输入标签，按回车添加"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    maxLength={20}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="btn btn-ghost"
                    disabled={!tagInput.trim() || tags.length >= 5}
                  >
                    添加
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-xs text-zinc-500">推荐标签：</span>
                  {['玄幻', '修仙', '科幻', '言情', '悬疑', '历史', '都市', '奇幻'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        if (!tags.includes(t) && tags.length < 5) {
                          setTags([...tags, t]);
                        }
                      }}
                      className="text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600"
                      disabled={tags.includes(t) || tags.length >= 5}
                    >
                      +{t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="mt-8 flex justify-end gap-4">
              <Link href="/me/stories" className="btn btn-ghost">
                取消
              </Link>
              <button
                type="button"
                onClick={nextStep}
                className="btn bg-indigo-600 text-white hover:bg-indigo-700"
              >
                下一步：AI创作设定 →
              </button>
            </div>
          </div>
        )}

        {/* 步骤2：AI创作设定 */}
        {step === 2 && (
          <form onSubmit={onSubmit} className="space-y-6">
            {/* 小说类型 */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">小说类型</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedStyle === style.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{style.name}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{style.desc}</div>
                  </button>
                ))}
              </div>

              {/* 自定义类型 */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  自定义类型/风格 <span className="text-zinc-400 font-normal">（可选）</span>
                </label>
                <input
                  type="text"
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  className="input w-full"
                  placeholder="如：赛博朋克、克苏鲁、无限流、种田文..."
                />
              </div>
            </div>

            {/* 文风设定 */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">文风设定</h2>

              {/* 叙事节奏 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">叙事节奏</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {TONE_OPTIONS.map((tone) => (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => setSelectedTone(tone.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selectedTone === tone.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                      }`}
                    >
                      <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{tone.name}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{tone.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 叙事视角 */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">叙事视角</label>
                <div className="flex gap-3">
                  {VIEWPOINT_OPTIONS.map((vp) => (
                    <button
                      key={vp.id}
                      type="button"
                      onClick={() => setSelectedViewpoint(vp.id)}
                      className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                        selectedViewpoint === vp.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                      }`}
                    >
                      <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{vp.name}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{vp.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AI创作提示词 */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">AI创作提示词</h2>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  补充提示 <span className="text-zinc-400 font-normal">（可选）</span>
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="input w-full min-h-[100px]"
                  placeholder="告诉AI更多关于你期望的创作风格，如：注重人物心理描写、喜欢细腻的环境刻画、希望对话幽默风趣..."
                  maxLength={500}
                />
                <p className="mt-1 text-xs text-zinc-500">{aiPrompt.length}/500 字符</p>
              </div>
            </div>

            {/* 预览 */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
              <h3 className="text-sm font-medium text-indigo-900 dark:text-indigo-300 mb-2">AI创作设定预览</h3>
              <p className="text-sm text-indigo-700 dark:text-indigo-400">
                {generateStyleParams() || '请选择小说类型'}
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                className="btn btn-ghost"
              >
                ← 上一步
              </button>
              <div className="flex gap-4">
                <Link href="/me/stories" className="btn btn-ghost">
                  取消
                </Link>
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  下一步 →
                </button>
              </div>
            </div>
          </form>
        )}

        {/* 步骤3：开源设置 */}
        {step === 3 && (
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">开源协议设置</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                选择开源协议后，其他用户可以Fork你的小说并进行二次创作。不开源则仅你自己可以编辑。
              </p>

              <div className="space-y-3">
                {LICENSE_OPTIONS.map((license) => (
                  <label
                    key={license.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedLicense === license.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="license"
                      value={license.id}
                      checked={selectedLicense === license.id}
                      onChange={(e) => setSelectedLicense(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{license.name}</div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{license.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                className="btn btn-ghost"
              >
                ← 上一步
              </button>
              <div className="flex gap-4">
                <Link href="/me/stories" className="btn btn-ghost">
                  取消
                </Link>
                <button
                  type="submit"
                  className="btn bg-indigo-600 text-white hover:bg-indigo-700"
                  disabled={loading}
                >
                  {loading ? '创建中...' : '创建小说并编辑'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
