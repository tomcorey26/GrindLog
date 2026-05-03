import { describe, it, expect } from 'vitest';
import { computeNextPhase, computeReplayForward, computeSummary, snapshotRoutineToSets } from './routine-session';
import type { RoutineSessionSet, RoutineSessionActiveTimer, Routine } from './types';

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

describe('snapshotRoutineToSets', () => {
  it('flattens routine blocks into ordered session sets', () => {
    const routine: Routine = {
      id: 1,
      name: 'Morning',
      blocks: [
        {
          id: 10,
          habitId: 100,
          habitName: 'Guitar',
          sortOrder: 0,
          notes: 'warm up',
          sets: [
            { durationSeconds: 60, breakSeconds: 30 },
            { durationSeconds: 90, breakSeconds: 0 },
          ],
        },
        {
          id: 11,
          habitId: 200,
          habitName: 'Piano',
          sortOrder: 1,
          notes: null,
          sets: [{ durationSeconds: 120, breakSeconds: 60 }],
        },
      ],
      createdAt: '',
      updatedAt: '',
    };
    const result = snapshotRoutineToSets(routine);
    expect(result).toEqual([
      { blockIndex: 0, setIndex: 0, habitId: 100, habitNameSnapshot: 'Guitar', notesSnapshot: 'warm up', plannedDurationSeconds: 60, plannedBreakSeconds: 30 },
      { blockIndex: 0, setIndex: 1, habitId: 100, habitNameSnapshot: 'Guitar', notesSnapshot: 'warm up', plannedDurationSeconds: 90, plannedBreakSeconds: 0 },
      { blockIndex: 1, setIndex: 0, habitId: 200, habitNameSnapshot: 'Piano', notesSnapshot: null, plannedDurationSeconds: 120, plannedBreakSeconds: 60 },
    ]);
  });
});
