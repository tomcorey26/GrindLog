# Countdown Timer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add countdown timer mode alongside existing stopwatch, with E2E tests first.

**Architecture:** Nullable `targetDurationSeconds` column on `activeTimers` table. `null` = stopwatch, non-null = countdown. Client computes remaining = target - elapsed. Auto-stops at zero with alert. Same session logging for both modes.

**Tech Stack:** Next.js 16, Drizzle ORM + Turso/libSQL, React 19, Playwright for E2E tests.

---

### Task 1: Install and configure Playwright

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/helpers.ts`
- Modify: `package.json` (new scripts)

**Step 1: Install Playwright**

Run: `npm init playwright@latest -- --yes --quiet --browser=chromium`

**Step 2: Create playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
```

**Step 3: Create e2e/helpers.ts with auth helper**

```typescript
import { Page } from '@playwright/test';

export const TEST_EMAIL = `test-${Date.now()}@example.com`;
export const TEST_PASSWORD = 'testpassword123';

export async function signUp(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await page.goto('/');
  await page.getByText('Sign up').click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign up/i }).click();
  await page.waitForSelector('text=10,000 Hours');
}

export async function addHabit(page: Page, name: string) {
  await page.getByPlaceholder(/add a habit/i).fill(name);
  await page.getByRole('button', { name: /add/i }).click();
  await page.waitForSelector(`text=${name}`);
}
```

**Step 4: Add test script to package.json**

Add `"test:e2e": "playwright test"` to scripts.

**Step 5: Commit**

```
feat: add Playwright E2E test setup
```

---

### Task 2: Write failing E2E tests for countdown timer

**Files:**
- Create: `e2e/countdown-timer.spec.ts`

**Step 1: Write E2E tests**

```typescript
import { test, expect } from '@playwright/test';
import { signUp, addHabit } from './helpers';

test.describe('Countdown Timer', () => {
  test.beforeEach(async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    await signUp(page, email);
    await addHabit(page, 'Piano');
  });

  test('shows mode selection after clicking Start', async ({ page }) => {
    await page.getByRole('button', { name: /start/i }).click();
    await expect(page.getByText('Stopwatch')).toBeVisible();
    await expect(page.getByText('Countdown')).toBeVisible();
  });

  test('stopwatch mode starts immediately (existing behavior)', async ({ page }) => {
    await page.getByRole('button', { name: /start/i }).click();
    await page.getByText('Stopwatch').click();
    await expect(page.getByText('Recording...')).toBeVisible();
    await expect(page.getByText(/\d{2}:\d{2}:\d{2}/)).toBeVisible();
  });

  test('countdown mode shows duration presets', async ({ page }) => {
    await page.getByRole('button', { name: /start/i }).click();
    await page.getByText('Countdown').click();
    await expect(page.getByText('15m')).toBeVisible();
    await expect(page.getByText('25m')).toBeVisible();
    await expect(page.getByText('30m')).toBeVisible();
    await expect(page.getByText('45m')).toBeVisible();
    await expect(page.getByText('60m')).toBeVisible();
  });

  test('countdown starts with preset duration', async ({ page }) => {
    await page.getByRole('button', { name: /start/i }).click();
    await page.getByText('Countdown').click();
    await page.getByText('25m').click();
    await page.getByRole('button', { name: /start/i }).click();
    // Should show countdown time (24:59 or 25:00)
    await expect(page.getByText(/2[45]:\d{2}/)).toBeVisible();
  });

  test('countdown starts with custom duration', async ({ page }) => {
    await page.getByRole('button', { name: /start/i }).click();
    await page.getByText('Countdown').click();
    await page.getByPlaceholder(/minutes/i).fill('10');
    await page.getByRole('button', { name: /start/i }).click();
    // Should show ~10:00 or 09:59
    await expect(page.getByText(/(?:10:00|09:5\d)/)).toBeVisible();
  });

  test('countdown shows remaining time on habit card', async ({ page }) => {
    await page.getByRole('button', { name: /start/i }).click();
    await page.getByText('Countdown').click();
    await page.getByText('25m').click();
    await page.getByRole('button', { name: /start/i }).click();
    // Go back to dashboard
    await page.getByText('Back').click();
    // Habit card should show remaining time
    await expect(page.getByText(/2[45]:\d{2}/)).toBeVisible();
  });

  test('can cancel mode selection and go back', async ({ page }) => {
    await page.getByRole('button', { name: /start/i }).click();
    // Should see mode selection
    await expect(page.getByText('Stopwatch')).toBeVisible();
    await page.getByText('Cancel').click();
    // Should be back on dashboard
    await expect(page.getByRole('button', { name: /start/i })).toBeVisible();
  });
});
```

