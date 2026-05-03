import { describe, it, expect } from 'vitest';
import { computeNextPhase } from './routine-session';
import type { RoutineSessionSet } from './types';

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
