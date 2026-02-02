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
    <main style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>My Blog</h1>
      <p>Web is running.</p>
      <p>API health: {health.status}</p>
    </main>
  );
}
