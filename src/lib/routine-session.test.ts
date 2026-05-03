import { describe, it, expect } from 'vitest';
import { computeNextPhase, computeReplayForward, computeSummary } from './routine-session';
import type { RoutineSessionSet, RoutineSessionActiveTimer } from './types';

function makeSet(partial: Partial<RoutineSessionSet> & { blockIndex: number; setIndex: number }): RoutineSessionSet {
  return {
    id: partial.blockIndex * 100 + partial.setIndex,
    sessionId: 1,
    habitId: 1,
    habitNameSnapshot: 'Guitar',
    notesSnapshot: null,
    plannedDurationSeconds: 60,
    plannedBreakSeconds: 30,
    actualDurationSeconds: null,
    startedAt: null,
    completedAt: null,
    ...partial,
  };
}

describe('computeNextPhase', () => {
  it('returns break when set has break and is not the final set', () => {
    const sets = [
      makeSet({ blockIndex: 0, setIndex: 0 }),
      makeSet({ blockIndex: 0, setIndex: 1 }),
    ];
    const result = computeNextPhase({ sets, completedSetId: sets[0].id });
    expect(result).toEqual({ phase: 'break', breakSeconds: 30, setRowId: sets[0].id });
  });

  it('returns idle when completed set has zero break', () => {
    const sets = [
      makeSet({ blockIndex: 0, setIndex: 0, plannedBreakSeconds: 0 }),
      makeSet({ blockIndex: 0, setIndex: 1 }),
    ];
    const result = computeNextPhase({ sets, completedSetId: sets[0].id });
    expect(result).toEqual({ phase: 'idle' });
  });

  it('returns idle when this is the final set of the final block', () => {
    const sets = [
      makeSet({ blockIndex: 0, setIndex: 0 }),
      makeSet({ blockIndex: 0, setIndex: 1 }),
    ];
    const result = computeNextPhase({ sets, completedSetId: sets[1].id });
    expect(result).toEqual({ phase: 'idle' });
  });

  it('returns break when last set of a non-final block has a break', () => {
    const sets = [
      makeSet({ blockIndex: 0, setIndex: 0 }),
      makeSet({ blockIndex: 1, setIndex: 0 }),
    ];
    const result = computeNextPhase({ sets, completedSetId: sets[0].id });
    expect(result).toEqual({ phase: 'break', breakSeconds: 30, setRowId: sets[0].id });
  });
});

function makeTimer(p: Partial<RoutineSessionActiveTimer> = {}): RoutineSessionActiveTimer {
  return {
    routineSessionSetId: 1,
    phase: 'set',
    startTime: '2026-05-02T00:00:00.000Z',
    targetDurationSeconds: 60,
    ...p,
  };
}

describe('computeReplayForward', () => {
  it('returns stable when no timer', () => {
    expect(computeReplayForward(null, new Date())).toEqual({ action: 'stable' });
  });

  it('returns stable when timer has not elapsed', () => {
    const start = new Date('2026-05-02T00:00:00.000Z');
    const now = new Date(start.getTime() + 30_000);
    expect(computeReplayForward(makeTimer({ targetDurationSeconds: 60 }), now)).toEqual({ action: 'stable' });
  });

  it('returns complete-set when set timer elapsed', () => {
    const start = new Date('2026-05-02T00:00:00.000Z');
    const now = new Date(start.getTime() + 120_000);
    expect(computeReplayForward(makeTimer({ phase: 'set', targetDurationSeconds: 60 }), now)).toEqual({
      action: 'complete-set',
      setRowId: 1,
    });
  });

  it('returns complete-break when break timer elapsed', () => {
    const start = new Date('2026-05-02T00:00:00.000Z');
    const now = new Date(start.getTime() + 120_000);
    expect(computeReplayForward(makeTimer({ phase: 'break', targetDurationSeconds: 60 }), now)).toEqual({
      action: 'complete-break',
    });
  });
});

describe('computeSummary', () => {
  it('aggregates completed sets only', () => {
    const sets: RoutineSessionSet[] = [
      makeSet({ blockIndex: 0, setIndex: 0, habitNameSnapshot: 'Guitar', actualDurationSeconds: 60 }),
      makeSet({ blockIndex: 0, setIndex: 1, habitNameSnapshot: 'Guitar', actualDurationSeconds: 30 }),
      makeSet({ blockIndex: 1, setIndex: 0, habitNameSnapshot: 'Piano', actualDurationSeconds: 0 }),
      makeSet({ blockIndex: 1, setIndex: 1, habitNameSnapshot: 'Piano', actualDurationSeconds: null }),
    ];
    const startedAt = '2026-05-02T00:00:00.000Z';
    const finishedAt = '2026-05-02T00:10:00.000Z';
    const result = computeSummary({
      routineNameSnapshot: 'Morning',
      sets,
      startedAt,
      finishedAt,
    });
    expect(result.totalElapsedSeconds).toBe(600);
    expect(result.totalActiveSeconds).toBe(90);
    expect(result.completedSetCount).toBe(2);
    expect(result.byHabit).toEqual([
      { habitName: 'Guitar', sets: 2, totalSeconds: 90 },
    ]);
  });
});
