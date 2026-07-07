import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, arrayUnion, arrayRemove, collection, addDoc, query, where, getDocs } from '@/lib/supabaseStore';
import { getDB } from './supabase';

export interface UserAddress {
  id: string;
  label: 'Home' | 'Work' | 'College' | 'Other';
  name: string;
  phone: string;
  street: string; // Used for Flat/House No
  fullAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  distance?: string; // Optional calculated distance string e.g. '0 m', '1.5 km'
  coordinates?: {
    lat: number;
    lng: number;
  };
  isDefault?: boolean;
}

export interface Coupon {
  id: string;
  brandName: string;
  title: string;
  subtitle: string;
  code: string;
  description: string;
  icon: string;
  validTill: string | Date | any; // Any allows for Firestore Timestamp
  active: boolean;
  createdAt: any;
  type?: "percentage" | "fixed" | "free_gift";
  discount?: number;
  freeProductId?: string;
  targetCriteria?: {
    minOrders?: number;
    minTotalAmount?: number;
  };
}

export interface UserCoupon {
  id: string;
  couponId: string;
  isScratched: boolean;
  assignedAt: any;
  scratchedAt?: any;
  couponData: Coupon; // Snapshot of the coupon data when assigned
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  dob?: string;
  anniversary?: string;
  gender?: 'Male' | 'Female' | 'Other';
  phoneNumber?: string;
  state?: string;
  address?: UserAddress; // Legacy, kept for backward compatibility with checkout
  savedAddresses?: UserAddress[];
  totalSavings: number;
  wishlist: string[];
  referralCode?: string;
  walletUsagePercent?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface Referral {
  id?: string;
  referrerId: string;
  referredUserId: string;
  referredUserEmail: string;
  status: 'pending' | 'completed';
  rewardAmount: number;
  createdAt: any;
  completedAt?: any;
}

export interface WalletTransaction {
  id?: string;
  userId: string;
  type: 'added' | 'deducted';
  amount: number;
  description: string;
  source: 'referral' | 'order' | 'admin' | 'other';
  createdAt: any;
  expiresAt?: any;
}

/**
 * Fetches the user profile from Firestore. Creates a default one if it doesn't exist.
 */
export const getUserProfile = async (uid: string, email: string, displayName: string): Promise<UserProfile> => {
  const db = getDB();
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data() as UserProfile;
    // Add referral code to existing users if they don't have one
    if (!data.referralCode) {
      const newCode = `sht${Math.random().toString(36).substring(2, 6).toUpperCase()}${Math.floor(Math.random() * 10)}`;
      data.referralCode = newCode;
      await updateDoc(userRef, { referralCode: newCode, updatedAt: serverTimestamp() });
    }
    return data;
  }

  // Create default profile
  const defaultProfile: UserProfile = {
    uid,
    email,
    displayName,
    totalSavings: 0,
    wishlist: [],
    walletUsagePercent: 50,
    referralCode: `SHT${Math.random().toString(36).substring(2, 6).toUpperCase()}${Math.floor(Math.random() * 10)}`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, defaultProfile);
  return defaultProfile;
};

/**
 * Updates user personal info and address.
 */
export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  const db = getDB();
  const userRef = doc(db, 'users', uid);

  await setDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

/**
 * Saves a new address to the user's savedAddresses array.
 */
export const saveUserAddress = async (uid: string, address: UserAddress) => {
  const db = getDB();
  const userRef = doc(db, 'users', uid);

  await setDoc(userRef, {
    savedAddresses: arrayUnion(address),
    updatedAt: serverTimestamp()
  }, { merge: true });
};

/**
 * Deletes an address from the user's savedAddresses array by id.
 */
export const deleteUserAddress = async (uid: string, addressId: string) => {
  const db = getDB();
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;
  const data = snap.data() as UserProfile;
  const updated = (data.savedAddresses || []).filter(a => a.id !== addressId);
  await setDoc(userRef, { savedAddresses: updated, updatedAt: serverTimestamp() }, { merge: true });
};

/**
 * Adds savings to the user's total.
 */
export const addSavings = async (uid: string, amount: number) => {
  const db = getDB();
  const userRef = doc(db, 'users', uid);

  await setDoc(userRef, {
    totalSavings: increment(amount),
    updatedAt: serverTimestamp()
  }, { merge: true });
};

/**
 * Deducts wallet balance and creates a transaction
 */
export const deductWalletBalance = async (uid: string, amount: number, orderId: string) => {
  const db = getDB();
  const userRef = doc(db, 'users', uid);

  // Deduct balance
  await updateDoc(userRef, {
    totalSavings: increment(-amount),
    updatedAt: serverTimestamp()
  });

  // Log transaction
  await addDoc(collection(db, 'wallet_transactions'), {
    userId: uid,
    type: 'deducted',
    amount: amount,
    description: `Applied to order ${orderId}`,
    source: 'order',
    createdAt: serverTimestamp()
  });
};

/**
 * Assigns a coupon to a user
 */
export const assignCouponToUser = async (uid: string, coupon: Coupon) => {
  const db = getDB();
  const userCouponsRef = collection(db, 'users', uid, 'coupons');

  await addDoc(userCouponsRef, {
    couponId: coupon.id,
    isScratched: false,
    assignedAt: serverTimestamp(),
    couponData: coupon
  });
};

/**
 * Marks a user's coupon as scratched
 */
export const markCouponScratched = async (uid: string, userCouponId: string) => {
  const db = getDB();
  const userCouponRef = doc(db, 'users', uid, 'coupons', userCouponId);

  await updateDoc(userCouponRef, {
    isScratched: true,
    scratchedAt: serverTimestamp()
  });
};

/**
 * Syncs the local wishlist with Firestore when user logs in.
 */
export const syncWishlistToFirestore = async (uid: string, localWishlist: string[]) => {
  const db = getDB();
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  let mergedWishlist = localWishlist;

  if (userSnap.exists()) {
    const data = userSnap.data() as UserProfile;
    const cloudWishlist = data.wishlist || [];

    // Combine arrays and remove duplicates
    mergedWishlist = Array.from(new Set([...cloudWishlist, ...localWishlist]));
  }

  // Guarantee the user doc exists and has the merged wishlist
  await setDoc(userRef, {
    wishlist: mergedWishlist,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return mergedWishlist;
};

/**
 * Toggle a single item in the Firestore wishlist.
 */
export const toggleWishlistItemInFirestore = async (uid: string, productId: string, isAdding: boolean) => {
  const db = getDB();
  const userRef = doc(db, 'users', uid);

  await setDoc(userRef, {
    wishlist: isAdding ? arrayUnion(productId) : arrayRemove(productId),
    updatedAt: serverTimestamp()
  }, { merge: true });
};
