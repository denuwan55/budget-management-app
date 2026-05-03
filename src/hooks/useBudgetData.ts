import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { yearMonth as getYearMonth } from '../engine/dateHelpers';
import {
  freePool,
  dailyBudget,
  obligationsRemaining,
  obligationsPaidAmount,
  discretionarySpent,
} from '../engine/budgetCalculator';
import { daysRemainingInMonth } from '../engine/dateHelpers';
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

export function useBudgetData(): BudgetData {
  const ym = getYearMonth();

  const month = useLiveQuery(() => db.months.where('yearMonth').equals(ym).first());

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
  const loading = month === undefined && allObligations === undefined;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const daysLeft = daysRemainingInMonth(today);

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
