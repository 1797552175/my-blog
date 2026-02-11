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
