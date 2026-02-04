import HomeClient from './_homeClient';

async function getHealth() {
  const isServer = typeof window === 'undefined';
  const base = isServer
    ? (process.env.INTERNAL_API_URL || 'http://localhost:8080').replace(/\/$/, '') + '/api'
    : (process.env.NEXT_PUBLIC_API_BASE || '/api');

  try {
    const res = await fetch(`${base}/health`, {
      cache: 'no-store',
    });
    if (!res.ok) return { status: `bad_status_${res.status}` };
    return await res.json();
  } catch (e) {
    return { status: 'error' };
  }
}

export const dynamic = 'force-dynamic';

export default async function Home() {
  const health = await getHealth();

  return (
    <main className="w-full p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="max-w-3xl mx-auto md:mx-0">
        {/* <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-100">My Blog</h1> */}
        <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm md:text-base">API 状态：{health.status}</p>
      </div>
      <HomeClient />
    </main>
  );
}
