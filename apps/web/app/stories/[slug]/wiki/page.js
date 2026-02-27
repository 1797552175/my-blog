import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStoryBySlug } from '../../../../services/stories';
import { getWikiPages, getWikiCharacters, getWikiTimeline } from '../../../../services/wiki';

export const dynamic = 'force-dynamic';

export default async function WikiPage({ params }) {
  const slug = typeof params?.slug === 'string' ? params.slug : params?.slug?.[0];
  if (!slug) notFound();

  let story = null;
  let pages = [];
  let characters = [];
  let timeline = [];

  try {
    story = await getStoryBySlug(slug);
    [pages, characters, timeline] = await Promise.all([
      getWikiPages(story.id).catch(() => []),
      getWikiCharacters(story.id).catch(() => []),
      getWikiTimeline(story.id).catch(() => [])
    ]);
  } catch {
    notFound();
  }

  if (!story || !story.published) notFound();

  // 按分类组织页面
  const pagesByCategory = pages.reduce((acc, page) => {
    const category = page.category || 'OTHER';
    if (!acc[category]) acc[category] = [];
    acc[category].push(page);
    return acc;
  }, {});

  const categoryNames = {
    'WORLDVIEW': '世界观',
    'CHARACTER': '角色',
    'TIMELINE': '时间线',
    'LOCATION': '地点',
    'ITEM': '物品/道具',
    'FACTION': '势力/组织',
    'OTHER': '其他'
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link href={`/stories/${slug}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          ← 返回小说详情
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{story.title} - 百科</h1>
        <Link
          href={`/stories/${slug}/wiki/manage`}
          className="btn bg-indigo-600 text-white hover:bg-indigo-700"
        >
          管理百科
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 左侧导航 */}
        <div className="space-y-4">
          {/* Wiki 页面 */}
          {Object.keys(pagesByCategory).length > 0 && (
            <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <h3 className="font-semibold mb-3">百科页面</h3>
              <div className="space-y-3">
                {Object.entries(pagesByCategory).map(([category, categoryPages]) => (
                  <div key={category}>
                    <div className="text-xs text-zinc-500 mb-1">{categoryNames[category] || category}</div>
                    <div className="space-y-1">
                      {categoryPages.map(page => (
                        <Link
                          key={page.slug}
                          href={`/stories/${slug}/wiki/page/${page.slug}`}
                          className="block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {page.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 快速链接 */}
          <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <h3 className="font-semibold mb-3">快速链接</h3>
            <div className="space-y-2">
              <Link
                href={`/stories/${slug}/wiki/characters`}
                className="block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                👤 角色档案 ({characters.length})
              </Link>
              <Link
                href={`/stories/${slug}/wiki/timeline`}
                className="block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                📅 时间线 ({timeline.length})
              </Link>
            </div>
          </div>
        </div>

        {/* 右侧内容预览 */}
        <div className="md:col-span-2 space-y-6">
          {/* 角色预览 */}
          {characters.length > 0 && (
            <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">主要角色</h2>
                <Link
                  href={`/stories/${slug}/wiki/characters`}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  查看全部 →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {characters.slice(0, 4).map(character => (
                  <Link
                    key={character.name}
                    href={`/stories/${slug}/wiki/characters/${encodeURIComponent(character.name)}`}
                    className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {character.avatarUrl ? (
                        <img src={character.avatarUrl} alt={character.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-lg">
                          👤
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{character.name}</div>
                        {character.roleTypeDisplayName && (
                          <div className="text-xs text-zinc-500">{character.roleTypeDisplayName}</div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 时间线预览 */}
          {timeline.length > 0 && (
            <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">故事时间线</h2>
                <Link
                  href={`/stories/${slug}/wiki/timeline`}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  查看全部 →
                </Link>
              </div>
              <div className="space-y-3">
                {timeline.slice(0, 3).map((event, index) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                      {index < 2 && <div className="w-0.5 h-full bg-zinc-200 dark:bg-zinc-700 mt-1"></div>}
                    </div>
                    <div className="pb-4">
                      <div className="text-sm text-zinc-500">{event.eventTime}</div>
                      <div className="font-medium">{event.title}</div>
                      {event.description && (
                        <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                          {event.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 空状态 */}
          {pages.length === 0 && characters.length === 0 && timeline.length === 0 && (
            <div className="p-8 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-center">
              <div className="text-4xl mb-3">📚</div>
              <h3 className="text-lg font-semibold mb-2">百科暂无内容</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                作者还没有添加百科内容，去看看小说正文吧！
              </p>
              <Link
                href={`/stories/${slug}/read`}
                className="btn bg-indigo-600 text-white hover:bg-indigo-700"
              >
                开始阅读
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
