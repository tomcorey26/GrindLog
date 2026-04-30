import { and, eq, desc, sql, inArray } from "drizzle-orm";

import { db } from "@/db";
import { routines, routineBlocks, habits } from "@/db/schema";
import type { Routine, RoutineBlock, RoutineSet } from "@/lib/types";

type RawBlock = {
  id: number;
  habitId: number;
  habitName: string;
  sortOrder: number;
  notes: string | null;
  sets: string;
};

function parseBlocks(rawBlocks: RawBlock[]): RoutineBlock[] {
  return rawBlocks
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((block) => {
      let sets: RoutineSet[];
      try {
        sets = JSON.parse(block.sets) as RoutineSet[];
      } catch {
        sets = [];
      }
      return {
        id: block.id,
        habitId: block.habitId,
        habitName: block.habitName,
        sortOrder: block.sortOrder,
        notes: block.notes,
        sets,
      };
    });
}

async function fetchBlocksForRoutine(routineId: number): Promise<RoutineBlock[]> {
  const rawBlocks = await db
    .select({
      id: routineBlocks.id,
      habitId: routineBlocks.habitId,
      habitName: habits.name,
      sortOrder: routineBlocks.sortOrder,
      notes: routineBlocks.notes,
      sets: routineBlocks.sets,
    })
    .from(routineBlocks)
    .innerJoin(habits, eq(routineBlocks.habitId, habits.id))
    .where(eq(routineBlocks.routineId, routineId));

  return parseBlocks(rawBlocks);
}

export async function getRoutinesForUser(userId: number): Promise<Routine[]> {
  const userRoutines = await db
    .select()
    .from(routines)
    .where(eq(routines.userId, userId))
    .orderBy(desc(routines.updatedAt));

  return Promise.all(
    userRoutines.map(async (routine) => {
      const blocks = await fetchBlocksForRoutine(routine.id);
      return {
        id: routine.id,
        name: routine.name,
        blocks,
        createdAt: routine.createdAt.toISOString(),
        updatedAt: routine.updatedAt.toISOString(),
      };
    }),
  );
}

export async function getRoutineById(
  routineId: number,
  userId: number,
): Promise<Routine | null> {
  const routine = await db
    .select()
    .from(routines)
    .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
    .get();

  if (!routine) return null;

  const blocks = await fetchBlocksForRoutine(routine.id);
  return {
    id: routine.id,
    name: routine.name,
    blocks,
    createdAt: routine.createdAt.toISOString(),
    updatedAt: routine.updatedAt.toISOString(),
  };
}

export function getRoutineByNameForUser(userId: number, name: string) {
  return db
    .select()
    .from(routines)
    .where(
      and(
        eq(routines.userId, userId),
        sql`LOWER(${routines.name}) = LOWER(${name})`
      )
    )
    .get();
}

async function verifyHabitOwnership(userId: number, habitIds: number[]): Promise<boolean> {
  if (habitIds.length === 0) return true;
  const unique = [...new Set(habitIds)];
  const owned = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.userId, userId), inArray(habits.id, unique)));
  return owned.length === unique.length;
}

export async function createRoutineForUser(
  userId: number,
  data: {
    name: string;
    blocks: Array<{
      habitId: number;
      sortOrder: number;
      notes?: string | null;
      sets: RoutineSet[];
    }>;
  },
): Promise<Routine | null> {
  const habitsOwned = await verifyHabitOwnership(userId, data.blocks.map(b => b.habitId));
  if (!habitsOwned) return null;

  const [routine] = await db
    .insert(routines)
    .values({ userId, name: data.name })
    .returning();

  if (data.blocks.length > 0) {
    await db.insert(routineBlocks).values(
      data.blocks.map((block) => ({
        routineId: routine.id,
        habitId: block.habitId,
        sortOrder: block.sortOrder,
        notes: block.notes ?? null,
        sets: JSON.stringify(block.sets),
      })),
    );
  }

  const blocks = await fetchBlocksForRoutine(routine.id);
  return {
    id: routine.id,
    name: routine.name,
    blocks,
    createdAt: routine.createdAt.toISOString(),
    updatedAt: routine.updatedAt.toISOString(),
  };
}

export async function updateRoutineForUser(
  routineId: number,
  userId: number,
  data: {
    name: string;
    blocks: Array<{
      habitId: number;
      sortOrder: number;
      notes?: string | null;
      sets: RoutineSet[];
    }>;
  },
): Promise<Routine | null> {
  const existing = await db
    .select()
    .from(routines)
    .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
    .get();

  if (!existing) return null;

  const habitsOwned = await verifyHabitOwnership(userId, data.blocks.map(b => b.habitId));
  if (!habitsOwned) return null;

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(routines)
      .set({ name: data.name, updatedAt: now })
      .where(eq(routines.id, routineId));

    await tx
      .delete(routineBlocks)
      .where(eq(routineBlocks.routineId, routineId));

    if (data.blocks.length > 0) {
      await tx.insert(routineBlocks).values(
        data.blocks.map((block) => ({
          routineId,
          habitId: block.habitId,
          sortOrder: block.sortOrder,
          notes: block.notes ?? null,
          sets: JSON.stringify(block.sets),
        })),
      );
    }
  });

  const blocks = await fetchBlocksForRoutine(routineId);
  const updated = await db.select().from(routines).where(eq(routines.id, routineId)).get();
  return {
    id: updated!.id,
    name: updated!.name,
    blocks,
    createdAt: updated!.createdAt.toISOString(),
    updatedAt: updated!.updatedAt.toISOString(),
  };
}

export async function deleteRoutineForUser(
  routineId: number,
  userId: number,
): Promise<boolean> {
  const [deleted] = await db
    .delete(routines)
    .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
    .returning();

  return !!deleted;
}
