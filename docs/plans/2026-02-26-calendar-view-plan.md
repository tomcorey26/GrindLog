# Calendar View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a toggleable month calendar view to the Sessions tab that shows practice days with colored dots and a day-detail panel.

**Architecture:** New `CalendarView` component renders a CSS grid month calendar. `SessionsView` gets a list/calendar toggle. Sessions are grouped client-side by date. Each habit gets a color from the existing chart palette. No backend changes.

**Tech Stack:** React 19, Tailwind CSS 4, lucide-react icons, Playwright E2E tests

---

### Task 1: Add habit color utility

**Files:**
- Create: `src/lib/habit-colors.ts`
- Create: `src/lib/__tests__/habit-colors.test.ts`

**Step 1: Write the test**

Create `src/lib/__tests__/habit-colors.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getHabitColor, HABIT_COLORS } from '../habit-colors';

describe('getHabitColor', () => {
  it('returns first color for index 0', () => {
    expect(getHabitColor(0)).toBe(HABIT_COLORS[0]);
  });

  it('wraps around when index exceeds palette length', () => {
    expect(getHabitColor(HABIT_COLORS.length)).toBe(HABIT_COLORS[0]);
  });

  it('returns different colors for different indices', () => {
    expect(getHabitColor(0)).not.toBe(getHabitColor(1));
  });
});
```

**Step 2: Check if vitest is configured. If not, skip unit tests and rely on E2E tests instead.** Run: `npx vitest --version 2>&1 || echo "no vitest"`. If no vitest, delete the test file and move to Step 3.

**Step 3: Write the implementation**

Create `src/lib/habit-colors.ts`:

```typescript
// Warm palette that complements the earthy theme.
// Uses CSS custom property values from globals.css chart colors.
export const HABIT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export function getHabitColor(index: number): string {
  return HABIT_COLORS[index % HABIT_COLORS.length];
}
```

**Step 4: Commit**

```bash
git add src/lib/habit-colors.ts
git commit -m "feat: add habit color utility for calendar view"
```

---

### Task 2: Add calendar date utilities

**Files:**
- Create: `src/lib/calendar.ts`

**Step 1: Write the implementation**

Create `src/lib/calendar.ts`:

```typescript
/** Get all days to display in a month grid (includes padding days from prev/next month). */
export function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday = 0, Sunday = 6 (ISO weekday)
  const startPad = (firstDay.getDay() + 6) % 7; // days before first of month (Mon-start)
  const endPad = (7 - ((startPad + lastDay.getDate()) % 7)) % 7;

  const days: Date[] = [];

  // Previous month padding
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Next month padding
  for (let i = 1; i <= endPad; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

/** Format Date to YYYY-MM-DD key string (local timezone). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Format Date for display: "Thursday, Feb 26" */
export function formatDayHeader(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/** Parse ISO string to local YYYY-MM-DD key. */
export function isoToDateKey(iso: string): string {
  return toDateKey(new Date(iso));
}
```

**Step 2: Commit**

```bash
git add src/lib/calendar.ts
git commit -m "feat: add calendar date utility functions"
```

---

### Task 3: Build CalendarView component

**Files:**
- Create: `src/components/CalendarView.tsx`

**Step 1: Write the component**

Create `src/components/CalendarView.tsx`:

