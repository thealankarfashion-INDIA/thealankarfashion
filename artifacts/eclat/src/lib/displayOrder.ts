import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
} from "@/lib/supabaseStore";
import { getDB } from "@/lib/supabase";

function positiveOrder(value: unknown) {
  const order = Number(value);
  return Number.isFinite(order) && order > 0 ? Math.floor(order) : 0;
}

function createdAtMillis(value: unknown) {
  const createdAt = value as any;
  return createdAt?.toMillis?.() || (createdAt ? new Date(createdAt).getTime() : 0);
}

export async function normalizeDisplayOrder(collectionName: string, activeId: string, targetOrder: unknown) {
  const requestedOrder = positiveOrder(targetOrder);
  if (!requestedOrder) return;

  const db = getDB();
  const snap = await getDocs(query(collection(db, collectionName)));
  const items = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    data: docSnap.data() as any,
  }));
  const active = items.find((item) => item.id === activeId);
  if (!active) return;

  const ordered = items
    .filter((item) => item.id !== activeId && positiveOrder(item.data.displayOrder) > 0)
    .sort((a, b) => {
      const orderDiff = positiveOrder(a.data.displayOrder) - positiveOrder(b.data.displayOrder);
      if (orderDiff !== 0) return orderDiff;
      return createdAtMillis(a.data.createdAt) - createdAtMillis(b.data.createdAt);
    });

  ordered.splice(Math.min(requestedOrder - 1, ordered.length), 0, active);

  await Promise.all(
    ordered.map((item, index) => {
      const nextOrder = index + 1;
      if (positiveOrder(item.data.displayOrder) === nextOrder) return Promise.resolve();
      return updateDoc(doc(db, collectionName, item.id), {
        displayOrder: nextOrder,
        updatedAt: serverTimestamp(),
      });
    })
  );
}
