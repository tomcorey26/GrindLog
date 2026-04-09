# TimerSync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Combine `TimerHydrator` and `CountdownAutoStop` into a single `TimerSync` component so server auto-stop toasts show on any page.

**Architecture:** One client component in the app layout replaces two. It fetches `GET /api/habits` on mount (which runs server-side auto-stop), hydrates Zustand, shows toast if `autoStopped` is present, and polls for client-side countdown expiry. Dashboard loses its `autoStopped` prop.

**Tech Stack:** React, Zustand, TanStack Query, sonner, vitest

**Spec:** `docs/superpowers/specs/2026-04-09-timer-sync-design.md`

---

### File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/TimerSync.tsx` | Combined hydration + auto-stop + toast |
| Create | `src/components/TimerSync.test.tsx` | Unit tests |
| Modify | `src/app/(app)/layout.tsx` | Swap imports |
| Modify | `src/app/(app)/habits/page.tsx` | Remove autoStopped logic |
| Modify | `src/components/Dashboard.tsx` | Remove autoStopped prop |
| Delete | `src/components/TimerHydrator.tsx` | Replaced |
| Delete | `src/components/CountdownAutoStop.tsx` | Replaced |
| Delete | `src/components/AutoStopToast.tsx` | Replaced |
| Delete | `src/lib/auto-stop-search-params.ts` | Unused after removal |
| Delete | `src/lib/auto-stop-search-params.test.ts` | Tests for deleted file |

---

### Task 1: Create TimerSync with hydration + server auto-stop toast

**Files:**
- Create: `src/components/TimerSync.tsx`
- Create: `src/components/TimerSync.test.tsx`

- [ ] **Step 1: Write failing tests for hydration and server auto-stop toast**

Create `src/components/TimerSync.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTimerStore } from "@/stores/timer-store";
import type { ReactNode } from "react";

// Mock dependencies
vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/habits"),
}));

import { api } from "@/lib/api";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { TimerSync } from "./TimerSync";

const mockedApi = vi.mocked(api);
const mockedPathname = vi.mocked(usePathname);

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  useTimerStore.setState({
    activeTimer: null,
    view: { type: "habits_list" },
    timerViewMounted: false,
  });
  vi.clearAllMocks();
  mockedPathname.mockReturnValue("/habits");
});

describe("TimerSync", () => {
  describe("hydration", () => {
    it("hydrates zustand when server has an active timer", async () => {
      mockedApi.mockResolvedValueOnce({
        habits: [
          {
            id: 1,
            name: "Guitar",
            todaySeconds: 0,
            totalSeconds: 0,
            streak: 0,
            activeTimer: {
              startTime: "2026-04-09T12:00:00.000Z",
              targetDurationSeconds: null,
            },
          },
        ],
        autoStopped: null,
      });

      renderHook(() => TimerSync(), { wrapper: createWrapper() });

      await waitFor(() => {
        const state = useTimerStore.getState();
        expect(state.activeTimer).toEqual({
          habitId: 1,
          habitName: "Guitar",
          startTime: "2026-04-09T12:00:00.000Z",
          targetDurationSeconds: null,
        });
      });
    });

    it("does not hydrate when no active timer in response", async () => {
      mockedApi.mockResolvedValueOnce({
        habits: [
          { id: 1, name: "Guitar", todaySeconds: 0, totalSeconds: 0, streak: 0, activeTimer: null },
        ],
        autoStopped: null,
      });

      renderHook(() => TimerSync(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockedApi).toHaveBeenCalled();
      });
      expect(useTimerStore.getState().activeTimer).toBeNull();
    });
  });

  describe("server auto-stop toast", () => {
    it("shows toast when autoStopped is present in response", async () => {
      mockedApi.mockResolvedValueOnce({
        habits: [
          { id: 1, name: "Guitar", todaySeconds: 0, totalSeconds: 0, streak: 0, activeTimer: null },
        ],
        autoStopped: { habitName: "Guitar", durationSeconds: 300 },
      });

      // Simulate that we had a timer before (e.g. from a previous session)
      useTimerStore.setState({
        activeTimer: {
          habitId: 1,
          habitName: "Guitar",
          startTime: "2026-04-09T12:00:00.000Z",
          targetDurationSeconds: 300,
        },
      });

      renderHook(() => TimerSync(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining("Guitar session was auto-recorded"),
        );
      });
      expect(useTimerStore.getState().activeTimer).toBeNull();
    });
  });

  describe("dismiss success on nav", () => {
    it("dismisses success view when navigating away from /habits", async () => {
      mockedApi.mockResolvedValueOnce({
        habits: [],
        autoStopped: null,
      });

      useTimerStore.setState({
        view: { type: "success", durationSeconds: 120 },
      });
      mockedPathname.mockReturnValue("/sessions");

      renderHook(() => TimerSync(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(useTimerStore.getState().view).toEqual({ type: "habits_list" });
      });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/TimerSync.test.tsx`
