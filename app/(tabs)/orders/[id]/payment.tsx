import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { useOrderDetail } from '@/hooks/use-orders';
import { useBanks } from '@/hooks/use-banks';
import { recordPayment } from '@/repositories/payments';
import { PaymentMethod } from '@/types/models';
import { Design, Fonts } from '@/constants/theme';

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

export default function PaymentScreen() {
  const params = useLocalSearchParams();
  const orderId = Number(params.id);
  const db = useSQLiteContext();
  const { order } = useOrderDetail(Number.isFinite(orderId) ? orderId : null);
  const { banks } = useBanks();
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState('0');
  const [amountReceived, setAmountReceived] = useState('0');
  const [bankName, setBankName] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [bankOpen, setBankOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryDue, setDeliveryDue] = useState(0);
  const [latestDeliveryId, setLatestDeliveryId] = useState<number | null>(null);

  useEffect(() => {
    if (order) {
      db.getFirstAsync<{ id: number; amount: number }>(
        'SELECT id, amount FROM deliveries WHERE order_id = ? ORDER BY id DESC LIMIT 1',
        [order.id]
      )
        .then((row) => {
          const due = row?.amount ?? order.total_amount;
          setDeliveryDue(due);
          setLatestDeliveryId(row?.id ?? null);
          setAmount(due.toFixed(2));
          setAmountReceived(due.toFixed(2));
        })
        .catch(() => {
          setDeliveryDue(order.total_amount);
          setLatestDeliveryId(null);
          setAmount(order.total_amount.toFixed(2));
          setAmountReceived(order.total_amount.toFixed(2));
        });
    }
  }, [db, order]);

  useEffect(() => {
    if (method !== 'cheque') {
      setBankOpen(false);
      setBankName('');
      setChequeNo('');
    }
  }, [method]);

  useEffect(() => {
    if (order && method === 'cash') {
      setAmount(deliveryDue.toFixed(2));
      setAmountReceived(deliveryDue.toFixed(2));
    }
  }, [deliveryDue, method, order]);

  const handleSubmit = async () => {
    if (!order) return;
    const amountValue = Number.parseFloat(amount);
    const receivedValue = Number.parseFloat(amountReceived);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }
    if (amountValue < deliveryDue) {
      setError('Payment amount cannot be less than the delivery due.');
      return;
    }
    if (method === 'cash') {
      if (!Number.isFinite(receivedValue) || receivedValue <= 0) {
        setError('Enter the cash amount received.');
        return;
      }
      if (receivedValue < deliveryDue) {
        setError('Cash received cannot be less than the delivery due.');
        return;
      }
    }
    if (method === 'cheque' && (!bankName.trim() || !chequeNo.trim())) {
      setError('Cheque payments require bank name and cheque number.');
      return;
    }

    try {
      setError(null);
      const changeGiven = method === 'cash' ? receivedValue - deliveryDue : 0;
      await recordPayment(
        db,
        order.id,
        method,
        deliveryDue,
        method === 'cash' ? receivedValue : deliveryDue,
        method === 'cash' ? changeGiven : 0,
        latestDeliveryId,
        bankName.trim(),
        chequeNo.trim()
      );
      router.replace(`/orders/${order.id}/receipt`);
    } catch (err) {
      Alert.alert('Payment Error', err instanceof Error ? err.message : 'Unable to record payment.');
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
      <Text style={styles.title}>Payment</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>This Delivery Due</Text>
        <Text style={styles.totalDue}>{formatCurrency(deliveryDue)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.methodRow}>
      {(['cash', 'cheque', 'credit'] as PaymentMethod[]).map((option) => (
        <Pressable
          key={option}
          style={[styles.methodPill, method === option && styles.methodPillActive]}
          onPress={() => setMethod(option)}>
              <Text style={[styles.methodText, method === option && styles.methodTextActive]}>
                {option.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {method === 'cash' ? 'This Delivery Due' : 'Amount Collected'}
        </Text>
        <TextInput
          keyboardType="decimal-pad"
          style={[styles.input, method === 'cash' && styles.inputDisabled]}
          value={amount}
          onChangeText={setAmount}
          editable={method !== 'cash'}
        />
      </View>

      {method === 'cash' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cash Received</Text>
          <TextInput
            keyboardType="decimal-pad"
            style={styles.input}
            value={amountReceived}
            onChangeText={setAmountReceived}
          />
          <Text style={styles.helperText}>
            Change: {formatCurrency(Math.max(Number.parseFloat(amountReceived) - deliveryDue, 0))}
          </Text>
        </View>
      )}

      {method === 'cheque' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cheque Details</Text>
          <Pressable
            style={styles.dropdown}
            onPress={() => setBankOpen((prev) => !prev)}>
            <Text style={styles.dropdownText}>{bankName || 'Select bank'}</Text>
          </Pressable>
          {bankOpen && (
            <View style={styles.dropdownList}>
              {banks.map((bank) => (
                <Pressable
                  key={bank.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setBankName(bank.name);
                    setBankOpen(false);
                  }}>
                  <Text style={styles.dropdownText}>{bank.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <TextInput
            style={[styles.input, styles.inputSpacing]}
            placeholder="Cheque number"
            value={chequeNo}
            onChangeText={setChequeNo}
            keyboardType="number-pad"
          />
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable style={styles.primaryButton} onPress={handleSubmit}>
        <Text style={styles.primaryButtonText}>Save Payment</Text>
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
  totalDue: {
    fontSize: 24,
    fontWeight: '700',
    color: Design.colors.secondary,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 10,
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
  input: {
    borderWidth: 1,
    borderColor: Design.colors.border,
    borderRadius: Design.radius.md,
    padding: Design.spacing.md,
    color: Design.colors.ink,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: Design.colors.border,
    borderRadius: Design.radius.md,
    padding: Design.spacing.md,
    backgroundColor: '#fdfbf7',
  },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Design.colors.border,
    borderRadius: Design.radius.md,
    backgroundColor: Design.colors.surface,
  },
  dropdownItem: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0ede7',
  },
  dropdownText: {
    color: Design.colors.ink,
    fontWeight: '600',
  },
  inputSpacing: {
    marginTop: 12,
  },
  inputDisabled: {
    backgroundColor: '#f0ede7',
    color: Design.colors.muted,
  },
  helperText: {
    marginTop: 8,
    color: Design.colors.muted,
    fontSize: 12,
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
