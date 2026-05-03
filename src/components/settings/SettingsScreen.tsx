import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useBudgetData } from '../../hooks/useBudgetData';
import { monthRepository } from '../../db/repositories/monthRepository';
import { db } from '../../db/database';
import {
  settingsRepository,
  SETTINGS_KEYS,
  DEFAULT_CYCLE_ANCHOR_DAY,
} from '../../db/repositories/settingsRepository';
import {
  cycleStartDate,
  cycleEndDate,
  cycleYearMonth,
  formatDate,
} from '../../engine/dateHelpers';
import { CurrencyInput } from '../shared/CurrencyInput';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { EmptyState } from '../shared/EmptyState';
import { MonthRolloverModal } from './MonthRolloverModal';

function clampAnchor(n: number): number {
  if (isNaN(n) || n < 1) return 1;
  if (n > 28) return 28;
  return Math.floor(n);
}

export function SettingsScreen() {
  const data = useBudgetData();
  const [totalStr, setTotalStr] = useState('');
  const [savingsStr, setSavingsStr] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [showRollover, setShowRollover] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const storedAnchor = useLiveQuery(() =>
    settingsRepository.get(SETTINGS_KEYS.CYCLE_ANCHOR_DAY)
  );
  const defaultAnchor = storedAnchor ? clampAnchor(parseInt(storedAnchor, 10)) : DEFAULT_CYCLE_ANCHOR_DAY;
  const [anchorStr, setAnchorStr] = useState(String(defaultAnchor));
  const [anchorInitialized, setAnchorInitialized] = useState(false);
  const [showAnchorConfirm, setShowAnchorConfirm] = useState(false);

  useEffect(() => {
    if (!anchorInitialized && storedAnchor !== undefined) {
      setAnchorStr(String(defaultAnchor));
      setAnchorInitialized(true);
    }
  }, [storedAnchor, defaultAnchor, anchorInitialized]);

  if (data.month && !initialized) {
    setTotalStr(String(data.month.totalAvailable));
    setSavingsStr(String(data.month.savingsTarget));
    setInitialized(true);
  }

  if (!data.month) {
    return <EmptyState icon={'⚙️'} title="No Month Set Up" subtitle="Go to Check tab to set up your first month." />;
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

  const handleReset = async () => {
    await db.transaction('rw', [db.months, db.obligations, db.purchases, db.settings], async () => {
      await db.months.clear();
      await db.obligations.clear();
      await db.purchases.clear();
      await db.settings.clear();
    });
    window.location.reload();
  };

  const parsedAnchor = clampAnchor(parseInt(anchorStr, 10));
  const anchorChanged = data.month && parsedAnchor !== data.month.anchorDay;

  const handleSaveAnchor = async () => {
    await settingsRepository.set(SETTINGS_KEYS.CYCLE_ANCHOR_DAY, String(parsedAnchor));
  };

  // Current month window (uses month's own anchor — never changes mid-cycle).
  const currentStart = data.month ? cycleStartDate(data.month.yearMonth, data.month.anchorDay) : null;
  const currentEnd = data.month ? cycleEndDate(data.month.yearMonth, data.month.anchorDay) : null;

  // Next cycle: starts the day after current ends; labeled by the new anchor's convention.
  // Preview uses the typed anchor so the user sees what their save will produce;
  // actual rollover uses the saved (defaultAnchor) value.
  const nextStart = currentEnd
    ? new Date(currentEnd.getFullYear(), currentEnd.getMonth(), currentEnd.getDate() + 1)
    : new Date();
  const previewYM = cycleYearMonth(nextStart, parsedAnchor);
  const nextCycleStart = cycleStartDate(previewYM, parsedAnchor);
  const nextCycleEnd = cycleEndDate(previewYM, parsedAnchor);
  const rolloverYM = cycleYearMonth(nextStart, defaultAnchor);

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

      <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-400">Cycle</h2>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Start day (1–28)</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-gray-800 rounded-xl px-4 py-3 flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={28}
                value={anchorStr}
                onChange={(e) => setAnchorStr(e.target.value)}
                className="bg-transparent outline-none w-20 font-bold text-xl"
              />
              <span className="text-xs text-gray-400">of every month</span>
            </div>
            <button
              onClick={() => (anchorChanged ? setShowAnchorConfirm(true) : handleSaveAnchor())}
              disabled={!anchorChanged && parsedAnchor === defaultAnchor}
              className="px-4 py-3 bg-blue-600 rounded-xl text-sm font-semibold disabled:bg-gray-800 disabled:text-gray-600"
            >
              Save
            </button>
          </div>
        </div>

        {currentStart && currentEnd && (
          <div className="text-xs text-gray-500 space-y-0.5">
            <p>
              Current month: {formatDate(currentStart)} → {formatDate(currentEnd)}
              {' '}(anchor day {data.month!.anchorDay})
            </p>
            {anchorChanged && (
              <p>
                Next month (with new anchor): {formatDate(nextCycleStart)} → {formatDate(nextCycleEnd)}
              </p>
            )}
          </div>
        )}
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
        <button
          onClick={() => setShowResetConfirm(true)}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-800 text-red-400"
        >
          Reset All Data
        </button>
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
          newYearMonth={rolloverYM}
          newAnchorDay={defaultAnchor}
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

      <ConfirmDialog
        open={showResetConfirm}
        title="Reset All Data"
        message="This will permanently delete all months, obligations, purchases, and settings. This cannot be undone."
        confirmLabel="Reset"
        danger
        onConfirm={handleReset}
        onClose={() => setShowResetConfirm(false)}
      />

      <ConfirmDialog
        open={showAnchorConfirm}
        title="Change cycle start day?"
        message={
          currentStart && currentEnd
            ? `Your current month (${formatDate(currentStart)} → ${formatDate(currentEnd)}) continues unchanged. The new start day (${parsedAnchor}) takes effect from your next month.`
            : `The new start day (${parsedAnchor}) will be used for your next month.`
        }
        confirmLabel="Save"
        onConfirm={handleSaveAnchor}
        onClose={() => setShowAnchorConfirm(false)}
      />
    </div>
  );
}
