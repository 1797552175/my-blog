'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdvancedSearchForm({ allTags }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    
    if (query.trim()) {
      params.set('q', query.trim());
    }
    
    router.push(`/stories?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="mb-6">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索小说标题、摘要..."
        className="input w-full max-w-md"
      />
    </form>
  );
}
