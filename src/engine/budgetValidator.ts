import type { Obligation } from '../db/models';
import { daysRemainingInMonth } from './dateHelpers';

export interface ValidationResult {
  warnings: string[];
  errors: string[];
}

export function validateMonth(
  totalAvailable: number,
  obligations: Obligation[],
  savingsTarget: number
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (totalAvailable <= 0) {
    errors.push('Total available must be greater than zero.');
  }

  if (savingsTarget > totalAvailable) {
    errors.push('Savings target exceeds total available.');
  }

  const pendingSum = obligations
    .filter((o) => o.status === 'pending')
    .reduce((sum, o) => sum + o.amountPlanned, 0);

  const totalCommitted = pendingSum + savingsTarget;

  if (totalCommitted > totalAvailable) {
    warnings.push(
      `Your commitments ($${Math.round(totalCommitted)}) exceed your total available ($${Math.round(totalAvailable)}). You have no discretionary budget.`
    );
  }

  const freePool = totalAvailable - totalCommitted;
  if (freePool > 0) {
    const daysLeft = daysRemainingInMonth();
    const daily = freePool / daysLeft;
    if (daily < 5) {
      warnings.push(`Your daily budget is very low ($${daily.toFixed(2)}/day).`);
    }
  }

  return { warnings, errors };
}
