import { describe, it, expect } from 'vitest';
import { checkImpact, freePool } from '../engine/budgetCalculator';
import { daysRemainingInMonth, yearMonth } from '../engine/dateHelpers';
import { validateMonth } from '../engine/budgetValidator';
import type { Obligation } from '../db/models';

function makeObligation(overrides: Partial<Obligation> = {}): Obligation {
  return {
    id: 1, monthId: 1, name: 'Test', amountPlanned: 100,
    dueDate: '2026-04-15', isRecurring: false, status: 'pending',
    createdAt: '', updatedAt: '',
    ...overrides,
  };
}

describe('edge cases', () => {
  it('last day of month returns 1', () => {
    expect(daysRemainingInMonth(new Date(2026, 3, 30))).toBe(1);
  });

  it('first day of month returns full month', () => {
    expect(daysRemainingInMonth(new Date(2026, 3, 1))).toBe(30);
  });

  it('February leap year', () => {
    expect(daysRemainingInMonth(new Date(2028, 1, 1))).toBe(29);
  });

  it('yearMonth pads single-digit months', () => {
    expect(yearMonth(new Date(2026, 0, 5))).toBe('2026-01');
  });

  it('zero total available', () => {
    const result = checkImpact(50, 0, [], 0, [], new Date(2026, 3, 15));
    // No savings target, so drops > 50% → painful
    expect(result.verdict.severity).toBe('painful');
  });

  it('very large purchase eats into savings', () => {
    const result = checkImpact(999999, 3000, [], 500, [], new Date(2026, 3, 1));
    // No obligations to be at risk, but savings consumed → savings_risk
    expect(result.verdict.severity).toBe('savings_risk');
  });

  it('all obligations paid — full amount is free', () => {
    const obligations = [
      makeObligation({ amountPlanned: 1500, status: 'paid', amountActual: 1500 }),
    ];
    expect(freePool(3000, obligations, 500, [])).toBe(2500);
  });

  it('validation catches overcommitment', () => {
    const obligations = [
      makeObligation({ amountPlanned: 2000 }),
      makeObligation({ amountPlanned: 500 }),
    ];
    const result = validateMonth(2000, obligations, 200);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('exceed');
  });

  it('validation catches negative savings', () => {
    const result = validateMonth(100, [], 200);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
