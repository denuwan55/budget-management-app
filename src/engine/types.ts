export type VerdictSeverity =
  | 'comfortable'    // green
  | 'tight'          // yellow-green
  | 'painful'        // yellow
  | 'savings_risk'   // orange
  | 'cannot_afford'; // red

export const SEVERITY_ORDER: Record<VerdictSeverity, number> = {
  comfortable: 0,
  tight: 1,
  painful: 2,
  savings_risk: 3,
  cannot_afford: 4,
};

export interface Verdict {
  severity: VerdictSeverity;
  headline: string;
  detail: string;
}

export interface ObligationAtRisk {
  name: string;
  amount: number;
  dueDate: string;
  shortfall: number;
}

export interface ObligationSummary {
  name: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
}

export interface ImpactResult {
  // Current state (before purchase)
  currentFreePool: number;
  currentDailyBudget: number;

  // Proposed state (after purchase)
  proposedFreePool: number;
  proposedDailyBudget: number;

  // Impact metrics
  daysEquivalent: number;
  dailyBudgetDropPercent: number;

  // Safety checks
  savingsIntact: boolean;
  savingsAtRisk: number;
  obligationsIntact: boolean;
  obligationsAtRisk: ObligationAtRisk[];

  // Context
  daysRemaining: number;
  upcomingObligations: ObligationSummary[];

  // Verdict
  verdict: Verdict;
}
