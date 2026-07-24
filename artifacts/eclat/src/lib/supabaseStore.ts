import { supabase } from './supabase';
import { APP_RESUME_EVENT, logClientError } from './appLifecycle';

type FilterOp = '==' | '!=';
type Sentinel =
  | { __op: 'serverTimestamp' }
  | { __op: 'increment'; amount: number }
  | { __op: 'arrayUnion'; values: unknown[] }
  | { __op: 'arrayRemove'; values: unknown[] };

type Ref = {
  kind: 'collection' | 'doc';
  table: string;
  id?: string;
  parent?: { userId?: string };
};

type QueryShape = Ref & {
  filters?: Array<{ field: string; op: FilterOp; value: unknown }>;
  order?: { field: string; direction: 'asc' | 'desc' };
  maxRows?: number;
};

type StoreDoc = {
  id: string;
  data: () => any;
  ref: Ref;
};

type StoreQuerySnapshot = {
  docs: StoreDoc[];
  empty: boolean;
  size: number;
};

type StoreDocSnapshot = {
  id?: string;
  exists: () => boolean;
  data: () => any;
};

type StoreSnapshot = StoreQuerySnapshot & StoreDocSnapshot;

const PUBLIC_CACHE_TABLES = new Set([
  'products',
  'categories',
  'brands',
  'offers',
  'main_banners',
  'announcements',
  'testing_videos',
  'site_settings',
  'delivery_settings',
]);
const STORE_CACHE_PREFIX = 'thealankar:supabase-store:';
const STORE_CACHE_TTL_MS = 20 * 60 * 1000;
const pendingReads = new Map<string, Promise<any[]>>();

const tableMap: Record<string, string> = {
  products: 'products',
  offers: 'offers',
  mainBanners: 'main_banners',
  announcements: 'announcements',
  categories: 'categories',
  brands: 'brands',
  testingVideos: 'testing_videos',
  orders: 'orders',
  users: 'profiles',
  referrals: 'referrals',
  coupons: 'coupons',
  wallet_transactions: 'wallet_transactions',
  supportMessages: 'support_messages',
  app_ratings: 'app_ratings',
  appRatings: 'app_ratings',
};

function tableFor(name: string) {
  return tableMap[name] || name;
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isAdminPath() {
  if (!isBrowser()) return false;
  const path = window.location.pathname || '';
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  return (
    path.includes('/antomanage') ||
    path.includes('/admin/') ||
    hash.startsWith('#/antomanage') ||
    search.includes('admin=antomanage') ||
    search.includes('admin-reset=1')
  );
}

function isFreshnessCriticalPath() {
  if (!isBrowser()) return false;
  const path = window.location.pathname || '';
  return (
    path.includes('/checkout') ||
    path.includes('/order') ||
    path.includes('/track') ||
    path.includes('/profile') ||
    path.includes('/wallet')
  );
}

function cacheAllowedFor(ref: QueryShape | Ref) {
  return (
    isBrowser() &&
    !isAdminPath() &&
    !isFreshnessCriticalPath() &&
    !ref.parent?.userId &&
    PUBLIC_CACHE_TABLES.has(ref.table)
  );
}

function cacheKeyFor(ref: QueryShape | Ref) {
  return `${STORE_CACHE_PREFIX}${ref.table}:${ref.id || 'collection'}`;
}

function pendingReadKeyFor(ref: QueryShape | Ref) {
  const queryRef = ref as QueryShape;
  return [
    ref.table,
    ref.id || 'collection',
    ref.parent?.userId || '',
    JSON.stringify(queryRef.filters || []),
    JSON.stringify(queryRef.order || null),
    queryRef.maxRows || '',
  ].join(':');
}

function readCachedRows(ref: QueryShape | Ref, allowStale = false) {
  if (!cacheAllowedFor(ref)) return null;

  try {
    const raw = window.localStorage.getItem(cacheKeyFor(ref));
    if (!raw) return null;
    const cached = JSON.parse(raw) as { savedAt: number; rows: any[] };
    if (!cached?.savedAt || !Array.isArray(cached.rows)) return null;
    if (!allowStale && Date.now() - cached.savedAt > STORE_CACHE_TTL_MS) return null;
    return cached.rows;
  } catch {
    return null;
  }
}

function writeCachedRows(ref: QueryShape | Ref, rows: any[]) {
  if (!cacheAllowedFor(ref)) return;

  try {
    window.localStorage.setItem(
      cacheKeyFor(ref),
      JSON.stringify({ savedAt: Date.now(), rows })
    );
  } catch {
    // Browser storage can be unavailable or full; live Supabase remains the source of truth.
  }
}

function invalidateTableCache(table: string) {
  if (!isBrowser()) return;

  try {
    const prefix = `${STORE_CACHE_PREFIX}${table}:`;
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(prefix)) window.localStorage.removeItem(key);
    }
  } catch {
    // Cache invalidation is best-effort.
  }
}

