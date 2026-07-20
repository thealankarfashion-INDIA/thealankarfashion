import { createRequire } from 'node:module';

const require = createRequire(new URL('../artifacts/eclat/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const sourceUrl = process.env.SOURCE_SUPABASE_URL;
const sourceKey = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;
const targetUrl = process.env.TARGET_SUPABASE_URL;
const targetKey = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY;

if (!sourceUrl || !sourceKey || !targetUrl || !targetKey) {
  console.error('Missing SOURCE_SUPABASE_URL, SOURCE_SUPABASE_SERVICE_ROLE_KEY, TARGET_SUPABASE_URL, or TARGET_SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const source = createClient(sourceUrl, sourceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const target = createClient(targetUrl, targetKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function listAllUsers(client) {
  const users = [];
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...(data.users || []));
    if (!data.users || data.users.length < perPage) break;
  }
  return users;
}

const sourceUsers = await listAllUsers(source);
const targetUsers = await listAllUsers(target);
const targetEmails = new Set(targetUsers.map((user) => user.email?.toLowerCase()).filter(Boolean));
let created = 0;
let skipped = 0;

for (const user of sourceUsers) {
  const email = user.email?.toLowerCase();
  if (!email || targetEmails.has(email)) {
    skipped += 1;
    continue;
  }

  const { error } = await target.auth.admin.createUser({
    id: user.id,
    email: user.email,
    email_confirm: Boolean(user.email_confirmed_at),
    phone: user.phone || undefined,
    phone_confirm: Boolean(user.phone_confirmed_at),
    user_metadata: user.user_metadata || {},
    app_metadata: user.app_metadata || {},
  });

  if (error) throw error;
  created += 1;
}

console.log(JSON.stringify({ sourceUsers: sourceUsers.length, created, skipped }, null, 2));
