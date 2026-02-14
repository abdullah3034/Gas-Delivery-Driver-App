import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';

import { useInventory } from '@/hooks/use-inventory';
import { useSelectedVehicle } from '@/hooks/use-selected-vehicle';
import { adjustInventory, getInventoryMovements } from '@/repositories/inventory';
import { InventoryMovement } from '@/types/models';
import { Design, Fonts } from '@/constants/theme';

export default function InventoryScreen() {
  const { selectedVehicle } = useSelectedVehicle();
  const db = useSQLiteContext();
  const { inventory, refresh } = useInventory(selectedVehicle?.id ?? null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [action, setAction] = useState<'load' | 'return'>('load');
  const [error, setError] = useState<string | null>(null);

  const productOptions = useMemo(
    () => inventory.map((item) => ({ id: item.product_id, name: item.product_name, unit: item.unit })),
    [inventory]
  );

  useEffect(() => {
    if (productOptions.length > 0 && !selectedProductId) {
      setSelectedProductId(productOptions[0].id);
    }
  }, [productOptions, selectedProductId]);

  useFocusEffect(
    useCallback(() => {
      if (!selectedVehicle) {
        setMovements([]);
        return;
      }
      getInventoryMovements(db, selectedVehicle.id).then(setMovements);
    }, [db, selectedVehicle])
  );

  const handleAdjust = async () => {
    if (!selectedVehicle) return;
    if (!selectedProductId) {
      setError('Select a product to adjust.');
      return;
    }
    const rawQty = Number.parseFloat(quantity);
    if (!Number.isFinite(rawQty) || rawQty === 0) {
      setError('Enter a valid quantity.');
      return;
    }

    const normalizedQty = Math.abs(rawQty);
    const change = action === 'load' ? normalizedQty : -normalizedQty;

    try {
      setError(null);
      await adjustInventory(
        db,
        selectedVehicle.id,
        selectedProductId,
        change,
        action,
        'Manual adjustment'
      );
      setQuantity('');
      await refresh();
      const latest = await getInventoryMovements(db, selectedVehicle.id);
      setMovements(latest);
    } catch (err) {
      Alert.alert('Inventory Error', err instanceof Error ? err.message : 'Unable to update inventory.');
    }
  };

  if (!selectedVehicle) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Select a vehicle first</Text>
        <Text style={styles.emptyText}>
          Inventory will appear once a vehicle is selected on the dashboard.
        </Text>
        <Text style={styles.linkText} onPress={() => router.push('/')}>
          Go To Dashboard
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Inventory - {selectedVehicle.name}</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Adjust Stock</Text>
        <Text style={styles.cardSubtitle}>Load increases stock, return decreases stock.</Text>
        <View style={styles.methodRow}>
          {(['load', 'return'] as const).map((option) => (
            <Pressable
              key={option}
              style={[styles.methodPill, action === option && styles.methodPillActive]}
              onPress={() => setAction(option)}>
              <Text style={[styles.methodText, action === option && styles.methodTextActive]}>
                {option === 'load' ? 'LOAD STOCK' : 'RETURN STOCK'}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.dropdownList}>
          {productOptions.map((product) => (
            <Pressable
              key={product.id}
              style={[
                styles.dropdownItem,
                selectedProductId === product.id && styles.dropdownItemActive,
              ]}
              onPress={() => setSelectedProductId(product.id)}>
              <Text style={styles.dropdownText}>
                {product.name} ({product.unit})
              </Text>
            </Pressable>
          ))}
          {productOptions.length === 0 && (
            <Text style={styles.cardSubtitle}>No products available for adjustment.</Text>
          )}
        </View>
        <TextInput
          keyboardType="decimal-pad"
          style={[styles.input, styles.inputSpacing]}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Quantity"
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable style={styles.primaryButton} onPress={handleAdjust}>
          <Text style={styles.primaryButtonText}>Update Inventory</Text>
        </Pressable>
      </View>
      {inventory.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>{item.product_name}</Text>
          <Text style={styles.cardSubtitle}>
            {item.quantity} {item.unit} remaining
          </Text>
        </View>
      ))}
      {inventory.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.cardSubtitle}>No inventory recorded for this vehicle.</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Movements</Text>
        {movements.map((move) => (
          <View key={move.id} style={styles.movementRow}>
            <View>
              <Text style={styles.cardSubtitle}>{move.product_name}</Text>
              <Text style={styles.movementMeta}>
                {move.movement_type.toUpperCase()} · {new Date(move.created_at).toLocaleString()}
              </Text>
            </View>
            <Text style={styles.movementQty}>
              {move.quantity_change > 0 ? '+' : ''}
              {move.quantity_change} {move.unit}
            </Text>
          </View>
        ))}
        {movements.length === 0 && (
          <Text style={styles.cardSubtitle}>No movements recorded yet.</Text>
        )}
      </View>
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
    gap: 12,
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
  methodRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  methodPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  methodPillActive: {
    backgroundColor: Design.colors.secondary,
    borderColor: Design.colors.secondary,
  },
  methodText: {
    color: Design.colors.muted,
    fontWeight: '600',
  },
  methodTextActive: {
    color: '#ffffff',
  },
  dropdownList: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: Design.colors.border,
    borderRadius: Design.radius.md,
    backgroundColor: Design.colors.surface,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0ede7',
  },
  dropdownItemActive: {
    backgroundColor: '#f1f7f5',
  },
  dropdownText: {
    color: Design.colors.ink,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: Design.colors.border,
    borderRadius: Design.radius.md,
    padding: Design.spacing.md,
    color: Design.colors.ink,
    marginTop: 12,
  },
  inputSpacing: {
    marginTop: 12,
  },
  errorText: {
    color: Design.colors.danger,
    fontWeight: '600',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: Design.colors.secondary,
    paddingVertical: 12,
    borderRadius: Design.radius.md,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2a2e',
  },
  cardSubtitle: {
    marginTop: 4,
    color: Design.colors.muted,
  },
  movementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0ede7',
    paddingTop: 12,
    marginTop: 12,
  },
  movementMeta: {
    marginTop: 4,
    color: Design.colors.muted,
    fontSize: 12,
  },
  movementQty: {
    fontWeight: '700',
    color: Design.colors.secondary,
  },
  emptyState: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f5f0',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2a2e',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6f675a',
  },
  linkText: {
    color: '#1f6e5c',
    fontWeight: '600',
  },
});
