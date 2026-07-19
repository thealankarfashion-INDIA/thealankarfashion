import { supabase } from './supabase';

type UploadedFile = { path: string; bucket?: string };

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

export async function getDownloadURL(uploaded: UploadedFile) {
  const bucket = uploaded.bucket || 'storefront-images';
  const { data } = supabase.storage.from(bucket).getPublicUrl(uploaded.path);
  return data.publicUrl;
}

export function dataUrlToBlob(dataUrl: string) {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

export async function uploadImageDataUrl(dataUrl: string, path: string) {
  if (!dataUrl.startsWith('data:')) return dataUrl;
  const uploaded = await uploadBytes(ref(getStorageInstance(), path), dataUrlToBlob(dataUrl));
  return getDownloadURL(uploaded);
}
