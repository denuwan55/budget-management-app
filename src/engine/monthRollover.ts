import { db } from '../db/database';
import { obligationRepository } from '../db/repositories/obligationRepository';
import { freePool } from './budgetCalculator';
import { generateForNewMonth } from './recurrenceEngine';
import type { Month } from '../db/models';

export interface RolloverResult {
  newMonth: Month;
  generatedObligations: number;
  carriedOverAmount: number;
}

export async function performRollover(
  previousMonth: Month,
  newYearMonth: string,
  newTotalAvailable: number,
  newSavingsTarget: number,
  carryOver: boolean,
  anchorDay: number
): Promise<RolloverResult> {
  const previousObligations = await db.obligations.where('monthId').equals(previousMonth.id!).toArray();
  const previousPurchases = await db.purchases.where('monthId').equals(previousMonth.id!).toArray();

  const previousFree = freePool(
    previousMonth.totalAvailable,
    previousObligations,
    previousMonth.savingsTarget,
    previousPurchases
  );
  const carriedOverAmount = carryOver ? Math.max(previousFree, 0) : 0;

  const now = new Date().toISOString();
  const newMonthId = await db.months.add({
    yearMonth: newYearMonth,
    totalAvailable: newTotalAvailable + carriedOverAmount,
    savingsTarget: newSavingsTarget,
    anchorDay,
    createdAt: now,
    updatedAt: now,
  });

  const generated = generateForNewMonth(previousObligations, newYearMonth, anchorDay);
  for (const g of generated) {
    await obligationRepository.add(newMonthId as number, {
      name: g.name,
      amountPlanned: g.amountPlanned,
      dueDate: g.dueDate,
      isRecurring: g.isRecurring,
      recurrenceRule: g.recurrenceRule,
    });
  }

  const newMonth = (await db.months.get(newMonthId as number))!;

  return {
    newMonth,
    generatedObligations: generated.length,
    carriedOverAmount,
  };
}
