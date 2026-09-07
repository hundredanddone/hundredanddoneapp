import { Stack } from 'expo-router';

export default function PatientLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="provider/[id]" options={{ headerShown: true, title: 'Provider' }} />
      <Stack.Screen name="booking/[offeringId]" options={{ headerShown: true, title: 'Book' }} />
      <Stack.Screen name="appointment/[id]" options={{ headerShown: true, title: 'Appointment' }} />
      <Stack.Screen
        name="address/new"
        options={{ headerShown: true, title: 'New address', presentation: 'modal' }}
      />
    </Stack>
  );
}
