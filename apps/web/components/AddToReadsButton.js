'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createForkBySlug, checkForkExists } from '../services/readerForks';
import { starStory } from '../services/stories';
import { isAuthed, getCurrentUser } from '../services/auth';

export default function AddToReadsButton({ slug, isInteractive }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const authStatus = isAuthed();
    setAuthenticated(authStatus);
    console.log('AddToReadsButton - slug:', slug, 'isInteractive:', isInteractive);
    
    if (authStatus) {
      checkForkExists(slug).then(exists => {
        setAdded(exists);
      }).catch(err => {
        console.error('检查阅读状态失败:', err);
      });
    }
  }, [slug, isInteractive]);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!authenticated) {
      router.push('/login?next=/stories/' + encodeURIComponent(slug));
      return;
    }

    if (added) {
      router.push('/me/reads');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const exists = await checkForkExists(slug);
      if (exists) {
        setAdded(true);
        router.push('/me/reads');
        return;
      }

      const fork = await createForkBySlug(slug);
      
      // 添加到阅读列表后，自动星标小说
      if (fork && fork.storyId) {
        try {
          await starStory(fork.storyId);
        } catch (starError) {
          console.warn('星标失败，但不影响阅读:', starError);
        }
      }
      
      setAdded(true);
      router.push('/read/' + fork.id);
    } catch (err) {
      setError(err?.message || '添加失败');
    } finally {
      setLoading(false);
    }
  };

  console.log('AddToReadsButton render - isClient:', isClient, 'isInteractive:', isInteractive);

  if (!isClient || !isInteractive) {
    console.log('AddToReadsButton not rendering - isClient:', isClient, 'isInteractive:', isInteractive);
    return null;
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          added
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-amber-500 text-white hover:bg-amber-600'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? '处理中...' : added ? '已在阅读列表' : '添加到我的阅读'}
      </button>
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
