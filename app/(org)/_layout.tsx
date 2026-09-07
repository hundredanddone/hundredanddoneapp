import { Stack } from 'expo-router';

export default function OrgLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="setup/services" options={{ headerShown: true, title: 'Services' }} />
      <Stack.Screen name="setup/branches" options={{ headerShown: true, title: 'Branches' }} />
      <Stack.Screen name="setup/staff" options={{ headerShown: true, title: 'Team' }} />
      <Stack.Screen name="appointment/[id]" options={{ headerShown: true, title: 'Appointment' }} />
    </Stack>
  );
}
