import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';

import { getLatestPayment, getLatestReceipt } from '@/repositories/payments';

type ReceiptInfo = {
  receipt_no: string;
  created_at: string;
};

type PaymentInfo = {
  method: string;
  amount: number;
  amount_received?: number | null;
  change_given?: number | null;
  bank_name?: string | null;
  cheque_no?: string | null;
  paid_at: string;
};

export function useReceipt(orderId: number | null) {
  const db = useSQLiteContext();
  const [receipt, setReceipt] = useState<ReceiptInfo | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orderId) {
      setReceipt(null);
      setPayment(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const receiptRow = await getLatestReceipt(db, orderId);
    const paymentRow = await getLatestPayment(db, orderId);
    setReceipt(receiptRow ?? null);
    setPayment(paymentRow ?? null);
    setLoading(false);
  }, [db, orderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { receipt, payment, loading, refresh: load };
}
