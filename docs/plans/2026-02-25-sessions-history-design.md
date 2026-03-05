# Sessions History Tab — Design

## Summary
Tab within the dashboard showing all completed sessions with skill name, date, start/end time, duration, and timer mode. Filterable by skill and date range.

## Architecture
- Extend `activeView` state: `'list' | 'timer' | 'sessions'`
- Tab bar below header: "Skills" / "Sessions"
- New `SessionsView` component
- New `GET /api/sessions` route

## Schema Change
Add `mode` column to `timeSessions` table:
- `mode TEXT NOT NULL DEFAULT 'stopwatch'` — values: `'stopwatch'` | `'countdown'`
- Set mode when stopping timer based on `activeTimers.targetDurationSeconds` (null = stopwatch, number = countdown)
- Drizzle migration required

## API: GET /api/sessions
- Auth: requires session userId
- Query params: `habitId` (optional int), `range` (optional: `today` | `week` | `month` | `all`, default `all`)
- Join `timeSessions` with `habits` to get habit name
- Filter by userId via habits.userId
- Sort: newest first
- Response: `{ sessions: [{ id, habitName, startTime, endTime, durationSeconds, mode }] }`

## UI: SessionsView
- Filter row: skill dropdown + date range selector (Today / This Week / This Month / All Time)
- Summary: total time for filtered results
- Session cards: skill name, date, start time, end time, duration, mode badge
- Empty state: "No sessions yet"

## UI: Dashboard Tab Bar
- Two buttons below header, segmented control style
- "Skills" (default) / "Sessions"
- Active tab has accent styling

## Timer Stop Changes
- When stopping timer, check `activeTimers.targetDurationSeconds`
- If null → mode = 'stopwatch', else → mode = 'countdown'
- Save mode to new column in `timeSessions`
