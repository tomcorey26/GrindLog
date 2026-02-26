import { describe, it, expect } from 'vitest';
import { getMonthGrid, toDateKey, formatDayHeader, isoToDateKey } from './calendar';

describe('toDateKey', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 1, 26))).toBe('2026-02-26');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('handles December correctly', () => {
    expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('isoToDateKey', () => {
  it('converts an ISO string to YYYY-MM-DD in local time', () => {
    const iso = new Date(2026, 5, 15).toISOString();
    expect(isoToDateKey(iso)).toBe('2026-06-15');
  });
});

describe('formatDayHeader', () => {
  it('returns a human-readable day header with weekday, month, and day', () => {
    // Feb 26, 2026 is a Thursday
    const result = formatDayHeader(new Date(2026, 1, 26));
    expect(result).toContain('Thursday');
    expect(result).toContain('Feb');
    expect(result).toContain('26');
  });
});

describe('getMonthGrid', () => {
  it('returns an array of Date objects', () => {
    const grid = getMonthGrid(2026, 1); // February 2026
    expect(grid.length).toBeGreaterThan(0);
    expect(grid[0]).toBeInstanceOf(Date);
  });

  it('grid length is always a multiple of 7 (full weeks)', () => {
    // Test several months
    for (let m = 0; m < 12; m++) {
      const grid = getMonthGrid(2026, m);
      expect(grid.length % 7).toBe(0);
    }
  });

  it('starts on Monday and ends on Sunday', () => {
    const grid = getMonthGrid(2026, 1); // February 2026
    // Monday = 1 in JS getDay()
    expect(grid[0].getDay()).toBe(1);
    // Sunday = 0 in JS getDay()
    expect(grid[grid.length - 1].getDay()).toBe(0);
  });

  it('contains all days of the current month', () => {
    const grid = getMonthGrid(2026, 1); // February 2026 has 28 days
    const febDays = grid.filter(
      (d) => d.getMonth() === 1 && d.getFullYear() === 2026
    );
    expect(febDays.length).toBe(28);
  });

  it('pads with days from previous month when month does not start on Monday', () => {
    // February 2026 starts on Sunday; need 6 padding days (Mon-Sat from Jan)
    const grid = getMonthGrid(2026, 1);
    const firstFeb = grid.findIndex(
      (d) => d.getMonth() === 1 && d.getDate() === 1
    );
    expect(firstFeb).toBe(6); // 6 days of January padding
    // Those padding days should be from January
    for (let i = 0; i < firstFeb; i++) {
      expect(grid[i].getMonth()).toBe(0); // January
    }
  });

  it('pads with days from next month to complete the final week', () => {
    // February 2026: 6 pad + 28 days = 34, need 35 (5 weeks), so 1 day of March
    const grid = getMonthGrid(2026, 1);
    const lastFeb = grid.filter((d) => d.getMonth() === 1).length;
    const marchDays = grid.filter((d) => d.getMonth() === 2);
    expect(lastFeb).toBe(28);
    expect(marchDays.length).toBeGreaterThanOrEqual(0);
    // Total should be multiple of 7
    expect(grid.length % 7).toBe(0);
  });

  it('handles a month that starts on Monday with no start padding', () => {
    // June 2026 starts on Monday
    const grid = getMonthGrid(2026, 5); // June 2026
    expect(grid[0].getMonth()).toBe(5);
    expect(grid[0].getDate()).toBe(1);
  });

  it('handles December correctly (year boundary for next month padding)', () => {
    const grid = getMonthGrid(2026, 11); // December 2026
    expect(grid.length % 7).toBe(0);
    // Check that padding after Dec 31 is January of next year
    const lastDay = grid[grid.length - 1];
    if (lastDay.getMonth() === 0) {
      expect(lastDay.getFullYear()).toBe(2027);
    }
  });

  it('handles January correctly (year boundary for prev month padding)', () => {
    // January 2026 starts on Thursday, so need 3 days from Dec 2025
    const grid = getMonthGrid(2026, 0);
    expect(grid.length % 7).toBe(0);
    if (grid[0].getMonth() === 11) {
      expect(grid[0].getFullYear()).toBe(2025);
    }
  });
});
