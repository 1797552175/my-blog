'use client';

export default function CreatePrButton({ storyId, chapterCount }) {
  const handleClick = () => {
    window.location.href = `/me/pr-novels/create?storyId=${storyId}&fromChapter=${chapterCount || 1}`;
  };

  return (
    <button
      onClick={handleClick}
      className="block w-full btn bg-purple-600 text-white hover:bg-purple-700 text-center"
    >
      📝 创建PR
    </button>
  );
}