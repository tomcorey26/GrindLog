"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatTime } from "@/lib/format";
import { isCountdownComplete } from "@/lib/timer";
import { useTimerStore } from "@/stores/timer-store";

function sendBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {}
}

export function CountdownAutoStop() {
  const queryClient = useQueryClient();
  const stoppingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTimer = useTimerStore((s) => s.activeTimer);
  const timerViewMounted = useTimerStore((s) => s.timerViewMounted);

  useEffect(() => {
    // Only poll for countdowns, and only when TimerView is NOT mounted.
    // When TimerView is on screen, it owns the stop call (foreground path).
    // CountdownAutoStop handles the background path (other pages, app re-entry).
    if (!activeTimer?.targetDurationSeconds || timerViewMounted) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      stoppingRef.current = false;
      return;
    }

    const { startTime, targetDurationSeconds, habitName } = activeTimer;

    async function checkAndStop() {
      if (stoppingRef.current) return;
      if (!isCountdownComplete(startTime, targetDurationSeconds!)) return;

      stoppingRef.current = true;
      try {
        const result = await api<{ durationSeconds: number }>(
          "/api/timer/stop",
          { method: "POST" },
        );

        const message = `Your ${formatTime(result.durationSeconds)} ${habitName} session was recorded`;
        toast.success(message);
        sendBrowserNotification("Session Complete", message);
        try {
          new Audio("/fanfare.mp3").play().catch(() => {});
        } catch {}

        // Go back to habits list (not success screen) since the timer
        // finished in the background, not while the user was watching
        useTimerStore.getState().resetTimer();

        queryClient.invalidateQueries({ queryKey: queryKeys.habits.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.rankings.all });
      } catch {
        // Timer was already stopped (e.g., server auto-stop or another tab).
        // Clean up zustand so the UI doesn't show a stale timer.
        useTimerStore.getState().resetTimer();
      }
    }

    stoppingRef.current = false;
    intervalRef.current = setInterval(checkAndStop, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeTimer, timerViewMounted, queryClient]);

  return null;
}
