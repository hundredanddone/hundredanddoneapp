import { useEffect } from 'react';

import { isBackendConfigured } from '@/constants/env';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

import { ensureProfile } from './api';

/**
 * Mounted once from the root layout. Restores any persisted Supabase session,
 * keeps the auth store in sync, and guarantees a profile row exists for the user.
 */
export function useAuthBootstrap(): void {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setProfileLoading = useAuthStore((s) => s.setProfileLoading);

  useEffect(() => {
    if (!isBackendConfigured) {
      // Without Supabase env vars there is nothing to restore; land on the sign-in screen.
      useAuthStore.setState({ status: 'unauthenticated' });
      return;
    }

    let cancelled = false;

    const syncProfile = async (userId: string) => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;
      setProfileLoading(true);
      try {
        const profile = await ensureProfile(data.user);
        if (!cancelled) setProfile(profile);
      } catch (error) {
        if (__DEV__) console.warn('[auth] could not load profile', userId, error);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session) void syncProfile(data.session.user.id);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      setSession(session);
      if (session && event !== 'TOKEN_REFRESHED') void syncProfile(session.user.id);
      if (!session) setProfile(null);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [setProfile, setProfileLoading, setSession]);
}
