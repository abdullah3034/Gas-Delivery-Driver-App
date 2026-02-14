import { SQLiteDatabase } from 'expo-sqlite';

import { CommissionConfig } from '@/types/models';

const RATE_KEY = 'commission_rate_per_unit';
const TARGET_KEY = 'commission_daily_target_qty';

function toNumber(value: string | null | undefined, fallback = 0) {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getCommissionConfig(db: SQLiteDatabase) {
  const rateRow = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', [RATE_KEY]);
  const targetRow = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', [TARGET_KEY]);

  return {
    rate_per_unit: toNumber(rateRow?.value, 0),
    daily_target_qty: toNumber(targetRow?.value, 0),
  } satisfies CommissionConfig;
}

export async function setCommissionConfig(db: SQLiteDatabase, config: CommissionConfig) {
  await db.execAsync('BEGIN');
  try {
    await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [
      RATE_KEY,
      String(config.rate_per_unit),
    ]);
    await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [
      TARGET_KEY,
      String(config.daily_target_qty),
    ]);
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}
