import type { Verdict, ObligationAtRisk } from './types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateVerdict(
  proposedFreePool: number,
  dailyBudgetDropPercent: number,
  savingsAtRisk: number,
  obligationsAtRisk: ObligationAtRisk[],
  proposedDailyBudget: number,
  daysRemaining: number
): Verdict {
  // Level 5: Can't afford — obligations at risk
  if (obligationsAtRisk.length > 0) {
    const topRisk = obligationsAtRisk[0];
    return {
      severity: 'cannot_afford',
      headline: "You can't afford this.",
      detail: `This would put ${topRisk.name} (${formatCurrency(topRisk.amount)}) at risk. You'd be short ${formatCurrency(topRisk.shortfall)}.`,
    };
  }

  // Level 4: Savings at risk
  if (savingsAtRisk > 0) {
    return {
      severity: 'savings_risk',
      headline: 'This eats into savings.',
      detail: `You'd lose ${formatCurrency(savingsAtRisk)} from your savings target. Your discretionary budget would be at ${formatCurrency(0)} for the rest of the month.`,
    };
  }

  // Level 3: Painful — daily budget drops > 50%
  if (dailyBudgetDropPercent > 50) {
    return {
      severity: 'painful',
      headline: "Affordable, but it'll hurt.",
      detail: `Your daily budget drops to ${formatCurrency(proposedDailyBudget)}/day for the next ${daysRemaining} days. That's a ${Math.round(dailyBudgetDropPercent)}% cut.`,
    };
  }

  // Level 2: Tight — daily budget drops 25-50%
  if (dailyBudgetDropPercent > 25) {
    return {
      severity: 'tight',
      headline: 'Safe, but tight.',
      detail: `You'll need to average ${formatCurrency(proposedDailyBudget)}/day for the rest of the month.`,
    };
  }

  // Level 1: Comfortable
  const purchasesLeft =
    proposedDailyBudget > 0
      ? Math.floor(proposedFreePool / proposedDailyBudget)
      : 0;
  return {
    severity: 'comfortable',
    headline: 'Comfortable.',
    detail: `You'll still have ${formatCurrency(proposedFreePool)} free. That's about ${purchasesLeft} more days of normal spending.`,
  };
}
