import { describe, it, expect } from 'vitest';
import {
  obligationsRemaining,
  discretionarySpent,
  freePool,
  dailyBudget,
  checkImpact,
} from '../engine/budgetCalculator';
import type { Obligation, Purchase } from '../db/models';

function makeObligation(overrides: Partial<Obligation> = {}): Obligation {
  return {
    id: 1,
    monthId: 1,
    name: 'Test',
    amountPlanned: 100,
    dueDate: '2026-04-15',
    isRecurring: false,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: 1,
    monthId: 1,
    amount: 50,
    description: 'Test purchase',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('obligationsRemaining', () => {
  it('sums pending obligations only', () => {
    const obligations = [
      makeObligation({ id: 1, amountPlanned: 100, status: 'pending' }),
      makeObligation({ id: 2, amountPlanned: 200, status: 'paid' }),
      makeObligation({ id: 3, amountPlanned: 150, status: 'cancelled' }),
    ];
    expect(obligationsRemaining(obligations)).toBe(100);
  });

  it('returns 0 when all obligations are paid', () => {
    const obligations = [
      makeObligation({ status: 'paid' }),
      makeObligation({ status: 'cancelled' }),
    ];
    expect(obligationsRemaining(obligations)).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(obligationsRemaining([])).toBe(0);
  });
});

describe('discretionarySpent', () => {
  it('sums purchases without matched obligations', () => {
    const purchases = [
      makePurchase({ id: 1, amount: 50 }),
      makePurchase({ id: 2, amount: 30, matchedObligationId: 5 }),
      makePurchase({ id: 3, amount: 20 }),
    ];
    expect(discretionarySpent(purchases)).toBe(70);
  });

  it('returns 0 when all purchases are obligation-matched', () => {
    const purchases = [
      makePurchase({ matchedObligationId: 1 }),
      makePurchase({ matchedObligationId: 2 }),
    ];
    expect(discretionarySpent(purchases)).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(discretionarySpent([])).toBe(0);
  });
});

describe('freePool', () => {
  it('calculates free pool correctly', () => {
    const obligations = [makeObligation({ amountPlanned: 500, status: 'pending' })];
    const purchases = [makePurchase({ amount: 100 })];
    // 2000 - 500 (obligations) - 200 (savings) - 100 (discretionary) = 1200
    expect(freePool(2000, obligations, 200, purchases)).toBe(1200);
  });

  it('returns negative value when overcommitted', () => {
    const obligations = [makeObligation({ amountPlanned: 1500, status: 'pending' })];
    // 1000 - 1500 - 200 - 0 = -700
    expect(freePool(1000, obligations, 200, [])).toBe(-700);
  });

  it('excludes paid obligations from calculation', () => {
    const obligations = [
      makeObligation({ amountPlanned: 300, status: 'pending' }),
      makeObligation({ amountPlanned: 200, status: 'paid' }),
    ];
    // 1000 - 300 - 0 - 0 = 700
    expect(freePool(1000, obligations, 0, [])).toBe(700);
  });
});

describe('dailyBudget', () => {
  it('divides free pool by days remaining', () => {
    expect(dailyBudget(300, 10)).toBe(30);
  });

  it('returns 0 when days remaining is 0', () => {
    expect(dailyBudget(300, 0)).toBe(0);
  });

  it('handles negative free pool', () => {
    expect(dailyBudget(-300, 10)).toBe(-30);
  });
});

describe('checkImpact', () => {
  const today = new Date(2026, 3, 15); // April 15 — 16 days remaining
  const obligations = [makeObligation({ amountPlanned: 500, dueDate: '2026-04-25' })];

  it('produces comfortable verdict for small purchase', () => {
    // free pool = 2000 - 500 - 200 - 0 = 1300, daily = 1300/16 ≈ 81.25
    // purchase of 50 = 50/81.25 ≈ 0.6 days, drop = ~3.8%
    const result = checkImpact(50, 2000, obligations, 200, [], today);
    expect(result.verdict.severity).toBe('comfortable');
    expect(result.proposedFreePool).toBe(1250);
    expect(result.savingsIntact).toBe(true);
    expect(result.obligationsIntact).toBe(true);
  });

  it('correctly calculates days equivalent', () => {
    // free pool = 1600 - 0 - 0 - 0 = 1600, daily = 1600/16 = 100
    // purchase of 200 = 2 days equivalent
    const result = checkImpact(200, 1600, [], 0, [], today);
    expect(result.daysEquivalent).toBeCloseTo(2, 1);
  });

  it('flags savings risk when free pool goes negative', () => {
    // free pool = 1000 - 900 (obligation) - 200 (savings) - 0 = -100
    // purchase of 50 would make it -150 — savings consumed = 150 capped at 200
    const tightObligations = [makeObligation({ amountPlanned: 900, dueDate: '2026-04-25' })];
    const result = checkImpact(50, 1000, tightObligations, 200, [], today);
    expect(result.verdict.severity).toBe('savings_risk');
    expect(result.savingsIntact).toBe(false);
  });

  it('flags cannot_afford when obligations are at risk', () => {
    // free pool = 500 - 800 (obligation) - 0 - 0 = -300
    // purchase of 100 → proposed = -400, shortfall after savings = -400 (no savings) → obligations at risk
    const bigObligations = [makeObligation({ amountPlanned: 800, dueDate: '2026-04-25' })];
    const result = checkImpact(100, 500, bigObligations, 0, [], today);
    expect(result.verdict.severity).toBe('cannot_afford');
    expect(result.obligationsIntact).toBe(false);
  });

  it('includes upcoming obligations in result', () => {
    const result = checkImpact(50, 2000, obligations, 200, [], today);
    expect(result.upcomingObligations).toHaveLength(1);
    expect(result.upcomingObligations[0].name).toBe('Test');
  });
});
