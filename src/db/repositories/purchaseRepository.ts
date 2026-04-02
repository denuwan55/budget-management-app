import { db } from '../database';
import type { Purchase } from '../models';

export const purchaseRepository = {
  async register(
    monthId: number,
    amount: number,
    description: string
  ): Promise<Purchase> {
    const now = new Date().toISOString();
    const id = await db.purchases.add({
      monthId,
      amount,
      description,
      createdAt: now,
      updatedAt: now,
    });
    return (await db.purchases.get(id))!;
  },

  async registerWithObligation(
    monthId: number,
    amount: number,
    description: string,
    obligationId: number
  ): Promise<Purchase> {
    const now = new Date().toISOString();

    return db.transaction('rw', [db.purchases, db.obligations], async () => {
      const id = await db.purchases.add({
        monthId,
        amount,
        description,
        matchedObligationId: obligationId,
        createdAt: now,
        updatedAt: now,
      });

      await db.obligations.update(obligationId, {
        status: 'paid',
        amountActual: amount,
        updatedAt: now,
      });

      return (await db.purchases.get(id))!;
    });
  },

  async getAll(monthId: number): Promise<Purchase[]> {
    return db.purchases
      .where('monthId')
      .equals(monthId)
      .reverse()
      .sortBy('createdAt');
  },

  async getDiscretionary(monthId: number): Promise<Purchase[]> {
    const all = await this.getAll(monthId);
    return all.filter((p) => !p.matchedObligationId);
  },

  async update(
    id: number,
    data: Partial<Pick<Purchase, 'amount' | 'description'>>
  ): Promise<void> {
    await db.purchases.update(id, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },

  async delete(id: number): Promise<void> {
    const purchase = await db.purchases.get(id);
    if (purchase?.matchedObligationId) {
      await db.obligations.update(purchase.matchedObligationId, {
        status: 'pending',
        amountActual: undefined,
        updatedAt: new Date().toISOString(),
      });
    }
    await db.purchases.delete(id);
  },
};
