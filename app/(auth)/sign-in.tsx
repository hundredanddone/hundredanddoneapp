import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Banner, Button, Screen, Text } from '@/components';
import { isBackendConfigured, isGoogleConfigured } from '@/constants/env';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { GoogleSignInCancelledError, signInWithGoogle } from '@/lib/googleAuth';

/**
 * The only entry point. Sign-up and sign-in are the same action — a new Google account
 * gets a profile row created on first success and is routed into onboarding.
 */
export default function SignInScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = isBackendConfigured && isGoogleConfigured;

  const handleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      // The auth listener in the root layout picks up the session and redirects.
    } catch (e) {
      if (!(e instanceof GoogleSignInCancelledError)) {
        setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={[styles.logo, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="medkit" size={36} color={colors.primary} />
        </View>
        <Text variant="display" center>
          100 and Done
        </Text>
        <Text variant="body" color="textMuted" center>
          Book a doctor, clinic or hospital — visit them, or have them visit you.
        </Text>
      </View>

      <View style={styles.actions}>
        {!configured ? (
          <Banner
            tone="warning"
            title="Backend not configured yet"
            message={
              'Fill in EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY and ' +
              'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env, then restart with `npx expo start -c`.'
            }
          />
        ) : null}

        {error ? <Banner tone="danger" title="Could not sign in" message={error} /> : null}

        <Button
          label="Continue with Google"
          icon="logo-google"
          onPress={() => void handleSignIn()}
          loading={loading}
          disabled={!configured}
          testID="continue-with-google"
        />

        <Text variant="caption" color="textMuted" center>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'space-between', gap: spacing.xxl },
  hero: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxxl * 1.5 },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actions: { gap: spacing.md, paddingBottom: spacing.xl },
});
