import type { BudgetData } from '../../hooks/useBudgetData';
import { formatCurrency } from '../../lib/formatters';

interface Props {
  data: BudgetData;
}

export function BudgetSummaryCard({ data }: Props) {
  return (
    <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
      <div className="text-center">
        <p className="text-sm text-gray-400">Daily Budget</p>
        <p className={`text-5xl font-bold tabular-nums ${data.dailyBudget >= 0 ? 'text-white' : 'text-red-500'}`}>
          {formatCurrency(data.dailyBudget)}
        </p>
        <p className="text-xs text-gray-500 mt-1">{data.daysRemaining} days remaining</p>
      </div>

      <div className="border-t border-gray-800 pt-4 space-y-2">
        <SummaryRow label="Total available" amount={data.month?.totalAvailable ?? 0} />
        <SummaryRow label="Obligations pending" amount={-data.obligationsRemaining} />
        <SummaryRow label="Savings target" amount={-(data.month?.savingsTarget ?? 0)} />
        <SummaryRow label="Discretionary spent" amount={-data.discretionarySpent} />
        <div className="border-t border-gray-800 pt-2">
          <SummaryRow label="Free pool" amount={data.freePool} bold />
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, amount, bold }: { label: string; amount: number; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={`text-sm ${bold ? 'font-semibold text-white' : 'text-gray-400'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? 'font-semibold' : ''} ${
        amount < 0 && bold ? 'text-red-400' : ''
      }`}>
        {formatCurrency(amount)}
      </span>
    </div>
  );
}
