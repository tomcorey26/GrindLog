"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useTimerStore } from "@/stores/timer-store";
import type { Habit } from "@/lib/types";

export function TimerHydrator() {
  const pathname = usePathname();
  const hydratedRef = useRef(false);

  // Fetch habits to ensure timer state is available on any page
  const { data } = useQuery({
    queryKey: queryKeys.habits.all,
    queryFn: () => api<{ habits: Habit[] }>("/api/habits"),
  });

  // Dismiss success view when navigating away from /habits
  useEffect(() => {
    if (
      !pathname.startsWith("/habits") &&
      useTimerStore.getState().view.type === "success"
    ) {
      useTimerStore.getState().dismissSuccess();
    }
  }, [pathname]);

  // Hydrate zustand from habits data (once)
  useEffect(() => {
    if (hydratedRef.current || !data) return;

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
  }, [data]);

  return null;
}
