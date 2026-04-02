import type { Purchase } from '../../db/models';
import { formatCurrency, formatDateTime } from '../../lib/formatters';

interface Props {
  purchase: Purchase;
  onDelete: () => void;
}

export function PurchaseRow({ purchase: p, onDelete }: Props) {
  return (
    <div className="p-4 flex justify-between items-start">
      <div className="flex-1">
        <p className="font-medium">{p.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{formatDateTime(p.createdAt)}</span>
          {p.matchedObligationId && (
            <span className="text-xs px-2 py-0.5 bg-blue-500/15 text-blue-400 rounded-full">
              obligation
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-medium tabular-nums">{formatCurrency(p.amount)}</p>
        <button onClick={onDelete} className="text-red-400 text-xs">{'\u2717'}</button>
      </div>
    </div>
  );
}
