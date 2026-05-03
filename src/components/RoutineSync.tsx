'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useActiveRoutine, useCompleteSet, useCompleteBreak } from '@/hooks/use-active-routine';
import { useRoutineSessionStore } from '@/stores/routine-session-store';
import { computeReplayForward } from '@/lib/routine-session';
import { formatRemaining } from '@/lib/format';

function sendBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try { new Notification(title, { body }); } catch {}
}

export function RoutineSync() {
  const { data: session } = useActiveRoutine();
  const completeSet = useCompleteSet();
  const completeBreak = useCompleteBreak();
  const advancingRef = useRef(false);

  // Hydrate store on each fetch.
  useEffect(() => {
    useRoutineSessionStore.getState().hydrate(session ?? null);
  }, [session]);

  const activeTimer = session?.activeTimer ?? null;

  // Replay-forward / natural-completion driver
  useEffect(() => {
    if (!activeTimer) return;
    let cancelled = false;
    async function tick() {
      if (cancelled || advancingRef.current) return;
      const action = computeReplayForward(activeTimer, new Date());
      if (action.action === 'stable') return;
      advancingRef.current = true;
      try {
        if (action.action === 'complete-set') {
          await completeSet.mutateAsync({ setRowId: action.setRowId });
          sendBrowserNotification('Set complete', 'Break starting');
        } else {
          await completeBreak.mutateAsync();
          sendBrowserNotification('Break complete', 'Ready for next set');
        }
      } catch {
        toast.error('Could not advance routine');
      } finally {
        advancingRef.current = false;
      }
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeTimer, completeSet, completeBreak]);

  // Display-time tick
  useEffect(() => {
    if (!activeTimer) {
      useRoutineSessionStore.getState().setDisplayTime('00:00:00');
      return;
    }
    function tick() {
      useRoutineSessionStore.getState().setDisplayTime(
        formatRemaining(activeTimer.startTime, activeTimer.targetDurationSeconds),
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeTimer]);

  return null;
}
