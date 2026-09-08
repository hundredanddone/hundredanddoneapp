import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';

export default function OnboardingLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        // A back chevron on every pushed step. The title stays empty because each screen
        // already renders its own StepProgress heading, and duplicating it looked wrong.
        headerShown: true,
        headerTitle: '',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        gestureEnabled: true,
      }}
    >
      {/* The entry point has nothing to go back to; it offers "Use a different account". */}
      <Stack.Screen name="account-type" options={{ headerShown: false }} />
      <Stack.Screen name="resume" options={{ headerShown: false }} />
    </Stack>
  );
}
