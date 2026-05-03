'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trophy } from 'lucide-react';
import { useRoutineSessionStore } from '@/stores/routine-session-store';
import { useFinishRoutineSession } from '@/hooks/use-active-routine';
import { useHaptics } from '@/hooks/use-haptics';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';

export function RoutineActionBar() {
  const router = useRouter();
  const { trigger } = useHaptics();
  const session = useRoutineSessionStore((s) => s.session);
  const setSummary = useRoutineSessionStore((s) => s.setSummary);
  const displayTime = useRoutineSessionStore((s) => s.displayTime);
  const mode = useRoutineSessionStore((s) => s.mode);
  const finish = useFinishRoutineSession();

  if (mode !== 'active' || !session) return null;

  const totalSets = session.sets.length;
  const activeTimer = session.activeTimer;
  const allComplete =
    !activeTimer && totalSets > 0 && session.sets.every((s) => s.completedAt);

  function navigateToActive() {
    if (session?.routineId) router.push(`/routines/${session.routineId}/active`);
  }

  async function handleFinish(e: React.MouseEvent) {
    e.stopPropagation();
    trigger('medium');
    try {
      const data = await finish.mutateAsync();
      setSummary(data.summary);
      navigateToActive();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        navigateToActive();
        return;
      }
      toast.error('Could not finish routine');
    }
  }

  if (allComplete) {
    return (
      <button
        type="button"
        onClick={() => {
          trigger('light');
          navigateToActive();
        }}
        className="w-full px-4 py-3 bg-emerald-500/15 border-t border-emerald-500/40 flex items-center justify-between hover:bg-emerald-500/20 transition-colors"
        aria-label="Open completed routine"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
          <div className="flex flex-col items-start min-w-0">
            <span className="font-semibold text-sm text-emerald-800 dark:text-emerald-300">
              Routine complete
            </span>
            <span className="text-xs text-muted-foreground">
              {totalSets} {totalSets === 1 ? 'set' : 'sets'} done
            </span>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleFinish}
          disabled={finish.isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {finish.isPending ? 'Finishing...' : 'Finish'}
        </Button>
      </button>
    );
  }

  const currentSetIndex = (() => {
    if (activeTimer) {
      const idx = session.sets.findIndex((s) => s.id === activeTimer.routineSessionSetId);
      return idx >= 0 ? idx : 0;
    }
    const nextIdle = session.sets.findIndex((s) => !s.completedAt);
    return nextIdle >= 0 ? nextIdle : totalSets - 1;
  })();
  const currentSet = session.sets[currentSetIndex];

  let phaseLabel: string;
  if (activeTimer?.phase === 'set') phaseLabel = 'Recording';
  else if (activeTimer?.phase === 'break') phaseLabel = 'Resting';
  else phaseLabel = `Tap to start set ${currentSetIndex + 1}`;

  return (
    <button
      type="button"
      onClick={() => {
        trigger('light');
        navigateToActive();
      }}
      className="w-full px-4 py-3 bg-primary/10 border-t border-primary/30 flex items-center justify-between hover:bg-primary/15 transition-colors"
      aria-label="Open active routine"
    >
      <div className="flex flex-col items-start min-w-0">
        <span className="font-semibold text-sm truncate max-w-[60vw]">
          {currentSet?.habitNameSnapshot ?? session.routineNameSnapshot} — Set {currentSetIndex + 1} of {totalSets}
        </span>
        <span className="text-xs text-muted-foreground">{phaseLabel}</span>
      </div>
      <span className="font-mono text-sm">{displayTime}</span>
    </button>
  );
}
