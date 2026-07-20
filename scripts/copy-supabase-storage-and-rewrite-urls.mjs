import { createRequire } from 'node:module';

const require = createRequire(new URL('../artifacts/eclat/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const sourceUrl = process.env.SOURCE_SUPABASE_URL;
const sourceKey = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;
const targetUrl = process.env.TARGET_SUPABASE_URL;
const targetKey = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes('--dry-run');

if (!sourceUrl || !sourceKey || !targetUrl || !targetKey) {
  console.error('Missing SOURCE_SUPABASE_URL, SOURCE_SUPABASE_SERVICE_ROLE_KEY, TARGET_SUPABASE_URL, or TARGET_SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const source = createClient(sourceUrl, sourceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const target = createClient(targetUrl, targetKey, { auth: { persistSession: false, autoRefreshToken: false } });
const sourceHost = new URL(sourceUrl).host;
const targetHost = new URL(targetUrl).host;

const buckets = ['storefront-images', 'payment-proofs', 'profile-images', 'review-images'];
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

async function listFiles(client, bucket, prefix = '') {
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) {
    if (String(error.message || '').toLowerCase().includes('not found')) return [];
    throw new Error(`${bucket}: ${error.message}`);
  }

  const files = [];
  for (const item of data || []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null || item.metadata === null) {
      files.push(...await listFiles(client, bucket, path));
    } else {
      files.push(path);
    }
  }
  return files;
}

async function copyFile(bucket, path) {
  if (dryRun) return;
  const { data, error } = await source.storage.from(bucket).download(path);
  if (error) throw new Error(`${bucket}/${path}: ${error.message}`);

  const contentType = data.type || 'application/octet-stream';
  const { error: uploadError } = await target.storage.from(bucket).upload(path, data, {
    upsert: true,
    contentType,
    cacheControl: '31536000',
  });
  if (uploadError) throw new Error(`${bucket}/${path}: ${uploadError.message}`);
}

function rewriteValue(value) {
  if (typeof value === 'string') return value.split(sourceHost).join(targetHost);
  if (Array.isArray(value)) return value.map(rewriteValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, rewriteValue(inner)]));
  }
  return value;
}

async function rewriteTable(table) {
  const { data: rows, error } = await target.from(table).select('id,data');
  if (error) throw new Error(`${table}: ${error.message}`);

  let changedRows = 0;
  for (const row of rows || []) {
    const currentText = JSON.stringify(row.data || {});
    if (!currentText.includes(sourceHost)) continue;
    changedRows += 1;
    if (dryRun) continue;

    const next = rewriteValue(row.data || {});
    const { error: updateError } = await target
      .from(table)
      .update({ data: next, updated_at: new Date().toISOString() })
      .eq('id', row.id);
    if (updateError) throw new Error(`${table}/${row.id}: ${updateError.message}`);
  }
  return changedRows;
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

const copied = [];
for (const bucket of buckets) {
  const sourceFiles = await listFiles(source, bucket);
  const targetFiles = new Set(await listFiles(target, bucket));
  const missingFiles = sourceFiles.filter((path) => !targetFiles.has(path));
  await runLimited(missingFiles, 8, (path) => copyFile(bucket, path));
  copied.push({ bucket, files: sourceFiles.length, missing: missingFiles.length });
}

const rewritten = [];
for (const table of jsonTables) {
  rewritten.push({ table, rows: await rewriteTable(table) });
}

console.log(JSON.stringify({
  mode: dryRun ? 'dry-run' : 'copied',
  copied,
  rewritten,
}, null, 2));
