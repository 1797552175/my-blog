'use client';

import Link from 'next/link';
import { useState } from 'react';
import PersonaChatPanel from '../../components/PersonaChatPanel';

function excerpt(md, maxLen = 160) {
  if (!md) return '暂无内容';
  const text = String(md)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

export default function PostsListWithPersona({ posts, tag, error }) {
  const [personaOpen, setPersonaOpen] = useState(false);
  const [personaAuthorId, setPersonaAuthorId] = useState(null);
  const [personaAuthorUsername, setPersonaAuthorUsername] = useState('');
  const [personaPostId, setPersonaPostId] = useState(null);
  const [personaPostTitle, setPersonaPostTitle] = useState(null);

  function openPersona(authorId, authorUsername, postId = null, postTitle = null) {
    setPersonaAuthorId(authorId);
    setPersonaAuthorUsername(authorUsername);
    setPersonaPostId(postId);
    setPersonaPostTitle(postTitle);
    setPersonaOpen(true);
  }

  return (
    <>
      <div className="space-y-4">
        {posts.length === 0 ? (
          <p className="text-gray-600 dark:text-zinc-400">暂无文章</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="border-b border-gray-200 dark:border-zinc-700 pb-4">
              <Link href={`/posts/${post.slug}`}>
                <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                  {post.title}
                </h2>
              </Link>
              {Array.isArray(post.tags) && post.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {post.tags.map((t) => (
                    <Link key={t} href={`/posts?tag=${encodeURIComponent(t)}`} className="text-xs rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600">
                      {t}
                    </Link>
                  ))}
                </div>
              ) : null}
              <p className="text-gray-600 dark:text-zinc-400 mt-1">
                {excerpt(post.contentMarkdown)}
              </p>
              <div className="text-sm text-gray-500 dark:text-zinc-400 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>发布于 {new Date(post.createdAt).toLocaleDateString()}</span>
                <span>作者：{post.authorUsername}</span>
                {post.authorPersonaEnabled && post.authorId != null ? (
                  <button
                    type="button"
                    onClick={() => openPersona(post.authorId, post.authorUsername, null, null)}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    与 TA 对话
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <PersonaChatPanel
        authorId={personaAuthorId}
        authorUsername={personaAuthorUsername}
        postId={personaPostId}
        postTitle={personaPostTitle}
        open={personaOpen}
        onClose={() => setPersonaOpen(false)}
      />
    </>
  );
}
