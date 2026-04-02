import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../lib/formatters';
import type { CategoryBreakdown } from '../../hooks/useTrendsData';

interface Props {
  data: CategoryBreakdown[];
}

export function CategoryBreakdownChart({ data }: Props) {
  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="bg-gray-900 rounded-2xl p-4">
      <h2 className="text-sm font-semibold text-gray-400 mb-3">This Month by Category</h2>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5">
          {data.map((entry) => (
            <div key={entry.category} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-300">{entry.category}</span>
              </div>
              <span className="text-gray-400 tabular-nums">
                {formatCurrency(entry.amount)}
                <span className="text-gray-600 ml-1 text-xs">
                  {total > 0 ? `${Math.round((entry.amount / total) * 100)}%` : ''}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
