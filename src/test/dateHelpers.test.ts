import { describe, it, expect } from 'vitest';
import {
  daysRemainingInMonth,
  yearMonth,
  daysBetween,
  parseDate,
  formatDate,
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
