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
} as const;