function updateTableCacheFromRealtime(table: string, payload: any) {
  if (!isBrowser() || !PUBLIC_CACHE_TABLES.has(table)) return;

  const changedRow = payload.new && Object.keys(payload.new).length > 0
    ? payload.new
    : payload.old;
  const changedId = changedRow?.id;
  if (!changedId) {
    invalidateTableCache(table);
    return;
  }

  try {
    const keys = [
      `${STORE_CACHE_PREFIX}${table}:collection`,
      `${STORE_CACHE_PREFIX}${table}:${changedId}`,
    ];
    for (const key of keys) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const cached = JSON.parse(raw) as { savedAt: number; rows: any[] };
      if (!Array.isArray(cached.rows)) continue;
      const rows = cached.rows.filter((row: any) => row.id !== changedId);
      if (payload.eventType !== 'DELETE') rows.push(changedRow);
      window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), rows }));
    }
  } catch {
    invalidateTableCache(table);
  }
}

function settingsId(id?: string) {
  if (id === 'deliverySettings') return { table: 'delivery_settings', id: 'default' };
  return { table: 'site_settings', id: id || 'storeSettings' };
}

function normalizeRef(path: string[]): Ref {
  if (path[0] === 'settings') {
    const mapped = settingsId(path[1]);
    return { kind: path.length > 1 ? 'doc' : 'collection', ...mapped };
  }

  if (path[0] === 'users' && path[2] === 'coupons') {
    return {
      kind: path.length > 3 ? 'doc' : 'collection',
      table: 'user_coupons',
      id: path[3],
      parent: { userId: path[1] },
    };
  }

  return {
    kind: path.length > 1 ? 'doc' : 'collection',
    table: tableFor(path[0]),
    id: path[1],
  };
}

function unwrapRow(row: any) {
  if (!row) return null;
  const base = row.data && typeof row.data === 'object' ? row.data : row;
  return {
    id: row.id,
    ...base,
    createdAt: base.createdAt ?? row.created_at ?? row.createdAt,
    updatedAt: base.updatedAt ?? row.updated_at ?? row.updatedAt,
  };
}

function applySentinels(previous: Record<string, any>, patch: Record<string, any>) {
  const next = { ...previous };
  for (const [key, value] of Object.entries(patch)) {
    const sentinel = value as Sentinel;
    if (sentinel && typeof sentinel === 'object' && '__op' in sentinel) {
      if (sentinel.__op === 'serverTimestamp') next[key] = new Date().toISOString();
      if (sentinel.__op === 'increment') next[key] = Number(next[key] || 0) + sentinel.amount;
      if (sentinel.__op === 'arrayUnion') {
        next[key] = Array.from(new Set([...(Array.isArray(next[key]) ? next[key] : []), ...sentinel.values]));
      }
      if (sentinel.__op === 'arrayRemove') {
        next[key] = (Array.isArray(next[key]) ? next[key] : []).filter(
          (item: unknown) => !sentinel.values.includes(item)
        );
      }
    } else if (value !== undefined) {
      next[key] = value;
    }
  }
  return next;
}

function storedPayload(data: Record<string, any>) {
  const now = new Date().toISOString();
  return {
    data,
    created_at: data.createdAt || now,
    updated_at: data.updatedAt || now,
  };
}

function valueForFilter(row: any, field: string) {
  const data = unwrapRow(row) || {};
  return data[field];
}

