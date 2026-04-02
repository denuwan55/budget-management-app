import { useState } from 'react';
import { useBudgetData } from '../../hooks/useBudgetData';
import { monthRepository } from '../../db/repositories/monthRepository';
import { CurrencyInput } from '../shared/CurrencyInput';
import { EmptyState } from '../shared/EmptyState';

export function SettingsScreen() {
  const data = useBudgetData();
  const [totalStr, setTotalStr] = useState('');
  const [savingsStr, setSavingsStr] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (data.month && !initialized) {
    setTotalStr(String(data.month.totalAvailable));
    setSavingsStr(String(data.month.savingsTarget));
    setInitialized(true);
  }

  if (!data.month) {
    return <EmptyState icon={'\u2699\uFE0F'} title="No Month Set Up" subtitle="Go to Check tab to set up your first month." />;
  }

  const handleSaveTotal = async () => {
    const val = parseFloat(totalStr);
    if (val > 0 && data.month?.id) {
      await monthRepository.updateTotalAvailable(data.month.id, val);
    }
  };

  const handleSaveSavings = async () => {
    const val = parseFloat(savingsStr) || 0;
    if (data.month?.id) {
      await monthRepository.updateSavingsTarget(data.month.id, val);
    }
  };

  return (
    <div className="p-6 pt-8 space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <div className="bg-gray-900 rounded-2xl p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400">Monthly Budget</h2>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Total Available</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-gray-800 rounded-xl px-4 py-3">
              <CurrencyInput value={totalStr} onChange={setTotalStr} />
            </div>
            <button onClick={handleSaveTotal} className="px-4 py-3 bg-blue-600 rounded-xl text-sm font-semibold">
              Save
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Savings Target</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-gray-800 rounded-xl px-4 py-3">
              <CurrencyInput value={savingsStr} onChange={setSavingsStr} />
            </div>
            <button onClick={handleSaveSavings} className="px-4 py-3 bg-blue-600 rounded-xl text-sm font-semibold">
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-400">Current Month</h2>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Month</span>
          <span>{data.month.yearMonth}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Created</span>
          <span>{new Date(data.month.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-400">About</h2>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">App</span>
          <span>MindfulSpend</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Version</span>
          <span>1.0</span>
        </div>
      </div>
    </div>
  );
}
