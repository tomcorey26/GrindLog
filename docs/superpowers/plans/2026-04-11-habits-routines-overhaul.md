# Habits Page & Routines Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make routines the primary feature, overhaul the habits page with a reusable HabitList component supporting list/grid toggle, seed default habits for new users, prevent duplicate names, and fix mobile overflow.

**Architecture:** Extract a reusable `HabitList` from `HabitPicker`, refactor `Dashboard` to use it with a list/grid view toggle. Add duplicate name checks at the API layer. Seed habits in the signup route. Reorder nav and redirect.

**Tech Stack:** Next.js, React, TanStack Query, Drizzle ORM, SQLite, Tailwind CSS, Framer Motion

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/components/HabitList.tsx` | Reusable searchable habit list with right-side slot |
| Modify | `src/components/HabitPicker.tsx` | Thin wrapper around HabitList for routine builder |
| Modify | `src/components/Dashboard.tsx` | List/grid toggle, use HabitList in list view |
| Modify | `src/components/TabNav.tsx` | Reorder tabs: Routines first |
| Modify | `src/components/AuthForm.tsx:106` | Redirect to `/routines` after login |
| Modify | `src/app/api/habits/route.ts` | Duplicate name check in POST |
| Modify | `src/app/api/routines/route.ts` | Duplicate name check in POST |
| Modify | `src/server/db/habits.ts` | Add `getHabitByNameForUser`, `seedDefaultHabits` |
| Modify | `src/app/api/auth/signup/route.ts` | Call `seedDefaultHabits` after user creation |
| Modify | `src/app/(app)/layout.tsx` | Fix mobile overflow |

---

### Task 1: Reorder Nav & Change Login Redirect

**Files:**
- Modify: `src/components/TabNav.tsx:7-12`
- Modify: `src/components/AuthForm.tsx:106`

- [ ] **Step 1: Reorder tabs in TabNav**

In `src/components/TabNav.tsx`, change the `TABS` array:

```typescript
const TABS = [
  { href: '/routines', label: 'Routines' },
  { href: '/habits', label: 'Habits' },
  { href: '/sessions', label: 'Sessions' },
  { href: '/rankings', label: 'Rankings' },
];
```

- [ ] **Step 2: Change login redirect**

In `src/components/AuthForm.tsx`, change line 106:

```typescript
router.push("/routines");
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
- Login should redirect to `/routines`
- Nav should show Routines first in both mobile and desktop

- [ ] **Step 4: Commit**

```bash
git add src/components/TabNav.tsx src/components/AuthForm.tsx
git commit -m "feat: make routines primary — reorder nav, change login redirect"
```

---

### Task 2: Duplicate Name Prevention — Habits API

**Files:**
- Modify: `src/server/db/habits.ts`
- Modify: `src/app/api/habits/route.ts`

- [ ] **Step 1: Add `getHabitByNameForUser` to server/db/habits.ts**

Add after the existing `getHabitByIdForUser` function (after line 71):

```typescript
export function getHabitByNameForUser(userId: number, name: string) {
  return db
    .select()
    .from(habits)
    .where(
      and(
        eq(habits.userId, userId),
        sql`LOWER(${habits.name}) = LOWER(${name})`
      )
    )
    .get();
}
```

- [ ] **Step 2: Add duplicate check in habits API POST**

In `src/app/api/habits/route.ts`, after the `safeParse` check (after line 34), add:

```typescript
import { createHabitForUser, getHabitsForUser, getHabitByNameForUser } from "@/server/db/habits";

// ... inside POST, after parsed.success check:
  const existing = await getHabitByNameForUser(userId, parsed.data.name);
  if (existing) {
    return NextResponse.json(
      { error: "A habit with this name already exists" },
      { status: 409 },
    );
  }
```

- [ ] **Step 3: Test duplicate prevention**

Run dev server, try creating two habits with the same name. Second attempt should show error.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/habits.ts src/app/api/habits/route.ts
git commit -m "feat: prevent duplicate habit names (case-insensitive)"
```

---

### Task 3: Duplicate Name Prevention — Routines API

**Files:**
- Modify: `src/server/db/routines.ts`
- Modify: `src/app/api/routines/route.ts`

- [ ] **Step 1: Add `getRoutineByNameForUser` to server/db/routines.ts**

```typescript
export function getRoutineByNameForUser(userId: number, name: string) {
  return db
    .select()
    .from(routines)
    .where(
      and(
        eq(routines.userId, userId),
        sql`LOWER(${routines.name}) = LOWER(${name})`
      )
    )
    .get();
}
```

- [ ] **Step 2: Add duplicate check in routines API POST**

In `src/app/api/routines/route.ts`, after the `safeParse` check (after line 50), add:

```typescript
import { getRoutinesForUser, createRoutineForUser, getRoutineByNameForUser } from "@/server/db/routines";

