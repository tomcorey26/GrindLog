import { NextResponse } from 'next/server';
import { db } from '@/db';
import { timeSessions, habits } from '@/db/schema';
import { getSessionUserId } from '@/lib/auth';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const totalSecondsExpr = sql<number>`sum(${timeSessions.durationSeconds})`;

  const rows = await db
    .select({
      habitId: habits.id,
      habitName: habits.name,
      totalSeconds: totalSecondsExpr.as('total_seconds'),
    })
    .from(timeSessions)
    .innerJoin(habits, eq(timeSessions.habitId, habits.id))
    .where(eq(habits.userId, userId))
    .groupBy(habits.id, habits.name)
    .orderBy(desc(totalSecondsExpr));

  const rankings = rows.map((row, i) => ({
    rank: i + 1,
    habitId: row.habitId,
    habitName: row.habitName,
    totalSeconds: row.totalSeconds,
  }));

  return NextResponse.json({ rankings });
}