**Step 2: Run tests to confirm they fail**

Run: `npx playwright test`
Expected: All tests fail (mode selection UI doesn't exist yet).

**Step 3: Commit**

```
test: add failing E2E tests for countdown timer feature
```

---

### Task 3: Add `targetDurationSeconds` column to schema

**Files:**
- Modify: `src/db/schema.ts:26-31` (activeTimers table)

**Step 1: Add column to activeTimers**

In `src/db/schema.ts`, add `targetDurationSeconds` to the `activeTimers` table:

```typescript
export const activeTimers = sqliteTable('active_timers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  habitId: integer('habit_id').notNull().references(() => habits.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  targetDurationSeconds: integer('target_duration_seconds'),
});
```

**Step 2: Push schema change**

Run: `npx drizzle-kit push`

**Step 3: Commit**

```
feat: add targetDurationSeconds column to activeTimers
```

---

### Task 4: Update types and format utilities

**Files:**
- Modify: `src/lib/types.ts:1-7`
- Modify: `src/lib/format.ts`

**Step 1: Update Habit type**

```typescript
export type Habit = {
  id: number;
  name: string;
  todaySeconds: number;
  streak: number;
  activeTimer: { startTime: string; targetDurationSeconds: number | null } | null;
};
```

**Step 2: Add formatRemaining to format.ts**

```typescript
export function formatRemaining(startTimeIso: string, targetDurationSeconds: number): string {
  const elapsed = Math.floor((Date.now() - new Date(startTimeIso).getTime()) / 1000);
  const remaining = Math.max(0, targetDurationSeconds - elapsed);
  const h = Math.floor(remaining / 3600).toString().padStart(2, '0');
  const m = Math.floor((remaining % 3600) / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function isCountdownComplete(startTimeIso: string, targetDurationSeconds: number): boolean {
  const elapsed = Math.floor((Date.now() - new Date(startTimeIso).getTime()) / 1000);
  return elapsed >= targetDurationSeconds;
}
```

**Step 3: Commit**

```
feat: update types and add countdown format utilities
```

---

### Task 5: Update API — timer start and habits GET

**Files:**
- Modify: `src/app/api/timer/start/route.ts:8-10,49-50`
- Modify: `src/app/api/habits/route.ts:37-41`

**Step 1: Update start schema and insert**

In `src/app/api/timer/start/route.ts`:

Update Zod schema:
```typescript
const startSchema = z.object({
  habitId: z.number().int().positive(),
  targetDurationSeconds: z.number().int().positive().optional(),
});
```

Update insert to include targetDurationSeconds:
```typescript
const { habitId, targetDurationSeconds } = parsed.data;
// ... (keep existing validation) ...
// In the transaction, update the insert:
await tx.insert(activeTimers).values({
  habitId,
  userId,
  startTime: now,
  targetDurationSeconds: targetDurationSeconds ?? null,
});
```

Update response:
```typescript
return NextResponse.json({
  startTime: new Date().toISOString(),
  habitId,
  targetDurationSeconds: targetDurationSeconds ?? null,
});
```

**Step 2: Update GET /api/habits to return targetDurationSeconds**

In `src/app/api/habits/route.ts`, update the activeTimer mapping (~line 40):

```typescript
activeTimer: timer
  ? { startTime: timer.startTime.toISOString(), targetDurationSeconds: timer.targetDurationSeconds ?? null }
  : null,
```

**Step 3: Commit**

```
feat: update timer start API and habits GET for countdown support
```

---

### Task 6: Create StartTimerModal component (mode selection + duration picker)

**Files:**
- Create: `src/components/StartTimerModal.tsx`

**Step 1: Create the component**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  habitName: string;
  onStart: (targetDurationSeconds?: number) => void;
  onCancel: () => void;
};

