import { createRequire } from 'node:module';

const require = createRequire(new URL('../artifacts/eclat/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const sourceUrl = process.env.SOURCE_SUPABASE_URL;
const sourceKey = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;
const targetUrl = process.env.TARGET_SUPABASE_URL;
const targetKey = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes('--dry-run');
const preserveUserIds = process.argv.includes('--preserve-user-ids');

if (!sourceUrl || !sourceKey || !targetUrl || !targetKey) {
  console.error('Missing SOURCE_SUPABASE_URL, SOURCE_SUPABASE_SERVICE_ROLE_KEY, TARGET_SUPABASE_URL, or TARGET_SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const source = createClient(sourceUrl, sourceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const target = createClient(targetUrl, targetKey, { auth: { persistSession: false, autoRefreshToken: false } });

const tableColumns = {
  admin_roles: ['user_id', 'created_at'],
  products: ['id', 'data', 'created_at', 'updated_at'],
  profiles: ['id', 'user_id', 'data', 'created_at', 'updated_at'],
  categories: ['id', 'data', 'created_at', 'updated_at'],
  brands: ['id', 'data', 'created_at', 'updated_at'],
  offers: ['id', 'data', 'created_at', 'updated_at'],
  main_banners: ['id', 'data', 'created_at', 'updated_at'],
  announcements: ['id', 'data', 'created_at', 'updated_at'],
  testing_videos: ['id', 'data', 'created_at', 'updated_at'],
  site_settings: ['id', 'data', 'created_at', 'updated_at'],
  delivery_settings: ['id', 'data', 'created_at', 'updated_at'],
  orders: ['id', 'user_id', 'data', 'created_at', 'updated_at'],
  payments: ['id', 'order_id', 'user_id', 'provider', 'provider_order_id', 'provider_payment_id', 'status', 'amount_paise', 'signature_verified', 'raw_payload', 'created_at', 'updated_at'],
  coupons: ['id', 'data', 'created_at', 'updated_at'],
  user_coupons: ['id', 'user_id', 'data', 'created_at', 'updated_at'],
  referrals: ['id', 'data', 'created_at', 'updated_at'],
  wallet_transactions: ['id', 'data', 'created_at', 'updated_at'],
  app_ratings: ['id', 'data', 'created_at', 'updated_at'],
  support_messages: ['id', 'data', 'created_at', 'updated_at'],
};

const authScopedColumns = new Map([
  ['profiles', ['user_id']],
  ['orders', ['user_id']],
  ['payments', ['user_id']],
]);

async function fetchAll(table, columns) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await source.from(table).select(columns.join(',')).range(from, to);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function prepareRow(table, row, columns) {
  const next = {};
  for (const column of columns) next[column] = row[column] ?? null;

  // Auth users are project-local. Preserve JSON data, but avoid FK failures when
  // the same auth user UUID does not exist in the target project yet.
  if (!preserveUserIds) {
    for (const column of authScopedColumns.get(table) || []) {
      next[column] = null;
    }
  }

  return next;
}

async function copyTable(table, columns) {
  const rows = await fetchAll(table, columns);
  if (dryRun || rows.length === 0) return { table, rows: rows.length, copied: 0 };

  const batchSize = 200;
  let copied = 0;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize).map((row) => prepareRow(table, row, columns));
    const conflictColumn = table === 'admin_roles' ? 'user_id' : 'id';
    const { error } = await target.from(table).upsert(batch, { onConflict: conflictColumn });
    if (error) throw new Error(`${table}: ${error.message}`);
    copied += batch.length;
  }
  return { table, rows: rows.length, copied };
}

const summary = [];
for (const [table, columns] of Object.entries(tableColumns)) {
  summary.push(await copyTable(table, columns));
}

console.log(JSON.stringify({ mode: dryRun ? 'dry-run' : 'copied', preserveUserIds, summary }, null, 2));
