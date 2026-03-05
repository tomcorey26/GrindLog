# Sessions History Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Sessions" tab to the dashboard showing all completed sessions with filtering by skill and date range.

**Architecture:** Extend Dashboard's `activeView` with `'sessions'`. New `SessionsView` component fetches from `GET /api/sessions` with query params. Add `mode` column to `timeSessions` to track stopwatch vs countdown.

**Tech Stack:** Next.js API Routes, Drizzle ORM (Turso/SQLite), React client components, Playwright E2E

---

### Task 1: Add `mode` column to `timeSessions` schema

**Files:**
- Modify: `src/db/schema.ts:18-24`

**Step 1: Write the schema change**

In `src/db/schema.ts`, add `mode` column to `timeSessions`:

```typescript
export const timeSessions = sqliteTable('time_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  habitId: integer('habit_id').notNull().references(() => habits.id, { onDelete: 'cascade' }),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }).notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  timerMode: text('timer_mode').notNull().$default(() => 'stopwatch'),
});
```

**Step 2: Push schema to database**

Run: `npm run db:push`
Expected: Schema synced successfully (use `--force` flag if prompted to confirm)

**Step 3: Commit**

```
feat: add timerMode column to timeSessions schema
```

---

### Task 2: Save timer mode when stopping timer

**Files:**
- Modify: `src/app/api/timer/stop/route.ts:17-23`

**Step 1: Write failing E2E test**

Create `e2e/sessions-history.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { signUp, addHabit } from './helpers';

test.describe('Sessions History', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page);
    await addHabit(page, 'Guitar');
  });

  test('completed session appears in Sessions tab', async ({ page }) => {
    // Start and stop a stopwatch session
    await page.getByRole('button', { name: /start/i }).click();
    await page.getByText('Stopwatch').click();
    await expect(page.getByText('Recording...')).toBeVisible();
    await page.getByRole('button', { name: /stop/i }).click();

    // Navigate to Sessions tab
    await page.getByRole('button', { name: /sessions/i }).click();

    // Should show the completed session
    await expect(page.getByText('Guitar')).toBeVisible();
    await expect(page.getByText('Stopwatch')).toBeVisible();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/sessions-history.spec.ts --headed`
Expected: FAIL — no "Sessions" button exists yet

**Step 3: Update timer stop route to save mode**

In `src/app/api/timer/stop/route.ts`, update the insert to include `timerMode`:

```typescript
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const timer = await db.select().from(activeTimers).where(eq(activeTimers.userId, userId)).get();
  if (!timer) return NextResponse.json({ error: 'No active timer' }, { status: 404 });

  const now = new Date();
  const durationSeconds = Math.round((now.getTime() - timer.startTime.getTime()) / 1000);
  const timerMode = timer.targetDurationSeconds !== null ? 'countdown' : 'stopwatch';

  await db.transaction(async (tx) => {
    await tx.insert(timeSessions).values({
      habitId: timer.habitId,
      startTime: timer.startTime,
      endTime: now,
      durationSeconds,
      timerMode,
    });
    await tx.delete(activeTimers).where(eq(activeTimers.userId, userId));
  });

  return NextResponse.json({ durationSeconds, habitId: timer.habitId });
}
```

**Step 4: Commit**

```
feat: save timer mode (stopwatch/countdown) when stopping timer
```

---

### Task 3: Create `GET /api/sessions` route

**Files:**
- Create: `src/app/api/sessions/route.ts`

