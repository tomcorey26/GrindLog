import { redirect } from 'next/navigation';
import { getSessionUserId } from '@/lib/auth';
import { getHabitsForUser } from '@/lib/queries';
import { Dashboard } from '@/components/Dashboard';
import { Suspense } from 'react';
import { Spinner } from '@/components/Spinner';

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect('/login');

  const habits = await getHabitsForUser(userId);

  return (
    <Suspense fallback={<Spinner />}>
      <Dashboard initialHabits={habits} />
    </Suspense>
  );
}
