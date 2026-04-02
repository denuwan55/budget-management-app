import { db } from '../database';
import type { Obligation } from '../models';

export const obligationRepository = {
  async add(
    monthId: number,
    data: {
      name: string;
      amountPlanned: number;
      dueDate: string;
      isRecurring?: boolean;
      recurrenceRule?: 'weekly' | 'monthly' | 'biweekly';
    }
  ): Promise<Obligation> {
    const now = new Date().toISOString();
    const id = await db.obligations.add({
      monthId,
      name: data.name,
      amountPlanned: data.amountPlanned,
      dueDate: data.dueDate,
      isRecurring: data.isRecurring ?? false,
      recurrenceRule: data.recurrenceRule,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
    return (await db.obligations.get(id))!;
  },

  async getAll(monthId: number): Promise<Obligation[]> {
    return db.obligations
      .where('monthId')
      .equals(monthId)
      .sortBy('dueDate');
  },

  async getPending(monthId: number): Promise<Obligation[]> {
    return db.obligations
      .where({ monthId, status: 'pending' })
      .sortBy('dueDate');
  },

  async markPaid(id: number, actualAmount: number): Promise<void> {
    await db.obligations.update(id, {
      status: 'paid',
      amountActual: actualAmount,
      updatedAt: new Date().toISOString(),
    });
  },

  async cancel(id: number): Promise<void> {
    await db.obligations.update(id, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
  },

  async update(
    id: number,
    data: Partial<Pick<Obligation, 'name' | 'amountPlanned' | 'dueDate' | 'isRecurring' | 'recurrenceRule'>>
  ): Promise<void> {
    await db.obligations.update(id, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },

  async delete(id: number): Promise<void> {
    await db.obligations.delete(id);
  },
};
