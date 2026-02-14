import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';

import { getDashboardStats, getDeliveryProgress, getProductDeliveryStats } from '@/repositories/dashboard';
import { DashboardStats, ProductDeliveryStat, ShopProgress } from '@/types/models';

export function useDashboard(vehicleId: number | null) {
  const db = useSQLiteContext();
  const [stats, setStats] = useState<DashboardStats>({
    total_orders: 0,
    pending_orders: 0,
    delivered_today: 0,
    revenue_today: 0,
    inventory_remaining: 0,
    commission_today: 0,
    cash_total: 0,
    cheque_total: 0,
    credit_total: 0,
    shops_completed: 0,
    total_gas_delivered: 0,
    target_progress: 0,
    target_qty: 0,
  });
  const [progress, setProgress] = useState<ShopProgress[]>([]);
  const [productStats, setProductStats] = useState<ProductDeliveryStat[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vehicleId) {
      setStats({
        total_orders: 0,
        pending_orders: 0,
        delivered_today: 0,
        revenue_today: 0,
        inventory_remaining: 0,
        commission_today: 0,
        cash_total: 0,
        cheque_total: 0,
        credit_total: 0,
        shops_completed: 0,
        total_gas_delivered: 0,
        target_progress: 0,
        target_qty: 0,
      });
      setProgress([]);
      setProductStats([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await getDashboardStats(db, vehicleId);
    const progressRows = await getDeliveryProgress(db, vehicleId);
    const productRows = await getProductDeliveryStats(db, vehicleId);
    setStats(result);
    setProgress(progressRows);
    setProductStats(productRows);
    setLoading(false);
  }, [db, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { stats, progress, productStats, loading, refresh: load };
}
