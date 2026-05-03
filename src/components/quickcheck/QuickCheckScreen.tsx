import { useState, useEffect } from 'react';
import { useBudgetData } from '../../hooks/useBudgetData';
import { checkImpact } from '../../engine/budgetCalculator';
import { formatCurrency } from '../../lib/formatters';
import { cycleYearMonth, cycleEndDate, startOfDay } from '../../engine/dateHelpers';
import { db } from '../../db/database';
import { getCycleAnchorDay } from '../../db/repositories/settingsRepository';
import { CurrencyInput } from '../shared/CurrencyInput';
import { ImpactDisplay } from './ImpactDisplay';
import { RegisterModal } from './RegisterModal';
import { MonthSetupModal } from '../settings/MonthSetupModal';
import { MonthRolloverModal } from '../settings/MonthRolloverModal';
import type { ImpactResult } from '../../engine/types';
import type { Month } from '../../db/models';

export function QuickCheckScreen() {
  const data = useBudgetData();
  const [amount, setAmount] = useState('');
  const [impact, setImpact] = useState<ImpactResult | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showRollover, setShowRollover] = useState(false);
  const [previousMonth, setPreviousMonth] = useState<Month | null>(null);
  const [nextYearMonth, setNextYearMonth] = useState<string>('');
  const [nextAnchor, setNextAnchor] = useState<number>(25);

  useEffect(() => {
    if (!data.loading && !data.month) {
      // No active month for today. Look for the most recent month — if today is
      // past its cycle end, prompt rollover. Otherwise this is first-time setup.
      (async () => {
        const recent = await db.months.orderBy('yearMonth').reverse().limit(1).first();
        const anchor = await getCycleAnchorDay();
        const today = startOfDay(new Date());
        if (recent) {
          const prevEnd = cycleEndDate(recent.yearMonth, recent.anchorDay);
          if (today > prevEnd) {
            setPreviousMonth(recent);
            setNextYearMonth(cycleYearMonth(new Date(), anchor));
            setNextAnchor(anchor);
            setShowRollover(true);
          }
        }
      })();
    }
  }, [data.loading, data.month]);

  if (data.loading) {
    return (
      <div className="p-6 pt-12 animate-pulse space-y-4">
        <div className="h-8 w-32 bg-gray-800 rounded mx-auto" />
        <div className="h-16 w-48 bg-gray-800 rounded mx-auto" />
        <div className="h-14 bg-gray-800 rounded-2xl" />
        <div className="flex gap-3">
          <div className="flex-1 h-14 bg-gray-800 rounded-2xl" />
          <div className="flex-1 h-14 bg-gray-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data.month) {
    return (
      <div className="p-6 pt-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">MindfulSpend</h1>
          <p className="text-gray-400 mb-6">Set up your budget to get started.</p>
          <button
            onClick={() => previousMonth ? setShowRollover(true) : setShowSetup(true)}
            className="px-6 py-3 bg-blue-600 rounded-xl font-semibold"
          >
            {previousMonth ? 'Start New Month' : 'Set Up This Month'}
          </button>
        </div>
        <MonthSetupModal open={showSetup} onClose={() => setShowSetup(false)} />
        {previousMonth && (
          <MonthRolloverModal
            open={showRollover}
            onClose={() => setShowRollover(false)}
            previousMonth={previousMonth}
            newYearMonth={nextYearMonth}
            newAnchorDay={nextAnchor}
          />
        )}
      </div>
    );
  }

  const parsedAmount = parseFloat(amount) || 0;

  const handleCheckImpact = () => {
    if (parsedAmount <= 0 || !data.month) return;
    const result = checkImpact(
      parsedAmount,
      data.month.totalAvailable,
      data.obligations,
      data.month.savingsTarget,
      data.purchases,
      new Date(),
      data.daysRemaining
    );
    setImpact(result);
  };

  const handleRegister = () => {
    if (parsedAmount <= 0) return;
    setShowRegister(true);
  };

  const handleRegistered = () => {
    setShowRegister(false);
    setAmount('');
    setImpact(null);
  };

  const handleClear = () => {
    setAmount('');
    setImpact(null);
  };

  return (
    <div className="p-6 pt-8">
      {/* Hero: Daily budget */}
      <div className="text-center mb-6">
        <p className="text-sm text-gray-400">Daily budget</p>
        <p className={`text-5xl font-bold tabular-nums ${data.dailyBudget >= 0 ? 'text-white' : 'text-red-500'}`}>
          {formatCurrency(data.dailyBudget)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {formatCurrency(data.freePool)} free &middot; {data.daysRemaining} days left
        </p>
      </div>

      {/* Amount input */}
      <div className="bg-gray-900 rounded-2xl p-4 mb-4">
        <CurrencyInput
          value={amount}
          onChange={setAmount}
          autoFocus={true}
          large={true}
          placeholder="0"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleCheckImpact}
          disabled={parsedAmount <= 0}
          className="flex-1 py-4 rounded-2xl font-semibold bg-blue-600 disabled:bg-gray-800 disabled:text-gray-600 transition-colors"
        >
          Check Impact
        </button>
        <button
          onClick={handleRegister}
          disabled={parsedAmount <= 0}
          className="flex-1 py-4 rounded-2xl font-semibold bg-green-600 disabled:bg-gray-800 disabled:text-gray-600 transition-colors"
        >
          Register
        </button>
      </div>

      {/* Impact result */}
      {impact && (
        <div className="space-y-4">
          <ImpactDisplay result={impact} />
          <button
            onClick={handleClear}
            className="w-full py-2 text-sm text-gray-400"
          >
            Clear
          </button>
        </div>
      )}

      {/* Next upcoming obligation teaser */}
      {!impact && data.upcomingObligations.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-2">Coming up</p>
          {data.upcomingObligations.slice(0, 2).map((o) => (
            <div key={o.id} className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-300">{o.name}</span>
              <span className="text-sm text-gray-400">
                {formatCurrency(o.amountPlanned)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Overdue warning */}
      {data.overdueObligations.length > 0 && (
        <div className="bg-orange-500/10 rounded-2xl p-4 mt-4">
          <p className="text-sm font-semibold text-orange-400 mb-1">Overdue</p>
          {data.overdueObligations.map((o) => (
            <p key={o.id} className="text-sm text-gray-300">
              {o.name} — {formatCurrency(o.amountPlanned)}
            </p>
          ))}
        </div>
      )}

      <RegisterModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        amount={parsedAmount}
        monthId={data.month?.id ?? 0}
        pendingObligations={data.pendingObligations}
        onRegistered={handleRegistered}
      />
    </div>
  );
}
