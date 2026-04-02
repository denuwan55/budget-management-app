import { useState } from 'react';
import { useBudgetData } from '../../hooks/useBudgetData';
import { monthRepository } from '../../db/repositories/monthRepository';
import { db } from '../../db/database';
import { CurrencyInput } from '../shared/CurrencyInput';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { EmptyState } from '../shared/EmptyState';
import { MonthRolloverModal } from './MonthRolloverModal';

export function SettingsScreen() {
  const data = useBudgetData();
  const [totalStr, setTotalStr] = useState('');
  const [savingsStr, setSavingsStr] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [showRollover, setShowRollover] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

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

  const handleExport = async () => {
    const months = await db.months.toArray();
    const obligations = await db.obligations.toArray();
    const purchases = await db.purchases.toArray();
    const settings = await db.settings.toArray();

    const payload = { months, obligations, purchases, settings, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindfulspend-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const imported = JSON.parse(text);

    await db.transaction('rw', [db.months, db.obligations, db.purchases, db.settings], async () => {
      await db.months.clear();
      await db.obligations.clear();
      await db.purchases.clear();
      await db.settings.clear();

      if (imported.months) await db.months.bulkAdd(imported.months);
      if (imported.obligations) await db.obligations.bulkAdd(imported.obligations);
      if (imported.purchases) await db.purchases.bulkAdd(imported.purchases);
      if (imported.settings) await db.settings.bulkAdd(imported.settings);
    });

    window.location.reload();
  };

  const handleFileSelected = (file: File) => {
    setPendingFile(file);
    setShowImportConfirm(true);
  };

  const nextYM = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
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
        <button
          onClick={() => setShowRollover(true)}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-800 text-green-400 mt-2"
        >
          Start New Month
        </button>
      </div>

      <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-400">Data</h2>
        <button
          onClick={handleExport}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-800 text-blue-400"
        >
          Export Backup (JSON)
        </button>
        <label className="block">
          <span className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-800 text-orange-400 text-center block cursor-pointer">
            Import Backup
          </span>
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelected(file);
            }}
          />
        </label>
      </div>

      <div className="bg-gray-900 rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-400">About</h2>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">App</span>
          <span>MindfulSpend</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Version</span>
          <span>1.1</span>
        </div>
      </div>

      {data.month && (
        <MonthRolloverModal
          open={showRollover}
          onClose={() => setShowRollover(false)}
          previousMonth={data.month}
          newYearMonth={nextYM()}
        />
      )}

      <ConfirmDialog
        open={showImportConfirm}
        title="Import Backup"
        message="This will replace all existing data. Are you sure?"
        confirmLabel="Import"
        onConfirm={() => {
          if (pendingFile) handleImport(pendingFile);
        }}
        onClose={() => {
          setShowImportConfirm(false);
          setPendingFile(null);
        }}
      />
    </div>
  );
}
