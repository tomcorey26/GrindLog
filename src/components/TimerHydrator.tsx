"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useTimerStore } from "@/stores/timer-store";
import type { Habit } from "@/lib/types";

export function TimerHydrator() {
  const queryClient = useQueryClient();
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;

    function tryHydrate() {
      if (hydratedRef.current) return;
      const data = queryClient.getQueryData<{ habits: Habit[] }>(
        queryKeys.habits.all,
      );
      if (!data) return;

      const activeHabit = data.habits.find((h) => h.activeTimer);
      if (activeHabit?.activeTimer) {
        useTimerStore.getState().hydrate({
          habitId: activeHabit.id,
          habitName: activeHabit.name,
          startTime: activeHabit.activeTimer.startTime,
          targetDurationSeconds: activeHabit.activeTimer.targetDurationSeconds,
        });
      }
      hydratedRef.current = true;
    }

    // Try immediately
    tryHydrate();

    // Also subscribe to cache updates for initial population
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (hydratedRef.current) return;
      if (event.query.queryKey[0] !== "habits") return;
      tryHydrate();
    });

    return unsubscribe;
  }, [queryClient]);

  return null;
}
