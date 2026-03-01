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
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">{getPageTitle()}</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          {getPageDescription()}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="sticky top-4 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-xl p-4 mb-6 border border-zinc-200 dark:border-zinc-700 shadow-sm">
            <SearchForm
              defaultValue={q}
              placeholder="搜索小说标题、作者、标签…"
              className="w-full"
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Link
              href="/stories"
              className={`group px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                filter === 'all' && !tag && !q
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm'
              }`}
            >
              全部小说
            </Link>
            <Link
              href="/stories?filter=completed"
              className={`group px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                filter === 'completed'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md shadow-green-500/25'
                  : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-green-300 dark:hover:border-green-600 hover:shadow-sm'
              }`}
            >
              已完成
            </Link>
            <Link
              href="/stories?filter=interactive"
              className={`group px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                filter === 'interactive'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25'
                  : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-sm'
              }`}
            >
              AI 互动续写
            </Link>
          </div>

          {(tag || isSearch) && (
            <div className="flex items-center gap-2 mb-6 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {tag ? (
                  <>当前标签：<span className="font-medium text-indigo-700 dark:text-indigo-300">{tag}</span></>
                ) : (
                  <>搜索关键词：<span className="font-medium text-indigo-700 dark:text-indigo-300">{q}</span></>
                )}
              </span>
              <Link
                href="/stories"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                清除
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Link>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {stories.length === 0 && !error ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 mb-2">暂无小说</p>
              <p className="text-sm text-zinc-400 dark:text-zinc-500">快来创作你的第一篇小说吧</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stories.map((story) => (
                <article
                  key={story.id}
                  className="group bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex flex-col h-full">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold mb-2 line-clamp-1">
                        <Link
                          href={`/stories/${story.slug}`}
                          className="text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                        >
                          {story.title}
                        </Link>
                      </h2>

                      {story.storySummary && (
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-3 line-clamp-2 min-h-[2.5rem]">
                          {story.storySummary}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                        {story.authorUsername && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {story.authorUsername}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(story.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {story.openSource && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium border border-green-200 dark:border-green-800">
                            🌿 开源
                          </span>
                        )}
                        {!story.openSource && story.hasContent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-800">
                            📖 有内容
                          </span>
                        )}
                        {story.isInteractive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium border border-amber-200 dark:border-amber-800">
                            ✨ AI 互动
                          </span>
                        )}
                        {story.tags && story.tags.length > 0 && story.tags.slice(0, 3).map((tagItem) => (
                          <Link
                            key={tagItem}
                            href={`/stories?tag=${encodeURIComponent(tagItem)}`}
                            className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                          >
                            {tagItem}
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="font-medium">{story.starCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          <span className="font-medium">{story.forkCount || 0}</span>
                        </div>
                      </div>
                      
                      <AddToReadsButton 
                        slug={story.slug} 
                        isInteractive={story.isInteractive}
                        storyId={story.id}
                        chapterCount={story.chapterCount}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
