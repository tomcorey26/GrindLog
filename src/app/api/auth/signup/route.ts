import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { eq } from 'drizzle-orm';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email or password (min 8 chars)' }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const result = await db.insert(users).values({ email, passwordHash }).returning();
  const user = result[0];

  await setSessionCookie(user.id);
  return NextResponse.json({ id: user.id, email: user.email });
}
