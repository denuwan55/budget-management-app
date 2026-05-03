import { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { CurrencyInput } from '../shared/CurrencyInput';
import { monthRepository } from '../../db/repositories/monthRepository';
import {
  settingsRepository,
  SETTINGS_KEYS,
  DEFAULT_CYCLE_ANCHOR_DAY,
  getCycleAnchorDay,
} from '../../db/repositories/settingsRepository';
import {
  cycleYearMonth,
  cycleStartDate,
  cycleEndDate,
  formatDate,
} from '../../engine/dateHelpers';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MonthSetupModal({ open, onClose }: Props) {
  const [totalStr, setTotalStr] = useState('');
  const [savingsStr, setSavingsStr] = useState('');
  const [anchorStr, setAnchorStr] = useState(String(DEFAULT_CYCLE_ANCHOR_DAY));

  useEffect(() => {
    if (open) {
      getCycleAnchorDay().then((d) => setAnchorStr(String(d)));
    }
  }, [open]);

  const anchor = (() => {
    const n = parseInt(anchorStr, 10);
    if (isNaN(n) || n < 1) return 1;
    if (n > 28) return 28;
    return n;
  })();

  const ym = cycleYearMonth(new Date(), anchor);
  const cycleStart = cycleStartDate(ym, anchor);
  const cycleEnd = cycleEndDate(ym, anchor);

  const handleStart = async () => {
    const total = parseFloat(totalStr);
    const savings = parseFloat(savingsStr) || 0;
    if (total <= 0) return;

    await settingsRepository.set(SETTINGS_KEYS.CYCLE_ANCHOR_DAY, String(anchor));
    await monthRepository.getOrCreate(ym, total, savings, anchor);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Set Up Your Budget">
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Cycle start day (1–28)</label>
          <div className="bg-gray-800 rounded-xl px-4 py-3 flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={28}
              value={anchorStr}
              onChange={(e) => setAnchorStr(e.target.value)}
              className="bg-transparent outline-none w-20 font-bold text-xl"
            />
            <span className="text-xs text-gray-400">
              of every month
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This month: {formatDate(cycleStart)} → {formatDate(cycleEnd)}
          </p>
        </div>

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
          Start
        </button>
      </div>
    </Modal>
  );
}
