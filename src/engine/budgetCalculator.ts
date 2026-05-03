import type { Obligation, Purchase } from '../db/models';
import type { ImpactResult, ObligationAtRisk, ObligationSummary } from './types';
import { daysRemainingInMonth, daysBetween, startOfDay, parseDate } from './dateHelpers';
import { generateVerdict } from './verdictEngine';

export function obligationsRemaining(obligations: Obligation[]): number {
  return obligations
    .filter((o) => o.status === 'pending')
    .reduce((sum, o) => sum + o.amountPlanned, 0);
}

export function obligationsPaidAmount(obligations: Obligation[]): number {
  return obligations
    .filter((o) => o.status === 'paid')
    .reduce((sum, o) => sum + (o.amountActual ?? o.amountPlanned), 0);
}

export function discretionarySpent(purchases: Purchase[]): number {
  return purchases
    .filter((p) => !p.matchedObligationId)
    .reduce((sum, p) => sum + p.amount, 0);
}

export function freePool(
  totalAvailable: number,
  obligations: Obligation[],
  savingsTarget: number,
  purchases: Purchase[]
): number {
  return (
    totalAvailable -
    obligationsRemaining(obligations) -
    obligationsPaidAmount(obligations) -
    savingsTarget -
    discretionarySpent(purchases)
  );
}

export function dailyBudget(freePoolAmount: number, daysRemaining: number): number {
  if (daysRemaining <= 0) return 0;
  return freePoolAmount / daysRemaining;
}

function findObligationsAtRisk(
  shortfall: number,
  obligations: Obligation[]
): ObligationAtRisk[] {
  if (shortfall <= 0) return [];

  const pending = obligations
    .filter((o) => o.status === 'pending')
    .sort((a, b) => (a.dueDate > b.dueDate ? -1 : 1)); // furthest first

  const atRisk: ObligationAtRisk[] = [];
  let remaining = shortfall;

  for (const obligation of pending) {
    if (remaining <= 0) break;
    const risk = Math.min(remaining, obligation.amountPlanned);
    atRisk.push({
      name: obligation.name,
      amount: obligation.amountPlanned,
      dueDate: obligation.dueDate,
      shortfall: risk,
    });
    remaining -= risk;
  }

  return atRisk;
}

function upcomingObligationSummaries(
  obligations: Obligation[],
  today: Date,
  limit: number = 3
): ObligationSummary[] {
  const todayStart = startOfDay(today);

  return obligations
    .filter((o) => o.status === 'pending' && parseDate(o.dueDate) >= todayStart)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
    .slice(0, limit)
    .map((o) => ({
      name: o.name,
      amount: o.amountPlanned,
      dueDate: o.dueDate,
      daysUntilDue: daysBetween(today, parseDate(o.dueDate)),
    }));
}

export function checkImpact(
  proposedAmount: number,
  totalAvailable: number,
  obligations: Obligation[],
  savingsTarget: number,
  purchases: Purchase[],
  today: Date = new Date(),
  daysRemaining?: number
): ImpactResult {
  const daysLeft = daysRemaining ?? daysRemainingInMonth(today);

  const currentFree = freePool(totalAvailable, obligations, savingsTarget, purchases);
  const currentDaily = dailyBudget(currentFree, daysLeft);

  const proposedFree = currentFree - proposedAmount;
  const proposedDaily = dailyBudget(proposedFree, daysLeft);

  const daysEquiv = currentDaily > 0 ? proposedAmount / currentDaily : Infinity;

  const dropPercent =
    currentDaily > 0
      ? ((currentDaily - proposedDaily) / currentDaily) * 100
      : 100;

  const savingsConsumed = proposedFree < 0 ? Math.min(Math.abs(proposedFree), savingsTarget) : 0;
  const savingsOk = savingsConsumed === 0;

  const totalShortfall = proposedFree < 0 ? Math.abs(proposedFree) - savingsTarget : 0;
  const atRiskObligations = findObligationsAtRisk(
    Math.max(totalShortfall, 0),
    obligations
  );

  const upcoming = upcomingObligationSummaries(obligations, today, 3);

  const verdict = generateVerdict(
    proposedFree,
    dropPercent,
    savingsConsumed,
    atRiskObligations,
    proposedDaily,
    daysLeft
  );

  return {
    currentFreePool: currentFree,
    currentDailyBudget: currentDaily,
    proposedFreePool: proposedFree,
    proposedDailyBudget: proposedDaily,
    daysEquivalent: daysEquiv,
    dailyBudgetDropPercent: dropPercent,
    savingsIntact: savingsOk,
    savingsAtRisk: savingsConsumed,
    obligationsIntact: atRiskObligations.length === 0,
    obligationsAtRisk: atRiskObligations,
    daysRemaining: daysLeft,
    upcomingObligations: upcoming,
    verdict,
  };
}
