import { SQLiteDatabase } from 'expo-sqlite';

import { InventoryItem, InventoryMovement } from '@/types/models';

export async function getInventoryForVehicle(db: SQLiteDatabase, vehicleId: number) {
  return db.getAllAsync<InventoryItem>(
    `SELECT i.id, i.vehicle_id, i.product_id, i.quantity,
            p.name as product_name, p.unit as unit
     FROM inventory i
     JOIN products p ON p.id = i.product_id
     WHERE i.vehicle_id = ?
     ORDER BY p.name ASC`,
    [vehicleId]
  );
}

export async function adjustInventory(
  db: SQLiteDatabase,
  vehicleId: number,
  productId: number,
  quantityChange: number,
  movementType: 'load' | 'return',
  notes?: string
) {
  await db.execAsync('BEGIN');
  try {
    const row = await db.getFirstAsync<{ id: number; quantity: number }>(
      'SELECT id, quantity FROM inventory WHERE vehicle_id = ? AND product_id = ?',
      [vehicleId, productId]
    );
    const currentQty = row?.quantity ?? 0;
    const nextQty = currentQty + quantityChange;
    if (nextQty < 0) {
      throw new Error('Inventory cannot go below zero.');
    }

    if (row?.id) {
      await db.runAsync('UPDATE inventory SET quantity = ? WHERE id = ?', [nextQty, row.id]);
    } else {
      await db.runAsync(
        'INSERT INTO inventory (vehicle_id, product_id, quantity) VALUES (?, ?, ?)',
        [vehicleId, productId, nextQty]
      );
    }

    await db.runAsync(
      'INSERT INTO inventory_movements (vehicle_id, product_id, quantity_change, movement_type, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [vehicleId, productId, quantityChange, movementType, notes ?? null, new Date().toISOString()]
    );

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

export async function getInventoryMovements(db: SQLiteDatabase, vehicleId: number) {
  return db.getAllAsync<InventoryMovement>(
    `SELECT m.id, m.vehicle_id, m.product_id, m.quantity_change, m.movement_type, m.notes, m.created_at,
            p.name as product_name, p.unit as unit
     FROM inventory_movements m
     JOIN products p ON p.id = m.product_id
     WHERE m.vehicle_id = ?
     ORDER BY m.created_at DESC
     LIMIT 10`,
    [vehicleId]
  );
}
