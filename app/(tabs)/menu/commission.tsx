import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useCommissionConfig } from '@/hooks/use-commission-config';
import { Design, Fonts } from '@/constants/theme';

export default function CommissionConfigScreen() {
  const { config, save } = useCommissionConfig();
  const [rate, setRate] = useState(String(config.rate_per_unit));
  const [target, setTarget] = useState(String(config.daily_target_qty));

  useEffect(() => {
    setRate(String(config.rate_per_unit));
    setTarget(String(config.daily_target_qty));
  }, [config.daily_target_qty, config.rate_per_unit]);

  const handleSave = async () => {
    const rateValue = Number.parseFloat(rate);
    const targetValue = Number.parseFloat(target);
    if (!Number.isFinite(rateValue) || rateValue < 0) {
      Alert.alert('Invalid Rate', 'Enter a valid commission rate per unit.');
      return;
    }
    if (!Number.isFinite(targetValue) || targetValue < 0) {
      Alert.alert('Invalid Target', 'Enter a valid daily target quantity.');
      return;
    }

    await save({ rate_per_unit: rateValue, daily_target_qty: targetValue });
    Alert.alert('Commission Updated', 'Dashboard commission values will update automatically.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Commission Configuration</Text>
      <Text style={styles.subtitle}>
        Update the commission rate (as a percentage of revenue) and set the daily commission target.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Commission Rate (%)</Text>
        <TextInput
          keyboardType="decimal-pad"
          style={styles.input}
          value={rate}
          onChangeText={setRate}
          placeholder="e.g. 0.15"
        />
        <Text style={styles.helperText}>Applied to today&apos;s revenue. Example: 0.15 = 15%.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Daily Commission Target</Text>
        <TextInput
          keyboardType="decimal-pad"
          style={styles.input}
          value={target}
          onChangeText={setTarget}
          placeholder="e.g. 200"
        />
        <Text style={styles.helperText}>Displayed as currency on the dashboard.</Text>
      </View>

      <Pressable style={styles.primaryButton} onPress={handleSave}>
        <Text style={styles.primaryButtonText}>Save Changes</Text>
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
  subtitle: {
    color: Design.colors.muted,
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
  helperText: {
    marginTop: 8,
    color: Design.colors.muted,
    fontSize: 12,
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
});