Expected: FAIL — `TimerSync` module not found

- [ ] **Step 3: Create TimerSync component**

Create `src/components/TimerSync.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatTime } from "@/lib/format";
import { isCountdownComplete } from "@/lib/timer";
import { useTimerStore } from "@/stores/timer-store";
import type { Habit, AutoStoppedSession } from "@/lib/types";

function sendBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {}
}

function playFanfare() {
  try {
    new Audio("/fanfare.mp3").play().catch(() => {});
  } catch {}
}

type HabitsResponse = {
  habits: Habit[];
  autoStopped: AutoStoppedSession | null;
};

export function TimerSync() {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const hydratedRef = useRef(false);
  const autoStopHandledRef = useRef(false);
  const stoppingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeTimer = useTimerStore((s) => s.activeTimer);
  const timerViewMounted = useTimerStore((s) => s.timerViewMounted);

  // Fetch habits (runs server-side autoStopExpiredCountdown via GET /api/habits)
  const { data } = useQuery({
    queryKey: queryKeys.habits.all,
    queryFn: () => api<HabitsResponse>("/api/habits"),
  });

  // --- Hydration (once) ---
  useEffect(() => {
    if (hydratedRef.current || !data) return;

    const activeHabit = data.habits.find((h) => h.activeTimer);
    if (activeHabit?.activeTimer) {
      useTimerStore.getState().hydrate({
        habitId: activeHabit.id,
        habitName: activeHabit.name,
        startTime: activeHabit.activeTimer.startTime,
        targetDurationSeconds: activeHabit.activeTimer.targetDurationSeconds,
      });
    }
    hydratedRef.current = true;
  }, [data]);

  // --- Server auto-stop toast ---
  useEffect(() => {
    if (autoStopHandledRef.current || !data?.autoStopped) return;
    autoStopHandledRef.current = true;

    const { habitName, durationSeconds } = data.autoStopped;
    const message = `Your ${formatTime(durationSeconds)} ${habitName} session was auto-recorded`;
    toast.success(message);
    sendBrowserNotification("Session Complete", message);
    playFanfare();

    useTimerStore.getState().resetTimer();

    queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.rankings.all });
  }, [data, queryClient]);

  // --- Dismiss success on nav away from /habits ---
  useEffect(() => {
    if (
      !pathname.startsWith("/habits") &&
      useTimerStore.getState().view.type === "success"
    ) {
      useTimerStore.getState().dismissSuccess();
    }
  }, [pathname]);

  // --- Client-side countdown polling ---
  useEffect(() => {
    if (!activeTimer?.targetDurationSeconds || timerViewMounted) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      stoppingRef.current = false;
      return;
    }

    const { startTime, targetDurationSeconds, habitName } = activeTimer;

    async function checkAndStop() {
      if (stoppingRef.current) return;
      if (!isCountdownComplete(startTime, targetDurationSeconds!)) return;

      stoppingRef.current = true;
      try {
        const result = await api<{ durationSeconds: number }>(
          "/api/timer/stop",
          { method: "POST" },
        );

        const message = `Your ${formatTime(result.durationSeconds)} ${habitName} session was recorded`;
        toast.success(message);
        sendBrowserNotification("Session Complete", message);
        playFanfare();

        useTimerStore.getState().resetTimer();

        queryClient.invalidateQueries({ queryKey: queryKeys.habits.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.rankings.all });
      } catch {
        useTimerStore.getState().resetTimer();
      }
    }

    stoppingRef.current = false;
    intervalRef.current = setInterval(checkAndStop, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeTimer, timerViewMounted, queryClient]);

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/TimerSync.test.tsx`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/TimerSync.tsx src/components/TimerSync.test.tsx
git commit -m "feat: create TimerSync component with hydration, auto-stop toast, and countdown polling"
```

---

### Task 2: Wire TimerSync into layout, remove old components

**Files:**
- Modify: `src/app/(app)/layout.tsx` — swap imports
- Modify: `src/app/(app)/habits/page.tsx` — remove autoStopped
- Modify: `src/components/Dashboard.tsx` — remove autoStopped prop

- [ ] **Step 1: Update layout to use TimerSync**

In `src/app/(app)/layout.tsx`, replace:
```tsx
import { CountdownAutoStop } from "@/components/CountdownAutoStop";
import { TimerHydrator } from "@/components/TimerHydrator";
```
with:
```tsx
import { TimerSync } from "@/components/TimerSync";
```

And in the JSX, replace:
```tsx
<CountdownAutoStop />
<TimerSync />
<TimerHydrator />
```
with:
```tsx
<TimerSync />
```

- [ ] **Step 2: Remove autoStopped from habits page**

In `src/app/(app)/habits/page.tsx`, remove the `autoStopExpiredCountdown` import and call. Change Dashboard to not pass `autoStopped`:

```tsx
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { Dashboard } from "@/components/Dashboard";
import { Suspense } from "react";
import { Spinner } from "@/components/Spinner";
import { getHabitsForUser } from "@/server/db/habits";