function sortRows(rows: any[], order?: QueryShape['order']) {
  if (!order) return rows;
  const dir = order.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = valueForFilter(a, order.field);
    const bv = valueForFilter(b, order.field);
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
  });
}

function finalizeRows(rows: any[], ref: QueryShape) {
  let result = rows;
  for (const filter of ref.filters || []) {
    result = result.filter((row: any) => {
      const actual = valueForFilter(row, filter.field);
      return filter.op === '!=' ? actual !== filter.value : actual === filter.value;
    });
  }
  result = sortRows(result, ref.order);
  if (ref.maxRows) result = result.slice(0, ref.maxRows);
  return result;
}

function topLevelUserIdFilter(ref: QueryShape | Ref) {
  if (!['orders', 'wallet_transactions', 'app_ratings', 'support_messages'].includes(ref.table)) {
    return null;
  }
  const queryRef = ref as QueryShape;
  const userFilter = queryRef.filters?.find(
    (filter) => filter.field === 'userId' && filter.op === '==' && typeof filter.value === 'string'
  );
  return userFilter ? String(userFilter.value) : null;
}

function applyServerQuery(request: any, ref: QueryShape) {
  let nextRequest = request;
  const topLevelUserId = topLevelUserIdFilter(ref);

  for (const filter of ref.filters || []) {
    if (filter.field === 'userId' && topLevelUserId) continue;
    const column = `data->>${filter.field}`;
    nextRequest = filter.op === '!='
      ? nextRequest.neq(column, filter.value)
      : nextRequest.eq(column, filter.value);
  }

  if (ref.order) {
    nextRequest = nextRequest.order(`data->>${ref.order.field}`, {
      ascending: ref.order.direction === 'asc',
    });
  }
  if (ref.maxRows) nextRequest = nextRequest.limit(ref.maxRows);
  return nextRequest;
}

async function fetchRows(ref: QueryShape, forceFresh = false) {
  if (!forceFresh) {
    const cachedRows = readCachedRows(ref);
    if (cachedRows) return finalizeRows(cachedRows, ref);

    if (ref.id) {
      const collectionRows = readCachedRows({ ...ref, kind: 'collection', id: undefined });
      const cachedRow = collectionRows?.find((row: any) => row.id === ref.id);
      if (cachedRow) return finalizeRows([cachedRow], ref);
    }
  }

  const requestKey = pendingReadKeyFor(ref);
  const existingRequest = pendingReads.get(requestKey);
  if (existingRequest) return finalizeRows(await existingRequest, ref);

  const isPartialCollection = !!ref.filters?.length || !!ref.maxRows;
  const requestPromise = (async () => {
    let request = supabase.from(ref.table).select('*');
    if (ref.id) request = request.eq('id', ref.id);
    if (ref.parent?.userId) request = request.eq('user_id', ref.parent.userId);
    const userIdFilter = topLevelUserIdFilter(ref);
    if (userIdFilter) request = request.eq('user_id', userIdFilter);
    request = applyServerQuery(request, ref);
    const { data, error } = await request;
    if (error) throw error;
    return data || [];
  })();
  pendingReads.set(requestKey, requestPromise);

  try {
    const rows = await requestPromise;
    if (!isPartialCollection) writeCachedRows(ref, rows);
    return finalizeRows(rows, ref);
  } catch (error) {
    const cachedRows = readCachedRows(ref, true);
    if (!cachedRows) throw error;

    return finalizeRows(cachedRows, ref);
  } finally {
    if (pendingReads.get(requestKey) === requestPromise) pendingReads.delete(requestKey);
  }
}

export function collection(_db: unknown, ...path: string[]): Ref {
  return normalizeRef(path);
}

export function doc(_db: unknown, ...path: string[]): Ref {
  return normalizeRef(path);
}

