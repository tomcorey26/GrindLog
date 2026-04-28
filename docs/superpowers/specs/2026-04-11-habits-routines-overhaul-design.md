# Habits Page & Routines Overhaul Design

## 1. Reusable `HabitList` Component

Extract from `HabitPicker` a new `HabitList` component:

- **Props:** `habits`, `search`/`onSearchChange`, `renderAction?: (habit) => ReactNode` (right-side slot), `onCreateHabit`
- Renders: search bar, "create new habit" form, scrollable alphabetically-sorted habit list
- Each list item: habit name on left, `renderAction(habit)` on right
- `HabitPicker` becomes thin wrapper around `HabitList` — click-to-select via `onSelectHabit`, no `renderAction`
- **Duplicate name prevention:** reject habit creation if name already exists (case-insensitive). Enforce client-side (disable/error) and server-side (check before insert). Same rule for routine names.

## 2. Habits Page Overhaul

Replace current Dashboard with two togglable views:

- **List view (default):** `HabitList` with `renderAction` rendering a "Start" button per habit. Tapping Start opens existing `StartTimerModal`. Lives in normal content area (no full-page takeover).
- **Grid view:** Current Dashboard card layout (habit cards with today's time, total time, streak, start button).
- **Toggle:** `LayoutList`/`LayoutGrid` icons in page header. Preference persisted in `localStorage`.
- "Create habit" form appears in both views (top of page, above toggle).
- Active timer behavior unchanged — if timer running, show `TimerView`/active timer card as today.

## 3. Seeded Habits for New Users

On signup, seed 10 default habits into the database:

Meditation, Coding, Guitar, Painting, Reading, Exercise, Writing, Cooking, Language Study, Chess

- Real records in `habits` table, owned by user, deletable/renamable
- Insert in signup server action, right after user creation

## 4. Routines as Primary Feature

- Reorder `TabNav`: Routines, Habits, Sessions, Rankings
- Post-login redirect: `/habits` → `/routines` in `AuthForm`
- Update any other default redirects to `/routines`

## 5. Mobile Overflow Fix

The app currently overflows horizontally on mobile on the routines branch. Fix:

- Run dev server, use DevTools/Playwright to identify which element exceeds viewport width
- Fix at source (likely `min-w`, fixed grid column, or non-shrinking content)
- Add `min-w-0` on flex children in app layout as safety net
- Debug-and-fix during implementation, not a prescriptive CSS change