**Step 1: Create the sessions API route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timeSessions, habits } from '@/db/schema';
import { getSessionUserId } from '@/lib/auth';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const habitId = searchParams.get('habitId');
  const range = searchParams.get('range') || 'all';

  // Build date filter
  let dateFilter: Date | null = null;
  const now = new Date();
  if (range === 'today') {
    dateFilter = new Date(now);
    dateFilter.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    dateFilter = new Date(now);
    dateFilter.setDate(dateFilter.getDate() - 7);
    dateFilter.setHours(0, 0, 0, 0);
  } else if (range === 'month') {
    dateFilter = new Date(now);
    dateFilter.setMonth(dateFilter.getMonth() - 1);
    dateFilter.setHours(0, 0, 0, 0);
  }

  const conditions = [eq(habits.userId, userId)];
  if (habitId) conditions.push(eq(timeSessions.habitId, Number(habitId)));
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

  const totalSeconds = rows.reduce((sum, r) => sum + r.durationSeconds, 0);

  return NextResponse.json({
    sessions: rows.map(r => ({
      ...r,
      startTime: r.startTime.toISOString(),
      endTime: r.endTime.toISOString(),
    })),
    totalSeconds,
  });
}
```

**Step 2: Verify route works**

Start dev server if not running. Test with browser or curl after completing a session.

**Step 3: Commit**

```
feat: add GET /api/sessions route with filtering
```

---

### Task 4: Add `Session` type to types.ts

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add the type**

```typescript
export type Session = {
  id: number;
  habitName: string;
  habitId: number;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  timerMode: string;
};
```

**Step 2: Commit**

```
feat: add Session type
```

---

### Task 5: Create `SessionsView` component

**Files:**
- Create: `src/components/SessionsView.tsx`

**Step 1: Create the component**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/format';
import type { Session } from '@/lib/types';

type DateRange = 'today' | 'week' | 'month' | 'all';

export function SessionsView({ habits }: { habits: { id: number; name: string }[] }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedHabitId, setSelectedHabitId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedHabitId) params.set('habitId', selectedHabitId);
    if (dateRange !== 'all') params.set('range', dateRange);

    const res = await fetch(`/api/sessions?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions);
      setTotalSeconds(data.totalSeconds);
    }
    setLoading(false);
  }, [selectedHabitId, dateRange]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const dateRanges: { value: DateRange; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ];

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  function formatTimeOfDay(iso: string) {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric', minute: '2-digit',
    });
  }

  function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-2">
        <select
          value={selectedHabitId}
          onChange={(e) => setSelectedHabitId(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Skills</option>
          {habits.map(h => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>

        <div className="flex gap-1">
          {dateRanges.map(r => (
            <Button
              key={r.value}
              variant={dateRange === r.value ? 'default' : 'outline'}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setDateRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="text-center py-2">
        <p className="text-sm text-muted-foreground">Total Time</p>
        <p className="text-2xl font-bold">{formatTime(totalSeconds)}</p>
      </div>

      {/* Sessions list */}
      {loading ? (
        <p className="text-center text-muted-foreground">Loading...</p>
      ) : sessions.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No sessions yet</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => (
            <Card key={session.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{session.habitName}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                    {session.timerMode}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{formatDate(session.endTime)}</span>
                  <span className="font-mono">{formatDuration(session.durationSeconds)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatTimeOfDay(session.startTime)} — {formatTimeOfDay(session.endTime)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```
feat: add SessionsView component with filtering
```

---

### Task 6: Add tab bar and wire SessionsView into Dashboard

**Files:**
- Modify: `src/components/Dashboard.tsx`

**Step 1: Update Dashboard**

Key changes:
1. Extend `activeView` type to include `'sessions'`
2. Add tab bar below header
3. Import and render `SessionsView` when `activeView === 'sessions'`
4. Pass habits list (id + name) to SessionsView

In `Dashboard.tsx`:

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { HabitCard } from '@/components/HabitCard';
import { AddHabitForm } from '@/components/AddHabitForm';
import { TimerView } from '@/components/TimerView';
import { StartTimerModal } from '@/components/StartTimerModal';
import { SessionsView } from '@/components/SessionsView';
import type { Habit } from '@/lib/types';

export function Dashboard({ user, onLogout }: { user: { id: number; email: string }; onLogout: () => void }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'timer' | 'sessions'>('list');
  const [pendingHabitId, setPendingHabitId] = useState<number | null>(null);

  // ... all existing handlers unchanged ...

  // Start timer modal
  const pendingHabit = habits.find(h => h.id === pendingHabitId);
  if (pendingHabitId && pendingHabit) {
    return (
      <StartTimerModal
        habitName={pendingHabit.name}
        onStart={handleStartConfirm}
        onCancel={() => setPendingHabitId(null)}
      />
    );
  }

  // Timer view
  if (activeView === 'timer' && activeHabit) {
    return (
      <TimerView ... />
    );
  }

  // Dashboard with tabs
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6 pb-[env(safe-area-inset-bottom)]">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">10,000 Hours</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>Log out</Button>
        </header>

        {/* Tab bar */}
        <div className="flex mb-4 rounded-lg bg-muted p-1">
          <button
            onClick={() => setActiveView('list')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeView === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Skills
          </button>
          <button
            onClick={() => setActiveView('sessions')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeView === 'sessions' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Sessions
          </button>
        </div>

        {activeView === 'sessions' ? (
          <SessionsView habits={habits.map(h => ({ id: h.id, name: h.name }))} />
        ) : (
          <>
            {loading ? (
              <p className="text-center text-muted-foreground">Loading...</p>
            ) : habits.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Start by adding your first habit</p>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {activeHabit && (
                  <div onClick={() => setActiveView('timer')} className="cursor-pointer">
                    <HabitCard key={activeHabit.id} habit={activeHabit} onStart={handleStartClick} onDelete={handleDelete} />
                  </div>
                )}
                {habits.filter(h => !h.activeTimer).map((habit) => (
                  <HabitCard key={habit.id} habit={habit} onStart={handleStartClick} onDelete={handleDelete} />
                ))}
              </div>
            )}
            <AddHabitForm onAdd={handleAdd} />
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Run the E2E test from Task 2**

Run: `npx playwright test e2e/sessions-history.spec.ts`
Expected: PASS

**Step 3: Commit**

```
feat: add Sessions tab to dashboard with tab bar navigation
```

---

### Task 7: Add remaining E2E tests

**Files:**
- Modify: `e2e/sessions-history.spec.ts`

**Step 1: Add filter tests**

```typescript
test('can filter sessions by skill', async ({ page }) => {
  // Add second habit and create sessions for both
  await addHabit(page, 'Reading');

  // Start/stop Guitar session
  await page.getByRole('button', { name: /start/i }).first().click();
  await page.getByText('Stopwatch').click();
  await page.getByRole('button', { name: /stop/i }).click();

  // Navigate to Sessions tab
  await page.getByRole('button', { name: /sessions/i }).click();

  // Filter by Guitar
  await page.locator('select').selectOption({ label: 'Guitar' });
  await expect(page.getByText('Guitar')).toBeVisible();
});

test('sessions tab shows "No sessions yet" when empty', async ({ page }) => {
  await page.getByRole('button', { name: /sessions/i }).click();
  await expect(page.getByText('No sessions yet')).toBeVisible();
});

test('countdown session shows countdown mode badge', async ({ page }) => {
  // Start a countdown session
  await page.getByRole('button', { name: /start/i }).click();
  await page.getByText('Countdown').click();
  await page.getByText('15m').click();
  await page.getByRole('button', { name: /start/i }).click();

  // Stop it
  await page.getByRole('button', { name: /stop/i }).click();

  // Go to Sessions tab
  await page.getByRole('button', { name: /sessions/i }).click();

  await expect(page.getByText('countdown')).toBeVisible();
});
```

**Step 2: Run all E2E tests**

Run: `npx playwright test`
Expected: All tests PASS (existing + new)

**Step 3: Commit**

```
test: add E2E tests for sessions history filtering and mode display
```