export function where(field: string, op: FilterOp, value: unknown) {
  return { type: 'where' as const, field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy' as const, field, direction };
}

export function limit(maxRows: number) {
  return { type: 'limit' as const, maxRows };
}

export function query(ref: Ref, ...clauses: any[]): QueryShape {
  const q: QueryShape = { ...ref, filters: [] };
  for (const clause of clauses) {
    if (clause?.type === 'where') q.filters?.push(clause);
    if (clause?.type === 'orderBy') q.order = clause;
    if (clause?.type === 'limit') q.maxRows = clause.maxRows;
  }
  return q;
}

export async function getDocs(
  ref: QueryShape | Ref,
  options?: { forceFresh?: boolean }
): Promise<StoreQuerySnapshot> {
  const rows = await fetchRows(ref as QueryShape, options?.forceFresh);
  const docs: StoreDoc[] = rows.map((row: any) => ({
    id: row.id,
    data: () => unwrapRow(row),
    ref: { ...(ref as Ref), id: row.id },
  }));
  return { docs, empty: docs.length === 0, size: docs.length };
}

export async function getDoc(
  ref: Ref,
  options?: { forceFresh?: boolean }
): Promise<StoreDocSnapshot> {
  const rows = await fetchRows(ref, options?.forceFresh);
  const row = rows[0];
  return {
    id: ref.id,
    exists: () => !!row,
    data: () => unwrapRow(row),
  };
}

export async function setDoc(ref: Ref, data: Record<string, any>, options?: { merge?: boolean }) {
  const id = ref.id || crypto.randomUUID();
  const current = options?.merge ? (await getDoc({ ...ref, id })).data() || {} : {};
  const merged = applySentinels(current, data);
  const payload: Record<string, any> = { id, ...storedPayload(merged) };
  if (ref.parent?.userId) payload.user_id = ref.parent.userId;
  if (ref.table === 'orders' && typeof merged.userId === 'string' && merged.userId) {
    payload.user_id = merged.userId;
  }
  const { error } = await supabase.from(ref.table).upsert(payload, { onConflict: 'id' });
  if (!error) {
    invalidateTableCache(ref.table);
    return;
  }

  if (ref.table === 'site_settings' || ref.table === 'delivery_settings') {
    const { error: rpcError } = await supabase.rpc('admin_upsert_json_doc', {
      target_table: ref.table,
      doc_id: id,
      doc_data: merged,
    });
    if (!rpcError) {
      invalidateTableCache(ref.table);
      return;
    }
    throw rpcError;
  }

  throw error;
}

export async function addDoc(ref: Ref, data: Record<string, any>) {
  const id = crypto.randomUUID();
  await setDoc({ ...ref, kind: 'doc', id }, data);
  return { id };
}

export async function updateDoc(ref: Ref, data: Record<string, any>) {
  if (!ref.id) throw new Error('Cannot update document without id.');
  await setDoc(ref, data, { merge: true });
}

export async function deleteDoc(ref: Ref) {
  if (!ref.id) throw new Error('Cannot delete document without id.');
  const { data, error } = await supabase.from(ref.table).delete().eq('id', ref.id).select('id');
  if (error) throw error;
  if (!data?.length) {
    throw new Error('The record was not deleted. Your account may not have permission.');
  }
  invalidateTableCache(ref.table);
}

function asSnapshot(snapshot: StoreQuerySnapshot | StoreDocSnapshot): StoreSnapshot {
  const queryPart =
    'docs' in snapshot
      ? snapshot
      : { docs: [], empty: !snapshot.exists(), size: snapshot.exists() ? 1 : 0 };
  const docPart =
    'exists' in snapshot
      ? snapshot
      : { id: undefined, exists: () => !snapshot.empty, data: () => snapshot.docs[0]?.data() };
  return { ...queryPart, ...docPart };
}

export function onSnapshot(ref: QueryShape | Ref, next: (snapshot: StoreSnapshot) => void, error?: (err: unknown) => void) {
  let active = true;
  let reconnectTimer: number | null = null;
  let refreshTimer: number | null = null;
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let latestRows: any[] | null = null;

  const emitRows = (rows: any[]) => {
    const finalized = finalizeRows(rows, ref as QueryShape);
    latestRows = finalized;
    const docs: StoreDoc[] = finalized.map((row: any) => ({
      id: row.id,
      data: () => unwrapRow(row),
      ref: { ...(ref as Ref), id: row.id },
    }));
    const row = docs[0];
    next(asSnapshot(
      (ref as Ref).kind === 'doc'
        ? {
            id: (ref as Ref).id,
            exists: () => !!row,
            data: () => row?.data(),
          }
        : { docs, empty: docs.length === 0, size: docs.length }
    ));
  };

  const load = async (forceFresh = false) => {
    try {
      const snapshot = (ref as Ref).kind === 'doc'
        ? await getDoc(ref as Ref, { forceFresh })
        : await getDocs(ref as QueryShape, { forceFresh });
      if (!active) return;
      latestRows = 'docs' in snapshot
        ? snapshot.docs.map((item) => ({ id: item.id, data: item.data() }))
        : snapshot.exists()
          ? [{ id: snapshot.id, data: snapshot.data() }]
          : [];
      next(asSnapshot(snapshot));
    } catch (err) {
      logClientError('supabase-store-load-failed', err, { table: (ref as Ref).table, id: (ref as Ref).id });
      if (active) error?.(err);
    }
  };

  const clearChannel = () => {
    if (channel) void supabase.removeChannel(channel);
    channel = null;
  };

  const scheduleLoad = () => {
    if (refreshTimer) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;
      if (active) void load(true);
    }, 250);
  };

  const handleRealtimeChange = (payload: any) => {
    updateTableCacheFromRealtime((ref as Ref).table, payload);
    if (!active) return;

    // A limited result may need a replacement row after an update or deletion.
    if (!latestRows || (ref as QueryShape).maxRows) {
      scheduleLoad();
      return;
    }

    const changedRow = payload.new && Object.keys(payload.new).length > 0
      ? payload.new
      : payload.old;
    const changedId = changedRow?.id;
    if (!changedId) {
      scheduleLoad();
      return;
    }
    if ((ref as Ref).id && (ref as Ref).id !== changedId) return;

    const rows = latestRows.filter((row: any) => row.id !== changedId);
    if (payload.eventType !== 'DELETE') rows.push(changedRow);
    emitRows(rows);
  };

  const scheduleReconnect = () => {
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      if (!active) return;
      void load(true);
      subscribe();
    }, 500);
  };

  const subscribe = () => {
    clearChannel();
    const changeFilter: any = {
      event: '*',
      schema: 'public',
      table: (ref as Ref).table,
    };
    if ((ref as Ref).id) changeFilter.filter = `id=eq.${(ref as Ref).id}`;
    else {
      const userIdFilter = topLevelUserIdFilter(ref);
      if (userIdFilter) changeFilter.filter = `user_id=eq.${userIdFilter}`;
    }

    channel = supabase
      .channel(`store-${(ref as Ref).table}-${(ref as Ref).id || 'all'}-${crypto.randomUUID()}`)
      .on('postgres_changes', changeFilter, handleRealtimeChange)
      .subscribe((status) => {
        if (!active) return;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          logClientError('supabase-store-channel-status', status, { table: (ref as Ref).table, id: (ref as Ref).id });
          scheduleReconnect();
        }
      });
  };

  const handleResume = () => {
    scheduleReconnect();
  };

  void load();
  subscribe();
  if (typeof window !== 'undefined') {
    window.addEventListener(APP_RESUME_EVENT, handleResume);
  }

  return () => {
    active = false;
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    if (refreshTimer) window.clearTimeout(refreshTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener(APP_RESUME_EVENT, handleResume);
    }
    clearChannel();
  };
}

export const serverTimestamp = (): Sentinel => ({ __op: 'serverTimestamp' });
export const increment = (amount: number): Sentinel => ({ __op: 'increment', amount });
export const arrayUnion = (...values: unknown[]): Sentinel => ({ __op: 'arrayUnion', values });
export const arrayRemove = (...values: unknown[]): Sentinel => ({ __op: 'arrayRemove', values });

export function writeBatch(_db?: unknown) {
  const ops: Array<() => Promise<void>> = [];
  return {
    delete(ref: Ref) {
      ops.push(() => deleteDoc(ref));
    },
    set(ref: Ref, data: Record<string, any>) {
      ops.push(() => setDoc(ref, data));
    },
    update(ref: Ref, data: Record<string, any>) {
      ops.push(() => updateDoc(ref, data));
    },
    async commit() {
      for (const op of ops) await op();
    },
  };
}
