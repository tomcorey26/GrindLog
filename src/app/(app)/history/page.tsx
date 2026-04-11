import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { HistoryView } from "@/components/HistoryView";
import { Suspense } from "react";
import { Spinner } from "@/components/Spinner";
import { getHabitsForUser } from "@/server/db/habits";
import { getHistoryForUser } from "@/server/db/history";

export default async function HistoryPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const [historyData, habits] = await Promise.all([
    getHistoryForUser(userId, {}),
    getHabitsForUser(userId),
  ]);

  const habitsList = habits.map((h) => ({ id: h.id, name: h.name }));

  return (
    <Suspense fallback={<Spinner />}>
      <HistoryView
        habits={habitsList}
        initialHistory={historyData.history}
        initialTotalSeconds={historyData.totalSeconds}
      />
    </Suspense>
  );
}
