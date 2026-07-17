import { supabase } from './supabase';

export function getStorageInstance() {
  return supabase.storage;
}

export function ref(_storage: unknown, path: string) {
  return { path };
}

export async function uploadBytes(storageRef: { path: string }, file: Blob) {
  const bucket = storageRef.path.startsWith('payment-screenshots/')
    ? 'payment-proofs'
    : 'storefront-images';
  const path = storageRef.path.replace(/^payment-screenshots\//, '');
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    cacheControl: '31536000',
    contentType: file.type || 'application/octet-stream',
  });
  if (error) throw error;
  return { path, bucket };
}

export async function getDownloadURL(uploaded: { path: string; bucket?: string }) {
  const bucket = uploaded.bucket || 'storefront-images';
  const { data } = supabase.storage.from(bucket).getPublicUrl(uploaded.path);
  return data.publicUrl;
}
