import { StoryListSkeleton } from '../../lib/loading';

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto p-6" style={{ width: '80%' }}>
      <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-2" />
      <div className="h-4 w-64 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-6" />
      
      {/* 搜索框骨架 */}
      <div className="mb-6">
        <div className="h-10 w-full max-w-md bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
      </div>
      
      {/* 筛选标签骨架 */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="h-7 w-16 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
        <div className="h-7 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
        <div className="h-7 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
      </div>
      
      {/* 小说列表骨架 */}
      <StoryListSkeleton items={6} />
    </div>
  );
}
