'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import {
  getStoryById,
} from '../../../../../services/stories';
import {
  listCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  listTerms,
  createTerm,
  updateTerm,
  deleteTerm,
  getReadme,
  putReadme,
  getAiParams,
  putAiParams,
} from '../../../../../services/storySeeds';
import { isAuthed } from '../../../../../services/auth';
import { useToast } from '../../../../../components/Toast';

export default function SettingsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const { addToast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [seed, setSeed] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [terms, setTerms] = useState([]);
  const [readme, setReadme] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readmeSaving, setReadmeSaving] = useState(false);
  const [aiParamsSaving, setAiParamsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('characters');

  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isAuthed());
  }, []);

  // AI参数
  const [aiParams, setAiParams] = useState({
    writingStyle: '',
    tone: '',
    narrativePerspective: '',
    targetAudience: '',
    genreTags: '',
    bannedWords: '',
    preferredPhrases: '',
    storyConstraints: '',
  });

  // 角色表单
  const [newCharName, setNewCharName] = useState('');
  const [newCharDesc, setNewCharDesc] = useState('');
  const [editingChar, setEditingChar] = useState(null);
  const [editCharName, setEditCharName] = useState('');
  const [editCharDesc, setEditCharDesc] = useState('');
  const [addingChar, setAddingChar] = useState(false);

  // 专有名词表单
  const [newTermType, setNewTermType] = useState('place');
  const [newTermName, setNewTermName] = useState('');
  const [newTermDef, setNewTermDef] = useState('');
  const [editingTerm, setEditingTerm] = useState(null);
  const [editTermType, setEditTermType] = useState('place');
  const [editTermName, setEditTermName] = useState('');
  const [editTermDef, setEditTermDef] = useState('');
  const [addingTerm, setAddingTerm] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const [s, chars, trms, rd] = await Promise.all([
        getStoryById(id),
        listCharacters(id).catch(() => []),
        listTerms(id).catch(() => []),
        getReadme(id).catch(() => ''),
      ]);
      setSeed(s);
      setCharacters(Array.isArray(chars) ? chars : []);
      setTerms(Array.isArray(trms) ? trms : []);
      setReadme(typeof rd === 'string' ? rd : '');
      
      // 加载AI参数 - 从 StoryResponse 中获取 styleParams
      if (s) {
        setAiParams({
          writingStyle: s.styleParams || '',
          tone: '',
          narrativePerspective: '',
          targetAudience: '',
          genreTags: s.tags?.join(', ') || '',
          bannedWords: '',
          preferredPhrases: '',
          storyConstraints: s.storySummary || '',
        });
      }
    } catch (err) {
      setError(err?.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isMounted) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/me/stories/' + id + '/settings');
      return;
    }
    load();
  }, [router, id, load, isAuthenticated, isMounted]);

  // AI参数保存
  async function handleSaveAiParams() {
    if (!id) return;
    setAiParamsSaving(true);
    setError(null);
    try {
      await putAiParams(id, aiParams);
      addToast('AI参数已保存');
    } catch (err) {
      setError(err?.message ?? '保存失败');
    } finally {
      setAiParamsSaving(false);
    }
  }

  // README保存
  async function handleSaveReadme() {
    if (!id) return;
    setReadmeSaving(true);
    setError(null);
    try {
      await putReadme(id, readme);
      addToast('设定文档已保存');
    } catch (err) {
      setError(err?.message ?? '保存失败');
    } finally {
      setReadmeSaving(false);
    }
  }

  // 角色操作
  async function handleAddCharacter(e) {
    e.preventDefault();
    if (!id || !newCharName.trim()) return;
    setAddingChar(true);
    setError(null);
    try {
      await createCharacter(id, {
        name: newCharName.trim(),
        description: newCharDesc.trim() || null,
        sortOrder: characters.length,
      });
      setNewCharName('');
      setNewCharDesc('');
      addToast('已添加角色');
      await load();
    } catch (err) {
      setError(err?.message ?? '添加失败');
    } finally {
      setAddingChar(false);
    }
  }

  async function handleEditCharacter(char) {
    setEditingChar(char);
    setEditCharName(char.name);
    setEditCharDesc(char.description || '');
  }

  async function handleUpdateCharacter(e) {
    e.preventDefault();
    if (!id || !editingChar || !editCharName.trim()) return;
    setError(null);
    try {
      await updateCharacter(id, editingChar.id, {
        name: editCharName.trim(),
        description: editCharDesc.trim() || null,
        sortOrder: editingChar.sortOrder,
      });
      setEditingChar(null);
      addToast('角色已更新');
      await load();
    } catch (err) {
      setError(err?.message ?? '更新失败');
    }
  }

  async function handleDeleteCharacter(characterId) {
    if (!confirm('确定删除该角色？')) return;
    try {
      await deleteCharacter(id, characterId);
      addToast('已删除');
      await load();
    } catch (err) {
      setError(err?.message ?? '删除失败');
    }
  }

  // 专有名词操作
  async function handleAddTerm(e) {
    e.preventDefault();
    if (!id || !newTermName.trim()) return;
    setAddingTerm(true);
    setError(null);
    try {
      await createTerm(id, {
        termType: newTermType.trim() || 'place',
        name: newTermName.trim(),
        definition: newTermDef.trim() || null,
        sortOrder: terms.length,
      });
      setNewTermName('');
      setNewTermDef('');
      addToast('已添加专有名词');
      await load();
    } catch (err) {
      setError(err?.message ?? '添加失败');
    } finally {
      setAddingTerm(false);
    }
  }

  async function handleEditTerm(term) {
    setEditingTerm(term);
    setEditTermType(term.termType);
    setEditTermName(term.name);
    setEditTermDef(term.definition || '');
  }

  async function handleUpdateTerm(e) {
    e.preventDefault();
    if (!id || !editingTerm || !editTermName.trim()) return;
    setError(null);
    try {
      await updateTerm(id, editingTerm.id, {
        termType: editTermType.trim() || 'place',
        name: editTermName.trim(),
        definition: editTermDef.trim() || null,
        sortOrder: editingTerm.sortOrder,
      });
      setEditingTerm(null);
      addToast('专有名词已更新');
      await load();
    } catch (err) {
      setError(err?.message ?? '更新失败');
    }
  }

  async function handleDeleteTerm(termId) {
    if (!confirm('确定删除该专有名词？')) return;
    try {
      await deleteTerm(id, termId);
      addToast('已删除');
      await load();
    } catch (err) {
      setError(err?.message ?? '删除失败');
    }
  }

  if (loading || !seed) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3" />
          <div className="h-32 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
      </div>
    );
  }

  const termTypeLabels = {
    place: '地名',
    item: '物品',
    skill: '技能',
    other: '其他',
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/me/stories/${id}/edit`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          ← {seed.title}
        </Link>
        <Link href={`/me/stories/${id}/branches`} className="text-sm text-zinc-500 hover:underline">分支</Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-2">设定</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        配置角色、世界观和AI写作参数，保持故事设定一致性。
      </p>

      {error ? (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      ) : null}

      {/* Tab导航 */}
      <div className="border-b border-zinc-200 dark:border-zinc-700 mb-6">
        <nav className="flex gap-6">
          {[
            { key: 'characters', label: `角色设定 (${characters.length})` },
            { key: 'terms', label: `专有名词 (${terms.length})` },
            { key: 'ai', label: 'AI参数' },
            { key: 'readme', label: '设定文档' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 角色设定 */}
      {activeTab === 'characters' && (
        <section>
          <h2 className="text-lg font-semibold mb-4">角色设定</h2>
          
          {/* 添加角色表单 */}
          <form onSubmit={handleAddCharacter} className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs text-zinc-500 mb-1">角色名</label>
                <input
                  type="text"
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value)}
                  className="input w-full"
                  placeholder="输入角色名"
                  maxLength={100}
                  required
                />
              </div>
              <div className="flex-[2] min-w-[200px]">
                <label className="block text-xs text-zinc-500 mb-1">性格、背景（可选）</label>
                <input
                  type="text"
                  value={newCharDesc}
                  onChange={(e) => setNewCharDesc(e.target.value)}
                  className="input w-full"
                  placeholder="描述角色的性格特点、背景故事等"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={addingChar}>
                {addingChar ? '添加中…' : '添加角色'}
              </button>
            </div>
          </form>

          {/* 角色列表 */}
          <div className="space-y-3">
            {characters.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <p>暂无角色设定</p>
                <p className="text-sm mt-1">添加角色帮助AI更好地理解故事中的人物关系</p>
              </div>
            ) : (
              characters.map((char) => (
                <div key={char.id} className="card p-4">
                  {editingChar?.id === char.id ? (
                    <form onSubmit={handleUpdateCharacter} className="flex flex-wrap items-end gap-3">
                      <div className="flex-1 min-w-[150px]">
                        <input
                          type="text"
                          value={editCharName}
                          onChange={(e) => setEditCharName(e.target.value)}
                          className="input w-full"
                          maxLength={100}
                          required
                        />
                      </div>
                      <div className="flex-[2] min-w-[200px]">
                        <input
                          type="text"
                          value={editCharDesc}
                          onChange={(e) => setEditCharDesc(e.target.value)}
                          className="input w-full"
                          placeholder="描述角色的性格特点、背景故事等"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="btn btn-sm btn-primary">保存</button>
                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditingChar(null)}>取消</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{char.name}</h3>
                        {char.description && (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{char.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditCharacter(char)}
                          className="btn btn-sm btn-ghost text-zinc-600 dark:text-zinc-400"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteCharacter(char.id)}
                          className="btn btn-sm btn-ghost text-red-600 dark:text-red-400"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* 专有名词 */}
      {activeTab === 'terms' && (
        <section>
          <h2 className="text-lg font-semibold mb-4">专有名词</h2>
          
          {/* 添加专有名词表单 */}
          <form onSubmit={handleAddTerm} className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">类型</label>
                <select
                  value={newTermType}
                  onChange={(e) => setNewTermType(e.target.value)}
                  className="input w-auto min-w-[100px]"
                >
                  <option value="place">地名</option>
                  <option value="item">物品</option>
                  <option value="skill">技能</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs text-zinc-500 mb-1">名称</label>
                <input
                  type="text"
                  value={newTermName}
                  onChange={(e) => setNewTermName(e.target.value)}
                  className="input w-full"
                  placeholder="输入名称"
                  maxLength={100}
                  required
                />
              </div>
              <div className="flex-[2] min-w-[200px]">
                <label className="block text-xs text-zinc-500 mb-1">定义（可选）</label>
                <input
                  type="text"
                  value={newTermDef}
                  onChange={(e) => setNewTermDef(e.target.value)}
                  className="input w-full"
                  placeholder="描述该名词的含义、用途等"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={addingTerm}>
                {addingTerm ? '添加中…' : '添加'}
              </button>
            </div>
          </form>

          {/* 专有名词列表 */}
          <div className="space-y-3">
            {terms.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <p>暂无专有名词</p>
                <p className="text-sm mt-1">添加地名、物品、技能等专有名词帮助AI理解世界观</p>
              </div>
            ) : (
              terms.map((term) => (
                <div key={term.id} className="card p-4">
                  {editingTerm?.id === term.id ? (
                    <form onSubmit={handleUpdateTerm} className="flex flex-wrap items-end gap-3">
                      <select
                        value={editTermType}
                        onChange={(e) => setEditTermType(e.target.value)}
                        className="input w-auto min-w-[100px]"
                      >
                        <option value="place">地名</option>
                        <option value="item">物品</option>
                        <option value="skill">技能</option>
                        <option value="other">其他</option>
                      </select>
                      <input
                        type="text"
                        value={editTermName}
                        onChange={(e) => setEditTermName(e.target.value)}
                        className="input flex-1 min-w-[120px]"
                        maxLength={100}
                        required
                      />
                      <input
                        type="text"
                        value={editTermDef}
                        onChange={(e) => setEditTermDef(e.target.value)}
                        className="input flex-[2] min-w-[200px]"
                        placeholder="描述该名词的含义、用途等"
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="btn btn-sm btn-primary">保存</button>
                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditingTerm(null)}>取消</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{term.name}</h3>
                          <span className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded">
                            {termTypeLabels[term.termType] || term.termType}
                          </span>
                        </div>
                        {term.definition && (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{term.definition}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditTerm(term)}
                          className="btn btn-sm btn-ghost text-zinc-600 dark:text-zinc-400"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteTerm(term.id)}
                          className="btn btn-sm btn-ghost text-red-600 dark:text-red-400"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* AI参数 */}
      {activeTab === 'ai' && (
        <section>
          <h2 className="text-lg font-semibold mb-4">AI写作参数</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            配置AI续写时的风格和约束条件，让AI更好地符合你的创作意图。
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">写作风格</label>
              <textarea
                value={aiParams.writingStyle}
                onChange={(e) => setAiParams({ ...aiParams, writingStyle: e.target.value })}
                className="input w-full min-h-[100px]"
                placeholder="如：古风、现代、科幻、悬疑... 详细描述整体写作风格"
              />
              <p className="text-xs text-zinc-400 mt-1">描述整体写作风格和叙事特点</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">故事约束/概述</label>
              <textarea
                value={aiParams.storyConstraints}
                onChange={(e) => setAiParams({ ...aiParams, storyConstraints: e.target.value })}
                className="input w-full min-h-[100px]"
                placeholder="描述故事必须遵守的规则和约束，如：主角不能死亡、不能出现现代元素..."
              />
              <p className="text-xs text-zinc-400 mt-1">设定AI续写时必须遵守的硬性规则和故事概述</p>
            </div>

            <div className="pt-4">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveAiParams}
                disabled={aiParamsSaving}
              >
                {aiParamsSaving ? '保存中…' : '保存AI参数'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 设定文档 */}
      {activeTab === 'readme' && (
        <section>
          <h2 className="text-lg font-semibold mb-4">设定文档</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            用 Markdown 编写详细的世界观设定、故事背景、规则说明等。
          </p>

          <textarea
            value={readme}
            onChange={(e) => setReadme(e.target.value)}
            className="input w-full min-h-[300px] font-mono text-sm"
            placeholder="# 世界观设定

## 故事背景
...

## 力量体系
...

## 势力分布
..."
          />
          
          <div className="mt-4 flex gap-4">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveReadme}
              disabled={readmeSaving}
            >
              {readmeSaving ? '保存中…' : '保存设定文档'}
            </button>
          </div>

          {readme ? (
            <div className="mt-6 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">预览：</p>
              <div className="prose dark:prose-invert max-w-none text-sm">
                <ReactMarkdown>{readme}</ReactMarkdown>
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
