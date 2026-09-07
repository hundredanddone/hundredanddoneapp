import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // The wizard is resumable, so back is allowed but never required.
        gestureEnabled: true,
      }}
    />
  );
}
