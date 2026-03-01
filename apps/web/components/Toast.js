'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function Toast({ message, type, duration, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return 'bg-red-500 dark:bg-red-600 text-white shadow-lg dark:shadow-zinc-900/50';
      case 'success':
        return 'bg-green-500 dark:bg-emerald-600 text-white shadow-lg dark:shadow-zinc-900/50';
      case 'warning':
        return 'bg-yellow-500 dark:bg-amber-600 text-white shadow-lg dark:shadow-zinc-900/50';
      default:
        return 'bg-indigo-500 dark:bg-indigo-600 text-white shadow-lg dark:shadow-zinc-900/50';
    }
  };

  return (
    <div className={`px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 ${getTypeStyles()} flex items-center gap-2 min-w-[200px] max-w-[90vw]`}>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 min-h-[32px] min-w-[32px] flex items-center justify-center rounded text-white/90 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50" aria-label="关闭">
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
