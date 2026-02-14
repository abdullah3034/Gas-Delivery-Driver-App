import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Design, Fonts } from '@/constants/theme';

export default function MenuScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menu</Text>
      <Pressable style={styles.menuItem} onPress={() => router.push('/menu/commission')}>
        <View>
          <Text style={styles.menuTitle}>Commission Configuration</Text>
          <Text style={styles.menuSubtitle}>Update rate per unit and daily target.</Text>
        </View>
        <Text style={styles.menuLink}>Open</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.colors.background,
    padding: Design.spacing.lg,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Design.colors.ink,
    fontFamily: Fonts.serif,
  },
  menuItem: {
    backgroundColor: Design.colors.surface,
    borderRadius: Design.radius.md,
    padding: Design.spacing.md,
    borderWidth: 1,
    borderColor: Design.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Design.colors.ink,
  },
  menuSubtitle: {
    marginTop: 4,
    color: Design.colors.muted,
  },
  menuLink: {
    color: Design.colors.primary,
    fontWeight: '600',
  },
});
