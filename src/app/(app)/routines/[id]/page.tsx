import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import { getSessionUserId } from "@/lib/auth";
import { parseId } from "@/lib/utils";
import { getRoutineById } from "@/server/db/routines";
import { RoutineDetailView } from "@/components/RoutineDetailView";
import { Spinner } from "@/components/Spinner";

export default async function RoutineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { id } = await params;
  const routineId = parseId(id);
  if (!routineId) notFound();

  const routine = await getRoutineById(routineId, userId);
  if (!routine) notFound();

  return (
    <Suspense fallback={<Spinner />}>
      <RoutineDetailView routineId={routine.id} initialRoutine={routine} />
    </Suspense>
  );
}
