// src/lib/orders.ts
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from '@/lib/supabaseStore';
import { getDB, supabase } from './supabase';
import type { Order, OrderStatus } from './types';

const ORDERS_COLLECTION = 'orders';
const STOCK_RESERVATION_MS = 5 * 60 * 1000;

/** Generate a unique order ID like "ECL-A1B2C3" */
export function generateOrderId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ECL-${code}`;
}

/** Remove undefined values (Firestore rejects them) */
function stripUndefined(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) clean[k] = v;
  }
  return clean;
}

function asMillis(value: any): number {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Create a new order in Firestore */
export async function createOrder(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const db = getDB();
  const docRef = doc(db, ORDERS_COLLECTION, order.orderId);
  const reservationExpiresAt = new Date(Date.now() + STOCK_RESERVATION_MS).toISOString();
  await setDoc(docRef, {
    ...stripUndefined(order as Record<string, any>),
    stockReserved: false,
    stockDeducted: false,
    stockCommitted: false,
    stockRestored: false,
    reservationExpiresAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return order.orderId;
}

/** Restore reserved stock when payment is not completed in time. */
export async function releaseOrderStock(orderId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('release_order_stock', { target_order_id: orderId });
  if (error) throw error;
  return data === true;
}

/** Clean up any pending payment reservations that already crossed the 5 minute window. */
export async function releaseExpiredPaymentPendingOrders(): Promise<number> {
  const db = getDB();
  const snap = await getDocs(query(
    collection(db, ORDERS_COLLECTION),
    where('orderStatus', '==', 'Payment Pending')
  ));
  const now = Date.now();
  let restored = 0;

  for (const docSnap of snap.docs) {
    const order = { id: docSnap.id, ...docSnap.data() } as Order;
    const expiry = asMillis(order.reservationExpiresAt);
    if (!order.stockRestored && expiry > 0 && expiry <= now) {
      if (await releaseOrderStock(order.orderId || docSnap.id)) restored += 1;
    }
  }

  return restored;
}

/** Update order with payment confirmation (transaction ID + screenshot URL) */
export async function submitPaymentConfirmation(
  orderId: string,
  transactionId: string,
  paymentScreenshotUrl: string
): Promise<void> {
  const db = getDB();

  // Check for duplicate transaction ID
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('transactionId', '==', transactionId)
  );
  const existing = await getDocs(q);
  if (!existing.empty) {
    throw new Error('Transaction ID already used. Please enter a different one.');
  }

  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Order not found.');
  }

  await updateDoc(docRef, {
    transactionId,
    paymentScreenshotUrl,
    orderStatus: 'Under Verification' as OrderStatus,
    updatedAt: serverTimestamp(),
  });
}

/** Automate order verification successfully from Razorpay */
export async function submitRazorpaySuccess(
  orderId: string,
  razorpayPaymentId: string
): Promise<void> {
  const db = getDB();

  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Order not found.');
  }

  await updateDoc(docRef, {
    transactionId: razorpayPaymentId,
    paymentMethod: 'Razorpay',
    orderStatus: 'Verified' as OrderStatus,
    updatedAt: serverTimestamp(),
  });
}

/** Admin: update order status (Verify / Reject) */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const db = getDB();
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  await updateDoc(docRef, {
    orderStatus: status,
    updatedAt: serverTimestamp(),
  });
}

/** Get a single order */
export async function getOrder(orderId: string): Promise<Order | null> {
  const db = getDB();
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Order;
}

/** Real-time listener for all orders (admin) */
export function subscribeToOrders(callback: (orders: Order[]) => void): () => void {
  const db = getDB();
  const q = query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Order[];
    callback(orders);
  });
}

/** Real-time listener for a specific user's orders */
export function subscribeToUserOrders(
  userId: string,
  callback: (orders: Order[]) => void
): () => void {
  const db = getDB();
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('userId', '==', userId)
  );
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Order[];
    
    // Sort chronologically (descending) in memory to avoid missing composite index errors
    orders.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt as any).getTime() : 0);
      const timeB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt as any).getTime() : 0);
      return timeB - timeA;
    });
    
    callback(orders);
  }, (error) => {
    console.error("Error in subscribeToUserOrders:", error);
  });
}

/** Compress an image file before upload */
export function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image load failed'));
      img.onload = () => {
        const ratio = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Compression failed'));
          },
          'image/jpeg',
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Fetch live store settings from Firestore */
export async function getStoreSettings(): Promise<any> {
  try {
    const docSnap = await getDoc(doc(getDB(), "settings", "storeSettings"));
    if (docSnap.exists()) return docSnap.data();
  } catch (err) {
    console.error("Failed to fetch store settings:", err);
  }
  return null;
}

/** Build UPI deep link string for Merchant Accounts */
export function buildUpiLink(
  upiId: string,
  payeeName: string,
  amount: number,
  orderId: string
): string {
  if (!upiId) return '';
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount.toFixed(2)}&cu=INR&tn=Order-${encodeURIComponent(orderId)}&tr=${encodeURIComponent(orderId)}`;
}
