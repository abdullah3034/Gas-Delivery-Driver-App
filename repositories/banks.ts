import { SQLiteDatabase } from 'expo-sqlite';

import { Bank } from '@/types/models';

export async function getBanks(db: SQLiteDatabase) {
  return db.getAllAsync<Bank>('SELECT id, name FROM banks ORDER BY name ASC');
}