```tsx
'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMonthGrid, toDateKey, formatDayHeader, isoToDateKey } from '@/lib/calendar';
import { getHabitColor } from '@/lib/habit-colors';
import type { Session } from '@/lib/types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Props = {
  sessions: Session[];
  habits: { id: number; name: string }[];
};

export function CalendarView({ sessions, habits }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Build a map: habitId -> index (for color assignment)
  const habitIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    habits.forEach((h, i) => map.set(h.id, i));
    return map;
  }, [habits]);

  // Group sessions by date key
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const key = isoToDateKey(s.endTime);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [sessions]);

  // Get unique habit IDs for a given date (for rendering dots)
  function getHabitIdsForDate(dateKey: string): number[] {
    const daySessions = sessionsByDate.get(dateKey) || [];
    return [...new Set(daySessions.map(s => s.habitId))];
  }

  const days = getMonthGrid(currentMonth.year, currentMonth.month);
  const todayKey = toDateKey(new Date());
  const monthLabel = new Date(currentMonth.year, currentMonth.month).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  function prevMonth() {
    setCurrentMonth(prev => {
      const d = new Date(prev.year, prev.month - 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    setSelectedDate(null);
  }

  function nextMonth() {
    setCurrentMonth(prev => {
      const d = new Date(prev.year, prev.month + 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    setSelectedDate(null);
  }

  const selectedSessions = selectedDate ? (sessionsByDate.get(selectedDate) || []) : [];
  const selectedTotalSeconds = selectedSessions.reduce((sum, s) => sum + s.durationSeconds, 0);

  function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function formatTimeOfDay(iso: string) {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={prevMonth} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <Button variant="ghost" size="sm" onClick={nextMonth} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map(d => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((day, i) => {
          const key = toDateKey(day);
          const isCurrentMonth = day.getMonth() === currentMonth.month;
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
          const habitIds = getHabitIdsForDate(key);

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(isSelected ? null : key)}
              className={`
                relative flex flex-col items-center py-1.5 text-sm rounded-md transition-colors
                ${!isCurrentMonth ? 'text-muted-foreground/40' : ''}
                ${isToday && !isSelected ? 'ring-1 ring-primary/40' : ''}
                ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
              `}
            >
              <span className="text-xs">{day.getDate()}</span>
              {/* Habit dots */}
              {habitIds.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {habitIds.slice(0, 3).map(hId => (
                    <span
                      key={hId}
                      className="block h-1 w-1 rounded-full"
                      style={{
                        backgroundColor: isSelected
                          ? 'currentColor'
                          : getHabitColor(habitIndexMap.get(hId) ?? 0),
                      }}
                    />
                  ))}
                  {habitIds.length > 3 && (
                    <span className="block h-1 w-1 rounded-full bg-muted-foreground/50" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Day detail panel */}
      {selectedDate && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">
                {formatDayHeader(new Date(selectedDate + 'T00:00:00'))}
              </h3>
              {selectedTotalSeconds > 0 && (
                <span className="text-xs text-muted-foreground">
                  Total: {formatDuration(selectedTotalSeconds)}
                </span>
              )}
            </div>
            {selectedSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sessions this day</p>
            ) : (
              <div className="space-y-2">
                {selectedSessions.map(session => (
                  <div key={session.id} className="flex items-center gap-2">
                    <span
                      className="block h-2 w-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: getHabitColor(habitIndexMap.get(session.habitId) ?? 0),
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{session.habitName}</span>
                        <span className="text-sm font-mono text-muted-foreground ml-2">
                          {formatDuration(session.durationSeconds)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeOfDay(session.startTime)} — {formatTimeOfDay(session.endTime)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/CalendarView.tsx
git commit -m "feat: add CalendarView component with month grid and day detail"
```

---

### Task 4: Add view toggle to SessionsView

**Files:**
- Modify: `src/components/SessionsView.tsx`

**Step 1: Update SessionsView to add list/calendar toggle and pass sessions to CalendarView**

Key changes to `src/components/SessionsView.tsx`:
- Add import for `CalendarView`, `List`, `CalendarDays` from lucide-react
- Add `viewMode` state: `'list' | 'calendar'`
- Add toggle buttons next to the filter area
- Hide date range buttons when in calendar mode
- When `viewMode === 'calendar'`, render `<CalendarView>` instead of the sessions list
- Pass fetched `sessions` to `CalendarView`

```tsx
// Add to imports:
import { CalendarView } from '@/components/CalendarView';
import { List, CalendarDays } from 'lucide-react';

// Add state:
const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

// Add toggle UI (after the skill select dropdown):
<div className="flex items-center gap-2">
  <select ...existing... className="flex-1 ..." />
  <div className="flex rounded-md border border-input">
    <button
      onClick={() => setViewMode('list')}
      className={`p-2 ${viewMode === 'list' ? 'bg-muted' : ''}`}
      aria-label="List view"
    >
      <List className="h-4 w-4" />
    </button>
    <button
      onClick={() => setViewMode('calendar')}
      className={`p-2 ${viewMode === 'calendar' ? 'bg-muted' : ''}`}
      aria-label="Calendar view"
    >
      <CalendarDays className="h-4 w-4" />
    </button>
  </div>
</div>

// Conditionally hide date range buttons:
{viewMode === 'list' && (
  <div className="flex gap-1">
    {dateRanges.map(...)}
  </div>
)}

// When in calendar mode, fetch all sessions (override dateRange):
// Update fetchSessions: if viewMode === 'calendar', don't send range param
// Update useCallback deps to include viewMode

// Render calendar or list:
{viewMode === 'calendar' ? (
  <CalendarView sessions={sessions} habits={habits} />
) : (
  // ...existing list rendering...
)}
```

