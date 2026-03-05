import { redirect } from 'next/navigation';
import { getSessionUserId } from '@/lib/auth';
import { getRankingsForUser } from '@/lib/queries';
import { RankingsView } from '@/components/RankingsView';
import { Suspense } from 'react';
import { Spinner } from '@/components/Spinner';

export default async function RankingsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect('/login');

  const rankings = await getRankingsForUser(userId);

  return (
    <Suspense fallback={<Spinner />}>
      <RankingsView initialRankings={rankings} />
    </Suspense>
  );
}
