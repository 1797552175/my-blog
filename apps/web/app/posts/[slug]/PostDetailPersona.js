'use client';

import { useState } from 'react';
import PersonaChatPanel from '../../../components/PersonaChatPanel';

export default function PostDetailPersona({ authorId, authorUsername, authorPersonaEnabled, postId, postTitle }) {
  const [panelOpen, setPanelOpen] = useState(false);

  if (!authorPersonaEnabled || authorId == null) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
      >
        与作者 AI 对话
      </button>
      <PersonaChatPanel
        authorId={authorId}
        authorUsername={authorUsername}
        postId={postId}
        postTitle={postTitle}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
      />
    </>
  );
}
