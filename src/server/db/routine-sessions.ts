import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  routineSessions,
  routineSessionSets,
  activeTimers,
  habits,
  timeSessions,
  routines,
} from '@/db/schema';
import type {
  ActiveRoutineSession,
  RoutineSessionSet,
  RoutineSessionActiveTimer,
} from '@/lib/types';
import { snapshotRoutineToSets, computeNextPhase, computeSummary } from '@/lib/routine-session';
import { getRoutineById } from '@/server/db/routines';

function rowToSet(row: typeof routineSessionSets.$inferSelect): RoutineSessionSet {
  return {
    id: row.id,
    sessionId: row.sessionId,
    blockIndex: row.blockIndex,
    setIndex: row.setIndex,
    habitId: row.habitId,
    habitNameSnapshot: row.habitNameSnapshot,
    notesSnapshot: row.notesSnapshot,
    plannedDurationSeconds: row.plannedDurationSeconds,
    plannedBreakSeconds: row.plannedBreakSeconds,
    actualDurationSeconds: row.actualDurationSeconds,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

function rowToTimer(
  row: typeof activeTimers.$inferSelect | undefined,
): RoutineSessionActiveTimer | null {
  if (!row || !row.routineSessionSetId || !row.phase || row.targetDurationSeconds === null) {
    return null;
  }
  return {
    routineSessionSetId: row.routineSessionSetId,
    phase: row.phase as 'set' | 'break',
    startTime: row.startTime.toISOString(),
    targetDurationSeconds: row.targetDurationSeconds,
  };
}

// Stubs — implemented in subsequent tasks:
export async function startRoutineSessionForUser(_userId: number, _routineId: number) {
  throw new Error('not implemented');
}
export async function getActiveRoutineSessionForUser(_userId: number): Promise<ActiveRoutineSession | null> {
  throw new Error('not implemented');
}
export async function discardActiveRoutineSessionForUser(_userId: number) {
  throw new Error('not implemented');
}
export async function buildSummaryForUser(_userId: number) {
  throw new Error('not implemented');
}
export async function saveActiveRoutineSessionForUser(_userId: number) {
  throw new Error('not implemented');
}
export async function startSetForUser(_userId: number, _setRowId: number) {
  throw new Error('not implemented');
}
export async function completeSetForUser(_userId: number, _setRowId: number, _endedAt?: Date) {
  throw new Error('not implemented');
}
export async function patchSetForUser(_userId: number, _setRowId: number, _patch: { plannedDurationSeconds?: number; plannedBreakSeconds?: number; actualDurationSeconds?: number }) {
  throw new Error('not implemented');
}
export async function skipBreakForUser(_userId: number) {
  throw new Error('not implemented');
}
export async function completeBreakForUser(_userId: number) {
  throw new Error('not implemented');
}
export async function userHasActiveRoutineSession(userId: number): Promise<boolean> {
  const row = await db
    .select({ id: routineSessions.id })
    .from(routineSessions)
    .where(and(eq(routineSessions.userId, userId), eq(routineSessions.status, 'active')))
    .get();
  return !!row;
}
export async function habitIsInActiveRoutineSession(userId: number, habitId: number): Promise<boolean> {
  const row = await db
    .select({ id: routineSessionSets.id })
    .from(routineSessionSets)
    .innerJoin(routineSessions, eq(routineSessions.id, routineSessionSets.sessionId))
    .where(
      and(
        eq(routineSessions.userId, userId),
        eq(routineSessions.status, 'active'),
        eq(routineSessionSets.habitId, habitId),
      ),
    )
    .get();
  return !!row;
}
