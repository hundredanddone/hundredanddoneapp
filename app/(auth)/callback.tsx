import { useEffect, useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { LoadingScreen, Screen, Text } from '@/components';
import { supabase } from '@/lib/supabase';

/**
 * Deep-link auth callback.
 *
 * The native Google flow (`signInWithIdToken`) never lands here — it returns a session
 * in-process. This route exists for the web/dev-browser fallback and for any future
 * provider that redirects back with tokens in the URL fragment.
 */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    error_description?: string;
  }>();

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  const hasTokens = Boolean(accessToken && refreshToken);

  const [sessionError, setSessionError] = useState<string | null>(null);
  const [exchanged, setExchanged] = useState(false);

  useEffect(() => {
    if (!accessToken || !refreshToken) return;

    let cancelled = false;
    void supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (cancelled) return;
        if (error) setSessionError(error.message);
        setExchanged(true);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshToken]);

  const error = params.error_description ?? sessionError;
  const settled = !hasTokens || exchanged;

  if (error) {
    return (
      <Screen>
        <Text variant="title">Sign-in failed</Text>
        <Text variant="body" color="textMuted">
          {error}
        </Text>
      </Screen>
    );
  }

  if (!settled) return <LoadingScreen message="Finishing sign-in…" />;
  return <Redirect href="/" />;
}
