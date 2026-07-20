import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import { corsHeaders, json } from '../_shared/cors.ts';

function encodePath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(value: string | Uint8Array) {
  const data = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return toHex(await crypto.subtle.digest('SHA-256', data));
}

async function hmac(key: CryptoKey | Uint8Array | string, value: string) {
  const rawKey = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const cryptoKey = rawKey instanceof CryptoKey
    ? rawKey
    : await crypto.subtle.importKey('raw', rawKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value)));
}

async function hmacHex(key: CryptoKey | Uint8Array | string, value: string) {
  return toHex(await hmac(key, value));
}

async function getSigningKey(secret: string, dateStamp: string) {
  const kDate = await hmac(`AWS4${secret}`, dateStamp);
  const kRegion = await hmac(kDate, 'auto');
  const kService = await hmac(kRegion, 's3');
  return hmac(kService, 'aws4_request');
}

async function uploadToR2(path: string, bytes: Uint8Array, contentType: string) {
  const accountId = Deno.env.get('R2_ACCOUNT_ID');
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
  const bucket = Deno.env.get('R2_BUCKET') || 'thealankar-images';
  const publicBaseUrl = (Deno.env.get('R2_PUBLIC_BASE_URL') || '').replace(/\/+$/, '');
  if (!accountId || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    throw new Error('R2 is not configured');
  }

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256(bytes);
  const canonicalUri = `/${bucket}/${encodePath(path)}`;
  const headers: Record<string, string> = {
    'cache-control': 'public, max-age=31536000, immutable',
    'content-type': contentType,
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((key) => `${key}:${headers[key]}\n`)
    .join('');
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join('\n');
  const signature = await hmacHex(await getSigningKey(secretAccessKey, dateStamp), stringToSign);

  const response = await fetch(`https://${host}${canonicalUri}`, {
    method: 'PUT',
    headers: {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: bytes,
  });
  if (!response.ok) {
    throw new Error(`R2 upload failed: ${response.status} ${await response.text()}`);
  }

  return `${publicBaseUrl}/${encodePath(path)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('authorization') || '';
  const authClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Authentication required' }, 401);

  const { data: adminRole } = await supabase
    .from('admin_roles')
    .select('user_id')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (!adminRole) return json({ error: 'Forbidden' }, 403);

  const body = await req.json().catch(() => null);
  const path = String(body?.path || '').replace(/^\/+/, '');
  const contentType = String(body?.contentType || 'image/jpeg');
  const base64 = String(body?.base64 || '');
  if (!path || !base64 || !contentType.startsWith('image/')) {
    return json({ error: 'Invalid image upload' }, 400);
  }
  if (!/^[a-zA-Z0-9/_.,=+@()-]+$/.test(path) || path.includes('..')) {
    return json({ error: 'Invalid image path' }, 400);
  }

  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  if (bytes.byteLength > 5 * 1024 * 1024) return json({ error: 'Image is too large' }, 413);

  try {
    const publicUrl = await uploadToR2(path, bytes, contentType);
    return json({ path, publicUrl });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Upload failed' }, 500);
  }
});
