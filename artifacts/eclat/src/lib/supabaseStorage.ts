import { supabase } from './supabase';

type UploadedFile = { path: string; bucket?: string; publicUrl?: string };

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

  if (bucket !== 'payment-proofs') {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (sessionError || !accessToken) {
      throw new Error('Admin session expired. Sign in again before uploading images.');
    }

    const base64 = await blobToBase64(file);
    const { data, error } = await supabase.functions.invoke('upload-r2-image', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        path,
        contentType: file.type || 'image/jpeg',
        base64,
      },
    });
    if (error) {
      let message = error.message || 'Image upload failed';
      const response = (error as { context?: Response }).context;
      if (response) {
        try {
          const details = await response.clone().json() as { error?: string };
          if (details.error) message = details.error;
        } catch {
          // Keep the SDK error when the function does not return JSON.
        }
      }
      throw new Error(message);
    }
    if (!data?.publicUrl) throw new Error('R2 upload did not return a public URL');
    return { path, bucket: 'r2', publicUrl: data.publicUrl };
  }

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    cacheControl: '31536000',
    contentType: file.type || 'application/octet-stream',
  });
  if (error) throw error;
  return { path, bucket };
}

export async function getDownloadURL(uploaded: UploadedFile) {
  if (uploaded.publicUrl) return uploaded.publicUrl;
  const bucket = uploaded.bucket || 'storefront-images';
  const { data } = supabase.storage.from(bucket).getPublicUrl(uploaded.path);
  return data.publicUrl;
}

async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
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
