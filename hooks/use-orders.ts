import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';

import { getOrderById, getOrderItems, getOrdersForVehicle } from '@/repositories/orders';
import { OrderDetail, OrderItem, OrderSummary } from '@/types/models';

export function useOrders(vehicleId: number | null) {
  const db = useSQLiteContext();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vehicleId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await getOrdersForVehicle(db, vehicleId);
    setOrders(result);
    setLoading(false);
  }, [db, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { orders, loading, refresh: load };
}

export function useOrderDetail(orderId: number | null) {
  const db = useSQLiteContext();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orderId) {
      setOrder(null);
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const detail = await getOrderById(db, orderId);
    const detailItems = await getOrderItems(db, orderId);
    setOrder(detail ?? null);
    setItems(detailItems);
    setLoading(false);
  }, [db, orderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { order, items, loading, refresh: load };
}
