'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const RECENT_KEY = 'search_recent';
const RECENT_MAX = 5;

function getRecent() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecent(q) {
  const t = String(q).trim();
  if (!t) return;
  let arr = getRecent().filter((x) => x !== t);
  arr.unshift(t);
  arr = arr.slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(arr));
  } catch (_) {}
}

export default function SearchForm({ defaultValue = '', className = '', placeholder = '搜索小说…' }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [recent, setRecent] = useState([]);
  const [showRecent, setShowRecent] = useState(false);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    setRecent(getRecent());
  }, []);

  function submit(e) {
    e?.preventDefault();
    const q = value.trim();
    if (!q) return;
    addRecent(q);
    setRecent(getRecent());
    setShowRecent(false);
    router.push(`/posts?q=${encodeURIComponent(q)}`);
  }

  function useRecent(q) {
    setValue(q);
    setShowRecent(false);
    router.push(`/posts?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={submit} className={`relative ${className}`}>
      <input
        type="search"
        className="input w-full"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setShowRecent(true)}
        onBlur={() => setTimeout(() => setShowRecent(false), 180)}
        aria-label="搜索"
      />
      {showRecent && recent.length > 0 ? (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg py-2 z-10">
          <p className="px-3 text-xs text-zinc-500 dark:text-zinc-400 mb-1">最近搜索</p>
          {recent.map((r) => (
            <button
              key={r}
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              onClick={() => useRecent(r)}
            >
              {r}
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}
