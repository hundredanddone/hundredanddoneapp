import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/components';
import { useAuthStore } from '@/stores/authStore';

/**
 * Cold-start gate. Sends the user to the right group; when onboarding is unfinished it
 * defers to `/resume`, which knows how far the org wizard got.
 */
export default function Index() {
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const profileLoading = useAuthStore((s) => s.profileLoading);

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'unauthenticated') return <Redirect href="/sign-in" />;
  if (!profile)
    return <LoadingScreen message={profileLoading ? 'Loading your profile…' : undefined} />;

  if (!profile.role) return <Redirect href="/account-type" />;
  if (!profile.onboarding_completed) return <Redirect href="/resume" />;

  return <Redirect href={profile.role === 'patient' ? '/home' : '/dashboard'} />;
}
