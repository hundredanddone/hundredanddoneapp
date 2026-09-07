import { File } from 'expo-file-system';

import { supabase } from './supabase';

/** Storage buckets created by `supabase/migrations/0002_storage.sql`. */
export const BUCKETS = {
  avatars: 'avatars',
  orgLogos: 'org-logos',
  verificationDocs: 'verification-docs',
  patientRecords: 'patient-records',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/** Buckets that are public read; everything else needs a signed URL. */
const PUBLIC_BUCKETS: BucketName[] = [BUCKETS.avatars, BUCKETS.orgLogos];

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function extensionFor(uri: string, fallback = 'bin'): string {
  const match = /\.([a-zA-Z0-9]{1,5})(?:\?|$)/.exec(uri);
  return match?.[1]?.toLowerCase() ?? fallback;
}

export interface UploadResult {
  path: string;
  /** Public URL for public buckets; storage path for private ones. */
  url: string;
}

/**
 * Upload a local file (from expo-image-picker / expo-document-picker) to Supabase Storage.
 * `prefix` must start with the owning user's or organization's id — the storage RLS
 * policies key off the first path segment.
 */
export async function uploadToStorage(
  bucket: BucketName,
  prefix: string,
  localUri: string,
  options?: { contentType?: string; fileName?: string },
): Promise<UploadResult> {
  const extension = extensionFor(options?.fileName ?? localUri);
  const path = `${prefix}/${randomId()}.${extension}`;
  const bytes = await new File(localUri).arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: options?.contentType ?? 'application/octet-stream',
    upsert: false,
  });
  if (error) throw error;

  if (PUBLIC_BUCKETS.includes(bucket)) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { path, url: data.publicUrl };
  }
  return { path, url: path };
}

/** Private buckets are read through short-lived signed URLs. */
export async function signedUrlFor(
  bucket: BucketName,
  path: string,
  expiresInSeconds = 60 * 10,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}
