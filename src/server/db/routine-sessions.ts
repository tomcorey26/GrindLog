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
export async function startRoutineSessionForUser(
  userId: number,
  routineId: number,
): Promise<ActiveRoutineSession | { conflict: 'active_timer_exists' } | null> {
  const routine = await getRoutineById(routineId, userId);
  if (!routine) return null;

  return db.transaction(async (tx) => {
    const existingTimer = await tx
      .select({ id: activeTimers.id })
      .from(activeTimers)
      .where(eq(activeTimers.userId, userId))
      .get();
    if (existingTimer) return { conflict: 'active_timer_exists' as const };

    const existingSession = await tx
      .select({ id: routineSessions.id })
      .from(routineSessions)
      .where(and(eq(routineSessions.userId, userId), eq(routineSessions.status, 'active')))
      .get();
    if (existingSession) return { conflict: 'active_timer_exists' as const };

    const now = new Date();
    const [session] = await tx
      .insert(routineSessions)
      .values({
        userId,
        routineId: routine.id,
        routineNameSnapshot: routine.name,
        status: 'active',
        startedAt: now,
      })
      .returning();

    const inserts = snapshotRoutineToSets(routine).map((s) => ({
      sessionId: session.id,
      ...s,
    }));
    if (inserts.length > 0) {
      await tx.insert(routineSessionSets).values(inserts);
    }

    return await reloadActiveSession(tx, userId);
  });
}

async function reloadActiveSession(
  tx: typeof db,
  userId: number,
): Promise<ActiveRoutineSession | null> {
  // Same body as getActiveRoutineSessionForUser but using `tx`. Inline-duplicated
  // to avoid a public signature change on the existing helper.
  const session = await tx
    .select()
    .from(routineSessions)
    .where(and(eq(routineSessions.userId, userId), eq(routineSessions.status, 'active')))
    .get();
  if (!session) return null;
  const setRows = await tx
    .select()
    .from(routineSessionSets)
    .where(eq(routineSessionSets.sessionId, session.id));
  const sortedSets = setRows
    .map(rowToSet)
    .sort((a, b) => a.blockIndex - b.blockIndex || a.setIndex - b.setIndex);
  const timerRow = await tx
    .select()
    .from(activeTimers)
    .where(eq(activeTimers.userId, userId))
    .get();
  return {
    id: session.id,
    routineId: session.routineId,
    routineNameSnapshot: session.routineNameSnapshot,
    status: session.status as 'active' | 'completed',
    startedAt: session.startedAt.toISOString(),
    finishedAt: session.finishedAt?.toISOString() ?? null,
    sets: sortedSets,
    activeTimer: rowToTimer(timerRow),
  };
}
export async function getActiveRoutineSessionForUser(
  userId: number,
): Promise<ActiveRoutineSession | null> {
  const session = await db
    .select()
    .from(routineSessions)
    .where(and(eq(routineSessions.userId, userId), eq(routineSessions.status, 'active')))
    .get();
  if (!session) return null;

  const setRows = await db
    .select()
    .from(routineSessionSets)
    .where(eq(routineSessionSets.sessionId, session.id));

  const sortedSets = setRows
    .map(rowToSet)
    .sort((a, b) => a.blockIndex - b.blockIndex || a.setIndex - b.setIndex);

  const timerRow = await db
    .select()
    .from(activeTimers)
    .where(eq(activeTimers.userId, userId))
    .get();

  return {
    id: session.id,
    routineId: session.routineId,
    routineNameSnapshot: session.routineNameSnapshot,
    status: session.status as 'active' | 'completed',
    startedAt: session.startedAt.toISOString(),
    finishedAt: session.finishedAt?.toISOString() ?? null,
    sets: sortedSets,
    activeTimer: rowToTimer(timerRow),
  };
}
export async function discardActiveRoutineSessionForUser(
  userId: number,
): Promise<{ discarded: boolean }> {
  return db.transaction(async (tx) => {
    const session = await tx
      .select({ id: routineSessions.id })
      .from(routineSessions)
      .where(and(eq(routineSessions.userId, userId), eq(routineSessions.status, 'active')))
      .get();
    if (!session) return { discarded: false };

    await tx.delete(activeTimers).where(eq(activeTimers.userId, userId));
    await tx.delete(routineSessions).where(eq(routineSessions.id, session.id));
    return { discarded: true };
  });
}
export async function buildSummaryForUser(_userId: number) {
  throw new Error('not implemented');
}
export async function saveActiveRoutineSessionForUser(_userId: number) {
  throw new Error('not implemented');
}
export async function startSetForUser(
  userId: number,
  setRowId: number,
): Promise<ActiveRoutineSession | { conflict: 'set_already_running' } | null> {
  return db.transaction(async (tx) => {
    const set = await tx
      .select({
        id: routineSessionSets.id,
        sessionId: routineSessionSets.sessionId,
        habitId: routineSessionSets.habitId,
        plannedDurationSeconds: routineSessionSets.plannedDurationSeconds,
        startedAt: routineSessionSets.startedAt,
      })
      .from(routineSessionSets)
      .innerJoin(routineSessions, eq(routineSessions.id, routineSessionSets.sessionId))
      .where(
        and(
          eq(routineSessionSets.id, setRowId),
          eq(routineSessions.userId, userId),
          eq(routineSessions.status, 'active'),
        ),
      )
      .get();
    if (!set) return null;
    if (set.startedAt) return { conflict: 'set_already_running' as const };

    const existingTimer = await tx
      .select({ id: activeTimers.id })
      .from(activeTimers)
      .where(eq(activeTimers.userId, userId))
      .get();
    if (existingTimer) return { conflict: 'set_already_running' as const };

    if (!set.habitId) return null; // habit deleted out from under us

    const now = new Date();
    await tx
      .update(routineSessionSets)
      .set({ startedAt: now })
      .where(eq(routineSessionSets.id, set.id));

    await tx.insert(activeTimers).values({
      habitId: set.habitId,
      userId,
      startTime: now,
      targetDurationSeconds: set.plannedDurationSeconds,
      routineSessionSetId: set.id,
      phase: 'set',
    });

    return await reloadActiveSession(tx, userId);
  });
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
