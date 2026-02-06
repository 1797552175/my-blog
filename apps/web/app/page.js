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
    <main className="w-full h-full flex-1">
      <div className="w-full">
        {health.status !== 'ok' && (
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm md:text-base">API 状态：{health.status}</p>
        )}
      </div>
      <div className="w-full h-full">
        <HomeClient />
      </div>
    </main>
  );
}