**Step 2: Commit**

```bash
git add src/components/SessionsView.tsx
git commit -m "feat: add list/calendar view toggle to SessionsView"
```

---

### Task 5: Write E2E tests for calendar view

**Files:**
- Create: `e2e/calendar-view.spec.ts`

**Step 1: Write the E2E test**

Create `e2e/calendar-view.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { signUp, addHabit } from './helpers';

test.describe('Calendar View', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page);
    await addHabit(page, 'Guitar');
  });

  test('can toggle to calendar view', async ({ page }) => {
    await page.getByRole('button', { name: /sessions/i }).click();
    await page.getByRole('button', { name: /calendar view/i }).click();

    // Should show month navigation and weekday headers
    await expect(page.getByText('Mon')).toBeVisible();
    await expect(page.getByText('Tue')).toBeVisible();
    await expect(page.getByRole('button', { name: /previous month/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /next month/i })).toBeVisible();
  });

  test('session shows as dot on calendar day', async ({ page }) => {
    // Complete a session
    await page.getByRole('button', { name: /start/i }).click();
    await page.getByText('Stopwatch').click();
    await expect(page.getByText('Recording...')).toBeVisible();
    await page.getByRole('button', { name: /stop/i }).click();

    // Go to calendar view
    await page.getByRole('button', { name: /sessions/i }).click();
    await page.getByRole('button', { name: /calendar view/i }).click();

    // Today's cell should have a dot (a 1x1 rounded span)
    const today = new Date().getDate().toString();
    // Click today's date to see the detail panel
    await page.locator('button', { hasText: today }).first().click();

    // Day detail panel should show Guitar session
    await expect(page.getByText('Guitar')).toBeVisible();
  });

  test('can navigate between months', async ({ page }) => {
    await page.getByRole('button', { name: /sessions/i }).click();
    await page.getByRole('button', { name: /calendar view/i }).click();

    const currentMonth = new Date().toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
    await expect(page.getByText(currentMonth)).toBeVisible();

    // Go to previous month
    await page.getByRole('button', { name: /previous month/i }).click();
    await expect(page.getByText(currentMonth)).not.toBeVisible();
  });

  test('clicking a day with no sessions shows empty message', async ({ page }) => {
    await page.getByRole('button', { name: /sessions/i }).click();
    await page.getByRole('button', { name: /calendar view/i }).click();

    // Click the first day cell
    const firstCell = page.locator('.grid-cols-7 button').first();
    await firstCell.click();

    await expect(page.getByText('No sessions this day')).toBeVisible();
  });

  test('can toggle back to list view', async ({ page }) => {
    await page.getByRole('button', { name: /sessions/i }).click();
    await page.getByRole('button', { name: /calendar view/i }).click();

    // Toggle back to list
    await page.getByRole('button', { name: /list view/i }).click();

    // Date range buttons should reappear
    await expect(page.getByRole('button', { name: /all time/i })).toBeVisible();
  });
});
```

**Step 2: Run E2E tests**

Run: `npx playwright test e2e/calendar-view.spec.ts`
Fix any failing tests.

**Step 3: Commit**

```bash
git add e2e/calendar-view.spec.ts
git commit -m "test: add E2E tests for calendar view"
```

---

### Task 6: Final verification

**Step 1: Run all E2E tests**

Run: `npx playwright test`
All existing and new tests should pass.

**Step 2: Manual smoke test**

Run: `npm run dev` and verify:
- Sessions tab shows list/calendar toggle icons
- Calendar view renders current month grid
- Days with sessions show colored dots
- Clicking a day shows session detail panel with colored dots + habit names
- Month navigation works (prev/next)
- Skill filter applies to calendar view
- Toggle back to list restores date range buttons
- Empty days show "No sessions this day" message

**Step 3: Commit any fixes if needed**
