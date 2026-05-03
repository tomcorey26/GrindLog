import type { RoutineSessionActiveTimer, RoutineSessionSet } from './types';

export type NextPhaseInput = {
  sets: RoutineSessionSet[];
  completedSetId: number;
};

export type NextPhaseResult =
  | { phase: 'idle' }
  | { phase: 'break'; breakSeconds: number; setRowId: number };

export function computeNextPhase({ sets, completedSetId }: NextPhaseInput): NextPhaseResult {
  const completed = sets.find((s) => s.id === completedSetId);
  if (!completed) return { phase: 'idle' };

  if (completed.plannedBreakSeconds === 0) return { phase: 'idle' };

  const sorted = [...sets].sort(
    (a, b) => a.blockIndex - b.blockIndex || a.setIndex - b.setIndex,
  );
  const last = sorted[sorted.length - 1];
  if (last.id === completedSetId) return { phase: 'idle' };

  return {
    phase: 'break',
    breakSeconds: completed.plannedBreakSeconds,
    setRowId: completed.id,
  };
}

export type ReplayAction =
  | { action: 'stable' }
  | { action: 'complete-set'; setRowId: number }
  | { action: 'complete-break' };

export function computeReplayForward(
  timer: RoutineSessionActiveTimer | null,
  now: Date,
): ReplayAction {
  if (!timer) return { action: 'stable' };
  const elapsed = (now.getTime() - new Date(timer.startTime).getTime()) / 1000;
  if (elapsed < timer.targetDurationSeconds) return { action: 'stable' };
  if (timer.phase === 'set') return { action: 'complete-set', setRowId: timer.routineSessionSetId };
  return { action: 'complete-break' };
}
