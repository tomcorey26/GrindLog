"use client";

import { useRoutineBuilder } from "@/hooks/use-routine-builder";
import { RoutineBuilder } from "@/components/RoutineBuilder";
import type { Routine, Habit } from "@/lib/types";

type Props = (
  | { mode: "create"; routine?: never }
  | { mode: "edit"; routine: Routine }
) & { initialHabits?: Habit[] };

export function RoutineBuilderPage({ mode, routine, initialHabits }: Props) {
  const builder = useRoutineBuilder(mode, routine);

  return (
    <RoutineBuilder
      mode={mode}
      initialHabits={initialHabits}
      builder={builder}
    />
  );
}
