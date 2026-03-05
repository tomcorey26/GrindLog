import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { timeSessions, habits } from '@/db/schema';
import { getSessionUserId } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { getSessionsForUser } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const habitId = searchParams.get('habitId');
  const range = searchParams.get('range') || 'all';

  const result = await getSessionsForUser(userId, {
    habitId: habitId ?? undefined,
    range,
  });

  return NextResponse.json(result);
}

const logSessionSchema = z.object({
  habitId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.number().positive().max(1440),
});

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = logSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { habitId, date, durationMinutes } = parsed.data;

  // Verify habit belongs to user
  const habit = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .get();
  if (!habit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 });

  // Validate date is within last 7 days
  const sessionDate = new Date(date + 'T12:00:00');
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  if (sessionDate < sevenDaysAgo || sessionDate >= tomorrow) {
    return NextResponse.json({ error: 'Date must be within the last 7 days' }, { status: 400 });
  }

  const durationSeconds = Math.round(durationMinutes * 60);
  const startTime = new Date(date + 'T00:00:00');
  const endTime = new Date(startTime.getTime() + durationSeconds * 1000);

  const result = await db.insert(timeSessions).values({
    habitId,
    startTime,
    endTime,
    durationSeconds,
    timerMode: 'manual',
  }).returning();

  return NextResponse.json({ session: result[0] }, { status: 201 });
}
