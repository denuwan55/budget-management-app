import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { CurrencyInput } from '../shared/CurrencyInput';
import { monthRepository } from '../../db/repositories/monthRepository';
import { yearMonth } from '../../engine/dateHelpers';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MonthSetupModal({ open, onClose }: Props) {
  const [totalStr, setTotalStr] = useState('');
  const [savingsStr, setSavingsStr] = useState('');

  const handleStart = async () => {
    const total = parseFloat(totalStr);
    const savings = parseFloat(savingsStr) || 0;
    if (total <= 0) return;

    await monthRepository.getOrCreate(yearMonth(), total, savings);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Set Up This Month">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Set up your budget for <span className="text-white font-medium">{yearMonth()}</span>
        </p>

        <div>
          <label className="block text-sm text-gray-400 mb-1">How much is in your expense account?</label>
          <div className="bg-gray-800 rounded-xl px-4 py-3">
            <CurrencyInput value={totalStr} onChange={setTotalStr} autoFocus large />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Savings target this month</label>
          <div className="bg-gray-800 rounded-xl px-4 py-3">
            <CurrencyInput value={savingsStr} onChange={setSavingsStr} placeholder="0" />
          </div>
        </div>

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
