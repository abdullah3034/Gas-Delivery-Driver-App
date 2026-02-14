import { SQLiteDatabase } from 'expo-sqlite';

import { OrderDetail, OrderItem, OrderSummary } from '@/types/models';

export type DeliveredItemInput = {
  item_id: number;
  product_id: number;
  qty_delivered: number;
};

export async function getOrdersForVehicle(db: SQLiteDatabase, vehicleId: number) {
  return db.getAllAsync<OrderSummary>(
    `SELECT o.id, o.order_no, o.status, o.scheduled_date, o.total_amount,
            c.name as customer_name,
            CASE
              WHEN EXISTS (
                SELECT 1 FROM order_items oi
                WHERE oi.order_id = o.id AND oi.qty_delivered < oi.qty_ordered
              )
              THEN 1 ELSE 0
            END as is_partial
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     WHERE o.vehicle_id = ?
     ORDER BY o.created_at DESC`,
    [vehicleId]
  );
}

export async function getOrderById(db: SQLiteDatabase, orderId: number) {
  return db.getFirstAsync<OrderDetail>(
    `SELECT o.id, o.order_no, o.status, o.scheduled_date, o.total_amount,
            o.customer_id, o.vehicle_id,
            c.name as customer_name, c.address as customer_address, c.phone as customer_phone
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     WHERE o.id = ?`,
    [orderId]
  );
}

export async function getOrderItems(db: SQLiteDatabase, orderId: number) {
  return db.getAllAsync<OrderItem>(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.qty_ordered, oi.qty_delivered, oi.price_per_unit,
            p.name as product_name, p.unit as unit
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?
     ORDER BY oi.id ASC`,
    [orderId]
  );
}

export async function setOrderStatus(db: SQLiteDatabase, orderId: number, status: string) {
  await db.runAsync('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
}

export async function confirmDelivery(
  db: SQLiteDatabase,
  orderId: number,
  deliveredBy: string,
  items: DeliveredItemInput[]
) {
  await db.execAsync('BEGIN');
  try {
    const orderRow = await db.getFirstAsync<{ status: string; total_amount: number }>(
      'SELECT status, total_amount FROM orders WHERE id = ?',
      [orderId]
    );
    const currentStatus = orderRow?.status ?? 'assigned';
    const currentTotal = orderRow?.total_amount ?? 0;

    const existingItems = await db.getAllAsync<{
      id: number;
      qty_delivered: number;
      price_per_unit: number;
    }>(
      'SELECT id, qty_delivered, price_per_unit FROM order_items WHERE order_id = ?',
      [orderId]
    );
    const existingMap = new Map<number, { qty: number; price: number }>();
    existingItems.forEach((row) => existingMap.set(row.id, { qty: row.qty_delivered, price: row.price_per_unit }));

    for (const item of items) {
      const inventory = await db.getFirstAsync<{ quantity: number }>(
        'SELECT quantity FROM inventory WHERE product_id = ? AND vehicle_id = (SELECT vehicle_id FROM orders WHERE id = ?)',
        [item.product_id, orderId]
      );

      const currentDelivered = existingMap.get(item.item_id)?.qty ?? 0;
      const delta = item.qty_delivered - currentDelivered;
      if (delta < 0) {
        throw new Error('Delivered quantity cannot be less than already delivered.');
      }

      if (!inventory || inventory.quantity < delta) {
        throw new Error('Insufficient inventory for one or more items.');
      }
    }

    for (const item of items) {
      const currentDelivered = existingMap.get(item.item_id)?.qty ?? 0;
      const delta = item.qty_delivered - currentDelivered;

      await db.runAsync(
        'UPDATE order_items SET qty_delivered = ? WHERE id = ?',
        [item.qty_delivered, item.item_id]
      );

      if (delta > 0) {
        await db.runAsync(
          `UPDATE inventory
           SET quantity = quantity - ?
           WHERE product_id = ? AND vehicle_id = (SELECT vehicle_id FROM orders WHERE id = ?)`,
          [delta, item.product_id, orderId]
        );
      }

      if (delta > 0) {
        await db.runAsync(
          `INSERT INTO inventory_movements (vehicle_id, product_id, quantity_change, movement_type, notes, created_at)
           VALUES ((SELECT vehicle_id FROM orders WHERE id = ?), ?, ?, ?, ?, ?)`,
          [orderId, item.product_id, -delta, 'delivery', 'Order delivery', new Date().toISOString()]
        );
      }
    }

    const deltaAmount = items.reduce((sum, item) => {
      const existing = existingMap.get(item.item_id);
      const currentDelivered = existing?.qty ?? 0;
      const price = existing?.price ?? 0;
      const delta = Math.max(item.qty_delivered - currentDelivered, 0);
      return sum + delta * price;
    }, 0);
    const totalAmount = currentTotal + deltaAmount;

    const partialRow = await db.getFirstAsync<{ partial_count: number }>(
      `SELECT SUM(CASE WHEN qty_delivered < qty_ordered THEN 1 ELSE 0 END) as partial_count
       FROM order_items WHERE order_id = ?`,
      [orderId]
    );
    const isPartial = (partialRow?.partial_count ?? 0) > 0;
    const nextStatus =
      currentStatus === 'paid' ? 'paid' : isPartial ? 'partial' : 'delivered';

    await db.runAsync('UPDATE orders SET status = ?, total_amount = ? WHERE id = ?', [
      nextStatus,
      totalAmount,
      orderId,
    ]);

    const deliveryResult = await db.runAsync(
      'INSERT INTO deliveries (order_id, delivered_at, delivered_by, amount, notes) VALUES (?, ?, ?, ?, ?)',
      [orderId, new Date().toISOString(), deliveredBy, deltaAmount, null]
    );
    const deliveryId = (deliveryResult as { lastInsertRowId?: number }).lastInsertRowId;

    if (deliveryId) {
      for (const item of items) {
        const existing = existingMap.get(item.item_id);
        const currentDelivered = existing?.qty ?? 0;
        const price = existing?.price ?? 0;
        const delta = Math.max(item.qty_delivered - currentDelivered, 0);
        if (delta > 0) {
          await db.runAsync(
            'INSERT INTO delivery_items (delivery_id, product_id, qty_delivered, price_per_unit) VALUES (?, ?, ?, ?)',
            [deliveryId, item.product_id, delta, price]
          );
        }
      }
    }

    const totalQty = items.reduce((sum, item) => sum + item.qty_delivered, 0);
    const existingSale = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM sales WHERE order_id = ?',
      [orderId]
    );
    if (existingSale?.id) {
      await db.runAsync(
        'UPDATE sales SET total_qty = ?, total_amount = ?, created_at = ? WHERE id = ?',
        [totalQty, totalAmount, new Date().toISOString(), existingSale.id]
      );
    } else {
      await db.runAsync(
        'INSERT INTO sales (order_id, total_qty, total_amount, created_at) VALUES (?, ?, ?, ?)',
        [orderId, totalQty, totalAmount, new Date().toISOString()]
      );
    }

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}
