import type { Obligation } from '../db/models';
import { cycleStartDate, cycleEndDate, formatDate } from './dateHelpers';

export interface GeneratedObligation {
  name: string;
  amountPlanned: number;
  dueDate: string;
  isRecurring: boolean;
  recurrenceRule: 'weekly' | 'monthly' | 'biweekly';
}

/**
 * Generate obligation instances for a new cycle (month) based on
 * recurring obligations from the previous cycle.
 *
 * The cycle window is defined by [cycleStart, cycleEnd] derived from
 * `newYearMonth` + `anchorDay`. Generated dueDates always fall inside
 * this window.
 */
export function generateForNewMonth(
  previousObligations: Obligation[],
  newYearMonth: string,
  anchorDay: number = 1
): GeneratedObligation[] {
  const cycleStart = cycleStartDate(newYearMonth, anchorDay);
  const cycleEnd = cycleEndDate(newYearMonth, anchorDay);

  const recurring = previousObligations.filter((o) => o.isRecurring && o.recurrenceRule);
  const results: GeneratedObligation[] = [];

  for (const template of recurring) {
    const rule = template.recurrenceRule!;
    const templateDay = parseInt(template.dueDate.split('-')[2], 10);

    switch (rule) {
      case 'monthly': {
        // Place at templateDay of whichever calendar month falls inside the cycle.
        // If templateDay >= anchorDay, it falls in cycleStart's month.
        // If templateDay < anchorDay, it falls in cycleEnd's month.
        const targetMonth =
          templateDay >= anchorDay ? cycleStart : cycleEnd;
        const lastDayOfTarget = new Date(
          targetMonth.getFullYear(),
          targetMonth.getMonth() + 1,
          0
        ).getDate();
        const day = Math.min(templateDay, lastDayOfTarget);
        const candidate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day);
        if (candidate >= cycleStart && candidate <= cycleEnd) {
          results.push({
            name: template.name,
            amountPlanned: template.amountPlanned,
            dueDate: formatDate(candidate),
            isRecurring: true,
            recurrenceRule: 'monthly',
          });
        }
        break;
      }

      case 'weekly':
      case 'biweekly': {
        const stepDays = rule === 'weekly' ? 7 : 14;
        const templateDate = new Date(
          parseInt(template.dueDate.split('-')[0], 10),
          parseInt(template.dueDate.split('-')[1], 10) - 1,
          templateDay
        );
        const targetWeekday = templateDate.getDay();
        const current = new Date(cycleStart);
        while (current.getDay() !== targetWeekday) {
          current.setDate(current.getDate() + 1);
        }
        while (current <= cycleEnd) {
          results.push({
            name: template.name,
            amountPlanned: template.amountPlanned,
            dueDate: formatDate(current),
            isRecurring: true,
            recurrenceRule: rule,
          });
          current.setDate(current.getDate() + stepDays);
        }
        break;
      }
    }
  }

  return results;
}
