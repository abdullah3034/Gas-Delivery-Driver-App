import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useOrders } from '@/hooks/use-orders';
import { useSelectedVehicle } from '@/hooks/use-selected-vehicle';
import { Design, Fonts } from '@/constants/theme';

const statusColors: Record<string, string> = {
  assigned: Design.colors.accent,
  in_progress: Design.colors.info,
  delivered: Design.colors.secondary,
  partial: '#d9822b',
  paid: Design.colors.primary,
};

const statusLabels: Record<string, string> = {
  assigned: 'Pending',
  in_progress: 'In Progress',
  delivered: 'Completed',
  partial: 'Completed (Partial)',
  paid: 'Paid',
};

export default function OrdersScreen() {
  const { selectedVehicle } = useSelectedVehicle();
  const { orders } = useOrders(selectedVehicle?.id ?? null);

  if (!selectedVehicle) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Select a vehicle first</Text>
        <Text style={styles.emptyText}>
          Head to the dashboard to choose a vehicle and load assigned orders.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/')}>
          <Text style={styles.primaryButtonText}>Go To Dashboard</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Orders for {selectedVehicle.name}</Text>
      {orders.map((order) => (
        <Pressable
          key={order.id}
          style={styles.card}
          onPress={() => router.push(`/orders/${order.id}`)}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{order.order_no}</Text>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    order.status === 'paid' && order.is_partial
                      ? '#7a4e2f'
                      : statusColors[order.status] ?? '#8a7f70',
                },
              ]}>
              <Text style={styles.badgeText}>
                {(() => {
                  const base = statusLabels[order.status] ?? order.status;
                  if (order.status === 'paid' && order.is_partial) {
                    return 'Paid – Partial Fulfillment'.toUpperCase();
                  }
                  return base.toUpperCase();
                })()}
              </Text>
            </View>
          </View>
          <Text style={styles.cardSubtitle}>{order.customer_name}</Text>
          <Text style={styles.cardSubtitle}>Scheduled: {order.scheduled_date}</Text>
        </Pressable>
      ))}
      {orders.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No orders assigned to this vehicle yet.</Text>
        </View>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Design.colors.ink,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: Design.colors.muted,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    padding: Design.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Design.colors.background,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Design.colors.ink,
  },
  emptyText: {
    textAlign: 'center',
    color: Design.colors.muted,
  },
  primaryButton: {
    backgroundColor: Design.colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: Design.radius.md,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: Design.colors.surface,
    borderRadius: Design.radius.md,
    padding: Design.spacing.md,
    borderWidth: 1,
    borderColor: Design.colors.border,
    alignItems: 'center',
  },
});
