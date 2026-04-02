import { useTrendsData } from '../../hooks/useTrendsData';
import { MonthlySpendingChart } from './MonthlySpendingChart';
import { CategoryBreakdownChart } from './CategoryBreakdownChart';
import { EmptyState } from '../shared/EmptyState';
import { formatCurrency } from '../../lib/formatters';

export function TrendsScreen() {
  const { monthlySpending, categoryBreakdown, currentMonth, loading } = useTrendsData();

  if (loading) {
    return (
      <div className="p-6 pt-8 animate-pulse space-y-4">
        <div className="h-6 w-24 bg-gray-800 rounded" />
        <div className="h-56 bg-gray-800 rounded-2xl" />
        <div className="h-44 bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  if (monthlySpending.length === 0) {
    return <EmptyState icon={'\uD83D\uDCC8'} title="No Data Yet" subtitle="Track spending for at least one month to see trends." />;
  }

  const totalThisMonth = currentMonth
    ? monthlySpending[monthlySpending.length - 1]?.total ?? 0
    : 0;

  return (
    <div className="p-6 pt-8 space-y-4">
      <div className="flex justify-between items-baseline">
        <h1 className="text-xl font-bold">Trends</h1>
        {currentMonth && (
          <span className="text-sm text-gray-400">
            {currentMonth.yearMonth} &middot; {formatCurrency(totalThisMonth)} spent
          </span>
        )}
      </div>

      <MonthlySpendingChart data={monthlySpending} />
      <CategoryBreakdownChart data={categoryBreakdown} />
    </div>
  );
}
