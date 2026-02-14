import { SQLiteDatabase } from 'expo-sqlite';

import { PaymentMethod } from '@/types/models';

export async function recordPayment(
  db: SQLiteDatabase,
  orderId: number,
  method: PaymentMethod,
  amount: number,
  amountReceived?: number,
  changeGiven?: number,
  deliveryId?: number | null,
  bankName?: string,
  chequeNo?: string
) {
  if (method === 'cheque' && (!bankName || !chequeNo)) {
    throw new Error('Cheque payments require bank name and cheque number.');
  }

  await db.execAsync('BEGIN');
  try {
    await db.runAsync(
      'INSERT INTO payments (order_id, delivery_id, method, amount, amount_received, change_given, bank_name, cheque_no, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        orderId,
        deliveryId ?? null,
        method,
        amount,
        amountReceived ?? null,
        changeGiven ?? null,
        bankName ?? null,
        chequeNo ?? null,
        new Date().toISOString(),
      ]
    );

    const receiptNo = `RCPT-${Date.now()}`;
    await db.runAsync(
      'INSERT INTO receipts (order_id, receipt_no, created_at) VALUES (?, ?, ?)',
      [orderId, receiptNo, new Date().toISOString()]
    );

    await db.runAsync('UPDATE orders SET status = ? WHERE id = ?', ['paid', orderId]);

    await db.execAsync('COMMIT');
    return receiptNo;
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

export async function getLatestReceipt(db: SQLiteDatabase, orderId: number) {
  return db.getFirstAsync<{ receipt_no: string; created_at: string }>(
    'SELECT receipt_no, created_at FROM receipts WHERE order_id = ? ORDER BY id DESC LIMIT 1',
    [orderId]
  );
}

export async function getLatestPayment(db: SQLiteDatabase, orderId: number) {
  return db.getFirstAsync<{
    method: string;
    amount: number;
    amount_received?: number | null;
    change_given?: number | null;
    bank_name?: string | null;
    cheque_no?: string | null;
    paid_at: string;
  }>(
    'SELECT method, amount, amount_received, change_given, bank_name, cheque_no, paid_at FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1',
    [orderId]
  );
}
