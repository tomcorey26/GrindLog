# Manual Session Logging

## Problem
Users practice habits away from the computer but can only log sessions via the in-app timer.

## Solution
Add a "Log" button to each habit card that opens a modal for manually recording past sessions.

## Data Model
Reuse existing `timeSessions` table. New `timerMode` value: `'manual'`.
- `startTime` = selected date at midnight
- `endTime` = startTime + durationSeconds
- `durationSeconds` = user-entered minutes * 60

No schema migration needed.

## API
**POST `/api/sessions`**
- Body: `{ habitId: number, date: string (YYYY-MM-DD), durationMinutes: number }`
- Validation: authenticated user, habit ownership, date within last 7 days, duration > 0
- Creates `timeSessions` row with `timerMode = 'manual'`

## UI

### HabitCard
- Add "Log" button next to "Start" button
- Only visible when no timer active for this habit

### LogSessionModal (new component)
- Date selector: dropdown with today + last 6 days (formatted as "Mon, Feb 23")
- Duration input: number field in minutes
- "Save" button → POST `/api/sessions` → refresh habit data

## Sessions History
No changes. Manual sessions appear in existing SessionsView via GET `/api/sessions`.
`timerMode = 'manual'` stored but not visually distinguished from timer sessions.

## Decisions
- Date + duration only (no start/end time picker)
- Last 7 days only (no arbitrary past dates)
- Modal form (consistent with StartTimerModal pattern)
- No visual distinction in history view
