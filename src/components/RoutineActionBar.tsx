'use client';

import { useRouter } from 'next/navigation';
import { useRoutineSessionStore } from '@/stores/routine-session-store';
import { useHaptics } from '@/hooks/use-haptics';

export function RoutineActionBar() {
  const router = useRouter();
  const { trigger } = useHaptics();
  const session = useRoutineSessionStore((s) => s.session);
  const displayTime = useRoutineSessionStore((s) => s.displayTime);
  const mode = useRoutineSessionStore((s) => s.mode);

  if (mode !== 'active' || !session) return null;

  const totalSets = session.sets.length;
  const activeTimer = session.activeTimer;

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
        if (session.routineId) router.push(`/routines/${session.routineId}/active`);
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
