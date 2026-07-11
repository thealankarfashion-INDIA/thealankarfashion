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

async function fetchRows(ref: QueryShape) {
  let request = supabase.from(ref.table).select('*');
  if (ref.id) request = request.eq('id', ref.id);
  if (ref.parent?.userId) request = request.eq('user_id', ref.parent.userId);
  const { data, error } = await request;
  if (error) throw error;
  let rows = data || [];
  for (const filter of ref.filters || []) {
    rows = rows.filter((row: any) => {
      const actual = valueForFilter(row, filter.field);
      return filter.op === '!=' ? actual !== filter.value : actual === filter.value;
    });
  }
  rows = sortRows(rows, ref.order);
  if (ref.maxRows) rows = rows.slice(0, ref.maxRows);
  return rows;
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

export async function getDocs(ref: QueryShape | Ref): Promise<StoreQuerySnapshot> {
  const rows = await fetchRows(ref as QueryShape);
  const docs: StoreDoc[] = rows.map((row: any) => ({
    id: row.id,
    data: () => unwrapRow(row),
    ref: { ...(ref as Ref), id: row.id },
  }));
  return { docs, empty: docs.length === 0, size: docs.length };
}

export async function getDoc(ref: Ref): Promise<StoreDocSnapshot> {
  const rows = await fetchRows(ref);
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
  const { error } = await supabase.from(ref.table).upsert(payload, { onConflict: 'id' });
  if (!error) return;

  if (ref.table === 'site_settings' || ref.table === 'delivery_settings') {
    const { error: rpcError } = await supabase.rpc('admin_upsert_json_doc', {
      target_table: ref.table,
      doc_id: id,
      doc_data: merged,
    });
    if (!rpcError) return;
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
  const { error } = await supabase.from(ref.table).delete().eq('id', ref.id);
  if (error) throw error;
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
  let channel: ReturnType<typeof supabase.channel> | null = null;

  const load = async () => {
    try {
      const snapshot = (ref as Ref).kind === 'doc' ? await getDoc(ref as Ref) : await getDocs(ref as QueryShape);
      if (active) next(asSnapshot(snapshot));
    } catch (err) {
      logClientError('supabase-store-load-failed', err, { table: (ref as Ref).table, id: (ref as Ref).id });
      if (active) error?.(err);
    }
  };

  const clearChannel = () => {
    if (channel) void supabase.removeChannel(channel);
    channel = null;
  };

  const scheduleReconnect = () => {
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      if (!active) return;
      void load();
      subscribe();
    }, 500);
  };

  const subscribe = () => {
    clearChannel();
    channel = supabase
      .channel(`store-${(ref as Ref).table}-${(ref as Ref).id || 'all'}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: (ref as Ref).table }, () => void load())
      .subscribe((status) => {
        if (!active) return;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          logClientError('supabase-store-channel-status', status, { table: (ref as Ref).table, id: (ref as Ref).id });
          scheduleReconnect();
        }
      });
  };

  const handleResume = () => {
    void load();
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
