import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../artifacts/eclat/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const sourceUrl = process.env.SOURCE_SUPABASE_URL;
const sourceKey = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;
const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2Bucket = process.env.R2_BUCKET || 'thealankar-images';
const r2PublicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
const dryRun = process.argv.includes('--dry-run');

if (!sourceUrl || !sourceKey || !r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2PublicBaseUrl) {
  console.error(
    'Missing SOURCE_SUPABASE_URL, SOURCE_SUPABASE_SERVICE_ROLE_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, or R2_PUBLIC_BASE_URL.'
  );
  process.exit(1);
}

const source = createClient(sourceUrl, sourceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sourceHost = new URL(sourceUrl).host;
const r2EndpointHost = `${r2AccountId}.r2.cloudflarestorage.com`;
const r2Endpoint = `https://${r2EndpointHost}`;

const buckets = ['storefront-images', 'profile-images', 'review-images'];
const jsonTables = [
  'products',
  'categories',
  'brands',
  'offers',
  'main_banners',
  'announcements',
  'testing_videos',
  'site_settings',
  'delivery_settings',
  'orders',
  'coupons',
  'user_coupons',
  'referrals',
  'wallet_transactions',
  'app_ratings',
  'support_messages',
];

function hash(value, encoding = 'hex') {
  return crypto.createHash('sha256').update(value).digest(encoding);
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding);
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function getSigningKey(dateStamp) {
  const kDate = hmac(`AWS4${r2SecretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, 'auto');
  const kService = hmac(kRegion, 's3');
  return hmac(kService, 'aws4_request');
}

function signRequest(method, objectKey, body = Buffer.alloc(0), contentType = '') {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = hash(body);
  const canonicalUri = `/${r2Bucket}/${encodePath(objectKey)}`;
  const headers = {
    host: r2EndpointHost,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (contentType) {
    headers['cache-control'] = 'public, max-age=31536000, immutable';
    headers['content-type'] = contentType;
  }

  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((key) => `${key}:${headers[key]}\n`)
    .join('');
  const canonicalRequest = [
    method,
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
    hash(canonicalRequest),
  ].join('\n');
  const signature = hmac(getSigningKey(dateStamp), stringToSign, 'hex');

  return {
    url: `${r2Endpoint}${canonicalUri}`,
    headers: {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${r2AccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

async function r2Request(method, objectKey, body, contentType) {
  const signed = signRequest(method, objectKey, body, contentType);
  const response = await fetch(signed.url, {
    method,
    headers: signed.headers,
    body: method === 'PUT' ? body : undefined,
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`${method} ${objectKey}: ${response.status} ${await response.text()}`);
  }
  return response;
}

async function listFiles(bucket, prefix = '') {
  const { data, error } = await source.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) {
    if (String(error.message || '').toLowerCase().includes('not found')) return [];
    throw new Error(`${bucket}: ${error.message}`);
  }

  const files = [];
  for (const item of data || []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null || item.metadata === null) {
      files.push(...await listFiles(bucket, path));
    } else {
      files.push(path);
    }
  }
  return files;
}

function getR2Key(bucket, path) {
  return `${bucket}/${path}`;
}

function getR2Url(bucket, path) {
  return `${r2PublicBaseUrl}/${encodePath(getR2Key(bucket, path))}`;
}

function getSupabaseUrl(bucket, path) {
  return `${sourceUrl}/storage/v1/object/public/${bucket}/${encodePath(path)}`;
}

async function copyFile(bucket, path) {
  const key = getR2Key(bucket, path);
  if (await r2Request('HEAD', key).then((res) => res.ok)) return { key, skipped: true };
  if (dryRun) return { key, skipped: false };

  const { data, error } = await retry(() => source.storage.from(bucket).download(path), `${bucket}/${path}`);
  if (error) throw new Error(`${bucket}/${path}: ${error.message}`);
  const body = Buffer.from(await data.arrayBuffer());
  await r2Request('PUT', key, body, data.type || 'application/octet-stream');
  return { key, skipped: false };
}

async function retry(task, label, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
    }
  }
  throw new Error(`${label}: ${lastError?.message || lastError}`);
}

function rewriteValue(value, urlMap) {
  if (typeof value === 'string') {
    if (!value.includes(sourceHost)) return value;
    let next = value;
    for (const [from, to] of urlMap) next = next.split(from).join(to);
    return next;
  }
  if (Array.isArray(value)) return value.map((inner) => rewriteValue(inner, urlMap));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, rewriteValue(inner, urlMap)]));
  }
  return value;
}

async function rewriteTable(table, urlMap) {
  const { data: rows, error } = await source.from(table).select('id,data');
  if (error) throw new Error(`${table}: ${error.message}`);

  let changed = 0;
  for (const row of rows || []) {
    const currentText = JSON.stringify(row.data || {});
    if (!currentText.includes(sourceHost)) continue;
    const next = rewriteValue(row.data || {}, urlMap);
    if (JSON.stringify(next) === currentText) continue;
    changed += 1;
    if (dryRun) continue;
    const { error: updateError } = await source
      .from(table)
      .update({ data: next, updated_at: new Date().toISOString() })
      .eq('id', row.id);
    if (updateError) throw new Error(`${table}/${row.id}: ${updateError.message}`);
  }
  return changed;
}

async function runLimited(items, limit, worker) {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

const files = [];
for (const bucket of buckets) {
  const paths = await listFiles(bucket);
  for (const path of paths) files.push({ bucket, path });
}

await r2Request('HEAD', '__r2_access_check__').catch((error) => {
  if (!String(error.message).includes('404')) throw error;
});

let uploaded = 0;
let skipped = 0;
await runLimited(files, 3, async ({ bucket, path }) => {
  const result = await copyFile(bucket, path);
  if (result.skipped) skipped += 1;
  else uploaded += 1;
});

const urlMap = new Map(files.map(({ bucket, path }) => [getSupabaseUrl(bucket, path), getR2Url(bucket, path)]));
const rewritten = [];
for (const table of jsonTables) {
  rewritten.push({ table, rows: await rewriteTable(table, urlMap) });
}

console.log(JSON.stringify({
  mode: dryRun ? 'dry-run' : 'migrated',
  files: files.length,
  uploaded,
  skipped,
  publicBaseUrl: r2PublicBaseUrl,
  rewritten,
}, null, 2));
