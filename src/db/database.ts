import Dexie, { type Table } from 'dexie';
import type { Month, Obligation, Purchase, AppSetting } from './models';

export class MindfulSpendDB extends Dexie {
  months!: Table<Month, number>;
  obligations!: Table<Obligation, number>;
  purchases!: Table<Purchase, number>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super('MindfulSpendDB');

    this.version(1).stores({
      months: '++id, &yearMonth',
      obligations: '++id, monthId, status, dueDate',
      purchases: '++id, monthId, matchedObligationId, createdAt',
      settings: '&key',
    });

    this.version(2).stores({
      purchases: '++id, monthId, matchedObligationId, category, createdAt',
    }).upgrade(tx => {
      return tx.table('purchases').toCollection().modify(purchase => {
        if (purchase.matchedObligationId && !purchase.category) {
          purchase.category = 'Bills';
        }
      });
    });
  }
}

export const db = new MindfulSpendDB();
