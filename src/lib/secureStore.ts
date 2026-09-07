import * as SecureStore from 'expo-secure-store';

/**
 * Thin wrapper over expo-secure-store for small secrets that must not sit in the
 * SQLite-backed localStorage the Supabase session uses (e.g. a pending invite token).
 * SecureStore values are capped at ~2KB, so never put session JSON here.
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function getSecureItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function deleteSecureItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