const PRESETS = [
  { label: '15m', seconds: 15 * 60 },
  { label: '25m', seconds: 25 * 60 },
  { label: '30m', seconds: 30 * 60 },
  { label: '45m', seconds: 45 * 60 },
  { label: '60m', seconds: 60 * 60 },
];

export function StartTimerModal({ habitName, onStart, onCancel }: Props) {
  const [mode, setMode] = useState<'select' | 'countdown'>('select');
  const [selectedSeconds, setSelectedSeconds] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState('');

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <h2 className="text-xl font-semibold mb-2">{habitName}</h2>
        <p className="text-muted-foreground mb-8">Choose timer mode</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button size="lg" onClick={() => onStart()} className="py-6 text-lg">
            Stopwatch
          </Button>
          <Button size="lg" variant="outline" onClick={() => setMode('countdown')} className="py-6 text-lg">
            Countdown
          </Button>
          <button onClick={onCancel} className="text-muted-foreground text-sm mt-4">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const effectiveSeconds = customMinutes
    ? parseInt(customMinutes, 10) * 60
    : selectedSeconds;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <h2 className="text-xl font-semibold mb-2">{habitName}</h2>
      <p className="text-muted-foreground mb-6">Set countdown duration</p>

      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => { setSelectedSeconds(p.seconds); setCustomMinutes(''); }}
            className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
              selectedSeconds === p.seconds && !customMinutes
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:border-primary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mb-8 w-full max-w-xs">
        <input
          type="number"
          placeholder="Custom minutes"
          value={customMinutes}
          onChange={(e) => { setCustomMinutes(e.target.value); setSelectedSeconds(null); }}
          min={1}
          max={480}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-center"
        />
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          size="lg"
          disabled={!effectiveSeconds || effectiveSeconds <= 0}
          onClick={() => effectiveSeconds && onStart(effectiveSeconds)}
          className="py-6 text-lg"
        >
          Start
        </Button>
        <button onClick={() => setMode('select')} className="text-muted-foreground text-sm">
          Back
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```
feat: add StartTimerModal with mode selection and duration picker
```

---

### Task 7: Update Dashboard to use StartTimerModal

**Files:**
- Modify: `src/components/Dashboard.tsx`

**Step 1: Add state and wire up modal**

Add new state for the mode selection flow:
```typescript
const [pendingHabitId, setPendingHabitId] = useState<number | null>(null);
```

Replace `handleStart` to show modal first:
```typescript
function handleStartClick(habitId: number) {
  setPendingHabitId(habitId);
}

async function handleStartConfirm(targetDurationSeconds?: number) {
  if (!pendingHabitId) return;
  const res = await fetch('/api/timer/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ habitId: pendingHabitId, targetDurationSeconds }),
  });
  if (!res.ok) return;
  setPendingHabitId(null);
  await fetchHabits();
  setActiveView('timer');
}
```

Add modal view before the timer/list views:
```typescript
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
```

Pass `targetDurationSeconds` to TimerView:
```typescript
<TimerView
  habitName={activeHabit.name}
  startTime={activeHabit.activeTimer!.startTime}
  targetDurationSeconds={activeHabit.activeTimer!.targetDurationSeconds}
  todaySeconds={activeHabit.todaySeconds}
  streak={activeHabit.streak}
  onStop={handleStop}
  onBack={() => setActiveView('list')}
/>
```

