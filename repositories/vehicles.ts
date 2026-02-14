import { SQLiteDatabase } from 'expo-sqlite';

import { Vehicle } from '@/types/models';

export async function getVehicles(db: SQLiteDatabase) {
  return db.getAllAsync<Vehicle>('SELECT * FROM vehicles ORDER BY name ASC');
}

export async function getVehicleById(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Vehicle>('SELECT * FROM vehicles WHERE id = ?', [id]);
}
