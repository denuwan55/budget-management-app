import { describe, it, expect } from 'vitest';
import { generateVerdict } from '../engine/verdictEngine';
import type { ObligationAtRisk } from '../engine/types';

const noObligationsAtRisk: ObligationAtRisk[] = [];

describe('generateVerdict', () => {
  it('returns comfortable when drop is < 25%', () => {
    const verdict = generateVerdict(1000, 10, 0, noObligationsAtRisk, 90, 10);
    expect(verdict.severity).toBe('comfortable');
    expect(verdict.headline).toBe('Comfortable.');
  });

  it('returns tight when drop is between 25% and 50%', () => {
    const verdict = generateVerdict(700, 35, 0, noObligationsAtRisk, 65, 10);
    expect(verdict.severity).toBe('tight');
    expect(verdict.headline).toBe('Safe, but tight.');
  });

  it('returns painful when drop is > 50%', () => {
    const verdict = generateVerdict(400, 60, 0, noObligationsAtRisk, 40, 10);
    expect(verdict.severity).toBe('painful');
    expect(verdict.headline).toContain("hurt");
  });

  it('returns savings_risk when savings are consumed', () => {
    const verdict = generateVerdict(-50, 100, 50, noObligationsAtRisk, 0, 10);
    expect(verdict.severity).toBe('savings_risk');
    expect(verdict.headline).toBe('This eats into savings.');
  });

  it('returns cannot_afford when obligations are at risk', () => {
    const atRisk: ObligationAtRisk[] = [
      { name: 'Rent', amount: 1200, dueDate: '2026-04-30', shortfall: 200 },
    ];
    const verdict = generateVerdict(-200, 100, 0, atRisk, 0, 10);
    expect(verdict.severity).toBe('cannot_afford');
    expect(verdict.headline).toContain("can't afford");
    expect(verdict.detail).toContain('Rent');
  });

  it('obligations at risk take priority over savings risk', () => {
    const atRisk: ObligationAtRisk[] = [
      { name: 'Rent', amount: 1200, dueDate: '2026-04-30', shortfall: 200 },
    ];
    const verdict = generateVerdict(-500, 100, 100, atRisk, 0, 10);
    expect(verdict.severity).toBe('cannot_afford');
  });

  it('detail mentions the obligation name when cannot_afford', () => {
    const atRisk: ObligationAtRisk[] = [
      { name: 'Phone Bill', amount: 80, dueDate: '2026-04-20', shortfall: 30 },
    ];
    const verdict = generateVerdict(-30, 100, 0, atRisk, 0, 10);
    expect(verdict.detail).toContain('Phone Bill');
  });
});
