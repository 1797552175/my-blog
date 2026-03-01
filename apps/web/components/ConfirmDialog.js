'use client';

export default function ConfirmDialog({ open, title, message, confirmText = '确定', cancelText = '取消', onConfirm, onCancel, loading = false }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !loading && onCancel?.()}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {message}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => !loading && onCancel?.()}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => !loading && onConfirm?.()}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {loading ? '处理中...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
