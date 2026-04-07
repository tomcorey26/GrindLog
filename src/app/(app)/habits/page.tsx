import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { Dashboard } from "@/components/Dashboard";
import { Suspense } from "react";
import { Spinner } from "@/components/Spinner";
import { getHabitsForUser } from "@/server/db/habits";
import { autoStopExpiredCountdown } from "@/server/db/timers";

export default async function HabitsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  // Auto-stop any expired countdown before fetching habits
  await autoStopExpiredCountdown(userId);
  const habits = await getHabitsForUser(userId);

  return (
    <Suspense fallback={<Spinner />}>
      <Dashboard initialHabits={habits} />
    </Suspense>
  );
}
