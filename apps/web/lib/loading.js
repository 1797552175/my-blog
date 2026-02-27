export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${sizeClasses[size]} ${className}`} />
  );
}

export function LoadingText({ text = '加载中…', className = '' }) {
  return (
    <div className={`flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 ${className}`}>
      <LoadingSpinner size="sm" />
      <span>{text}</span>
    </div>
  );
}

export function LoadingCard({ className = '', height = 'h-32' }) {
  return (
    <div className={`card p-6 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <LoadingSpinner size="sm" />
        <span>加载中…</span>
      </div>
    </div>
  );
}

export function LoadingSkeleton({ className = '', lines = 3 }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function LoadingList({ items = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="card p-4">
          <LoadingSkeleton lines={2} />
        </div>
      ))}
    </div>
  );
}

/**
 * 小说卡片骨架屏
 */
export function StoryCardSkeleton({ className = '' }) {
  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex gap-4">
        <div className="w-20 h-28 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          <div className="flex gap-2 pt-2">
            <div className="h-5 w-12 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
            <div className="h-5 w-12 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 小说卡片列表骨架屏
 */
export function StoryListSkeleton({ items = 6, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <StoryCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * 章节卡片骨架屏
 */
export function ChapterCardSkeleton({ className = '' }) {
  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          <div className="h-3 w-1/4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
        </div>
        <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
      </div>
    </div>
  );
}

/**
 * 用户信息骨架屏
 */
export function UserSkeleton({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
        <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
      </div>
    </div>
  );
}

/**
 * 全屏加载骨架屏
 */
export function FullPageSkeleton({ className = '' }) {
  return (
    <div className={`min-h-[200px] flex items-center justify-center ${className}`}>
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">加载中…</p>
      </div>
    </div>
  );
}
