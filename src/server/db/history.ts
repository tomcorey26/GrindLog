import { and, desc, eq, gte } from "drizzle-orm";

import { db } from "@/db";
import { habits, timeSessions } from "@/db/schema";
import type { HistoryEntry } from "@/lib/types";

type HistoryFilters = {
  habitId?: string;
  range?: string;
};

type ManualHistoryInput = {
  userId: number;
  habitId: number;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
};

export async function getHistoryForUser(
  userId: number,
  filters: HistoryFilters,
): Promise<{ history: HistoryEntry[]; totalSeconds: number }> {
  const dateFilter = getDateFilter(filters.range);

  const conditions = [eq(habits.userId, userId)];
  if (filters.habitId)
    conditions.push(eq(timeSessions.habitId, Number(filters.habitId)));
  if (dateFilter) conditions.push(gte(timeSessions.endTime, dateFilter));

  const rows = await db
    .select({
      id: timeSessions.id,
      habitName: habits.name,
      habitId: timeSessions.habitId,
      startTime: timeSessions.startTime,
      endTime: timeSessions.endTime,
      durationSeconds: timeSessions.durationSeconds,
      timerMode: timeSessions.timerMode,
    })
    .from(timeSessions)
    .innerJoin(habits, eq(timeSessions.habitId, habits.id))
    .where(and(...conditions))
    .orderBy(desc(timeSessions.endTime));

  const totalSeconds = rows.reduce((sum, row) => sum + row.durationSeconds, 0);

  return {
    history: rows.map((row) => ({
      ...row,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
    })),
    totalSeconds,
  };
}

export async function createManualHistoryEntry({
  userId,
  habitId,
  startTime,
  endTime,
  durationSeconds,
}: ManualHistoryInput) {
  const habit = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .get();

  if (!habit) return null;

  const [entry] = await db
    .insert(timeSessions)
    .values({
      habitId,
      userId,
      startTime,
      endTime,
      durationSeconds,
      timerMode: "manual",
    })
    .returning();

  return entry;
}

export async function deleteHistoryEntry(
  entryId: number,
  userId: number,
) {
  const [deleted] = await db
    .delete(timeSessions)
    .where(
      and(eq(timeSessions.id, entryId), eq(timeSessions.userId, userId)),
    )
    .returning();

  return deleted ?? null;
}

function getDateFilter(range?: string): Date | null {
  const now = new Date();

  if (range === "today") {
    const dateFilter = new Date(now);
    dateFilter.setHours(0, 0, 0, 0);
    return dateFilter;
  }

  if (range === "week") {
    const dateFilter = new Date(now);
    dateFilter.setDate(dateFilter.getDate() - 7);
    dateFilter.setHours(0, 0, 0, 0);
    return dateFilter;
  }

  if (range === "month") {
    const dateFilter = new Date(now);
    dateFilter.setMonth(dateFilter.getMonth() - 1);
    dateFilter.setHours(0, 0, 0, 0);
    return dateFilter;
  }

  return null;
}
