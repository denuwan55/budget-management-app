import type { Obligation } from '../db/models';

export interface GeneratedObligation {
  name: string;
  amountPlanned: number;
  dueDate: string;
  isRecurring: boolean;
  recurrenceRule: 'weekly' | 'monthly' | 'biweekly';
}

/**
 * Generate obligation instances for a new month based on
 * recurring obligations from the previous month.
 */
export function generateForNewMonth(
  previousObligations: Obligation[],
  newYearMonth: string
): GeneratedObligation[] {
  const [yearStr, monthStr] = newYearMonth.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  const recurring = previousObligations.filter((o) => o.isRecurring && o.recurrenceRule);
  const results: GeneratedObligation[] = [];

  for (const template of recurring) {
    const rule = template.recurrenceRule!;
    const templateDate = new Date(
      parseInt(template.dueDate.split('-')[0]),
      parseInt(template.dueDate.split('-')[1]) - 1,
      parseInt(template.dueDate.split('-')[2])
    );

    switch (rule) {
      case 'monthly': {
        const lastDay = new Date(year, month, 0).getDate();
        const day = Math.min(templateDate.getDate(), lastDay);
        const dateStr = `${yearStr}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        results.push({
          name: template.name,
          amountPlanned: template.amountPlanned,
          dueDate: dateStr,
          isRecurring: true,
          recurrenceRule: 'monthly',
        });
        break;
      }

      case 'weekly': {
        const targetWeekday = templateDate.getDay();
        const current = new Date(year, month - 1, 1);

        while (current.getDay() !== targetWeekday) {
          current.setDate(current.getDate() + 1);
        }

        while (current.getMonth() === month - 1) {
          const d = String(current.getDate()).padStart(2, '0');
          const m = String(month).padStart(2, '0');
          results.push({
            name: template.name,
            amountPlanned: template.amountPlanned,
            dueDate: `${yearStr}-${m}-${d}`,
            isRecurring: true,
            recurrenceRule: 'weekly',
          });
          current.setDate(current.getDate() + 7);
        }
        break;
      }

      case 'biweekly': {
        const targetWeekday = templateDate.getDay();
        const current = new Date(year, month - 1, 1);

        while (current.getDay() !== targetWeekday) {
          current.setDate(current.getDate() + 1);
        }

        while (current.getMonth() === month - 1) {
          const d = String(current.getDate()).padStart(2, '0');
          const m = String(month).padStart(2, '0');
          results.push({
            name: template.name,
            amountPlanned: template.amountPlanned,
            dueDate: `${yearStr}-${m}-${d}`,
            isRecurring: true,
            recurrenceRule: 'biweekly',
          });
          current.setDate(current.getDate() + 14);
        }
        break;
      }
    }
  }

  return results;
}
