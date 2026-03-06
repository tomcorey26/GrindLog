"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PressableButton } from "@/components/ui/pressable-button";
import {
  formatTime,
  formatElapsed,
  formatRemaining,
  isCountdownComplete,
} from "@/lib/format";
import { useStopTimer } from "@/hooks/use-habits";
import { useHaptics } from "@/hooks/use-haptics";
import { FullHeight } from "@/components/ui/full-height";

type Props = {
  habitName: string;
  startTime: string;
  targetDurationSeconds: number | null;
  todaySeconds: number;
  streak: number;
};

export function TimerView({
  habitName,
  startTime,
  targetDurationSeconds,
  todaySeconds,
  streak,
}: Props) {
  const isCountdown = targetDurationSeconds !== null;
  const router = useRouter();
  const stopTimer = useStopTimer();
  const { trigger } = useHaptics();

  const [display, setDisplay] = useState(() =>
    isCountdown
      ? formatRemaining(startTime, targetDurationSeconds)
      : formatElapsed(startTime),
  );
  const [finished, setFinished] = useState(() =>
    isCountdown ? isCountdownComplete(startTime, targetDurationSeconds) : false,
  );
  const autoStopTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleStop() {
    trigger("buzz");
    stopTimer.mutate(undefined, {
      onSuccess: () => router.push("/dashboard"),
    });
  }

  function handleBack() {
    router.push("/dashboard");
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (isCountdown) {
        setDisplay(formatRemaining(startTime, targetDurationSeconds));
        if (isCountdownComplete(startTime, targetDurationSeconds)) {
          setFinished(true);
        }
      } else {
        setDisplay(formatElapsed(startTime));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, targetDurationSeconds, isCountdown]);

  useEffect(() => {
    if (!finished) return;

    trigger("buzz");

    try {
      const audio = new Audio("/alarm.mp3");
      audio.play().catch(() => {});
    } catch {
      // Ignore audio errors
    }

    autoStopTimeout.current = setTimeout(() => {
      handleStop();
    }, 2000);

    return () => {
      if (autoStopTimeout.current) {
        clearTimeout(autoStopTimeout.current);
      }
    };
  }, [finished]);

  return (
    <FullHeight>
      <header className="flex items-center justify-between py-4">
        <button onClick={handleBack} className="text-muted-foreground text-sm">
          &larr; Back
        </button>
        <span className="font-semibold">{habitName}</span>
        <div className="w-12" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-6xl font-mono font-light tracking-tight mb-3">
          {display}
        </p>
        <div className="flex items-center gap-2 mb-12">
          {finished ? (
            <span className="text-sm font-semibold text-primary">
              Time&apos;s up!
            </span>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-muted-foreground">
                {isCountdown ? "Counting down..." : "Recording..."}
              </span>
            </>
          )}
        </div>

        <PressableButton size="lg" onClick={handleStop} className="px-12 py-6 text-lg">
          Stop
        </PressableButton>
      </div>

      <footer className="pb-2 text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          Today total: {formatTime(todaySeconds)}
        </p>
        <p className="text-sm text-muted-foreground">
          {streak > 0 ? `🔥 ${streak} day streak` : "No streak yet"}
        </p>
      </footer>
    </FullHeight>
  );
}
