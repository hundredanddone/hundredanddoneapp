import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import 'expo-sqlite/localStorage/install';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/constants/env';

/**
 * `createClient` validates its arguments synchronously and throws `supabaseUrl is
 * required.` on an empty string. This module is imported by the root layout, so an
 * unset EXPO_PUBLIC_SUPABASE_URL would crash the app at launch with nothing on screen
 * to explain why — which is exactly what an EAS build does, because .env is gitignored
 * and never reaches the build server.
 *
 * Falling back to a syntactically valid placeholder lets the app boot so the sign-in
 * screen can render its "backend not configured" banner. Requests still fail, but
 * visibly and with an explanation instead of a silent stop.
 */
const supabaseUrl = SUPABASE_URL || 'https://not-configured.supabase.co';
const supabasePublishableKey = SUPABASE_PUBLISHABLE_KEY || 'not-configured';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
