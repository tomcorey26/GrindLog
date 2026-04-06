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
  const stopTimer = useTimerStore((s) => s.stopTimer);

  useEffect(() => {
    // Only poll for countdowns
    if (!activeTimer?.targetDurationSeconds) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
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
        stopTimer(result.durationSeconds);

        const message = `Your ${formatTime(result.durationSeconds)} ${habitName} session was recorded`;
        toast.success(message);
        sendBrowserNotification("Session Complete", message);
        try {
          new Audio("/fanfare.mp3").play().catch(() => {});
        } catch {}

        queryClient.invalidateQueries({ queryKey: queryKeys.habits.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.rankings.all });
      } catch {
        // Timer may have already been stopped (e.g., another tab)
      } finally {
        stoppingRef.current = false;
      }
    }

    intervalRef.current = setInterval(checkAndStop, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeTimer, queryClient, stopTimer]);

  return null;
}
