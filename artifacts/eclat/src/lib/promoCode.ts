// src/lib/promoCode.ts
import { getDB } from "./supabase";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from "@/lib/supabaseStore";

export type PromoCode = {
  code: string;
  discount: number;
  type: "percentage" | "fixed" | "free_gift";
  offerId: string;
  minOrderAmount: number;
  freeProductId?: string;
};

/* =====================================
   VALIDATE PROMO CODE (FIRESTORE)
===================================== */
export async function validatePromoCode(
  code: string,
  userId?: string
): Promise<PromoCode | null> {
  if (!code || !code.trim()) return null;

  const normalized = code.trim().toUpperCase();
  const db = getDB();

  try {
    // 1. Check Global Offers first
    const q = query(
      collection(db, "offers"),
      where("code", "==", normalized),
      limit(1)
    );

    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const data = docSnap.data();
      const isActive = data.active === true || data.active === "true";
      if (!isActive) return null;

      const discount = Number(data.discount);
      if (!Number.isFinite(discount) || discount <= 0) return null;

      const type: "percentage" | "fixed" | "free_gift" =
        data.type === "fixed" ? "fixed" : "percentage";

      return {
        code: normalized,
        discount,
        type,
        offerId: docSnap.id,
        minOrderAmount: Number(data.minOrderAmount) || 0,
      };
    }

    // 2. If not found in global offers, check User's Assigned Coupons
    if (userId) {
      const userCouponsSnap = await getDocs(collection(db, "users", userId, "coupons"));
      for (const d of userCouponsSnap.docs) {
        const cData = d.data() as any;
        if (cData.couponData?.code?.toUpperCase() === normalized) {
          // Found matching personal coupon
          const coupon = cData.couponData;
          if (!coupon.active) return null;
          
          // Validate validTill
          if (coupon.validTill) {
            const validTillDate = coupon.validTill.toDate ? coupon.validTill.toDate() : new Date(coupon.validTill);
            if (validTillDate < new Date()) return null;
          }

          const type = coupon.type || "percentage";
          const discount = Number(coupon.discount) || 0;
          
          // Free gift logic or valid discount check
          if (type !== 'free_gift' && (!Number.isFinite(discount) || discount <= 0)) {
             return null;
          }

          return {
            code: normalized,
            discount,
            type: type as any,
            offerId: coupon.id || d.id,
            minOrderAmount: coupon.targetCriteria?.minTotalAmount || 0,
            freeProductId: coupon.freeProductId,
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.warn('Failed to validate promo code', err);
    return null;
  }
}

/* =====================================
   CALCULATE DISCOUNT (SAFE)
===================================== */
export function calculateDiscount(
  subtotal: number,
  promoCode: PromoCode
): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  
  if (promoCode.type === "free_gift") return 0;

  const discount = Number(promoCode.discount);
  if (!Number.isFinite(discount) || discount <= 0) return 0;

  if (promoCode.type === "percentage") {
    return Math.round((subtotal * discount) / 100);
  }

  // fixed
  return Math.min(discount, subtotal);
}
