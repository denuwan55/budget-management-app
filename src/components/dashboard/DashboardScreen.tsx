import { useBudgetData } from '../../hooks/useBudgetData';
import { BudgetSummaryCard } from './BudgetSummaryCard';
import { UpcomingObligations } from './UpcomingObligations';
import { validateMonth } from '../../engine/budgetValidator';
import { formatCurrency } from '../../lib/formatters';
import { EmptyState } from '../shared/EmptyState';

export function DashboardScreen() {
  const data = useBudgetData();

  if (!data.month) {
    return <EmptyState icon={'\uD83D\uDCCA'} title="No Month Set Up" subtitle="Go to Check tab to set up your first month." />;
  }

  const validation = validateMonth(data.month.totalAvailable, data.obligations, data.month.savingsTarget);

  return (
    <div className="p-6 pt-8 space-y-4">
      <h1 className="text-xl font-bold">Dashboard</h1>

      <BudgetSummaryCard data={data} />

      {validation.warnings.map((w, i) => (
        <div key={i} className="bg-yellow-500/10 rounded-2xl p-3">
          <p className="text-sm text-yellow-400">{w}</p>
        </div>
      ))}

      {data.overdueObligations.length > 0 && (
        <div className="bg-orange-500/10 rounded-2xl p-4">
          <p className="text-sm font-semibold text-orange-400 mb-2">Overdue</p>
          {data.overdueObligations.map((o) => (
            <div key={o.id} className="flex justify-between py-1">
              <span className="text-sm text-gray-300">{o.name}</span>
              <span className="text-sm text-orange-400">{formatCurrency(o.amountPlanned)}</span>
            </div>
          ))}
        </div>
      )}

      <UpcomingObligations obligations={data.upcomingObligations} />
    </div>
  );
}
