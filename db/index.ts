import { SQLiteDatabase } from 'expo-sqlite';

import { schemaSql } from './schema';
import { seedDatabase } from './seed';

export const DATABASE_NAME = 'gas-driver-demo-v2.db';

const defaultBanks = [
  'Axis Bank',
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India',
  'Kotak Mahindra Bank',
];

async function ensureDefaults(db: SQLiteDatabase) {
  const commissionRate = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    ['commission_rate_per_unit']
  );
  if (!commissionRate?.value) {
    await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [
      'commission_rate_per_unit',
      '0.075',
    ]);
  }

  const commissionTarget = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    ['commission_daily_target_qty']
  );
  if (!commissionTarget?.value) {
    await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [
      'commission_daily_target_qty',
      '50',
    ]);
  }

  const bankCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM banks');
  if (!bankCount || bankCount.count === 0) {
    for (const bank of defaultBanks) {
      await db.runAsync('INSERT INTO banks (name) VALUES (?)', [bank]);
    }
  }
}

export async function initDatabase(db: SQLiteDatabase) {
  await db.execAsync(schemaSql);

  const seeded = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    ['seeded']
  );

  if (!seeded || seeded.value !== '1') {
    await seedDatabase(db);
    await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', ['seeded', '1']);
  }

  await ensureDefaults(db);
}
