'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { isAuthed } from '../services/auth';
import HomeAiInspirationLayout from '../components/HomeAiInspirationLayout';
import { listPosts } from '../services/posts';
import { excerpt } from '../lib/utils';
import { SparklesIcon, BookOpenIcon, CheckIcon, PlayIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export default function HomeClient() {
  const [mounted, setMounted] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [postsError, setPostsError] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // 加载热门小说
    if (!isAuthed()) {
      loadPosts();
    }
  }, [isAuthed]);

  const loadPosts = async () => {
    setLoading(true);
    setPostsError(null);
    try {
      const res = await listPosts({ page: 0, size: 6 });
      setPosts(res?.content || []);
    } catch (error) {
      console.error('加载热门小说失败:', error);
      setPosts([]);
      setPostsError(error?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  if (!isAuthed()) {
    return (
      <div className="w-full h-full">
        {/* Hero 区 */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-indigo-800 dark:text-indigo-300 mb-6">
              用 AI 找灵感，写出你的小说
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              和 AI 对话获取灵感 → 存到灵感库 → 选灵感「开始创作」写小说
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <Link href="/register" className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                立即注册
              </Link>
              <Link href="/login" className="px-6 py-3 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-medium rounded-lg border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors">
                登录
              </Link>
              <Link href="/posts" className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                先逛逛热门小说
              </Link>
            </div>
          </div>
        </section>

        {/* 产品怎么用 */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 dark:text-gray-200 mb-12">
              产品怎么用
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SparklesIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">和 AI 对话找灵感</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  告诉 AI 你想写什么类型的小说，获取创意灵感
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">保存到灵感库</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  将有价值的灵感保存到个人灵感库，随时查看
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpenIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">选灵感开始写</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  从灵感库中选择一个灵感，开始创作你的小说
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PlayIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">发布/被阅读</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  完成小说后发布，让更多人阅读你的作品
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 创作示例 */}
        <section className="py-12 px-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-200 mb-8">
              创作示例
            </h2>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-900 shadow-sm">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl px-5 py-3.5 whitespace-pre-wrap break-words shadow-sm bg-indigo-600 text-white">
                    <p className="text-xs opacity-80 mb-1">用户</p>
                    <p className="text-sm">我想写一个关于未来世界的科幻小说，能给我一些灵感吗？</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-5 py-3.5 whitespace-pre-wrap break-words shadow-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                    <p className="text-xs opacity-80 mb-1">AI</p>
                    <p className="text-sm">未来世界科幻小说灵感：

1. 记忆交易市场：在2150年，人类可以买卖记忆，主角是一名记忆经纪人，发现了一个能改变世界的记忆。

2. 时间裂缝修复者：特殊部门负责修复时间线上的异常，主角在一次任务中发现了时间本身的秘密。

3. 意识上传后的社会：大部分人类已经将意识上传到数字世界，少数坚持保留肉身的人类形成了地下反抗组织。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 热门小说 */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                热门小说
              </h2>
              <Link href="/posts" className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                查看更多
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">加载中...</p>
              </div>
            ) : postsError ? (
              <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400 mb-4">加载失败：{postsError}</p>
                <button onClick={loadPosts} className="btn btn-sm btn-ghost">
                  重试
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400 mb-4">暂无小说</p>
                <Link href="/write" className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                  去写第一篇
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <div key={post.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-shadow">
                    <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {post.tags && post.tags.length > 0 ? post.tags.join(' · ') : '未分类'} · {new Date(post.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">
                      {excerpt(post.contentMarkdown, 100)}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>作者：{post.author?.username ?? post.authorUsername ?? '匿名'}</span>
                      <Link href={`/posts/${post.slug}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                        阅读更多
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  return <HomeAiInspirationLayout />;
}