// ... inside POST, after parsed.success check:
  const existing = await getRoutineByNameForUser(userId, parsed.data.name);
  if (existing) {
    return NextResponse.json(
      { error: "A routine with this name already exists" },
      { status: 409 },
    );
  }
```

- [ ] **Step 3: Test duplicate prevention**

Try creating two routines with the same name. Second attempt should fail with 409.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/routines.ts src/app/api/routines/route.ts
git commit -m "feat: prevent duplicate routine names (case-insensitive)"
```

---

### Task 4: Seed Default Habits on Signup

**Files:**
- Modify: `src/server/db/habits.ts`
- Modify: `src/app/api/auth/signup/route.ts`

- [ ] **Step 1: Add `seedDefaultHabits` to server/db/habits.ts**

Add at the end of the file:

```typescript
const DEFAULT_HABITS = [
  "Meditation",
  "Coding",
  "Guitar",
  "Painting",
  "Reading",
  "Exercise",
  "Writing",
  "Cooking",
  "Language Study",
  "Chess",
];

export async function seedDefaultHabits(userId: number) {
  await db.insert(habits).values(
    DEFAULT_HABITS.map((name) => ({ userId, name }))
  );
}
```

- [ ] **Step 2: Call seedDefaultHabits in signup route**

In `src/app/api/auth/signup/route.ts`, add import and call after user creation:

```typescript
import { seedDefaultHabits } from "@/server/db/habits";

// After line 38 (const user = await createUser(...)):
  await seedDefaultHabits(user.id);
```

- [ ] **Step 3: Test signup**

Create a new account. Should see 10 default habits on the habits page.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/habits.ts src/app/api/auth/signup/route.ts
git commit -m "feat: seed 10 default habits for new users on signup"
```

---

### Task 5: Create Reusable HabitList Component

**Files:**
- Create: `src/components/HabitList.tsx`

- [ ] **Step 1: Create HabitList component**

Create `src/components/HabitList.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import type { Habit } from "@/lib/types";

type HabitListProps = {
  habits: Habit[];
  onCreateHabit: (name: string) => Promise<void>;
  renderAction?: (habit: Habit) => React.ReactNode;
  onSelectHabit?: (habit: { id: number; name: string }) => void;
};

