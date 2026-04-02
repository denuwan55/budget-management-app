import type { ImpactResult } from '../../engine/types';
import { formatCurrency } from '../../lib/formatters';
import { VerdictBadge } from '../shared/VerdictBadge';

interface ImpactDisplayProps {
  result: ImpactResult;
}

export function ImpactDisplay({ result }: ImpactDisplayProps) {
  return (
    <div className="space-y-3">
      <VerdictBadge verdict={result.verdict} />

      <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
        <Row
          label="Free pool"
          before={result.currentFreePool}
          after={result.proposedFreePool}
        />
        <Row
          label="Daily budget"
          before={result.currentDailyBudget}
          after={result.proposedDailyBudget}
          suffix="/day"
        />
        <div className="border-t border-gray-800 pt-3">
          <p className="text-sm text-gray-400">
            That's <span className="text-white font-medium">
              {result.daysEquivalent === Infinity ? '\u221E' : result.daysEquivalent.toFixed(1)}
            </span> days of budget in one purchase
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <StatusPill ok={result.savingsIntact} label="Savings" />
          <StatusPill ok={result.obligationsIntact} label="Obligations" />
        </div>
      </div>

      {result.upcomingObligations.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-2">Coming up</p>
          {result.upcomingObligations.map((o, i) => (
            <div key={i} className="flex justify-between py-1">
              <span className="text-sm text-gray-300">{o.name}</span>
              <span className="text-sm text-gray-400">
                {formatCurrency(o.amount)} in {o.daysUntilDue}d
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  label, before, after, suffix = '',
}: {
  label: string; before: number; after: number; suffix?: string;
}) {
  const isNegative = after < 0;
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm">
        <span className="text-gray-500">{formatCurrency(before)}</span>
        <span className="text-gray-600 mx-1">{'\u2192'}</span>
        <span className={isNegative ? 'text-red-400 font-medium' : 'text-white font-medium'}>
          {formatCurrency(after)}{suffix}
        </span>
      </span>
    </div>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
      ok ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
    }`}>
      {ok ? '\u2713' : '\u2717'} {label}
    </span>
  );
}