Update HabitCard `onStart` prop to use `handleStartClick`.

**Step 2: Commit**

```
feat: wire StartTimerModal into Dashboard flow
```

---

### Task 8: Update TimerView for countdown mode

**Files:**
- Modify: `src/components/TimerView.tsx`

**Step 1: Update Props and add countdown logic**

```typescript
type Props = {
  habitName: string;
  startTime: string;
  targetDurationSeconds: number | null;
  todaySeconds: number;
  streak: number;
  onStop: () => void;
  onBack: () => void;
};

export function TimerView({ habitName, startTime, targetDurationSeconds, todaySeconds, streak, onStop, onBack }: Props) {
  const isCountdown = targetDurationSeconds !== null;
  const [display, setDisplay] = useState(
    isCountdown ? formatRemaining(startTime, targetDurationSeconds) : formatElapsed(startTime)
  );
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isCountdown) {
        setDisplay(formatRemaining(startTime, targetDurationSeconds));
        if (isCountdownComplete(startTime, targetDurationSeconds) && !finished) {
          setFinished(true);
          // Play alert sound
          try { new Audio('/alarm.mp3').play().catch(() => {}); } catch {}
          // Auto-stop after brief delay so user sees "Time's up!"
          setTimeout(() => onStop(), 2000);
        }
      } else {
        setDisplay(formatElapsed(startTime));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, targetDurationSeconds, isCountdown, finished, onStop]);
```

Update the JSX display area:
```typescript
<p className="text-6xl font-mono font-light tracking-tight mb-3">{display}</p>
<div className="flex items-center gap-2 mb-12">
  {finished ? (
    <span className="text-lg font-semibold text-primary">Time&apos;s up!</span>
  ) : isCountdown ? (
    <>
      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      <span className="text-sm text-muted-foreground">Counting down...</span>
    </>
  ) : (
    <>
      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      <span className="text-sm text-muted-foreground">Recording...</span>
    </>
  )}
</div>
```

Add import of `formatRemaining` and `isCountdownComplete` from `@/lib/format`.

**Step 2: Add a simple alarm sound file**

Place a small alarm.mp3 in `/public/alarm.mp3`. Can use a short beep sound. If no audio file available, the `try/catch` ensures it degrades gracefully.

**Step 3: Commit**

```
feat: update TimerView for countdown mode with auto-stop
```

---

### Task 9: Update HabitCard for countdown display

**Files:**
- Modify: `src/components/HabitCard.tsx`

**Step 1: Show remaining time for countdown timers**

Import `formatRemaining` from `@/lib/format`.

Update the elapsed display logic:
```typescript
useEffect(() => {
  if (!activeStartTime) return;
  const targetDuration = habit.activeTimer?.targetDurationSeconds ?? null;
  const update = () => {
    setElapsed(
      targetDuration !== null
        ? formatRemaining(activeStartTime, targetDuration)
        : formatElapsed(activeStartTime)
    );
  };
  update();
  const interval = setInterval(update, 1000);
  return () => clearInterval(interval);
}, [activeStartTime, habit.activeTimer?.targetDurationSeconds]);
```

**Step 2: Commit**

```
feat: show countdown remaining time on habit card
```

---

### Task 10: Run E2E tests and iterate

**Step 1: Run the full E2E suite**

Run: `npx playwright test`

**Step 2: Fix any failures**

Iterate on the implementation until all E2E tests pass. Common things to adjust:
- Selector text not matching exactly (check button labels, placeholder text)
- Timing issues (add `waitForSelector` or `waitForTimeout` if needed)
- Auth flow differences (adjust helpers.ts selectors)

**Step 3: Run tests one more time to confirm green**

Run: `npx playwright test`
Expected: All tests PASS.

**Step 4: Commit**

```
test: all countdown timer E2E tests passing
```