export function HabitList({
  habits,
  onCreateHabit,
  renderAction,
  onSelectHabit,
}: HabitListProps) {
  const [search, setSearch] = useState("");
  const [newHabitName, setNewHabitName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const sorted = [...habits].sort((a, b) => a.name.localeCompare(b.name));
  const filtered = sorted.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  const isDuplicate = habits.some(
    (h) => h.name.toLowerCase() === newHabitName.trim().toLowerCase()
  );

  async function handleCreateHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!newHabitName.trim() || isDuplicate) return;
    setError("");
    setCreating(true);
    try {
      await onCreateHabit(newHabitName.trim());
      setNewHabitName("");
    } catch {
      setError("Failed to create habit");
    }
    setCreating(false);
  }

  return (
    <div className="flex flex-col">
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search habits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <form onSubmit={handleCreateHabit} className="mb-3 flex gap-2">
        <Input
          placeholder="Create new habit..."
          value={newHabitName}
          onChange={(e) => {
            setNewHabitName(e.target.value);
            setError("");
          }}
          className="h-8 text-sm flex-1"
          maxLength={30}
        />
        <Button
          type="submit"
          size="sm"
          disabled={creating || !newHabitName.trim() || isDuplicate}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </form>

      {isDuplicate && newHabitName.trim() && (
        <p className="text-xs text-destructive mb-2">
          A habit with this name already exists
        </p>
      )}
      {error && <p className="text-xs text-destructive mb-2">{error}</p>}

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            {habits.length === 0
              ? "No habits yet. Create one above."
              : "No habits match your search."}
          </p>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <button
                  type="button"
                  onClick={() =>
                    onSelectHabit?.({ id: habit.id, name: habit.name })
                  }
                  className={`text-left flex-1 ${onSelectHabit ? "cursor-pointer" : "cursor-default"}`}
                >
                  {habit.name}
                </button>
                {renderAction?.(habit)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to HabitList

- [ ] **Step 3: Commit**

```bash
git add src/components/HabitList.tsx
git commit -m "feat: create reusable HabitList component with render slot"
```

---

### Task 6: Refactor HabitPicker to Use HabitList

**Files:**
- Modify: `src/components/HabitPicker.tsx`

- [ ] **Step 1: Rewrite HabitPicker as a wrapper**

Replace the entire contents of `src/components/HabitPicker.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { HabitList } from "@/components/HabitList";
import type { Habit } from "@/lib/types";

type HabitPickerProps = {
  habits: Habit[];
  onSelectHabit: (habit: { id: number; name: string }) => void;
  onClose: () => void;
  onCreateHabit: (name: string) => Promise<void>;
};

export function HabitPicker({
  habits,
  onSelectHabit,
  onClose,
  onCreateHabit,
}: HabitPickerProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Select Habit</h3>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto px-4 py-3">
        <HabitList
          habits={habits}
          onSelectHabit={onSelectHabit}
          onCreateHabit={onCreateHabit}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify routine builder still works**

Run dev server, go to `/routines/new`, click "Add Habits". The picker should still work — search, create, and select habits.

- [ ] **Step 3: Commit**

```bash
git add src/components/HabitPicker.tsx
git commit -m "refactor: HabitPicker now wraps reusable HabitList"
```

---

### Task 7: Habits Page — List/Grid Toggle with HabitList

**Files:**
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: Add list/grid toggle and list view**

Replace the contents of `src/components/Dashboard.tsx` with the following. Key changes:
- Import `HabitList`, `LayoutList`, `LayoutGrid`
- Add `viewMode` state persisted in `localStorage`
- List view renders `HabitList` with a "Start" button as `renderAction`
- Grid view renders the existing card layout
- `AddHabitForm` is removed (creation is now inside `HabitList`)

```typescript
"use client";

import { useState, useEffect } from "react";
import { useHaptics } from "@/hooks/use-haptics";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutList, LayoutGrid } from "lucide-react";
import { HabitCard } from "@/components/HabitCard";
import { HabitList } from "@/components/HabitList";
import { StartTimerModal } from "@/components/StartTimerModal";
import { TimerView } from "@/components/TimerView";
import { EmojiBubbles } from "@/components/EmojiBubbles";
import { LogSessionModal } from "@/components/LogSessionModal";
import { PressableButton } from "@/components/ui/pressable-button";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useHabits,
  useAddHabit,
  useDeleteHabit,
  useStartTimer,
  useStopTimer,
} from "@/hooks/use-habits";
import { PageHeader } from "@/components/ui/page-header";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { useTimerStore } from "@/stores/timer-store";
import { ApiError } from "@/lib/api";
import { formatTime, getElapsedSeconds } from "@/lib/format";
import { getRandomCongratsMessage } from "@/lib/congrats-messages";
import type { Habit } from "@/lib/types";

function playFanfare() {
  try {
    const audio = new Audio("/fanfare.mp3");
    audio.play().catch(() => {});
  } catch {}
}

const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

function SuccessScreen({ durationSeconds }: { durationSeconds: number }) {
  const { trigger } = useHaptics();
  const dismissSuccess = useTimerStore((s) => s.dismissSuccess);
  const [message] = useState(() => getRandomCongratsMessage());

  useEffect(() => {
    playFanfare();
    trigger("buzz");
    if (
      document.hidden &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification("🎉 Session Complete", {
          body: `Your ${formatTime(durationSeconds)} session was recorded`,
        });
      } catch {}
    }
  }, [trigger, durationSeconds]);

  return (
    <div className="relative flex-1 flex flex-col">
      <EmojiBubbles />
      <motion.div
        className="flex-1 flex flex-col items-center justify-center text-center px-6 relative z-10"
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: 0.15, delayChildren: 0.1 }}
      >
        <motion.p
          className="text-6xl mb-6"
          variants={{
            hidden: { opacity: 0, scale: 0.3 },
            visible: { opacity: 1, scale: 1 },
          }}
          transition={{ type: "spring", stiffness: 200, damping: 12 }}
        >
          &#127942;
        </motion.p>
        <motion.h1
          className="text-2xl font-bold mb-3"
          variants={staggerItem}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          Session Complete!
        </motion.h1>
        <motion.p
          className="text-lg text-muted-foreground mb-6 max-w-xs"
          variants={staggerItem}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {message}
        </motion.p>
        <motion.p
          className="text-4xl font-mono font-light tracking-tight mb-10"
          variants={staggerItem}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {formatTime(durationSeconds)}
        </motion.p>
        <motion.div
          variants={staggerItem}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <PressableButton
            size="lg"
            onClick={() => {
              trigger("light");
              dismissSuccess();
            }}
            className="px-12 py-6 text-lg"
          >
            Back to Habits
          </PressableButton>
        </motion.div>
      </motion.div>
    </div>
  );
}

