'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { isAuthed } from '../services/auth';
import HomeAiInspirationLayout from '../components/HomeAiInspirationLayout';

export default function HomeClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!isAuthed()) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card p-6 text-center">
          <p className="text-zinc-600 dark:text-zinc-400 mb-3">登录后可使用「AI 找灵感」与保存灵感到灵感库。</p>
          <Link href="/login?next=/" className="btn">去登录</Link>
        </div>
      </div>
    );
  }

  return <HomeAiInspirationLayout />;
}
