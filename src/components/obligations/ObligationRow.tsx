import type { Obligation } from '../../db/models';
import { formatCurrency, formatDateShort } from '../../lib/formatters';

interface Props {
  obligation: Obligation;
  onEdit: () => void;
  onPay: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function ObligationRow({ obligation: o, onEdit, onPay, onCancel, onDelete }: Props) {
  const isOverdue = o.status === 'pending' && o.dueDate < new Date().toISOString().split('T')[0];

  return (
    <div className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <p className={`font-medium ${o.status === 'cancelled' ? 'line-through text-gray-500' : ''}`}>
              {o.name}
            </p>
            {o.isRecurring && <span className="text-xs text-blue-400">{'\u21BB'}</span>}
          </div>
          <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
            {formatDateShort(o.dueDate)}
            {o.status === 'paid' && o.amountActual !== undefined && (
              <span className="text-green-400 ml-2">Paid: {formatCurrency(o.amountActual)}</span>
            )}
          </p>
        </div>
        <p className={`font-medium tabular-nums ${o.status === 'paid' ? 'text-gray-500' : ''}`}>
          {formatCurrency(o.amountPlanned)}
        </p>
      </div>

      {o.status === 'pending' && (
        <div className="flex gap-2 mt-3">
          <button onClick={onPay} className="px-3 py-1.5 text-xs bg-green-600/20 text-green-400 rounded-lg">
            Pay
          </button>
          <button onClick={onEdit} className="px-3 py-1.5 text-xs bg-blue-600/20 text-blue-400 rounded-lg">
            Edit
          </button>
          <button onClick={onCancel} className="px-3 py-1.5 text-xs bg-orange-600/20 text-orange-400 rounded-lg">
            Cancel
          </button>
          <button onClick={onDelete} className="px-3 py-1.5 text-xs bg-red-600/20 text-red-400 rounded-lg">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
