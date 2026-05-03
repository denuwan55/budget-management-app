import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import {
  freePool,
  dailyBudget,
  obligationsRemaining,
  obligationsPaidAmount,
  discretionarySpent,
} from '../engine/budgetCalculator';
import {
  cycleStartDate,
  cycleEndDate,
  daysRemainingInCycle,
  startOfDay,
} from '../engine/dateHelpers';
import type { Month, Obligation, Purchase } from '../db/models';

export interface BudgetData {
  month: Month | undefined;
  obligations: Obligation[];
  purchases: Purchase[];
  freePool: number;
  dailyBudget: number;
  obligationsRemaining: number;
  billsPaid: number;
  discretionarySpent: number;
  daysRemaining: number;
  pendingObligations: Obligation[];
  overdueObligations: Obligation[];
  upcomingObligations: Obligation[];
  loading: boolean;
}

/**
 * Find the most recent Month whose cycle window contains today.
 * Each Month carries its own anchorDay so anchor changes don't disturb running cycles.
 */
function findActiveMonth(months: Month[], today: Date): Month | undefined {
  const todayStart = startOfDay(today);
  for (const m of months) {
    const start = cycleStartDate(m.yearMonth, m.anchorDay);
    const end = cycleEndDate(m.yearMonth, m.anchorDay);
    if (todayStart >= start && todayStart <= end) return m;
  }
  return undefined;
}

export function useBudgetData(): BudgetData {
  const recentMonths = useLiveQuery(() =>
    db.months.orderBy('yearMonth').reverse().limit(3).toArray()
  );

  const today = new Date();
  const month = recentMonths ? findActiveMonth(recentMonths, today) : undefined;

  const allObligations = useLiveQuery(
    () => (month?.id ? db.obligations.where('monthId').equals(month.id).sortBy('dueDate') : []),
    [month?.id]
  );

  const allPurchases = useLiveQuery(
    () => (month?.id ? db.purchases.where('monthId').equals(month.id).reverse().sortBy('createdAt') : []),
    [month?.id]
  );

  const obligations = allObligations ?? [];
  const purchases = allPurchases ?? [];
  const loading = recentMonths === undefined;

  const todayStr = today.toISOString().split('T')[0];
  const daysLeft = month
    ? daysRemainingInCycle(today, month.yearMonth, month.anchorDay)
    : 1;

  const free = month
    ? freePool(month.totalAvailable, obligations, month.savingsTarget, purchases)
    : 0;

  const daily = dailyBudget(free, daysLeft);

  const pending = obligations.filter((o) => o.status === 'pending');
  const overdue = pending.filter((o) => o.dueDate < todayStr);
  const upcoming = pending
    .filter((o) => o.dueDate >= todayStr)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));

  return {
    month,
    obligations,
    purchases,
    freePool: free,
    dailyBudget: daily,
    obligationsRemaining: obligationsRemaining(obligations),
    billsPaid: obligationsPaidAmount(obligations),
    discretionarySpent: discretionarySpent(purchases),
    daysRemaining: daysLeft,
    pendingObligations: pending,
    overdueObligations: overdue,
    upcomingObligations: upcoming,
    loading,
  };
}
