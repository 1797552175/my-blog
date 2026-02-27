import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams: searchParamsProp }) {
  const searchParams = typeof searchParamsProp?.then === 'function' ? await searchParamsProp : searchParamsProp;
  const q = searchParams?.q ?? '';
  if (q && String(q).trim()) {
    redirect(`/stories?q=${encodeURIComponent(String(q).trim())}`);
  }
  redirect('/stories');
}
