import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStoryBySlug, listChaptersBySlug, getStoryContributors } from '../../../services/stories';

export const dynamic = 'force-dynamic';

export default async function StoryDetailPage({ params }) {
  const slug = typeof params?.slug === 'string' ? params.slug : params?.slug?.[0];
  if (!slug) notFound();

  let story = null;
  let chapters = [];
  let contributors = [];
  try {
    story = await getStoryBySlug(slug);
    chapters = await listChaptersBySlug(slug).catch(() => []);
    contributors = await getStoryContributors(story.id).catch(() => []);
  } catch {
    notFound();
  }

  if (!story || !story.published) notFound();

  const hasContent = story.hasContent;
  const isForkable = story.isForkable;
  const hasChapters = Array.isArray(chapters) && chapters.length > 0;
  const hasContributors = Array.isArray(contributors) && contributors.length > 0;

  // 计算总字数
  const totalWordCount = contributors.reduce((sum, c) => sum + (c.wordCount || 0), 0);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/stories" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          ← 返回小说列表
        </Link>
      </div>

      <div className="flex gap-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{story.title}</h1>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-zinc-500 dark:text-zinc-400">作者：{story.authorUsername}</span>
            {story.openSource && (
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                开源 {story.openSourceLicense || ''}
              </span>
            )}
            {hasContent && (
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                有内容
              </span>
            )}
          </div>

          {story.storySummary && (
            <div className="mb-6 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">简介</h2>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm">{story.storySummary}</p>
            </div>
          )}

          {story.tags && story.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {story.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {hasChapters ? (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">章节列表 ({chapters.length}章)</h2>
              <div className="space-y-2">
                {chapters.map((chapter) => (
                  <Link
                    key={chapter.id}
                    href={`/stories/${slug}/chapter/${chapter.sortOrder}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors"
                  >
                    <span className="text-zinc-400 dark:text-zinc-500 w-8">第{chapter.sortOrder}章</span>
                    <span className="flex-1">{chapter.title}</span>
                    <span className="text-xs text-zinc-400">阅读 →</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6 p-6 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-center">
              <p className="text-zinc-500 dark:text-zinc-400">
                该小说暂无章节内容
              </p>
            </div>
          )}

          {/* 贡献者统计 */}
          {hasContributors && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">
                贡献者 ({contributors.length}人 · 共{totalWordCount}字)
              </h2>
              <div className="space-y-2">
                {contributors.slice(0, 5).map((contributor, index) => (
                  <div
                    key={contributor.userId}
                    className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{contributor.username}</div>
                      <div className="text-xs text-zinc-500">
                        {contributor.chapterCount}章 · {contributor.wordCount}字
                      </div>
                    </div>
                    {index === 0 && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs">
                        🏆 最多贡献
                      </span>
                    )}
                  </div>
                ))}
                {contributors.length > 5 && (
                  <div className="text-center text-sm text-zinc-500 py-2">
                    还有 {contributors.length - 5} 位贡献者...
                  </div>
                )}
              </div>
            </div>
          )}

          {!hasContent && (
            <div className="mb-6 p-6 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-300 dark:border-amber-700">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">✨</span>
                <h2 className="text-xl font-bold text-amber-900 dark:text-amber-300">等待创作</h2>
              </div>
              <p className="text-amber-800 dark:text-amber-400 mb-4">
                这是一个开源小说，等待你来创作内容！
              </p>
            </div>
          )}
        </div>

        <div className="w-64 shrink-0">
          <div className="sticky top-6 space-y-4">
            <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{story.starCount || 0}</div>
                <div className="text-sm text-zinc-500">Stars</div>
              </div>
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{story.forkCount || 0}</div>
                <div className="text-sm text-zinc-500">Forks</div>
              </div>
              {hasContributors && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{contributors.length}</div>
                  <div className="text-sm text-zinc-500">贡献者</div>
                </div>
              )}
            </div>

            {isForkable && (
              <Link
                href={`/stories/${slug}/fork`}
                className="block w-full btn bg-green-600 text-white hover:bg-green-700 text-center"
              >
                🍴 Fork 这个世界
              </Link>
            )}

            <Link
              href={`/stories/${slug}/read`}
              className="block w-full btn bg-indigo-600 text-white hover:bg-indigo-700 text-center"
            >
              📖 开始阅读
            </Link>

            <Link
              href={`/stories/${slug}/manage`}
              className="block w-full btn bg-zinc-600 text-white hover:bg-zinc-700 text-center"
            >
              ⚙️ 管理章节
            </Link>

            <Link
              href={`/stories/${slug}/wiki`}
              className="block w-full btn bg-amber-600 text-white hover:bg-amber-700 text-center"
            >
              📚 百科资料
            </Link>

            <Link
              href={`/stories/${slug}/branches`}
              className="block w-full btn bg-purple-600 text-white hover:bg-purple-700 text-center"
            >
              🌳 分支图谱
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
