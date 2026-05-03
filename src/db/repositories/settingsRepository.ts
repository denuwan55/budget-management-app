import { db } from '../database';

export const settingsRepository = {
  async get(key: string): Promise<string | undefined> {
    const setting = await db.settings.get(key);
    return setting?.value;
  },

  async set(key: string, value: string): Promise<void> {
    await db.settings.put({ key, value });
  },

  async delete(key: string): Promise<void> {
    await db.settings.delete(key);
  },
};

export const SETTINGS_KEYS = {
  CARRY_OVER_POLICY: 'carry_over_policy',
  DEFAULT_SAVINGS_TARGET: 'default_savings_target',
  CYCLE_ANCHOR_DAY: 'cycle_anchor_day',
} as const;

export const DEFAULT_CYCLE_ANCHOR_DAY = 25;

export async function getCycleAnchorDay(): Promise<number> {
  const value = await settingsRepository.get(SETTINGS_KEYS.CYCLE_ANCHOR_DAY);
  if (!value) return DEFAULT_CYCLE_ANCHOR_DAY;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 28) return DEFAULT_CYCLE_ANCHOR_DAY;
  return parsed;
}
