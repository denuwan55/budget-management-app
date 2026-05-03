/**
 * Integration tests for the budget engine with realistic scenarios.
 * These tests use pure functions only — no Dexie required.
 */
import { describe, it, expect } from 'vitest';
import { freePool, dailyBudget, checkImpact, obligationsRemaining, discretionarySpent } from '../engine/budgetCalculator';
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
    description: 'Coffee',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Realistic scenario: mid-month with obligations and purchases', () => {
  // April 15 — 16 days remaining
  const today = new Date(2026, 3, 15);

  const obligations: Obligation[] = [
    makeObligation({ id: 1, name: 'Rent', amountPlanned: 1200, dueDate: '2026-04-30', status: 'pending' }),
    makeObligation({ id: 2, name: 'Internet', amountPlanned: 80, dueDate: '2026-04-20', status: 'pending' }),
    makeObligation({ id: 3, name: 'Gym', amountPlanned: 50, dueDate: '2026-04-10', status: 'paid' }),
  ];

  const purchases: Purchase[] = [
    makePurchase({ id: 1, amount: 40, description: 'Groceries' }),
    makePurchase({ id: 2, amount: 25, description: 'Coffee x5' }),
    makePurchase({ id: 3, amount: 50, description: 'Gym payment', matchedObligationId: 3 }),
  ];

  it('computes obligations remaining correctly (excludes paid)', () => {
    expect(obligationsRemaining(obligations)).toBe(1280); // 1200 + 80
  });

  it('computes discretionary spent correctly (excludes matched)', () => {
    expect(discretionarySpent(purchases)).toBe(65); // 40 + 25
  });

  it('computes free pool correctly', () => {
    // 3000 - 1280(pending) - 50(Gym paid) - 300(savings) - 65(discretionary) = 1305
    expect(freePool(3000, obligations, 300, purchases)).toBe(1305);
  });

  it('computes daily budget correctly', () => {
    const free = freePool(3000, obligations, 300, purchases); // 1305
    expect(dailyBudget(free, 16)).toBeCloseTo(81.56, 1);
  });

  it('impact check for a $200 discretionary purchase', () => {
    const result = checkImpact(200, 3000, obligations, 300, purchases, today);
    expect(result.currentFreePool).toBe(1305);
    expect(result.proposedFreePool).toBe(1105);
    expect(result.savingsIntact).toBe(true);
    expect(result.obligationsIntact).toBe(true);
    // drop ≈ 15% — comfortable
    expect(result.verdict.severity).toBe('comfortable');
  });
});

describe('Scenario: tight budget — large purchase check', () => {
  const today = new Date(2026, 3, 20); // April 20 — 11 days remaining

  const obligations: Obligation[] = [
    makeObligation({ id: 1, name: 'Rent', amountPlanned: 1200, dueDate: '2026-04-30', status: 'pending' }),
  ];

  it('returns painful verdict for large purchase that drops budget >50%', () => {
    // free = 1800 - 1200 - 200 - 0 = 400; daily = 400/11 ≈ 36.36
    // purchase 300 → proposed = 100; proposed daily = 100/11 ≈ 9.09
    // drop ≈ 75%
    const result = checkImpact(300, 1800, obligations, 200, [], today);
    expect(result.verdict.severity).toBe('painful');
  });
});

describe('Scenario: overcommitted month', () => {
  const today = new Date(2026, 3, 25); // April 25 — 6 days remaining

  const obligations: Obligation[] = [
    makeObligation({ id: 1, name: 'Rent', amountPlanned: 1500, dueDate: '2026-04-30', status: 'pending' }),
    makeObligation({ id: 2, name: 'Car payment', amountPlanned: 400, dueDate: '2026-04-28', status: 'pending' }),
  ];

  it('any purchase puts obligations at risk when savings cannot cover', () => {
    // free = 1800 - 1900 - 0 - 0 = -100
    // purchase 50 → proposed = -150, shortfall after savings(0) = 150
    const result = checkImpact(50, 1800, obligations, 0, [], today);
    expect(result.verdict.severity).toBe('cannot_afford');
    expect(result.obligationsAtRisk.length).toBeGreaterThan(0);
  });

  it('savings can buffer a small overage', () => {
    // free = 1800 - 1900 - 200 savings - 0 = -300
    // free pool is already negative, any purchase makes it worse
    // purchase 10 → proposed free = -310, savings consumed = min(310, 200) = 200
    // shortfall after savings = 310 - 200 = 110 → obligations at risk
    const result = checkImpact(10, 1800, obligations, 200, [], today);
    expect(result.verdict.severity).toBe('cannot_afford');
  });
});