type ViewMode = "list" | "grid";

function getInitialViewMode(): ViewMode {
  if (typeof window === "undefined") return "list";
  return (localStorage.getItem("habits-view-mode") as ViewMode) ?? "list";
}

export function Dashboard({
  initialHabits,
}: {
  initialHabits: Habit[];
}) {
  const { data: habits } = useHabits(initialHabits);
  const { data: flags } = useFeatureFlags();
  const { trigger } = useHaptics();
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const [switchConfirmHabitId, setSwitchConfirmHabitId] = useState<
    number | null
  >(null);
  const [loggingHabitId, setLoggingHabitId] = useState<number | null>(null);

  const addHabit = useAddHabit();
  const deleteHabit = useDeleteHabit();
  const startTimerApi = useStartTimer();
  const stopTimerApi = useStopTimer();

  const view = useTimerStore((s) => s.view);
  const activeTimer = useTimerStore((s) => s.activeTimer);
  const openConfig = useTimerStore((s) => s.openConfig);
  const closeConfig = useTimerStore((s) => s.closeConfig);
  const startTimer = useTimerStore((s) => s.startTimer);
  const stopTimer = useTimerStore((s) => s.stopTimer);

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem("habits-view-mode", mode);
  }

  function handleStartClick(habitId: number) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    if (activeTimer && activeTimer.habitId !== habitId) {
      setSwitchConfirmHabitId(habitId);
      return;
    }
    openConfig(habitId, habit.name);
  }

  function handleStartConfirm(targetDurationSeconds?: number) {
    if (view.type !== "timer_config") return;
    const { habitId, habitName } = view;

    trigger("medium");
    startTimer({ habitId, habitName, targetDurationSeconds });

    startTimerApi.mutate(
      {
        habitId,
        targetDurationSeconds,
      },
      {
        onError: () => {
          useTimerStore.getState().resetTimer();
          toast.error("Failed to start timer");
        },
      },
    );
  }

  function handleStop() {
    trigger("buzz");
    stopTimerApi.mutate(undefined, {
      onSuccess: (data) => {
        stopTimer(data.durationSeconds);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 404) {
          useTimerStore.getState().resetTimer();
          return;
        }
        toast.error("Failed to stop timer");
      },
    });
  }

  function handleDelete(habitId: number) {
    deleteHabit.mutate(habitId);
  }

  async function handleAdd(name: string) {
    await addHabit.mutateAsync(name);
  }

  function handleLogClick(habitId: number) {
    setLoggingHabitId(habitId);
  }

  function handleLogSave() {
    setLoggingHabitId(null);
  }

  const switchConfirmHabit = habits.find((h) => h.id === switchConfirmHabitId);
  const loggingHabit = habits.find((h) => h.id === loggingHabitId);

  // ── Timer Config View ──
  if (view.type === "timer_config") {
    return (
      <StartTimerModal
        habitName={view.habitName}
        onStart={handleStartConfirm}
        onCancel={closeConfig}
      />
    );
  }

  // ── Active Timer View ──
  if (view.type === "active_timer" && activeTimer) {
    const habit = habits.find((h) => h.id === activeTimer.habitId);
    return (
      <TimerView
        habitName={activeTimer.habitName}
        targetDurationSeconds={activeTimer.targetDurationSeconds}
        todaySeconds={habit?.todaySeconds ?? 0}
        streak={habit?.streak ?? 0}
        onStop={handleStop}
        onBack={() => useTimerStore.getState().showHabits()}
      />
    );
  }

  // ── Success View ──
  if (view.type === "success") {
    return <SuccessScreen durationSeconds={view.durationSeconds} />;
  }

  // ── Habits View (default) ──
  return (
    <>
      <AlertDialog
        open={!!switchConfirmHabit}
        onOpenChange={(open) => {
          if (!open) setSwitchConfirmHabitId(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Switch timer?</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              You have a timer running for{" "}
              <span className="font-semibold">{activeTimer?.habitName}</span>
              {activeTimer && (
                <> ({formatTime(getElapsedSeconds(activeTimer.startTime))})</>
              )}
              . Switching will save this session and start a new one for{" "}
              <span className="font-semibold">{switchConfirmHabit?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="default"
              onClick={() => {
                if (switchConfirmHabitId !== null) {
                  const savedHabitName = activeTimer?.habitName;
                  const savedHabitId = switchConfirmHabitId;
                  setSwitchConfirmHabitId(null);

                  stopTimerApi.mutate(undefined, {
                    onSuccess: (data) => {
                      useTimerStore.getState().resetTimer();
                      toast.success(
                        `${savedHabitName} session saved (${formatTime(data.durationSeconds)})`,
                      );
                      const habit = habits.find((h) => h.id === savedHabitId);
                      if (habit) {
                        openConfig(savedHabitId, habit.name);
                      }
                    },
                    onError: (error) => {
                      if (error instanceof ApiError && error.status === 404) {
                        useTimerStore.getState().resetTimer();
                        const habit = habits.find((h) => h.id === savedHabitId);
                        if (habit) {
                          openConfig(savedHabitId, habit.name);
                        }
                        return;
                      }
                      toast.error("Failed to stop timer");
                    },
                  });
                }
              }}
            >
              Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {flags?.logSession && loggingHabit && (
        <LogSessionModal
          habitId={loggingHabit.id}
          habitName={loggingHabit.name}
          onSave={handleLogSave}
          onCancel={() => setLoggingHabitId(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <PageHeader title="Habits" />
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => handleViewModeChange("list")}
            aria-label="List view"
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => handleViewModeChange("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === "list" ? (
        <HabitList
          habits={habits}
          onCreateHabit={handleAdd}
          renderAction={(habit) => (
            <Button
              size="sm"
              variant="default"
              onClick={() => handleStartClick(habit.id)}
            >
              Start
            </Button>
          )}
        />
      ) : (
        <>
          {habits.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Start by adding your first habit
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AnimatePresence initial={false}>
                  {habits.map((habit) => (
                    <motion.div
                      key={habit.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <HabitCard
                        habit={habit}
                        onStart={handleStartClick}
                        onDelete={handleDelete}
                        onLog={flags?.logSession ? handleLogClick : undefined}
                        onTimerClick={() =>
                          useTimerStore.getState().showActiveTimer()
                        }
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
```

- [ ] **Step 2: Remove AddHabitForm import (no longer needed in Dashboard)**

The new Dashboard code above already omits the `AddHabitForm` import. Verify `AddHabitForm` is not imported anywhere else — if it's only used in Dashboard, it can be deleted later or kept for potential reuse.

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
- Go to `/habits`
- Default view should be list view with search, create form, and Start buttons
- Toggle to grid view — should show existing habit cards
- Toggle preference should persist on page reload
- Start button in list view should open StartTimerModal
- Active timer and success screen should still work

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: habits page list/grid toggle using HabitList component"
```

---

### Task 8: Fix Mobile Overflow

**Files:**
- Modify: `src/app/(app)/layout.tsx` (and potentially other files depending on diagnosis)

- [ ] **Step 1: Diagnose the overflow**

Run: `npm run dev`

Open browser DevTools at mobile viewport (375px). Use the element inspector to find which element is wider than the viewport. Check:
- Header container and its children
- TabNav buttons
- Main content area
- Any component with `min-w-[...]` or fixed widths

- [ ] **Step 2: Fix the source**

Based on diagnosis, fix the offending element. Common fixes:
- Add `min-w-0` to flex children that won't shrink
- Add `overflow-hidden` on the root layout container
- Ensure no child has a `min-width` that exceeds mobile viewport minus padding

In `src/app/(app)/layout.tsx`, add `min-w-0` to the content column as a safety net:

```typescript
// Line 41: add min-w-0
<div className="flex-1 flex flex-col min-h-0 min-w-0">
```

- [ ] **Step 3: Verify on mobile viewport**

Check all pages at 375px width — habits, routines, sessions, rankings. No horizontal scroll on any page.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/layout.tsx
git commit -m "fix: mobile horizontal overflow"
```
