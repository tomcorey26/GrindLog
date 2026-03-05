# Rankings Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Rankings" tab that shows skills ranked by total time practiced, with server-side aggregation.

**Architecture:** New `GET /api/rankings` endpoint aggregates `time_sessions` by `habit_id` using SQL `SUM`/`GROUP BY`. New `RankingsView` component displays ranked list. Dashboard tab bar expanded from 2 to 3 tabs.

**Tech Stack:** Next.js API route, Drizzle ORM (sql import for aggregation), React client component, Tailwind CSS, Playwright E2E tests.

---

### Task 1: API Route — `GET /api/rankings`

**Files:**
- Create: `src/app/api/rankings/route.ts`
- Test: `e2e/rankings.spec.ts`

**Step 1: Write the failing E2E test**

Create `e2e/rankings.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { signUp, addHabit } from './helpers';

test.describe('Rankings', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page);
  });

  test('rankings tab shows "No rankings yet" when no sessions exist', async ({ page }) => {
    await page.getByRole('button', { name: /rankings/i }).click();
    await expect(page.getByText('No rankings yet')).toBeVisible();
  });

  test('rankings tab shows skills ranked by total time', async ({ page }) => {
    // Add two habits
    await addHabit(page, 'Guitar');
    await addHabit(page, 'Reading');

    // Complete a Guitar session
    await page.locator('button', { hasText: /start/i }).first().click();
    await page.getByText('Stopwatch').click();
    await page.getByRole('button', { name: /stop/i }).click();

    // Go to Rankings tab
    await page.getByRole('button', { name: /rankings/i }).click();

    // Guitar should appear ranked #1
    await expect(page.getByText('Guitar')).toBeVisible();
    await expect(page.getByText('#1')).toBeVisible();

    // Reading should NOT appear (no sessions)
    await expect(page.getByText('Reading')).not.toBeVisible();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/rankings.spec.ts`
Expected: FAIL — no Rankings button exists yet

**Step 3: Create the API route**

Create `src/app/api/rankings/route.ts`:

```ts
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
```

**Step 4: Commit**

```bash
git add src/app/api/rankings/route.ts e2e/rankings.spec.ts
git commit -m "feat: add GET /api/rankings route and E2E test shell"
```

---

### Task 2: `RankingsView` Component

**Files:**
- Create: `src/components/RankingsView.tsx`

**Step 1: Create the component**

Create `src/components/RankingsView.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatTime } from '@/lib/format';

type Ranking = {
  rank: number;
  habitName: string;
  totalSeconds: number;
};

const RANK_COLORS: Record<number, string> = {
  1: 'text-yellow-500',
  2: 'text-gray-400',
  3: 'text-amber-600',
};

export function RankingsView() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRankings() {
      const res = await fetch('/api/rankings');
      if (res.ok) {
        const data = await res.json();
        setRankings(data.rankings);
      }
      setLoading(false);
    }
    fetchRankings();
  }, []);

  if (loading) {
    return <p className="text-center text-muted-foreground">Loading...</p>;
  }

  if (rankings.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No rankings yet</p>;
  }

  return (
    <div className="space-y-2">
      {rankings.map((r) => (
        <Card key={r.habitName}>
          <CardContent className="p-3 flex items-center gap-3">
            <span className={`text-lg font-bold w-8 ${RANK_COLORS[r.rank] || 'text-muted-foreground'}`}>
              #{r.rank}
            </span>
            <span className="font-medium flex-1">{r.habitName}</span>
            <span className="font-mono text-sm text-muted-foreground">{formatTime(r.totalSeconds)}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/RankingsView.tsx
git commit -m "feat: add RankingsView component"
```

---

### Task 3: Add Rankings Tab to Dashboard

**Files:**
- Modify: `src/components/Dashboard.tsx`

**Step 1: Wire up the tab**

In `src/components/Dashboard.tsx`:

1. Add import: `import { RankingsView } from '@/components/RankingsView';`
2. Change `activeView` type from `'list' | 'timer' | 'sessions'` to `'list' | 'timer' | 'sessions' | 'rankings'`
3. Add third tab button after "Sessions" button:
```tsx
<button
  onClick={() => setActiveView('rankings')}
  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
    activeView === 'rankings' ? 'bg-background shadow-sm' : 'text-muted-foreground'
  }`}
>
  Rankings
</button>
```
4. Add rendering branch — change the ternary at line 134 to handle rankings:
```tsx
{activeView === 'rankings' ? (
  <RankingsView />
) : activeView === 'sessions' ? (
  <SessionsView habits={habits.map(h => ({ id: h.id, name: h.name }))} />
) : (
  // ... existing skills list
)}
```

**Step 2: Run E2E tests**

Run: `npx playwright test e2e/rankings.spec.ts`
Expected: PASS

**Step 3: Run full test suite**

Run: `npx playwright test`
Expected: All tests PASS (existing sessions tests unaffected)

**Step 4: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: add Rankings tab to dashboard"
```
