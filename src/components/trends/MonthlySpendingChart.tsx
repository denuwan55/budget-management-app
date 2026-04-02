import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CATEGORIES, CATEGORY_HEX, type Category } from '../../db/categories';
import type { MonthlySpendingData } from '../../hooks/useTrendsData';

interface Props {
  data: MonthlySpendingData[];
}

export function MonthlySpendingChart({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="bg-gray-900 rounded-2xl p-4">
      <h2 className="text-sm font-semibold text-gray-400 mb-3">Monthly Spending</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: '#d1d5db' }}
            itemStyle={{ color: '#d1d5db' }}
            formatter={(value) => [`$${Math.round(Number(value))}`, undefined]}
          />
          {CATEGORIES.map((cat) => (
            <Bar
              key={cat}
              dataKey={cat}
              stackId="spending"
              fill={CATEGORY_HEX[cat as Category]}
              radius={cat === CATEGORIES[CATEGORIES.length - 1] ? [4, 4, 0, 0] : undefined}
            />
          ))}
          <Bar
            dataKey="Uncategorized"
            stackId="spending"
            fill="#4b5563"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
