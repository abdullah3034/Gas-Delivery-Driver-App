import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { useOrderDetail } from '@/hooks/use-orders';
import { useReceipt } from '@/hooks/use-receipt';
import { useVehicles } from '@/hooks/use-vehicles';
import { Design, Fonts } from '@/constants/theme';

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

export default function ReceiptScreen() {
  const params = useLocalSearchParams();
  const orderId = Number(params.id);
  const db = useSQLiteContext();
  const { order, items } = useOrderDetail(Number.isFinite(orderId) ? orderId : null);
  const { receipt, payment } = useReceipt(Number.isFinite(orderId) ? orderId : null);
  const { vehicles } = useVehicles();

  const vehicle = vehicles.find((item) => item.id === order?.vehicle_id);
  const amountPaid = payment?.amount ?? 0;
  const amountReceived = payment?.amount_received ?? amountPaid;
  const changeGiven = payment?.change_given ?? 0;
  const [deliveryHistory, setDeliveryHistory] = useState<
    { id: number; delivered_at: string; amount: number }[]
  >([]);
  const [deliveryItems, setDeliveryItems] = useState<
    { delivery_id: number; product_name: string; qty_delivered: number; price_per_unit: number }[]
  >([]);
  const [deliveryPayments, setDeliveryPayments] = useState<
    {
      delivery_id: number;
      method: string;
      amount: number;
      amount_received?: number | null;
      change_given?: number | null;
    }[]
  >([]);
  const itemsTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.qty_delivered * item.price_per_unit, 0),
    [items]
  );

  useEffect(() => {
    if (!order) return;
    Promise.all([
      db.getAllAsync<{ id: number; delivered_at: string; amount: number }>(
        'SELECT id, delivered_at, amount FROM deliveries WHERE order_id = ? ORDER BY id ASC',
        [order.id]
      ),
      db.getAllAsync<{ delivery_id: number; product_name: string; qty_delivered: number; price_per_unit: number }>(
        `SELECT di.delivery_id, p.name as product_name, di.qty_delivered, di.price_per_unit
         FROM delivery_items di
         JOIN products p ON p.id = di.product_id
         WHERE di.delivery_id IN (SELECT id FROM deliveries WHERE order_id = ?)
         ORDER BY di.delivery_id ASC`,
        [order.id]
      ),
      db.getAllAsync<{
        delivery_id: number;
        method: string;
        amount: number;
        amount_received?: number | null;
        change_given?: number | null;
      }>(
        `SELECT delivery_id, method, amount, amount_received, change_given
         FROM payments
         WHERE order_id = ? AND delivery_id IS NOT NULL
         ORDER BY id ASC`,
        [order.id]
      ),
    ])
      .then(([deliveries, itemsRows, paymentRows]) => {
        setDeliveryHistory(deliveries);
        setDeliveryItems(itemsRows);
        setDeliveryPayments(paymentRows);
      })
      .catch(() => {
        setDeliveryHistory([]);
        setDeliveryItems([]);
        setDeliveryPayments([]);
      });
  }, [db, order]);

  if (!order) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Receipt not available.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Receipt</Text>

      <View style={styles.receipt}>
        <Text style={styles.receiptTitle}>GAS DELIVERY RECEIPT</Text>
        <Text style={styles.receiptMeta}>Receipt: {receipt?.receipt_no ?? 'Pending'}</Text>
        <Text style={styles.receiptMeta}>
          Date: {receipt?.created_at ? new Date(receipt.created_at).toLocaleString() : ''}
        </Text>
        <Text style={styles.receiptMeta}>Vehicle: {vehicle ? `${vehicle.name} (${vehicle.plate})` : 'N/A'}</Text>

        <View style={styles.receiptSection}>
          <Text style={styles.receiptSectionTitle}>Customer</Text>
          <Text style={styles.receiptText}>{order.customer_name}</Text>
          <Text style={styles.receiptText}>{order.customer_address}</Text>
        </View>

        <View style={styles.receiptSection}>
          <Text style={styles.receiptSectionTitle}>Items</Text>
          {items.filter((item) => item.qty_delivered > 0).map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.receiptText}>{item.product_name}</Text>
                <Text style={styles.receiptSubtext}>
                  {item.qty_delivered} {item.unit} x {formatCurrency(item.price_per_unit)}
                </Text>
              </View>
              <Text style={styles.receiptText}>
                {formatCurrency(item.qty_delivered * item.price_per_unit)}
              </Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.receiptTotal}>Total</Text>
            <Text style={styles.receiptTotal}>{formatCurrency(itemsTotal)}</Text>
          </View>
        </View>

        {deliveryHistory.length > 1 && (
          <View style={styles.receiptSection}>
            <Text style={styles.receiptSectionTitle}>Delivery History</Text>
            {deliveryHistory.map((delivery, index) => {
              const itemsForDelivery = deliveryItems.filter((item) => item.delivery_id === delivery.id);
              const paymentForDelivery = deliveryPayments.find(
                (paymentRow) => paymentRow.delivery_id === delivery.id
              );
              const deliveryTotal = itemsForDelivery.reduce(
                (sum, item) => sum + item.qty_delivered * item.price_per_unit,
                0
              );
              const paidAmount = paymentForDelivery?.amount ?? 0;
              const changeGivenForDelivery =
                paymentForDelivery?.change_given ?? Math.max(paidAmount - deliveryTotal, 0);
              const paymentMethodForDelivery =
                paymentForDelivery?.method?.toUpperCase() ?? 'N/A';

              return (
                <View key={delivery.id} style={styles.deliveryBlock}>
                  <Text style={styles.deliveryTitle}>
                    Delivery {index + 1} - {new Date(delivery.delivered_at).toLocaleString()}
                  </Text>
                  {itemsForDelivery.map((item, itemIndex) => (
                    <View key={`${delivery.id}-${itemIndex}`} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.receiptText}>{item.product_name}</Text>
                        <Text style={styles.receiptSubtext}>
                          {item.qty_delivered} x {formatCurrency(item.price_per_unit)}
                        </Text>
                      </View>
                      <Text style={styles.receiptText}>
                        {formatCurrency(item.qty_delivered * item.price_per_unit)}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.totalRow}>
                    <Text style={styles.receiptTotal}>Total</Text>
                    <Text style={styles.receiptTotal}>{formatCurrency(deliveryTotal)}</Text>
                  </View>
                  {paymentMethodForDelivery === 'CASH' ? (
                    <>
                      <View style={styles.paymentRow}>
                        <Text style={styles.receiptText}>Amount Paid</Text>
                        <Text style={styles.receiptText}>{formatCurrency(paidAmount)}</Text>
                      </View>
                      <View style={styles.paymentRow}>
                        <Text style={styles.receiptText}>Change Given</Text>
                        <Text style={styles.receiptText}>{formatCurrency(changeGivenForDelivery)}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.paymentRow}>
                      <Text style={styles.receiptText}>Paid Via</Text>
                      <Text style={styles.receiptText}>{paymentMethodForDelivery}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {deliveryHistory.length <= 1 && (
          <View style={styles.receiptSection}>
            <Text style={styles.receiptSectionTitle}>Payment</Text>
            <Text style={styles.receiptText}>{payment?.method?.toUpperCase() ?? 'N/A'}</Text>
            <Text style={styles.receiptText}>Total Due: {formatCurrency(itemsTotal)}</Text>
            {payment?.method === 'cash' ? (
              <>
                <Text style={styles.receiptText}>Cash Received: {formatCurrency(amountReceived)}</Text>
                <Text style={styles.receiptText}>Change Given: {formatCurrency(changeGiven)}</Text>
              </>
            ) : (
              <Text style={styles.receiptText}>
                Paid Via: {payment?.method?.toUpperCase() ?? 'N/A'}
              </Text>
            )}
            {payment?.bank_name ? <Text style={styles.receiptText}>Bank: {payment.bank_name}</Text> : null}
            {payment?.cheque_no ? <Text style={styles.receiptText}>Cheque: {payment.cheque_no}</Text> : null}
          </View>
        )}
      </View>

      <Pressable style={styles.primaryButton} onPress={() => router.replace('/orders')}>
        <Text style={styles.primaryButtonText}>Back to Orders</Text>
      </Pressable>
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Design.colors.ink,
    fontFamily: Fonts.serif,
  },
  card: {
    backgroundColor: Design.colors.surface,
    borderRadius: Design.radius.md,
    padding: Design.spacing.md,
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  receipt: {
    backgroundColor: Design.colors.surface,
    borderRadius: Design.radius.md,
    padding: Design.spacing.lg,
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: Design.colors.ink,
    fontFamily: Fonts.serif,
  },
  receiptMeta: {
    textAlign: 'center',
    color: Design.colors.muted,
    marginTop: 4,
  },
  receiptSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0ede7',
    paddingTop: 12,
    marginTop: 12,
  },
  receiptSectionTitle: {
    fontWeight: '700',
    color: Design.colors.ink,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  deliveryBlock: {
    borderTopWidth: 1,
    borderTopColor: '#f0ede7',
    paddingTop: 12,
    marginTop: 12,
  },
  deliveryTitle: {
    fontWeight: '700',
    color: Design.colors.ink,
    marginBottom: 8,
  },
  receiptText: {
    color: Design.colors.ink,
  },
  receiptSubtext: {
    color: Design.colors.muted,
    marginTop: 2,
    fontSize: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  itemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0ede7',
    paddingTop: 10,
    marginTop: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  receiptTotal: {
    fontWeight: '700',
    color: Design.colors.ink,
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
