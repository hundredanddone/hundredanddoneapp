import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { GOOGLE_WEB_CLIENT_ID } from '@/constants/env';

import { supabase } from './supabase';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
  scopes: ['profile', 'email'],
});

/** Thrown when the user backs out of the Google sheet — callers should stay silent. */
export class GoogleSignInCancelledError extends Error {
  constructor() {
    super('Google Sign-In cancelled');
    this.name = 'GoogleSignInCancelledError';
  }
}

export async function signInWithGoogle() {
  try {
    await GoogleSignin.hasPlayServices();
    const signInResult = await GoogleSignin.signIn();
    const idToken = signInResult?.data?.idToken;
    if (!idToken) throw new Error('No ID token returned from Google Sign-In');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) throw new GoogleSignInCancelledError();
      if (error.code === statusCodes.IN_PROGRESS) throw new GoogleSignInCancelledError();
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services are not available or are out of date.');
      }
    }
    throw error;
  }
}

export async function signOut() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Signing out of Google is best-effort; the Supabase session is the source of truth.
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
