import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../artifacts/eclat/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_IMAGE_BUCKET || 'storefront-images';
const dryRun = process.argv.includes('--dry-run');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const specs = [
  { table: 'products', fields: ['image', 'images'] },
  { table: 'categories', fields: ['image'] },
  { table: 'brands', fields: ['image'] },
  { table: 'offers', fields: ['image', 'imageUrl', 'bannerImage'] },
  { table: 'main_banners', fields: ['desktopImage', 'mobileImage'] },
  { table: 'coupons', fields: ['icon', 'image', 'imageUrl', 'bannerImage'] },
];

const uploadedByHash = new Map();
let convertedImages = 0;
let updatedRows = 0;
let scannedRows = 0;
let skippedImages = 0;

function parseDataUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('data:image/')) return null;
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const contentType = match[1] || 'image/jpeg';
  const dataBase64 = match[2];
  const extension = contentType.includes('png') ? 'png'
    : contentType.includes('webp') ? 'webp'
      : 'jpg';
  return {
    bytes: Buffer.from(dataBase64, 'base64'),
    contentType,
    extension,
  };
}

function publicUrlFor(path) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(bucket);
  if (data || dryRun) return;

  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 5242880,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });
  if (error && !String(error.message || '').toLowerCase().includes('already exists')) {
    throw error;
  }
}

async function uploadDataUrl(value, table, field) {
  const parsed = parseDataUrl(value);
  if (!parsed) return { value, changed: false };
  if (parsed.bytes.length === 0) {
    skippedImages += 1;
    return { value, changed: false };
  }

  const hash = createHash('sha256').update(value).digest('hex');
  if (uploadedByHash.has(hash)) {
    convertedImages += 1;
    return { value: uploadedByHash.get(hash), changed: true };
  }

  const path = `migrated/${table}/${field}/${hash.slice(0, 16)}-${randomUUID()}.${parsed.extension}`;
  const publicUrl = publicUrlFor(path);

  if (!dryRun) {
    const { error } = await supabase.storage.from(bucket).upload(path, parsed.bytes, {
      contentType: parsed.contentType,
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw error;
  }

  uploadedByHash.set(hash, publicUrl);
  convertedImages += 1;
  return { value: publicUrl, changed: true };
}

async function transformValue(value, table, field) {
  if (Array.isArray(value)) {
    let changed = false;
    const next = [];
    for (const item of value) {
      const result = await uploadDataUrl(item, table, field);
      changed ||= result.changed;
      next.push(result.value);
    }
    return { value: next, changed };
  }
  return uploadDataUrl(value, table, field);
}

async function migrateTable(spec) {
  const { data: rows, error } = await supabase.from(spec.table).select('id,data');
  if (error) throw error;

  for (const row of rows || []) {
    scannedRows += 1;
    const current = row.data && typeof row.data === 'object' ? row.data : {};
    const next = { ...current };
    let changed = false;

    for (const field of spec.fields) {
      if (!(field in next)) continue;
      const result = await transformValue(next[field], spec.table, field);
      if (result.changed) {
        next[field] = result.value;
        changed = true;
      }
    }

    if (!changed) continue;
    updatedRows += 1;
    if (dryRun) continue;

    const { error: updateError } = await supabase
      .from(spec.table)
      .update({ data: next, updated_at: new Date().toISOString() })
      .eq('id', row.id);
    if (updateError) throw updateError;
  }
}

await ensureBucket();

for (const spec of specs) {
  await migrateTable(spec);
}

console.log(JSON.stringify({
  mode: dryRun ? 'dry-run' : 'updated',
  scannedRows,
  updatedRows,
  convertedImages,
  skippedImages,
  bucket,
}, null, 2));
