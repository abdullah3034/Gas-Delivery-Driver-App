import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { useOrderDetail } from '@/hooks/use-orders';
import { useInventory } from '@/hooks/use-inventory';
import { confirmDelivery } from '@/repositories/orders';
import { Design, Fonts } from '@/constants/theme';

export default function ConfirmDeliveryScreen() {
  const params = useLocalSearchParams();
  const orderId = Number(params.id);
  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const mode = modeParam === 'remaining' ? 'remaining' : 'standard';
  const db = useSQLiteContext();
  const { order, items } = useOrderDetail(Number.isFinite(orderId) ? orderId : null);
  const { inventory } = useInventory(order?.vehicle_id ?? null);
  const [deliveredBy, setDeliveredBy] = useState('Driver 01');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<string | null>(null);
  const [deliveredMap, setDeliveredMap] = useState<Record<number, string>>({});

  useEffect(() => {
    if (items.length > 0) {
      const next = Object.fromEntries(
        items.map((item) => {
          const remaining = Math.max(item.qty_ordered - item.qty_delivered, 0);
          const defaultValue = mode === 'remaining' ? remaining : item.qty_ordered;
          return [item.id, String(defaultValue)];
        })
      );
      setDeliveredMap(next);
    }
  }, [items, mode]);

  const inventoryByProduct = useMemo(() => {
    const map = new Map<number, number>();
    inventory.forEach((item) => map.set(item.product_id, item.quantity));
    return map;
  }, [inventory]);



  const updateDelivered = (itemId: number, value: string) => {
    setDeliveredMap((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = async () => {
    if (!order) return;
    const payload = items.map((item) => {
      const raw = deliveredMap[item.id] ?? '0';
      const qty = Number.parseFloat(raw);
      const remaining = Math.max(item.qty_ordered - item.qty_delivered, 0);
      const normalized = Number.isFinite(qty) ? qty : 0;
      const targetQty =
        mode === 'remaining' ? item.qty_delivered + Math.min(normalized, remaining) : normalized;
      return {
        item,
        qty: targetQty,
        inputQty: normalized,
      };
    });

    for (const entry of payload) {
      const available = inventoryByProduct.get(entry.item.product_id) ?? 0;
      const remaining = Math.max(entry.item.qty_ordered - entry.item.qty_delivered, 0);
      if (entry.qty < 0) {
        setErrors('Delivered quantity cannot be negative.');
        return;
      }
      if (entry.qty < entry.item.qty_delivered) {
        setErrors('Delivered quantity cannot be less than already delivered.');
        return;
      }
      if (mode === 'remaining' && entry.inputQty > remaining) {
        setErrors('Delivered quantity cannot exceed remaining quantity.');
        return;
      }
      if (entry.qty > entry.item.qty_ordered) {
        setErrors('Delivered quantity cannot exceed ordered quantity.');
        return;
      }
      const delta = entry.qty - entry.item.qty_delivered;
      if (delta > available) {
        setErrors('Delivered quantity cannot exceed vehicle inventory.');
        return;
      }
    }

    const totalDelta = payload.reduce((sum, entry) => sum + (entry.qty - entry.item.qty_delivered), 0);
    if (totalDelta <= 0) {
      setErrors('Enter at least one additional delivered quantity.');
      return;
    }

    try {
      setErrors(null);
      await confirmDelivery(
        db,
        order.id,
        deliveredBy.trim() || 'Driver',
        payload.map((entry) => ({
          item_id: entry.item.id,
          product_id: entry.item.product_id,
          qty_delivered: entry.qty,
        }))
      );
      if (notes.trim()) {
        await db.runAsync(
          'UPDATE deliveries SET notes = ? WHERE id = (SELECT id FROM deliveries WHERE order_id = ? ORDER BY id DESC LIMIT 1)',
          [notes.trim(), order.id]
        );
      }
      router.replace(`/orders/${order.id}/payment`);
    } catch (error) {
      Alert.alert('Delivery Error', error instanceof Error ? error.message : 'Unable to confirm delivery.');
    }
  };

  if (!order) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Order not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {mode === 'remaining' ? 'Complete Remaining Delivery' : 'Confirm Delivery'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Delivered By</Text>
        <TextInput style={styles.input} value={deliveredBy} onChangeText={setDeliveredBy} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Delivered Quantities</Text>
        {items.map((item) => {
          const available = inventoryByProduct.get(item.product_id) ?? 0;
          const remaining = Math.max(item.qty_ordered - item.qty_delivered, 0);
          return (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                <Text style={styles.itemMeta}>
                  Ordered: {item.qty_ordered} {item.unit}
                </Text>
                <Text style={styles.itemMeta}>
                  Delivered: {item.qty_delivered} {item.unit}
                </Text>
                <Text style={styles.itemMeta}>
                  Available: {available} {item.unit}
                </Text>
              </View>
              <TextInput
                keyboardType="numeric"
                style={styles.quantityInput}
                value={deliveredMap[item.id] ?? ''}
                onChangeText={(value) => updateDelivered(item.id, value)}
                placeholder={mode === 'remaining' ? 'Remaining' : undefined}
              />
            </View>
          );
        })}
      </View>


      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Optional delivery notes"
        />
      </View>

      {errors ? <Text style={styles.errorText}>{errors}</Text> : null}

      <Pressable style={styles.primaryButton} onPress={handleSubmit}>
        <Text style={styles.primaryButtonText}>Confirm Delivery</Text>
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
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 8,
    color: Design.colors.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: Design.colors.border,
    borderRadius: Design.radius.md,
    padding: Design.spacing.md,
    color: Design.colors.ink,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0ede7',
    paddingVertical: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: '600',
    color: Design.colors.ink,
  },
  itemMeta: {
    color: Design.colors.muted,
    marginTop: 2,
  },
  quantityInput: {
    width: 80,
    borderWidth: 1,
    borderColor: Design.colors.border,
    borderRadius: Design.radius.md,
    padding: 10,
    textAlign: 'center',
    backgroundColor: '#fdfbf7',
  },
  errorText: {
    color: Design.colors.danger,
    fontWeight: '600',
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
