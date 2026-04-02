import type { Verdict } from '../../engine/types';
import { severityColor, severityBg } from '../../lib/formatters';

interface VerdictBadgeProps {
  verdict: Verdict;
}

export function VerdictBadge({ verdict }: VerdictBadgeProps) {
  return (
    <div className={`rounded-xl p-4 ${severityBg(verdict.severity)}`}>
      <p className={`font-bold text-lg ${severityColor(verdict.severity)}`}>
        {verdict.headline}
      </p>
      <p className="text-sm text-gray-300 mt-1">{verdict.detail}</p>
    </div>
  );
}
