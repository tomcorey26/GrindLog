import { NextResponse } from 'next/server';
import { db } from '@/db';
import { timeSessions, habits } from '@/db/schema';
import { getSessionUserId } from '@/lib/auth';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select({
      habitName: habits.name,
      totalSeconds: sql<number>`sum(${timeSessions.durationSeconds})`.as('total_seconds'),
    })
    .from(timeSessions)
    .innerJoin(habits, eq(timeSessions.habitId, habits.id))
    .where(eq(habits.userId, userId))
    .groupBy(habits.id, habits.name)
    .orderBy(desc(sql`total_seconds`));

  const rankings = rows.map((row, i) => ({
    rank: i + 1,
    habitName: row.habitName,
    totalSeconds: row.totalSeconds,
  }));

  return NextResponse.json({ rankings });
}
