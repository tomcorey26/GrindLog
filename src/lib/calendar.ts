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
