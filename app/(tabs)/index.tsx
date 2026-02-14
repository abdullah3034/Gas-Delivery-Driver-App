import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import Svg, { Circle } from "react-native-svg";

import { Design, Fonts } from "@/constants/theme";
import { useDashboard } from "@/hooks/use-dashboard";
import { useInventory } from "@/hooks/use-inventory";
import { useSelectedVehicle } from "@/hooks/use-selected-vehicle";
import { useVehicles } from "@/hooks/use-vehicles";

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

export default function DashboardScreen() {
  const { vehicles } = useVehicles();
  const { selectedVehicle, selectVehicle } = useSelectedVehicle();
  const { stats, progress, productStats } = useDashboard(
    selectedVehicle?.id ?? null,
  );
  const { inventory } = useInventory(selectedVehicle?.id ?? null);

  const inventoryTotal = inventory.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const inventoryPalette = [
    Design.colors.secondary,
    Design.colors.accent,
    Design.colors.info,
    Design.colors.primary,
  ];
  const pieRadius = 48;
  const circumference = 2 * Math.PI * pieRadius;
  let pieOffset = 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroTitle}>
              {selectedVehicle
                ? `${selectedVehicle.name} - ${selectedVehicle.plate}`
                : "Select Vehicle"}
            </Text>
            <Text style={styles.heroSub}>Sunday, 14 Feb 2026</Text>
          </View>
          <View style={styles.heroActions}>
            <Pressable style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Sync</Text>
            </Pressable>
            <Pressable style={styles.heroButtonOutline}>
              <Text style={styles.heroButtonOutlineText}>Visit</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.heroPill}>
          <Text style={styles.heroPillText}>Route: Kuliyapitiya</Text>
        </View>
      </View>

      {!selectedVehicle && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Available Vehicles</Text>
          {vehicles.map((vehicle) => (
            <Pressable
              key={vehicle.id}
              style={styles.vehicleRow}
              onPress={() => selectVehicle(vehicle.id)}
            >
              <View>
                <Text style={styles.cardTitle}>{vehicle.name}</Text>
                <Text style={styles.cardSubtitle}>Plate: {vehicle.plate}</Text>
              </View>
              <Text style={styles.linkText}>Select</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.commissionCard}>
        <Text style={styles.commissionLabel}>Your commission today</Text>
        <Text style={styles.commissionValue}>
          {formatCurrency(stats.commission_today)} /{" "}
          {formatCurrency(stats.target_qty)}
        </Text>
        <Text style={styles.commissionSub}>
          Daily commission target - {formatPercent(stats.target_progress)}{" "}
          achieved
        </Text>
      </View>

      <View style={styles.paymentGrid}>
        <View style={[styles.paymentCard, styles.paymentCash]}>
          <Text style={styles.paymentValue}>
            {formatCurrency(stats.cash_total)}
          </Text>
          <Text style={styles.paymentLabel}>Cash</Text>
        </View>
        <View style={[styles.paymentCard, styles.paymentCheque]}>
          <Text style={styles.paymentValue}>
            {formatCurrency(stats.cheque_total)}
          </Text>
          <Text style={styles.paymentLabel}>Cheque</Text>
        </View>
        <View style={[styles.paymentCard, styles.paymentCredit]}>
          <Text style={styles.paymentValue}>
            {formatCurrency(stats.credit_total)}
          </Text>
          <Text style={styles.paymentLabel}>Credit</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Inventory Mix</Text>
        <View style={styles.pieRow}>
          <View style={styles.pieChart}>
            <Svg width={120} height={120} viewBox="0 0 120 120">
              <Circle cx="60" cy="60" r={pieRadius} fill="#f3efe7" />
              {inventory.map((item, index) => {
                const ratio =
                  inventoryTotal > 0 ? item.quantity / inventoryTotal : 0;
                const strokeLength = circumference * ratio;
                const dashArray = `${strokeLength} ${circumference - strokeLength}`;
                const offset = pieOffset;
                pieOffset += strokeLength;
                return (
                  <Circle
                    key={item.id}
                    cx="60"
                    cy="60"
                    r={pieRadius}
                    stroke={inventoryPalette[index % inventoryPalette.length]}
                    strokeWidth={16}
                    strokeDasharray={dashArray}
                    strokeDashoffset={-offset}
                    fill="transparent"
                    strokeLinecap="round"
                  />
                );
              })}
            </Svg>
          </View>
          <View style={styles.pieLegend}>
            {inventory.map((item, index) => (
              <View key={item.id} style={styles.pieLegendRow}>
                <View
                  style={[
                    styles.pieDot,
                    {
                      backgroundColor:
                        inventoryPalette[index % inventoryPalette.length],
                    },
                  ]}
                />
                <View>
                  <Text style={styles.cardTitle}>{item.product_name}</Text>
                  <Text style={styles.cardSubtitle}>
                    {item.quantity.toFixed(0)} {item.unit}
                  </Text>
                </View>
              </View>
            ))}
            {inventory.length === 0 && (
              <Text style={styles.cardSubtitle}>No inventory available.</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.progressStats}>
        <View style={styles.progressStatCard}>
          <Text style={styles.progressStatValue}>
            {stats.delivered_today}/{stats.total_orders}
          </Text>
          <Text style={styles.progressStatLabel}>Orders Completed (Today)</Text>
          <Text style={styles.progressStatSub}>
            {stats.total_orders > 0
              ? formatPercent(stats.delivered_today / stats.total_orders)
              : "0%"}{" "}
            complete
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Total Gas Delivered (Today)</Text>
        {productStats.map((product) => (
          <View key={product.product_id} style={styles.productRow}>
            <View style={styles.productHeader}>
              <Text style={styles.cardTitle}>{product.product_name}</Text>
              <Text style={styles.cardSubtitle}>
                {product.delivered_qty.toFixed(0)} /{" "}
                {product.initial_qty.toFixed(0)} {product.unit}
              </Text>
            </View>
            <View style={styles.productTrack}>
              <View
                style={[
                  styles.productFill,
                  { width: formatPercent(product.delivered_ratio) },
                ]}
              />
            </View>
          </View>
        ))}
        {productStats.length === 0 && (
          <Text style={styles.cardSubtitle}>No deliveries recorded today.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Delivery Progress by Shop</Text>
        {progress.map((shop) => (
          <View key={shop.customer_name} style={styles.progressRow}>
            <View style={styles.progressInfo}>
              <Text style={styles.cardTitle}>{shop.customer_name}</Text>
              <Text style={styles.cardSubtitle}>
                {shop.total_delivered.toFixed(0)} /{" "}
                {shop.total_ordered.toFixed(0)} units
              </Text>
            </View>
            <View style={styles.progressMiniTrack}>
              <View
                style={[
                  styles.progressMiniFill,
                  { width: formatPercent(shop.completion_rate) },
                ]}
              />
            </View>
          </View>
        ))}
        {progress.length === 0 && (
          <Text style={styles.cardSubtitle}>
            No scheduled deliveries for today.
          </Text>
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
    padding: wp("4.5%"),
    gap: hp("1.6%"),
  },
  hero: {
    backgroundColor: Design.colors.primary,
    borderRadius: Design.radius.xl,
    padding: wp("4%"),
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: Fonts.serif,
  },
  heroSub: {
    color: "#ffe9dd",
    marginTop: 4,
  },
  heroActions: {
    flexDirection: "row",
    gap: 8,
  },
  heroButton: {
    backgroundColor: "#ffffff",
    borderRadius: Design.radius.md,
    paddingHorizontal: Design.spacing.md,
    paddingVertical: Design.spacing.sm,
  },
  heroButtonText: {
    color: Design.colors.primary,
    fontWeight: "700",
  },
  heroButtonOutline: {
    borderWidth: 1,
    borderColor: "#fff0e7",
    borderRadius: Design.radius.md,
    paddingHorizontal: Design.spacing.md,
    paddingVertical: Design.spacing.sm,
  },
  heroButtonOutlineText: {
    color: "#fff0e7",
    fontWeight: "700",
  },
  heroPill: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#f7a277",
    paddingHorizontal: Design.spacing.md,
    paddingVertical: Design.spacing.xs,
    borderRadius: 999,
  },
  heroPillText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  commissionCard: {
    backgroundColor: Design.colors.secondary,
    borderRadius: Design.radius.lg,
    padding: Design.spacing.lg,
  },
  commissionLabel: {
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#c6f2e4",
    fontSize: 12,
  },
  commissionValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    fontFamily: Fonts.serif,
  },
  commissionSub: {
    marginTop: 4,
    color: "#d9f8ef",
  },
  paymentGrid: {
    flexDirection: "row",
    gap: 12,
  },
  paymentCard: {
    flex: 1,
    borderRadius: Design.radius.md,
    padding: Design.spacing.md,
    alignItems: "center",
    backgroundColor: Design.colors.surface,
    borderWidth: 1,
  },
  paymentCash: {
    borderColor: Design.colors.secondary,
  },
  paymentCheque: {
    borderColor: Design.colors.accent,
  },
  paymentCredit: {
    borderColor: Design.colors.info,
  },
  paymentValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Design.colors.ink,
  },
  paymentLabel: {
    marginTop: 4,
    color: Design.colors.muted,
  },
  pieRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  pieChart: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  pieLegend: {
    flex: 1,
    gap: 10,
  },
  pieLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pieDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressStats: {
    flexDirection: "row",
    gap: 12,
  },
  progressStatCard: {
    flex: 1,
    backgroundColor: Design.colors.surface,
    borderRadius: Design.radius.md,
    padding: Design.spacing.md,
  },
  progressStatValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Design.colors.primary,
    fontFamily: Fonts.serif,
  },
  progressStatLabel: {
    marginTop: 6,
    fontWeight: "600",
    color: Design.colors.ink,
  },
  progressStatSub: {
    marginTop: 4,
    color: Design.colors.muted,
  },
  card: {
    backgroundColor: Design.colors.surface,
    borderRadius: Design.radius.md,
    padding: Design.spacing.md,
    borderWidth: 1,
    borderColor: Design.colors.border,
  },
  cardLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: Design.colors.muted,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Design.colors.ink,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Design.colors.muted,
    marginTop: 4,
  },
  vehicleRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0ede7",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  linkText: {
    color: Design.colors.primary,
    fontWeight: "600",
  },
  progressRow: {
    borderTopWidth: 1,
    borderTopColor: "#f0ede7",
    paddingTop: 12,
    marginTop: 12,
  },
  progressInfo: {
    marginBottom: 8,
  },
  progressMiniTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#f0ede7",
    overflow: "hidden",
  },
  progressMiniFill: {
    height: "100%",
    backgroundColor: Design.colors.primary,
  },
  productRow: {
    borderTopWidth: 1,
    borderTopColor: "#f0ede7",
    paddingTop: 12,
    marginTop: 12,
  },
  productHeader: {
    marginBottom: 8,
  },
  productTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#f0ede7",
    overflow: "hidden",
  },
  productFill: {
    height: "100%",
    backgroundColor: Design.colors.secondary,
  },
});
