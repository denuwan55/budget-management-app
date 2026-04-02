import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { yearMonth } from '../engine/dateHelpers';

export function useCurrentMonth() {
  const ym = yearMonth();
  return useLiveQuery(() => db.months.where('yearMonth').equals(ym).first());
}
