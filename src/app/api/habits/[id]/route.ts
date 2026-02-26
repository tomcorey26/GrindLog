import { NextResponse } from 'next/server';
import { db } from '@/db';
import { habits } from '@/db/schema';
import { getSessionUserId } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const habitId = parseInt(id, 10);
  if (isNaN(habitId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const deleted = await db
    .delete(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
