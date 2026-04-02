import { describe, it, expect } from 'vitest';
import { generateForNewMonth } from '../engine/recurrenceEngine';
import type { Obligation } from '../db/models';

function makeObligation(overrides: Partial<Obligation>): Obligation {
  return {
    id: 1, monthId: 1, name: 'Test', amountPlanned: 100,
    dueDate: '2026-03-15', isRecurring: false, status: 'pending',
    createdAt: '', updatedAt: '',
    ...overrides,
  };
}

describe('generateForNewMonth', () => {
  it('generates monthly obligation on same day', () => {
    const templates = [
      makeObligation({ name: 'Rent', amountPlanned: 1500, dueDate: '2026-03-01', isRecurring: true, recurrenceRule: 'monthly' }),
    ];
    const result = generateForNewMonth(templates, '2026-04');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Rent');
    expect(result[0].dueDate).toBe('2026-04-01');
    expect(result[0].amountPlanned).toBe(1500);
  });

  it('clamps day to last day of shorter month', () => {
    const templates = [
      makeObligation({ name: 'Test', dueDate: '2026-03-31', isRecurring: true, recurrenceRule: 'monthly' }),
    ];
    const result = generateForNewMonth(templates, '2026-04');
    expect(result[0].dueDate).toBe('2026-04-30');
  });

  it('generates weekly obligations (4-5 per month)', () => {
    const templates = [
      makeObligation({ name: 'Groceries', amountPlanned: 100, dueDate: '2026-03-02', isRecurring: true, recurrenceRule: 'weekly' }),
    ];
    // March 2 is a Monday. April 2026 Mondays: 6, 13, 20, 27 = 4
    const result = generateForNewMonth(templates, '2026-04');
    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(result.every((o) => o.name === 'Groceries')).toBe(true);
  });

  it('generates biweekly obligations (2 per month)', () => {
    const templates = [
      makeObligation({ name: 'Cleaner', amountPlanned: 80, dueDate: '2026-03-05', isRecurring: true, recurrenceRule: 'biweekly' }),
    ];
    // March 5, 2026 is Thursday. April Thursdays: 2, 16, 30 = 3 biweekly
    const result = generateForNewMonth(templates, '2026-04');
    expect(result.length).toBe(3);
  });

  it('skips non-recurring obligations', () => {
    const templates = [
      makeObligation({ name: 'Birthday', isRecurring: false }),
    ];
    expect(generateForNewMonth(templates, '2026-04')).toHaveLength(0);
  });

  it('handles February in a leap year', () => {
    const templates = [
      makeObligation({ name: 'Test', dueDate: '2028-01-31', isRecurring: true, recurrenceRule: 'monthly' }),
    ];
    const result = generateForNewMonth(templates, '2028-02');
    expect(result[0].dueDate).toBe('2028-02-29');
  });
});
