# Log Session Redesign: Time-Aware Input with Overlap Validation

## Problem

The current Log Session modal accepts only a date and duration in minutes. There is no upper bound on duration (users can enter absurd values like 2323213223214321432), no start time, and no overlap detection. This allows impossible and conflicting data.

## Goals

- Prevent absurd duration values
- Capture *when* a session happened, not just how long
- Block overlapping sessions across all habits on the same day
- Keep the UX simple — modal stays a modal

## Design

### Modal Fields

| Field | Type | Details |
|-------|------|---------|
| Date | Dropdown | Last 7 days (Today → 6 days ago). Same as current. |
| Start Time | Dropdown | 15-minute increments, 12:00 AM → 11:45 PM (96 options) |
| Duration | Number input | Free-form, min 1, max 720 minutes |
| Computed end time | Read-only text | Displayed below form, e.g. "2:00 PM → 3:25 PM" |

### Overlap Validation (Client-Side)

1. When user selects a date, fetch all sessions for that day across all habits via `GET /api/sessions?date=YYYY-MM-DD`.
2. On any change to start time or duration, compute the proposed interval `[startTime, startTime + duration)`.
3. Check against fetched sessions for overlap.
4. If overlap found, display inline error: *"Overlaps with [Habit Name] from 2:00 PM – 4:00 PM"* and disable Save button.
5. If session would extend past midnight (11:59 PM), display: *"Session cannot extend past midnight"* and disable Save.

No debounce needed — the overlap check runs against locally cached data after the initial date fetch.

### Backend Validation (Safety Net)

On `POST /api/sessions`:

1. **Max duration**: Reject if `durationMinutes > 720`.
2. **Start time required**: `startTime` becomes a required field for manual sessions (`timerMode: 'manual'`). Sent as an ISO 8601 timestamp or `HH:mm` string alongside `date`.
3. **Overlap check**: Query existing sessions for the user on the given date. If the proposed `[startTime, endTime)` overlaps any existing session (any habit), return 409 Conflict with details of the conflicting session.
4. **Midnight boundary**: Reject if computed end time crosses into the next day.

### Schema

No schema migration needed. The `timeSessions` table already has `startTime` and `endTime` (timestamp columns). Currently, manual sessions store a noon placeholder — they will now store real values derived from the user's date + start time + duration.

### API Changes

#### `GET /api/sessions` — new query param

- `date` (optional, `YYYY-MM-DD`): Return sessions for a specific date only. Used by the modal to fetch data for overlap checking.

#### `POST /api/sessions` — updated body

```json
{
  "habitId": 123,
  "date": "2026-03-19",
  "startTime": "14:00",
  "durationMinutes": 90
}
```

Server computes:
- `startTime` = `2026-03-19T14:00:00` (user's local date + time)
- `endTime` = `2026-03-19T15:30:00`
- `durationSeconds` = `5400`

Returns 409 if overlap detected:
```json
{
  "error": "Overlaps with existing session",
  "conflict": {
    "habitName": "Guitar",
    "startTime": "2026-03-19T13:00:00",
    "endTime": "2026-03-19T15:00:00"
  }
}
```

### What Stays the Same

- Modal remains a modal (no new page)
- 7-day lookback rule unchanged
- Delete flow unchanged
- React Query invalidation unchanged
- `timerMode` for manual sessions stays `'manual'`
- Stopwatch and countdown sessions are unaffected (they already have real start/end times)

### Edge Cases

| Case | Behavior |
|------|----------|
| Duration bleeds past midnight | Error: "Session cannot extend past midnight" |
| Two sessions back-to-back (end == start) | Allowed — intervals are `[start, end)`, so no overlap |
| User changes date after entering time/duration | Re-fetch sessions for new date, re-validate |
| Existing manual sessions with noon placeholder | Not affected — they remain as-is. New sessions get real times. |
