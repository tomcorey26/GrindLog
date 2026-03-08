# Timer Success Screen

## Summary
After stopping timer, show celebration screen with fanfare sound, random witty message, duration display, and button back to habits.

## Flow
1. User clicks Stop → `POST /api/timer/stop` (returns `durationSeconds`)
2. Set `successData` state instead of routing to `/dashboard`
3. Play `/fanfare.mp3` via Web Audio API
4. Trigger haptic buzz
5. Show: random congrats message + formatted duration
6. "Back to Habits" button → `/dashboard`

## Implementation
- Inline state in `TimerView` — no new routes/pages
- `useStopTimer` hook updated to return `durationSeconds` from API response
- ~10 randomized witty congrats messages
- `formatTime()` for duration display
- Auto-stop countdown also shows success screen
