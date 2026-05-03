import { describe, it, expect } from 'vitest';
import {
  daysRemainingInMonth,
  yearMonth,
  daysBetween,
  parseDate,
  formatDate,
  cycleYearMonth,
  cycleStartDate,
  cycleEndDate,
  daysRemainingInCycle,
} from '../engine/dateHelpers';

describe('daysRemainingInMonth', () => {
  it('returns 30 on April 1st', () => {
    expect(daysRemainingInMonth(new Date(2026, 3, 1))).toBe(30);
  });

  it('returns 1 on the last day of April', () => {
    expect(daysRemainingInMonth(new Date(2026, 3, 30))).toBe(1);
  });

  it('handles February in a leap year', () => {
    expect(daysRemainingInMonth(new Date(2028, 1, 1))).toBe(29);
  });

  it('returns minimum 1 to avoid division by zero', () => {
    expect(daysRemainingInMonth(new Date(2026, 3, 30))).toBeGreaterThanOrEqual(1);
  });
});

describe('yearMonth', () => {
  it('formats with zero-padded month', () => {
    expect(yearMonth(new Date(2026, 0, 5))).toBe('2026-01');
    expect(yearMonth(new Date(2026, 11, 25))).toBe('2026-12');
  });

  it('formats April correctly', () => {
    expect(yearMonth(new Date(2026, 3, 15))).toBe('2026-04');
  });
});

describe('daysBetween', () => {
  it('calculates days between two dates', () => {
    expect(daysBetween(new Date(2026, 3, 1), new Date(2026, 3, 10))).toBe(9);
  });

  it('returns 0 for the same date', () => {
    expect(daysBetween(new Date(2026, 3, 5), new Date(2026, 3, 5))).toBe(0);
  });

  it('is absolute (order does not matter)', () => {
    expect(daysBetween(new Date(2026, 3, 10), new Date(2026, 3, 1))).toBe(9);
  });
});

describe('parseDate / formatDate', () => {
  it('round-trips correctly', () => {
    expect(formatDate(parseDate('2026-04-07'))).toBe('2026-04-07');
  });

  it('parses to correct components', () => {
    const d = parseDate('2026-12-25');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(11); // 0-indexed
    expect(d.getDate()).toBe(25);
  });
});

describe('cycleYearMonth', () => {
  it('anchor=1 matches calendar yearMonth', () => {
    expect(cycleYearMonth(new Date(2026, 4, 10), 1)).toBe('2026-05');
    expect(cycleYearMonth(new Date(2026, 4, 1), 1)).toBe('2026-05');
  });

  it('anchor=25, date after anchor returns current calendar month', () => {
    // May 25 → cycle starts May 25 → "2026-05"
    expect(cycleYearMonth(new Date(2026, 4, 25), 25)).toBe('2026-05');
    expect(cycleYearMonth(new Date(2026, 4, 31), 25)).toBe('2026-05');
  });

  it('anchor=25, date before anchor returns previous calendar month', () => {
    // May 10 → cycle started Apr 25 → "2026-04"
    expect(cycleYearMonth(new Date(2026, 4, 10), 25)).toBe('2026-04');
    expect(cycleYearMonth(new Date(2026, 4, 24), 25)).toBe('2026-04');
  });

  it('handles year boundary (Jan before anchor → previous Dec)', () => {
    // Jan 10, anchor 25 → cycle started Dec 25 → "2025-12"
    expect(cycleYearMonth(new Date(2026, 0, 10), 25)).toBe('2025-12');
  });
});

describe('cycleStartDate / cycleEndDate', () => {
  it('anchor=1 cycle spans calendar month', () => {
    const start = cycleStartDate('2026-04', 1);
    const end = cycleEndDate('2026-04', 1);
    expect(formatDate(start)).toBe('2026-04-01');
    expect(formatDate(end)).toBe('2026-04-30');
  });

  it('anchor=25 cycle spans Apr 25 → May 24', () => {
    expect(formatDate(cycleStartDate('2026-04', 25))).toBe('2026-04-25');
    expect(formatDate(cycleEndDate('2026-04', 25))).toBe('2026-05-24');
  });

  it('anchor=25 cycle Dec → Jan crosses year boundary', () => {
    expect(formatDate(cycleStartDate('2025-12', 25))).toBe('2025-12-25');
    expect(formatDate(cycleEndDate('2025-12', 25))).toBe('2026-01-24');
  });
});

describe('daysRemainingInCycle', () => {
  it('on cycle start day returns full cycle length', () => {
    // Apr 25 → May 24 = 30 days inclusive
    expect(daysRemainingInCycle(new Date(2026, 3, 25), '2026-04', 25)).toBe(30);
  });

  it('on cycle end day returns 1', () => {
    expect(daysRemainingInCycle(new Date(2026, 4, 24), '2026-04', 25)).toBe(1);
  });

  it('mid-cycle returns days until end inclusive', () => {
    // May 10 in cycle Apr 25 → May 24: days remaining = 24-10+1 = 15
    expect(daysRemainingInCycle(new Date(2026, 4, 10), '2026-04', 25)).toBe(15);
  });

  it('returns minimum 1 past cycle end', () => {
    expect(daysRemainingInCycle(new Date(2026, 5, 1), '2026-04', 25)).toBe(1);
  });

  it('anchor=1 matches daysRemainingInMonth behavior', () => {
    expect(daysRemainingInCycle(new Date(2026, 3, 1), '2026-04', 1)).toBe(30);
    expect(daysRemainingInCycle(new Date(2026, 3, 30), '2026-04', 1)).toBe(1);
  });
});
