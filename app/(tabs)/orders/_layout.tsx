import { Stack } from 'expo-router';

export default function OrdersLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Orders' }} />
      <Stack.Screen name="[id]" options={{ title: 'Order Detail' }} />
      <Stack.Screen name="[id]/confirm" options={{ title: 'Confirm Delivery' }} />
      <Stack.Screen name="[id]/payment" options={{ title: 'Payment' }} />
      <Stack.Screen name="[id]/receipt" options={{ title: 'Receipt' }} />
    </Stack>
  );
}
