import { supabase } from "@/lib/supabase";

function positiveOrder(value: unknown) {
  const order = Number(value);
  return Number.isFinite(order) && order > 0 ? Math.floor(order) : 0;
}

export async function normalizeDisplayOrder(collectionName: string, activeId: string, targetOrder: unknown) {
  const requestedOrder = positiveOrder(targetOrder);
  if (!requestedOrder) return;

  const { error } = await supabase.rpc("admin_normalize_display_order", {
    target_table: collectionName,
    active_id: activeId,
    requested_order: requestedOrder,
  });
  if (error) throw error;
}
