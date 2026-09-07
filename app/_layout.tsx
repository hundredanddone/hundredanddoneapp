import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { withStallion } from 'react-native-stallion';
import 'react-native-reanimated';

import { LoadingScreen } from '@/components';
import { useAuthBootstrap } from '@/features/auth';
import { useTheme } from '@/hooks/useTheme';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  anchor: 'index',
};

void SplashScreen.preventAutoHideAsync();

/**
 * Root layout.
 *
 * Owns the single source of truth for which route group the user belongs in:
 *   - no session                          -> (auth)
 *   - session, role null or setup unfinished -> (onboarding)
 *   - session, finished, role 'patient'   -> (patient)
 *   - session, finished, role 'org'       -> (org)
 *
 * `Stack.Protected` enforces this for deep links too — a patient who taps an org link
 * is bounced back rather than rendering a screen their RLS policies would reject.
 * `app/index.tsx` performs the corresponding forward redirect on cold start.
 */
function RootLayout() {
  useAuthBootstrap();

  const { isDark } = useTheme();
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const profileLoading = useAuthStore((s) => s.profileLoading);

  const isAuthenticated = status === 'authenticated';
  // A finished profile must have both flags; a null role means the wizard never ran.
  const onboardingDone = Boolean(profile?.onboarding_completed && profile?.role);
  const role = profile?.role ?? null;
  const bootstrapping = status === 'loading' || (isAuthenticated && !profile && profileLoading);

  useEffect(() => {
    if (!bootstrapping) void SplashScreen.hideAsync();
  }, [bootstrapping]);

  if (bootstrapping) {
    return (
      <SafeAreaProvider>
        <LoadingScreen message="Getting things ready…" />
      </SafeAreaProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />

            <Stack.Protected guard={!isAuthenticated}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>

            <Stack.Protected guard={isAuthenticated && !onboardingDone}>
              <Stack.Screen name="(onboarding)" />
            </Stack.Protected>

            <Stack.Protected guard={isAuthenticated && onboardingDone && role === 'patient'}>
              <Stack.Screen name="(patient)" />
            </Stack.Protected>

            <Stack.Protected guard={isAuthenticated && onboardingDone && role === 'org'}>
              <Stack.Screen name="(org)" />
            </Stack.Protected>

            <Stack.Screen name="+not-found" options={{ headerShown: true, title: 'Not found' }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default withStallion(RootLayout);
