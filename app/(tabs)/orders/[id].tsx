import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { useOrderDetail } from '@/hooks/use-orders';
import { setOrderStatus } from '@/repositories/orders';
import { Design, Fonts } from '@/constants/theme';

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

const statusLabels: Record<string, string> = {
  assigned: 'Pending',
  in_progress: 'In Progress',
  delivered: 'Completed',
  partial: 'Completed (Partial)',
  paid: 'Paid',
};

export default function OrderDetailScreen() {
  const params = useLocalSearchParams();
  const orderId = Number(params.id);
  const db = useSQLiteContext();
  const { order, items } = useOrderDetail(Number.isFinite(orderId) ? orderId : null);
  const [latestDeliveryAmount, setLatestDeliveryAmount] = useState(0);

  const isPartial =
    items.length > 0 && items.some((item) => item.qty_delivered < item.qty_ordered);
  useEffect(() => {
    if (!order) return;
    db.getFirstAsync<{ amount: number }>(
      'SELECT amount FROM deliveries WHERE order_id = ? ORDER BY id DESC LIMIT 1',
      [order.id]
    )
      .then((row) => setLatestDeliveryAmount(row?.amount ?? 0))
      .catch(() => setLatestDeliveryAmount(0));
  }, [db, order]);

  if (!order) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Order not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{order.order_no}</Text>
        <Text style={styles.cardSubtitle}>{order.customer_name}</Text>
        <Text style={styles.cardSubtitle}>{order.customer_address}</Text>
        {order.customer_phone ? <Text style={styles.cardSubtitle}>{order.customer_phone}</Text> : null}
        <Text style={styles.cardSubtitle}>
          Status:{' '}
          {(() => {
            if (order.status === 'paid' && isPartial) {
              return 'PAID - PARTIAL FULFILLMENT';
            }
            return (statusLabels[order.status] ?? order.status).toUpperCase();
          })()}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Items</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View>
              <Text style={styles.itemName}>{item.product_name}</Text>
              <Text style={styles.cardSubtitle}>
                Ordered: {item.qty_ordered} {item.unit}
              </Text>
              <Text style={styles.cardSubtitle}>
                Delivered: {item.qty_delivered} {item.unit}
              </Text>
            </View>
            {(order.status === 'paid' || order.status === 'delivered' || order.status === 'partial') && (
              <Text style={styles.itemAmount}>
                {formatCurrency(item.price_per_unit * item.qty_delivered)}
              </Text>
            )}
          </View>
        ))}
      </View>

      {(order.status === 'paid' || order.status === 'delivered' || order.status === 'partial') && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {order.status === 'paid' && isPartial ? 'Last Delivery Amount' : 'Total Due'}
          </Text>
          <Text style={styles.totalAmount}>
            {formatCurrency(order.status === 'paid' && isPartial ? latestDeliveryAmount : order.total_amount)}
          </Text>
        </View>
      )}

      {order.status === 'assigned' && (
        <Pressable
          style={styles.primaryButton}
          onPress={async () => {
            await setOrderStatus(db, order.id, 'in_progress');
            router.push(`/orders/${order.id}/confirm`);
          }}>
          <Text style={styles.primaryButtonText}>Start Delivery</Text>
        </Pressable>
      )}

      {order.status === 'in_progress' && (
        <>
          <Pressable style={styles.primaryButton} onPress={() => router.push(`/orders/${order.id}/confirm`)}>
            <Text style={styles.primaryButtonText}>Confirm Delivery</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              Alert.alert('Cancel Delivery', 'Move this order back to Pending?', [
                { text: 'No' },
                {
                  text: 'Yes, Cancel',
                  onPress: async () => {
                    await setOrderStatus(db, order.id, 'assigned');
                    router.replace('/orders');
                  },
                },
              ]);
            }}>
            <Text style={styles.secondaryButtonText}>Cancel Delivery</Text>
          </Pressable>
        </>
      )}

      {(order.status === 'delivered' || order.status === 'partial') && (
        <Pressable style={styles.primaryButton} onPress={() => router.push(`/orders/${order.id}/payment`)}>
          <Text style={styles.primaryButtonText}>Record Payment</Text>
        </Pressable>
      )}

      {order.status === 'paid' && (
        <>
          {isPartial && (
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push(`/orders/${order.id}/confirm?mode=remaining`)}>
              <Text style={styles.primaryButtonText}>Complete Remaining Delivery</Text>
            </Pressable>
          )}
          <Pressable style={styles.secondaryButton} onPress={() => router.push(`/orders/${order.id}/receipt`)}>
            <Text style={styles.secondaryButtonText}>View Receipt</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.colors.background,
  },
  content: {
    padding: Design.spacing.lg,
    gap: 16,
  },
  card: {
    backgroundColor: Design.colors.surface,
    borderRadius: Design.radius.md,
    padding: Design.spacing.md,
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Design.colors.ink,
    fontFamily: Fonts.serif,
  },
  cardSubtitle: {
    color: Design.colors.muted,
    marginTop: 4,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 8,
    color: Design.colors.ink,
  },
  itemRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0ede7',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemName: {
    fontWeight: '600',
    color: Design.colors.ink,
  },
  itemAmount: {
    fontWeight: '600',
    color: Design.colors.secondary,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: Design.colors.secondary,
  },
  primaryButton: {
    backgroundColor: Design.colors.secondary,
    paddingVertical: 14,
    borderRadius: Design.radius.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#efe7dc',
    paddingVertical: 14,
    borderRadius: Design.radius.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Design.colors.ink,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Design.colors.background,
  },
  emptyText: {
    color: Design.colors.muted,
  },
});
