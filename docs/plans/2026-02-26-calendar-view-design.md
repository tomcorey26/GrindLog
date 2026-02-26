# Calendar View for Sessions

## Summary

Add a month calendar view to the Sessions tab. Users toggle between the existing list view and the new calendar. Tapping a day shows that day's sessions color-coded by habit.

## Architecture

- **New component:** `CalendarView.tsx` — month grid + day detail panel
- **View toggle:** List/calendar icon toggle added inside `SessionsView.tsx`
- **No backend changes.** Reuses existing `/api/sessions` API

## Data Flow

1. `SessionsView` fetches sessions (already does this)
2. Passes sessions array to `CalendarView`
3. `CalendarView` groups sessions by date client-side (`endTime` → `YYYY-MM-DD`)
4. Renders month grid with colored dots on days with sessions

## CalendarView Component

### Month Grid
- 7-column CSS grid, Mon–Sun headers
- Navigation: `< February 2026 >` prev/next month arrows
- Day cells:
  - Colored dots per habit practiced that day
  - Today: subtle ring/border
  - Selected day: solid background highlight
  - Outside-month days: dimmed

### Color Coding
- Each habit assigned a color from a fixed palette (by habit index)
- Same colors used in day dots and day-detail session list

### Day Detail Panel
Shown below calendar when a day is tapped:
- Date header: "Thursday, Feb 26"
- Session list: colored dot + habit name + duration + time range
- Total time for the day

## State
- `selectedDate: string | null` — tapped day (YYYY-MM-DD)
- `currentMonth: Date` — month being displayed
- `viewMode: 'list' | 'calendar'` — added to SessionsView

## Filter Interaction
- Skill filter: applies to both views (only matching dots/sessions shown)
- Date range buttons: hidden in calendar mode (calendar is the navigator)

## Decisions
- Custom-built grid (no library) for full styling control
- Colors assigned by habit index, not random
- Reuse existing API, group client-side
