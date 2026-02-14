import { SQLiteDatabase } from 'expo-sqlite';

import { DashboardStats, ProductDeliveryStat, ShopProgress } from '@/types/models';

function toNumber(value: string | null | undefined, fallback = 0) {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getDashboardStats(db: SQLiteDatabase, vehicleId: number) {
  const totalOrdersRow = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM orders WHERE vehicle_id = ? AND scheduled_date = date('now')",
    [vehicleId]
  );
  const pendingOrdersRow = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM orders WHERE vehicle_id = ? AND scheduled_date = date('now') AND status IN ('assigned', 'in_progress')",
    [vehicleId]
  );
  const deliveredTodayRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM orders o
     WHERE o.vehicle_id = ?
       AND o.scheduled_date = date('now')
       AND o.status IN ('delivered', 'partial', 'paid')`,
    [vehicleId]
  );
  const revenueTodayRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(p.amount), 0) as total
     FROM payments p
     JOIN orders o ON o.id = p.order_id
     WHERE o.vehicle_id = ? AND date(p.paid_at) = date('now')`,
    [vehicleId]
  );
  const inventoryRemainingRow = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(quantity), 0) as total FROM inventory WHERE vehicle_id = ?',
    [vehicleId]
  );

  const cashRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(p.amount), 0) as total
     FROM payments p
     JOIN orders o ON o.id = p.order_id
     WHERE o.vehicle_id = ? AND p.method = 'cash' AND date(p.paid_at) = date('now')`,
    [vehicleId]
  );
  const chequeRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(p.amount), 0) as total
     FROM payments p
     JOIN orders o ON o.id = p.order_id
     WHERE o.vehicle_id = ? AND p.method = 'cheque' AND date(p.paid_at) = date('now')`,
    [vehicleId]
  );
  const creditRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(p.amount), 0) as total
     FROM payments p
     JOIN orders o ON o.id = p.order_id
     WHERE o.vehicle_id = ? AND p.method = 'credit' AND date(p.paid_at) = date('now')`,
    [vehicleId]
  );

  const totalGasRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(oi.qty_delivered), 0) as total
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.vehicle_id = ?
       AND o.id IN (
         SELECT DISTINCT d.order_id FROM deliveries d WHERE date(d.delivered_at) = date('now')
       )`,
    [vehicleId]
  );


  const shopsCompletedRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM orders o
     WHERE o.vehicle_id = ?
       AND o.scheduled_date = date('now')
       AND o.status IN ('delivered', 'partial', 'paid')`,
    [vehicleId]
  );

  const commissionRateRow = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    ['commission_rate_per_unit']
  );
  const commissionTargetRow = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    ['commission_daily_target_qty']
  );
  const commissionRate = toNumber(commissionRateRow?.value, 0);
  const targetQty = toNumber(commissionTargetRow?.value, 0);
  const totalGas = totalGasRow?.total ?? 0;
  const revenueToday = revenueTodayRow?.total ?? 0;
  const commissionToday = revenueToday * commissionRate;

  return {
    total_orders: totalOrdersRow?.count ?? 0,
    pending_orders: pendingOrdersRow?.count ?? 0,
    delivered_today: deliveredTodayRow?.count ?? 0,
    revenue_today: revenueTodayRow?.total ?? 0,
    inventory_remaining: inventoryRemainingRow?.total ?? 0,
    commission_today: commissionToday,
    cash_total: cashRow?.total ?? 0,
    cheque_total: chequeRow?.total ?? 0,
    credit_total: creditRow?.total ?? 0,
    shops_completed: shopsCompletedRow?.count ?? 0,
    total_gas_delivered: totalGas,
    target_progress: targetQty > 0 ? Math.min(commissionToday / targetQty, 1) : 0,
    target_qty: targetQty,
  } satisfies DashboardStats;
}

export async function getDeliveryProgress(db: SQLiteDatabase, vehicleId: number) {
  const rows = await db.getAllAsync<{
    customer_name: string;
    total_ordered: number;
    total_delivered: number;
  }>(
    `SELECT c.name as customer_name,
            COALESCE(SUM(oi.qty_ordered), 0) as total_ordered,
            COALESCE(SUM(oi.qty_delivered), 0) as total_delivered
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     JOIN order_items oi ON oi.order_id = o.id
     WHERE o.vehicle_id = ? AND o.scheduled_date = date('now')
     GROUP BY c.id
     ORDER BY c.name ASC`,
    [vehicleId]
  );

  return rows.map((row) => ({
    ...row,
    completion_rate:
      row.total_ordered > 0 ? Math.min(row.total_delivered / row.total_ordered, 1) : 0,
  })) satisfies ShopProgress[];
}

export async function getProductDeliveryStats(db: SQLiteDatabase, vehicleId: number) {
  const deliveredRows = await db.getAllAsync<{
    product_id: number;
    product_name: string;
    unit: string;
    delivered_qty: number;
  }>(
    `SELECT p.id as product_id, p.name as product_name, p.unit as unit,
            COALESCE(SUM(di.qty_delivered), 0) as delivered_qty
     FROM deliveries d
     JOIN orders o ON o.id = d.order_id
     JOIN delivery_items di ON di.delivery_id = d.id
     JOIN products p ON p.id = di.product_id
     WHERE o.vehicle_id = ? AND date(d.delivered_at) = date('now')
     GROUP BY p.id
     ORDER BY p.name ASC`,
    [vehicleId]
  );

  const inventoryRows = await db.getAllAsync<{ product_id: number; quantity: number }>(
    'SELECT product_id, quantity FROM inventory WHERE vehicle_id = ?',
    [vehicleId]
  );
  const inventoryMap = new Map<number, number>();
  inventoryRows.forEach((row) => inventoryMap.set(row.product_id, row.quantity));

  return deliveredRows.map((row) => {
    const currentQty = inventoryMap.get(row.product_id) ?? 0;
    const initialQty = currentQty + row.delivered_qty;
    return {
      ...row,
      current_qty: currentQty,
      initial_qty: initialQty,
      delivered_ratio: initialQty > 0 ? Math.min(row.delivered_qty / initialQty, 1) : 0,
    };
  }) satisfies ProductDeliveryStat[];
}
