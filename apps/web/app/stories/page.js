import Link from 'next/link';
import { listStories, searchStories, listStoriesByTag } from '../../services/stories';
import SearchForm from '../../components/SearchForm';
import AddToReadsButton from '../../components/AddToReadsButton';

export const dynamic = 'force-dynamic';

export default async function StoriesPage({ searchParams: searchParamsProp }) {
  const searchParams = typeof searchParamsProp?.then === 'function' ? await searchParamsProp : searchParamsProp;
  const filter = searchParams?.filter ?? 'all';
  const tag = searchParams?.tag ?? null;
  const q = searchParams?.q ?? '';

  let stories = [];
  let error = null;
  let isSearch = false;

  try {
    if (q && String(q).trim()) {
      isSearch = true;
      const response = await searchStories({ q: q.trim(), page: 0, size: 20 });
      stories = response?.content ?? [];
    } else if (tag) {
      const response = await listStoriesByTag(tag, { page: 0, size: 20 });
      stories = response?.content ?? [];
    } else {
      const response = await listStories({ filter, page: 0, size: 20 });
      stories = response?.content ?? [];
    }
    console.log('Stories loaded:', stories.length, 'stories');
    if (stories.length > 0) {
      console.log('First story:', stories[0]);
    }
  } catch (err) {
    console.error('Failed to fetch stories:', err);
    const message = err?.message ?? '加载失败';
    const status = err?.status;
    if (status) {
      error = `加载失败（${status}${message ? `: ${message}` : ''}），请检查后端是否已启动且地址正确。`;
    } else {
      error = message ? `加载失败：${message}。请确认后端已启动（如 http://localhost:8080）。` : '加载失败，请稍后重试。';
    }
  }

  const getPageTitle = () => {
    if (isSearch) return '搜索结果';
    if (filter === 'completed') return '已完成小说';
    return '全部小说';
  };

  const getPageDescription = () => {
    if (filter === 'completed') return '已完成的完整小说，直接阅读精彩内容。';
    return '探索各种AI创作的小说，发现精彩内容。';
  };

  return (
    <div className="max-w-4xl mx-auto p-6" style={{ width: '80%' }}>
      <h1 className="text-3xl font-bold mb-2">{getPageTitle()}</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-6">
        {getPageDescription()}
      </p>

      {/* 搜索框 */}
      <div className="mb-6">
        <SearchForm
          defaultValue={q}
          placeholder="搜索小说…"
          className="max-w-md"
        />
      </div>

      {/* 筛选标签 */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/stories"
          className={`px-3 py-1 rounded-full text-sm ${
            filter === 'all' && !tag && !q
              ? 'bg-indigo-600 text-white'
              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
          }`}
        >
          全部
        </Link>
        <Link
          href="/stories?filter=completed"
          className={`px-3 py-1 rounded-full text-sm ${
            filter === 'completed'
              ? 'bg-indigo-600 text-white'
              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
          }`}
        >
          已完成
        </Link>
        <Link
          href="/stories?filter=interactive"
          className={`px-3 py-1 rounded-full text-sm ${
            filter === 'interactive'
              ? 'bg-amber-500 text-white'
              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
          }`}
        >
          未完成
        </Link>
      </div>

      {/* 筛选提示 */}
      {tag ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          当前标签：<span className="font-medium text-zinc-700 dark:text-zinc-200">{tag}</span>
          {' · '}
          <Link href="/stories" className="text-indigo-600 hover:underline">清除筛选</Link>
        </p>
      ) : null}

      {isSearch && q && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          搜索关键词：<span className="font-medium text-zinc-700 dark:text-zinc-200">{q}</span>
          {' · '}
          <Link href="/stories" className="text-indigo-600 hover:underline">清除</Link>
        </p>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* 小说列表 */}
      {stories.length === 0 && !error ? (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          <p>暂无小说</p>
        </div>
      ) : (
        <div className="space-y-4">
          {stories.map((story) => (
            <article
              key={story.id}
              className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold mb-1">
                    <Link
                      href={`/stories/${story.slug}`}
                      className="hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      {story.title}
                    </Link>
                    {story.openSource && (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                        🌿 开源 {story.openSourceLicense || ''}
                      </span>
                    )}
                    {!story.openSource && story.hasContent && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                        📖 有内容
                      </span>
                    )}
                  </h2>

                  {story.storySummary && (
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-2 line-clamp-2">
                      {story.storySummary}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                    {story.authorUsername && (
                      <span>作者：{story.authorUsername}</span>
                    )}
                    <span>创建于：{new Date(story.createdAt).toLocaleDateString('zh-CN')}</span>
                  </div>

                  {/* 标签 */}
                  {story.tags && story.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {story.tags.map((tagItem) => (
                        <Link
                          key={tagItem}
                          href={`/stories?tag=${encodeURIComponent(tagItem)}`}
                          className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                          {tagItem}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {/* Star/Fork 统计 */}
                  <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-1">
                      <span>⭐</span>
                      <span>{story.starCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>🍴</span>
                      <span>{story.forkCount || 0}</span>
                    </div>
                  </div>
                  
                  {/* 添加到我的阅读按钮 */}
                  <AddToReadsButton slug={story.slug} isInteractive={story.isInteractive} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
