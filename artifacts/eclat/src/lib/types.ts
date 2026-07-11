// src/lib/types.ts — Firestore document types

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  brand?: string;
  badge?: string;
  rating: number;
  reviews: number;
  description: string;
  images: string[];
  image?: string;
  sizes?: string[];
  colors?: string[];
  variants: string[];
  weight?: string;
  ingredients?: string;
  flavor?: string;
  servingSuggestion?: string;
  allergenInfo?: string;
  shelfLife?: string;
  inStock: boolean;
  stockQuantity?: number;
  featured: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  isOnSale?: boolean;
  reviewCount?: number;
  whatsInTheBox?: string[];
  youtubeUrl?: string;
  youtubeUrls?: string[];
  youtubeVideoId?: string;
  displayOrder?: number;
  // Fashion-specific fields
  collection?: string;
  fabric?: string;
  fit?: string;
  occasion?: string;
  createdAt?: any;
  updatedAt?: any;
  sku?: string;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  image?: string;
  description?: string;
  count?: number;
  displayOrder?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface Brand {
  id: string;
  name: string;
  slug?: string;
  tagline?: string;
  image?: string;
  bg?: string;
  createdAt?: any;
  updatedAt?: any;
  displayOrder?: number;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  cta: string;
  link: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
  sku?: string;
  variant?: string;
}

export interface PromoCode {
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  offerId?: string;
  minOrderAmount?: number;
}

export interface Address {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  district?: string;
  state: string;
  zipCode: string;
}

export interface Announcement {
  id: string;
  text: string;
  active: boolean;
  link?: string;
  order: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface Offer {
  id: string;
  title?: string;
  subtitle?: string;
  code?: string;
  discount?: number;
  type?: 'percentage' | 'fixed';
  minOrderAmount?: number;
  cta?: string;
  badge?: string;
  image?: string;
  order?: number;
  active?: boolean;
  countdown?: { days: number; hours: number; minutes: number };
  bg?: string;
  link?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface MainBanner {
  id: string;
  desktopImage: string;
  mobileImage: string;
  link?: string;
  order: number;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface TestingVideo {
  id: string;
  title: string;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  videoId?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  duration?: string;
  badgeText?: string;
  highlightText?: string;
  isActive: boolean;
  displayOrder: number;
  startDate?: string;
  endDate?: string;
  createdAt?: any;
  updatedAt?: any;
}

// ─── Order Management ───
export type OrderStatus = 'Payment Pending' | 'Placed' | 'Under Verification' | 'Verified' | 'Rejected' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface Order {
  id?: string;
  orderId: string;
  userId?: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  district?: string;
  state: string;
  pincode: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  promoCode?: string;
  paymentMethod: 'Manual UPI' | 'Razorpay' | 'Card';
  transactionId?: string;
  paymentScreenshotUrl?: string;
  orderNote?: string;
  deliveryType?: 'Standard' | 'Express';
  orderStatus: OrderStatus;
  stockReserved?: boolean;
  stockRestored?: boolean;
  reservationExpiresAt?: any;
  stockRestoredAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

// ─── User Profile (Google Auth) ───
export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  lastLoginAt: any;
  createdAt?: any;
}
