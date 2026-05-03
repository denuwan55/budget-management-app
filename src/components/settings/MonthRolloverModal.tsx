import { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { CurrencyInput } from '../shared/CurrencyInput';
import { performRollover } from '../../engine/monthRollover';
import { freePool } from '../../engine/budgetCalculator';
import { formatCurrency } from '../../lib/formatters';
import { cycleStartDate, cycleEndDate, formatDate } from '../../engine/dateHelpers';
import { db } from '../../db/database';
import type { Month } from '../../db/models';

interface Props {
  open: boolean;
  onClose: () => void;
  previousMonth: Month;
  newYearMonth: string;
  newAnchorDay: number;
}

export function MonthRolloverModal({
  open, onClose, previousMonth, newYearMonth, newAnchorDay,
}: Props) {
  const [totalStr, setTotalStr] = useState('');
  const [savingsStr, setSavingsStr] = useState(String(previousMonth.savingsTarget));
  const [carryOver, setCarryOver] = useState(true);
  const [previousFree, setPreviousFree] = useState(0);
  const [recurringCount, setRecurringCount] = useState(0);

  useEffect(() => {
    if (open) {
      Promise.all([
        db.obligations.where('monthId').equals(previousMonth.id!).toArray(),
        db.purchases.where('monthId').equals(previousMonth.id!).toArray(),
      ]).then(([obligations, purchases]) => {
        setPreviousFree(freePool(
          previousMonth.totalAvailable, obligations,
          previousMonth.savingsTarget, purchases
        ));
        setRecurringCount(obligations.filter((o) => o.isRecurring).length);
      });
    }
  }, [open, previousMonth]);

  const newCycleStart = cycleStartDate(newYearMonth, newAnchorDay);
  const newCycleEnd = cycleEndDate(newYearMonth, newAnchorDay);

  const handleStart = async () => {
    const total = parseFloat(totalStr);
    const savings = parseFloat(savingsStr) || 0;
    if (total <= 0) return;

    await performRollover(previousMonth, newYearMonth, total, savings, carryOver, newAnchorDay);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Month">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          New cycle:{' '}
          <span className="text-white font-medium">
            {formatDate(newCycleStart)} → {formatDate(newCycleEnd)}
          </span>
        </p>

        <div className="bg-gray-800 rounded-xl p-3 space-y-1">
          <p className="text-xs text-gray-400">Previous month</p>
          <div className="flex justify-between text-sm">
            <span>Total available</span>
            <span>{formatCurrency(previousMonth.totalAvailable)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Unspent free pool</span>
            <span className={previousFree >= 0 ? 'text-green-400' : 'text-red-400'}>
              {formatCurrency(previousFree)}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Total Available</label>
          <div className="bg-gray-800 rounded-xl px-4 py-3">
            <CurrencyInput value={totalStr} onChange={setTotalStr} autoFocus large />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Savings Target</label>
          <div className="bg-gray-800 rounded-xl px-4 py-3">
            <CurrencyInput value={savingsStr} onChange={setSavingsStr} />
          </div>
        </div>

        {previousFree > 0 && (
          <div className="flex items-center justify-between bg-gray-800 rounded-xl p-3">
            <span className="text-sm">Carry over {formatCurrency(previousFree)}</span>
            <button
              onClick={() => setCarryOver(!carryOver)}
              className={`w-12 h-7 rounded-full transition-colors ${carryOver ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transform transition-transform mx-1 ${
                carryOver ? 'translate-x-5' : ''
              }`} />
            </button>
          </div>
        )}

        {recurringCount > 0 && (
          <p className="text-xs text-gray-400">
            {recurringCount} recurring obligation{recurringCount > 1 ? 's' : ''} will be generated automatically.
          </p>
        )}

        <button
          onClick={handleStart}
          disabled={!parseFloat(totalStr) || parseFloat(totalStr) <= 0}
          className="w-full py-3 rounded-xl font-semibold bg-blue-600 disabled:bg-gray-800 disabled:text-gray-600"
        >
          Start Month
        </button>
      </div>
    </Modal>
  );
}
