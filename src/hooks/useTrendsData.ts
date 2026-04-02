import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { CATEGORIES, CATEGORY_HEX, type Category } from '../db/categories';
import type { Month, Purchase } from '../db/models';

export interface MonthlySpendingData {
  yearMonth: string;
  label: string;
  total: number;
  [key: string]: string | number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  color: string;
}

export interface TrendsData {
  monthlySpending: MonthlySpendingData[];
  categoryBreakdown: CategoryBreakdown[];
  currentMonth: Month | undefined;
  loading: boolean;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthLabel(yearMonth: string): string {
  const month = parseInt(yearMonth.split('-')[1]) - 1;
  return MONTH_LABELS[month];
}

function aggregateByCategory(purchases: Purchase[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const cat of CATEGORIES) result[cat] = 0;
  result['Uncategorized'] = 0;

  for (const p of purchases) {
    const cat = p.category && CATEGORIES.includes(p.category as Category)
      ? p.category
      : 'Uncategorized';
    result[cat] = (result[cat] || 0) + p.amount;
  }
  return result;
}

export function useTrendsData(): TrendsData {
  const months = useLiveQuery(() =>
    db.months.orderBy('yearMonth').reverse().limit(6).toArray().then(m => m.reverse())
  );

  const monthIds = months?.map(m => m.id!).filter(Boolean) ?? [];

  const purchases = useLiveQuery(
    () => monthIds.length > 0
      ? db.purchases.where('monthId').anyOf(monthIds).toArray()
      : [],
    [monthIds.join(',')]
  );

  const loading = months === undefined;

  if (!months || !purchases) {
    return { monthlySpending: [], categoryBreakdown: [], currentMonth: undefined, loading };
  }

  // Group purchases by monthId
  const purchasesByMonth = new Map<number, Purchase[]>();
  for (const p of purchases) {
    const list = purchasesByMonth.get(p.monthId) ?? [];
    list.push(p);
    purchasesByMonth.set(p.monthId, list);
  }

  // Monthly spending data (stacked bar chart)
  const monthlySpending: MonthlySpendingData[] = months.map(m => {
    const mp = purchasesByMonth.get(m.id!) ?? [];
    const cats = aggregateByCategory(mp);
    const total = mp.reduce((s, p) => s + p.amount, 0);
    return {
      yearMonth: m.yearMonth,
      label: getMonthLabel(m.yearMonth),
      total,
      ...cats,
    };
  });

  // Category breakdown for most recent month
  const currentMonth = months[months.length - 1];
  const currentPurchases = currentMonth ? (purchasesByMonth.get(currentMonth.id!) ?? []) : [];
  const catTotals = aggregateByCategory(currentPurchases);

  const categoryBreakdown: CategoryBreakdown[] = [
    ...CATEGORIES.map(cat => ({
      category: cat,
      amount: catTotals[cat] || 0,
      color: CATEGORY_HEX[cat],
    })),
    {
      category: 'Uncategorized',
      amount: catTotals['Uncategorized'] || 0,
      color: '#4b5563',
    },
  ].filter(c => c.amount > 0);

  return { monthlySpending, categoryBreakdown, currentMonth, loading };
}
