import { db } from '../database';
import type { Month } from '../models';

export const monthRepository = {
  async getOrCreate(
    yearMonth: string,
    totalAvailable: number = 0,
    savingsTarget: number = 0
  ): Promise<Month> {
    const existing = await db.months.where('yearMonth').equals(yearMonth).first();
    if (existing) return existing;

    const now = new Date().toISOString();
    const id = await db.months.add({
      yearMonth,
      totalAvailable,
      savingsTarget,
      createdAt: now,
      updatedAt: now,
    });
    return (await db.months.get(id))!;
  },

  async getCurrentMonth(): Promise<Month | undefined> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return db.months.where('yearMonth').equals(yearMonth).first();
  },

  async updateTotalAvailable(id: number, amount: number): Promise<void> {
    await db.months.update(id, {
      totalAvailable: amount,
      updatedAt: new Date().toISOString(),
    });
  },

  async updateSavingsTarget(id: number, amount: number): Promise<void> {
    await db.months.update(id, {
      savingsTarget: amount,
      updatedAt: new Date().toISOString(),
    });
  },

  async getByYearMonth(yearMonth: string): Promise<Month | undefined> {
    return db.months.where('yearMonth').equals(yearMonth).first();
  },

  async getRecent(count: number = 6): Promise<Month[]> {
    const months = await db.months.orderBy('yearMonth').reverse().limit(count).toArray();
    return months.reverse();
  },
};
