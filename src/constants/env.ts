/**
 * Typed access to the EXPO_PUBLIC_* env vars.
 *
 * Expo inlines `process.env.EXPO_PUBLIC_*` at build time, so these must be read as
 * full static member expressions — never destructured off `process.env`.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env and fill it in, ` +
        `then restart the bundler with a cleared cache (npx expo start -c).`,
    );
  }
  return value;
}

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

/** True when every var needed to reach the backend is present. */
export const isBackendConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
export const isGoogleConfigured = Boolean(GOOGLE_WEB_CLIENT_ID);

export function assertBackendConfigured(): void {
  required(SUPABASE_URL, 'EXPO_PUBLIC_SUPABASE_URL');
  required(SUPABASE_PUBLISHABLE_KEY, 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
}
