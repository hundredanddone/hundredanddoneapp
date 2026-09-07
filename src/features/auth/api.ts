import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data as Profile | null) ?? null;
}

/** Values Google hands back live under different keys depending on the provider payload. */
function profileFromGoogleUser(user: User) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = meta[key];
      if (typeof value === 'string' && value.length > 0) return value;
    }
    return null;
  };

  return {
    id: user.id,
    email: user.email ?? pick('email') ?? '',
    full_name: pick('full_name', 'name'),
    avatar_url: pick('avatar_url', 'picture'),
    role: null,
    onboarding_completed: false,
  };
}

/**
 * Returns the caller's profile, creating it from the Google profile on first sign-in.
 * `role` is left null and `onboarding_completed` false so the router sends the user
 * into the onboarding wizard.
 */
export async function ensureProfile(user: User): Promise<Profile> {
  const existing = await fetchProfile(user.id);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('profiles')
    .insert(profileFromGoogleUser(user))
    .select('*')
    .single();

  if (error) {
    // A concurrent first sign-in (two devices at once) can lose the insert race.
    if (error.code === '23505') {
      const retried = await fetchProfile(user.id);
      if (retried) return retried;
    }
    throw error;
  }
  return data as Profile;
}

export async function updateProfile(userId: string, patch: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data as Profile;
}
