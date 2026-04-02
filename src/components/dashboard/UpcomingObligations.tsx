import type { Obligation } from '../../db/models';
import { formatCurrency, formatDateShort } from '../../lib/formatters';

interface Props {
  obligations: Obligation[];
}

export function UpcomingObligations({ obligations }: Props) {
  return (
    <div className="bg-gray-900 rounded-2xl p-4">
      <p className="text-sm font-semibold mb-3">Upcoming</p>
      {obligations.length === 0 ? (
        <p className="text-sm text-gray-500">No upcoming obligations</p>
      ) : (
        obligations.slice(0, 5).map((o) => (
          <div key={o.id} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
            <div>
              <p className="text-sm font-medium">{o.name}</p>
              <p className="text-xs text-gray-500">{formatDateShort(o.dueDate)}</p>
            </div>
            <p className="text-sm tabular-nums">{formatCurrency(o.amountPlanned)}</p>
          </div>
        ))
      )}
    </div>
  );
}
