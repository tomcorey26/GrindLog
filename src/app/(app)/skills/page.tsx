import { redirect } from 'next/navigation';
import { getSessionUserId } from '@/lib/auth';
import { getHabitsForUser, autoStopExpiredCountdown } from '@/lib/queries';
import { Dashboard } from '@/components/Dashboard';
import { AutoStopToastTrigger } from '@/components/AutoStopToast';
import { Suspense } from 'react';
import { Spinner } from '@/components/Spinner';

type Props = {
  searchParams: Promise<{ autoStopped?: string; duration?: string }>;
};

export default async function SkillsPage({ searchParams }: Props) {
  const userId = await getSessionUserId();
  if (!userId) redirect('/login');

  const params = await searchParams;

  // Check search params first (redirected from /timer after auto-stop)
  // Otherwise check DB directly (user navigated to /skills with an expired timer)
  const autoStopped = params.autoStopped && params.duration
    ? { habitName: params.autoStopped, durationSeconds: Number(params.duration) }
    : await autoStopExpiredCountdown(userId);

  const habits = await getHabitsForUser(userId);

  return (
    <Suspense fallback={<Spinner />}>
      <Dashboard initialHabits={habits} />
      {autoStopped && <AutoStopToastTrigger autoStopped={autoStopped} />}
    </Suspense>
  );
}