export default async function HabitsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const habits = await getHabitsForUser(userId);

  return (
    <Suspense fallback={<Spinner />}>
      <Dashboard initialHabits={habits} />
    </Suspense>
  );
}
```

- [ ] **Step 3: Remove autoStopped prop from Dashboard**

In `src/components/Dashboard.tsx`:

Remove `autoStopped` from the props type and destructuring:
```tsx
export function Dashboard({
  initialHabits,
}: {
  initialHabits: Habit[];
}) {
```

Remove the `useEffect` that shows the autoStopped toast (lines 146-152):
```tsx
// DELETE this entire block:
useEffect(() => {
  if (autoStopped) {
    toast.success(
      `Your ${formatTime(autoStopped.durationSeconds)} ${autoStopped.habitName} session was auto-recorded`,
    );
  }
}, [autoStopped]);
```

Also remove `formatTime` from imports if no longer used in Dashboard. Check before removing.

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: All pass. `auto-stop-search-params.test.ts` may fail since we haven't deleted it yet — that's fine, handled in Task 3.

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/layout.tsx src/app/(app)/habits/page.tsx src/components/Dashboard.tsx
git commit -m "refactor: wire TimerSync into layout, remove autoStopped prop from Dashboard"
```

---

### Task 3: Delete old files

**Files:**
- Delete: `src/components/TimerHydrator.tsx`
- Delete: `src/components/CountdownAutoStop.tsx`
- Delete: `src/components/AutoStopToast.tsx`
- Delete: `src/lib/auto-stop-search-params.ts`
- Delete: `src/lib/auto-stop-search-params.test.ts`

- [ ] **Step 1: Verify no remaining imports of deleted files**

Run:
```bash
grep -r "TimerHydrator\|CountdownAutoStop\|AutoStopToast\|auto-stop-search-params" src/ --include="*.ts" --include="*.tsx" -l
```

Expected: Only the files being deleted. If any other file imports them, fix that import first.

- [ ] **Step 2: Delete the files**

```bash
git rm src/components/TimerHydrator.tsx src/components/CountdownAutoStop.tsx src/components/AutoStopToast.tsx src/lib/auto-stop-search-params.ts src/lib/auto-stop-search-params.test.ts
```

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor: delete TimerHydrator, CountdownAutoStop, AutoStopToast, auto-stop-search-params"
```

---

### Task 4: Verify E2E tests pass

**Files:** No changes — verification only.

- [ ] **Step 1: Run E2E auto-stop tests**

Run: `npx playwright test e2e/auto-stop-countdown.spec.ts`
Expected: PASS. These tests exercise the full auto-stop flow through the browser, which now goes through `TimerSync`.

- [ ] **Step 2: Run E2E timer stop race tests**

Run: `npx playwright test e2e/timer-stop-race.spec.ts`
Expected: PASS. If any tests reference `CountdownAutoStop` by name in assertions or comments only, that's fine. If they mock/intercept it, they need updating.

- [ ] **Step 3: Run full E2E suite**

Run: `npx playwright test`
Expected: PASS

- [ ] **Step 4: Commit any E2E test fixes if needed**

```bash
git add e2e/
git commit -m "test: update E2E tests for TimerSync refactor"
```
