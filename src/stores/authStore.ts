import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import type { Profile } from '@/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  /** True while the profile row is being fetched/created after a session appears. */
  profileLoading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setProfileLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  session: null,
  profile: null,
  profileLoading: false,
  setSession: (session) =>
    set((state) => ({
      session,
      status: session ? 'authenticated' : 'unauthenticated',
      // Keep the cached profile across token refreshes; drop it on sign-out or user switch.
      profile: session && session.user.id === state.session?.user.id ? state.profile : null,
    })),
  setProfile: (profile) => set({ profile }),
  setProfileLoading: (profileLoading) => set({ profileLoading }),
  reset: () =>
    set({ status: 'unauthenticated', session: null, profile: null, profileLoading: false }),
}));

/** Convenience selectors — keep components subscribed to the narrowest slice. */
export const selectUserId = (s: AuthState) => s.session?.user.id ?? null;
export const selectRole = (s: AuthState) => s.profile?.role ?? null;
export const selectOnboardingCompleted = (s: AuthState) => s.profile?.onboarding_completed ?? false;
