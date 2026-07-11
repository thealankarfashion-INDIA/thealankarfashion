import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import SEO from '@/components/seo/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck, CreditCard, Smartphone, AlertTriangle, CheckCircle2, ChevronRight, ArrowLeft, Sparkles, Plus, Paperclip, Package, Share2, Navigation, Ticket, MapPin, Wallet, Truck, Zap, Loader2, XCircle, RefreshCw } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import Navbar from '@/components/layout/Navbar';
import AnnouncementBar from '@/components/home/AnnouncementBar';

import { validatePromoCode, calculateDiscount } from '@/lib/promoCode';
import { getDB, getStorageInstance } from '@/lib/supabase';
import { collection, query, orderBy, onSnapshot, doc, getDocs, where, limit } from '@/lib/supabaseStore';
import { ref, uploadBytes, getDownloadURL } from '@/lib/supabaseStorage';
import { generateOrderId, createOrder, submitPaymentConfirmation, submitRazorpaySuccess, buildUpiLink, releaseOrderStock, releaseExpiredPaymentPendingOrders } from '@/lib/orders';
import { loadRazorpayScript } from '@/lib/razorpay';
import { createRazorpayOrder, createRazorpayPaymentLink, verifyRazorpayPayment, verifyRazorpayPaymentLink } from '@/lib/payments';
import LocationPicker from '@/components/checkout/LocationPicker';
import CheckoutSummary from '@/components/checkout/CheckoutSummary';
import { useAuth } from '@/context/AuthContext';
import { useDelivery } from '@/hooks/useDelivery';
import { getUserProfile, updateUserProfile, addSavings, deductWalletBalance } from '@/lib/user';
import AddressMapModal from '@/components/profile/AddressMapModal';
import { QuickView } from '@/components/shop/QuickView';
import PaymentProgressAnimation from '@/components/payment/PaymentProgressAnimation';
import AnimatedCross from '@/components/payment/AnimatedCross';
const cls = "w-full bg-white/60 border border-[#E8D8D1] rounded-sm px-4 py-3 text-sm text-[#8E5E4F] placeholder:text-[#8E5E4F]/30 focus:outline-none focus:border-[#B47A67] transition-colors";
const lbl = "block text-xs tracking-widest uppercase text-[#8E5E4F]/70 mb-2";
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "";
const DEFAULT_UPI_ID = import.meta.env.VITE_UPI_ID || "";
const DEFAULT_UPI_PAYEE_NAME = import.meta.env.VITE_UPI_PAYEE_NAME || "Thealankar";
const isRazorpayConfigured = true;
const CHECKOUT_DETAILS_STORAGE_KEY = "thealankar_checkout_details";
const RAZORPAY_LINK_RETURN_PARAM = "razorpay_link_return";
const PENDING_RAZORPAY_LINK_KEY = "thealankar_pending_razorpay_link";
const HOSTED_RAZORPAY_HOSTS = new Set(["thealankarfashion-india.github.io", "thealankar.in"]);

type CheckoutDetails = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  state: string;
  zip: string;
};

type PaymentScreenStatus = 'idle' | 'processing' | 'redirecting' | 'verifying' | 'success' | 'failed' | 'cancelled';

const emptyCheckoutDetails: CheckoutDetails = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  city: "",
  district: "",
  state: "",
  zip: "",
};

const checkoutDetailsKey = (uid?: string) => `${CHECKOUT_DETAILS_STORAGE_KEY}:${uid || "guest"}`;
const shouldUseHostedRazorpay = () =>
  typeof window !== "undefined" && HOSTED_RAZORPAY_HOSTS.has(window.location.hostname);

const getRazorpayLinkCallbackUrl = () => {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const url = new URL(`${basePath}/checkout`, window.location.origin);
  url.searchParams.set(RAZORPAY_LINK_RETURN_PARAM, "1");
  return url.toString();
};

const hasCheckoutDetails = (details: CheckoutDetails | null) =>
  Boolean(details?.firstName || details?.lastName || details?.phone || details?.address || details?.city || details?.district || details?.state || details?.zip);

const readSavedCheckoutDetails = (uid?: string): CheckoutDetails | null => {
  try {
    const raw = localStorage.getItem(checkoutDetailsKey(uid)) || (uid ? localStorage.getItem(checkoutDetailsKey()) : null);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutDetails>;
    return {
      ...emptyCheckoutDetails,
      email: parsed.email || "",
      firstName: parsed.firstName || "",
      lastName: parsed.lastName || "",
      phone: parsed.phone || "",
      address: parsed.address || "",
      city: parsed.city || "",
      district: parsed.district || "",
      state: parsed.state || "",
      zip: parsed.zip || "",
    };
  } catch {
    return null;
  }
};

const saveCheckoutDetails = (uid: string | undefined, details: CheckoutDetails) => {
  try {
    localStorage.setItem(checkoutDetailsKey(uid), JSON.stringify(details));
    localStorage.setItem(checkoutDetailsKey(), JSON.stringify(details));
  } catch {
    // Ignore storage failures; the order flow should continue.
  }
};

const mergeCheckoutDetails = (...sources: Array<CheckoutDetails | null | undefined>): CheckoutDetails => {
  return sources.reduce<CheckoutDetails>((merged, source) => {
    if (!source) return merged;
    return {
      email: source.email || merged.email,
      firstName: source.firstName || merged.firstName,
      lastName: source.lastName || merged.lastName,
      phone: source.phone || merged.phone,
      address: source.address || merged.address,
      city: source.city || merged.city,
      district: source.district || merged.district,
      state: source.state || merged.state,
      zip: source.zip || merged.zip,
    };
  }, { ...emptyCheckoutDetails });
};

const checkoutDetailsFromOrder = (order: any): CheckoutDetails => {
  const [firstName = "", ...restName] = String(order.customerName || "").trim().split(/\s+/).filter(Boolean);
  return {
    email: order.email || "",
    firstName,
    lastName: restName.join(" "),
    phone: order.phone || "",
    address: order.address || "",
    city: order.city || "",
    district: order.district || "",
    state: order.state || "",
    zip: order.pincode || "",
  };
};

const checkoutDetailsFromProfileAddress = (profile: any, address: any): CheckoutDetails | null => {
  if (!address) return null;
  const nameParts = String(address.name || profile.displayName || "").trim().split(/\s+/).filter(Boolean);
  const street = String(address.street || "").trim();
  const fullAddress = String(address.fullAddress || "").trim();
  const addressLine = street && fullAddress && street !== fullAddress ? `${street}, ${fullAddress}` : street || fullAddress;
  return {
    email: profile.email || "",
    firstName: nameParts[0] || "",
    lastName: nameParts.slice(1).join(" "),
    phone: address.phone || profile.phoneNumber || "",
    address: addressLine,
    city: address.city || "",
    district: address.district || "",
    state: address.state || "",
    zip: address.zipCode || "",
  };
};

const getGPayLink = (upiLink: string) => {
  const query = upiLink.split("?")[1] || "";
  return query ? `tez://upi/pay?${query}` : upiLink;
};

const openUpiLink = (upiLink: string, app: "gpay" | "upi") => {
  if (!upiLink) return;
  window.location.href = app === "gpay" ? getGPayLink(upiLink) : upiLink;
};

const FallbackImage = ({ src, alt, className }: { src?: string; alt?: string; className?: string }) => {
  const [error, setError] = useState(false);

  if (error || !src || src.includes('placehold')) {
    return (
      <div className={`flex items-center justify-center bg-[#FBF6F3] text-[#8E5E4F] ${className}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-1/3 h-1/3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setError(true)} />;
};

function Field({ label, error, ...props }: any) {
  return (
    <div>
      <label className={lbl}>{label}{props.required && <span className="text-[#B47A67] ml-1">*</span>}</label>
      <input className={`${cls} ${error ? 'border-red-400' : ''}`} {...props} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function SectionHead({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <span className="font-serif text-4xl text-[#E4C7BC] leading-none">{n}</span>
      <div><h2 className="font-serif text-xl text-[#8E5E4F]">{title}</h2><div className="w-8 h-px bg-[#C8927D] mt-1" /></div>
    </div>
  );
}

// ─── Simple Confetti (Paper Effect) ───
const SimpleConfetti = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#8E5E4F', '#B47A67', '#D4AF37', '#E8D8D1', '#F7F1EE', '#C8927D'];
    const particles: any[] = [];
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * -1,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }
    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rotation += p.rotationSpeed;
        if (p.y > canvas.height * 0.8) p.opacity -= 0.02;
        if (p.opacity <= 0) continue;
        alive = true; ctx.save(); ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180); ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      }
      if (alive) animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 z-[1000] pointer-events-none" />;
};

function RazorpayStatusScreen({
  status,
  amount,
  orderId,
  message,
  onRetry,
  onBackToCheckout,
}: {
  status: Exclude<PaymentScreenStatus, 'idle'>;
  amount: number;
  orderId?: string;
  message?: string;
  onRetry: () => void;
  onBackToCheckout: () => void;
}) {
  const isLoading = status === 'processing' || status === 'redirecting' || status === 'verifying';
  const isSuccess = status === 'success';
  const isCancelled = status === 'cancelled';
  const Icon = isLoading ? Loader2 : isSuccess ? CheckCircle2 : isCancelled ? XCircle : AlertTriangle;
  const tone = isSuccess ? 'text-green-600' : isCancelled ? 'text-[#B47A67]' : isLoading ? 'text-[#B47A67]' : 'text-red-600';
  const ring = isSuccess ? 'bg-green-50 border-green-100' : isCancelled ? 'bg-[#FBF6F3] border-[#E8D8D1]' : isLoading ? 'bg-[#FBF6F3] border-[#E8D8D1]' : 'bg-red-50 border-red-100';
  const title =
    status === 'processing' ? 'Preparing secure payment' :
    status === 'redirecting' ? 'Redirecting to Razorpay' :
    status === 'verifying' ? 'Verifying your payment' :
    status === 'success' ? 'Payment successful' :
    status === 'cancelled' ? 'Payment cancelled' :
    'Payment failed';
  const body = message ||
    (status === 'processing' ? 'Please wait while we create your secure Razorpay session.' :
    status === 'redirecting' ? 'You will be taken to Razorpay in a moment. Please do not refresh this page.' :
    status === 'verifying' ? 'We are confirming the payment with Razorpay. This usually takes a few seconds.' :
    status === 'success' ? 'Your order is confirmed. Opening your order confirmation now.' :
    status === 'cancelled' ? 'No payment was captured. You can safely retry from checkout.' :
    'No payment was captured. Please retry or choose another payment option.');

  return (
    <div className="fixed inset-0 z-[220] bg-[#F7F1EE] flex items-center justify-center px-4">
      <SEO title="Payment Status" noindex />
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md rounded-[24px] border border-[#E8D8D1] bg-white p-7 text-center shadow-[0_18px_60px_rgba(142,94,79,0.16)]"
      >
        <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border ${ring}`}>
          <Icon className={`h-10 w-10 ${tone} ${isLoading ? 'animate-spin' : ''}`} />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#B47A67]">Razorpay Secure Checkout</p>
        <h1 className="mt-3 font-serif text-3xl text-[#8E5E4F]">{title}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#8E5E4F]/65">{body}</p>

        <div className="mt-6 rounded-2xl border border-[#E8D8D1]/70 bg-[#FBF6F3] px-4 py-3 text-left">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E5E4F]/50">Amount</span>
            <span className="text-lg font-black text-[#8E5E4F]">Rs. {amount.toFixed(2)}</span>
          </div>
          {orderId && (
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E5E4F]/50">Order</span>
              <span className="truncate text-xs font-bold text-[#8E5E4F]">{orderId}</span>
            </div>
          )}
        </div>

        {!isLoading && !isSuccess && (
          <div className="mt-6 grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B47A67] px-4 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-[#B47A67]/20 transition-colors hover:bg-[#8E5E4F]"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Payment
            </button>
            <button
              type="button"
              onClick={onBackToCheckout}
              className="rounded-xl border border-[#E8D8D1] bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8E5E4F] transition-colors hover:border-[#B47A67]"
            >
              Back to Checkout
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}





export default function Checkout() {
  const { items, cartTotal, updateQuantity, removeFromCart, clearCart, addToCart } = useCart();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { calculateDelivery, settings: deliverySettings } = useDelivery();

  // Promo
  const [promoInput, setPromoInput] = useState('');
  const [promoCode, setPromoCode] = useState<any>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [availableOffers, setAvailableOffers] = useState<any[]>([]);
  const [freeProduct, setFreeProduct] = useState<any>(null);

  // Wallet
  const [useWallet, setUseWallet] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletUsagePercent, setWalletUsagePercent] = useState(50);

  // Store settings & related products
  const [storeSettings, setStoreSettings] = useState({ minOrderAmount: 0, upiId: DEFAULT_UPI_ID, upiPayeeName: DEFAULT_UPI_PAYEE_NAME });
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  // Form & Address Modal
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', phone: '', address: '', city: '', district: '', state: '', zip: '', saveInfo: false });
  const [savedCheckoutDetails, setSavedCheckoutDetails] = useState<CheckoutDetails | null>(null);
  const [autoFilledDetails, setAutoFilledDetails] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locationSet, setLocationSet] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  // Payment & Delivery Option
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'upi'>(isRazorpayConfigured ? 'razorpay' : 'upi');
  const [deliveryType, setDeliveryType] = useState<'Standard' | 'Express'>('Standard');
  const [transactionId, setTransactionId] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isUpiPaymentOpen, setIsUpiPaymentOpen] = useState(false);
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  // Status
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentScreen, setPaymentScreen] = useState<PaymentScreenStatus>('idle');
  const [paymentScreenMessage, setPaymentScreenMessage] = useState('');
  const [step, setStep] = useState<'form' | 'success' | 'failed'>('form');
  const [failurePhase] = useState<'idle' | 'progress' | 'cross'>('idle');
  const [orderId, setOrderId] = useState('');
  const [qvProduct, setQvProduct] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showGoBackModal, setShowGoBackModal] = useState(false);
  const hasGuardEntry = useRef(false);
  const stockReleaseTimers = useRef<Record<string, number>>({});

  const discount = promoCode ? calculateDiscount(cartTotal, promoCode) : 0;
  const subtotalAfterDiscount = Math.max(0, cartTotal - discount);
  const maxWalletUsage = walletBalance > 0 ? (subtotalAfterDiscount * (walletUsagePercent / 100)) : 0;
  const walletDiscount = useWallet ? Math.min(walletBalance, maxWalletUsage) : 0;
  const baseSubtotal = Math.max(0, subtotalAfterDiscount - walletDiscount);
  const standardDelivery = calculateDelivery(baseSubtotal, 'Standard');
  const expressDelivery = calculateDelivery(baseSubtotal, 'Express');
  const deliveryCharge = deliveryType === 'Express' ? expressDelivery : standardDelivery;
  const total = baseSubtotal + deliveryCharge;
  const isBelowMin = storeSettings.minOrderAmount > 0 && cartTotal < storeSettings.minOrderAmount;
  const resolvedUpiId = storeSettings.upiId.trim();
  const resolvedUpiPayeeName = storeSettings.upiPayeeName.trim() || DEFAULT_UPI_PAYEE_NAME;
  const upiLink = resolvedUpiId ? buildUpiLink(resolvedUpiId, resolvedUpiPayeeName, total, 'ODR') : '';

  const clearStockReleaseTimer = useCallback((oid: string) => {
    const timerId = stockReleaseTimers.current[oid];
    if (timerId) {
      window.clearTimeout(timerId);
      delete stockReleaseTimers.current[oid];
    }
  }, []);

  const scheduleStockRelease = useCallback((oid: string) => {
    clearStockReleaseTimer(oid);
    stockReleaseTimers.current[oid] = window.setTimeout(() => {
      void releaseOrderStock(oid).catch(console.error);
      delete stockReleaseTimers.current[oid];
    }, 5 * 60 * 1000);
  }, [clearStockReleaseTimer]);

  const showPaymentScreen = useCallback((status: PaymentScreenStatus, message = '') => {
    setPaymentScreen(status);
    setPaymentScreenMessage(message);
  }, []);

  const returnToCheckout = useCallback(() => {
    setPaymentScreen('idle');
    setPaymentScreenMessage('');
    setError('');
    setIsProcessing(false);
  }, []);

  const goToConfirmationSoon = useCallback(() => {
    window.setTimeout(() => setLocation('/order-confirmation'), 1200);
  }, [setLocation]);

  useEffect(() => {
    void releaseExpiredPaymentPendingOrders().catch(console.error);
    return () => {
      Object.values(stockReleaseTimers.current).forEach((timerId) => window.clearTimeout(timerId));
      stockReleaseTimers.current = {};
    };
  }, []);

  const currentCheckoutDetails = useCallback((): CheckoutDetails => ({
    email: form.email.trim(),
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    district: form.district.trim(),
    state: form.state.trim(),
    zip: form.zip.trim(),
  }), [form.address, form.city, form.district, form.email, form.firstName, form.lastName, form.phone, form.state, form.zip]);

  const applySavedCheckoutDetails = useCallback((details: CheckoutDetails) => {
    setForm(p => ({
      ...p,
      ...details,
      saveInfo: true,
    }));
    setErrors({});
    setAutoFilledDetails(true);
  }, []);

  const rememberCurrentDetailsLocally = useCallback(() => {
    const details = currentCheckoutDetails();
    if (!hasCheckoutDetails(details)) return;
    saveCheckoutDetails(user?.uid, details);
    setSavedCheckoutDetails(details);
  }, [currentCheckoutDetails, user?.uid]);

  const persistCurrentCheckoutDetails = useCallback(async () => {
    const details = currentCheckoutDetails();
    saveCheckoutDetails(user?.uid, details);
    setSavedCheckoutDetails(details);
    setAutoFilledDetails(true);

    if (!user) return;

    await updateUserProfile(user.uid, {
      displayName: `${details.firstName} ${details.lastName}`.trim(),
      phoneNumber: details.phone,
      address: {
        id: 'default',
        label: 'Home',
        name: `${details.firstName} ${details.lastName}`.trim(),
        phone: details.phone,
        street: details.address,
        fullAddress: details.address,
        city: details.city,
        district: details.district,
        state: details.state,
        zipCode: details.zip,
        country: 'India'
      }
    }).catch(console.error);
  }, [currentCheckoutDetails, user]);

  useEffect(() => {
    if (authLoading || !user) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get(RAZORPAY_LINK_RETURN_PARAM) !== "1") return;

    let pending: { orderId?: string; discount?: number; walletDiscount?: number } = {};
    try {
      pending = JSON.parse(sessionStorage.getItem(PENDING_RAZORPAY_LINK_KEY) || "{}");
    } catch {
      pending = {};
    }

    const payload = {
      razorpay_payment_id: params.get("razorpay_payment_id") || "",
      razorpay_payment_link_id: params.get("razorpay_payment_link_id") || "",
      razorpay_payment_link_reference_id: params.get("razorpay_payment_link_reference_id") || "",
      razorpay_payment_link_status: params.get("razorpay_payment_link_status") || "",
      razorpay_signature: params.get("razorpay_signature") || "",
    };

    if (!Object.values(payload).every(Boolean)) {
      if (pending.orderId) void releaseOrderStock(pending.orderId).catch(console.error);
      setOrderId(pending.orderId || "");
      showPaymentScreen('cancelled', 'Payment was cancelled or not completed. No payment was captured. You can retry safely.');
      setIsProcessing(false);
      return;
    }

    let cancelled = false;
    const verifyHostedPayment = async () => {
      setIsProcessing(true);
      setOrderId(payload.razorpay_payment_link_reference_id);
      showPaymentScreen('verifying');
      setError("");
      try {
        const result = await verifyRazorpayPaymentLink(payload);
        if (cancelled) return;

        const oid = result.appOrderId || payload.razorpay_payment_link_reference_id;
        sessionStorage.removeItem(PENDING_RAZORPAY_LINK_KEY);
        sessionStorage.setItem("last_order_id", oid);
        clearStockReleaseTimer(oid);
        if (pending.orderId === oid) {
          if ((pending.discount || 0) > 0) await addSavings(user.uid, pending.discount || 0).catch(console.error);
          if ((pending.walletDiscount || 0) > 0) await deductWalletBalance(user.uid, pending.walletDiscount || 0, oid).catch(console.error);
        }
        await persistCurrentCheckoutDetails();
        clearCart();
        setOrderId(oid);
        showPaymentScreen('success');
        goToConfirmationSoon();
      } catch (err: any) {
        if (!cancelled) {
          const message = err.message || "Payment verification failed. Please contact support.";
          if (pending.orderId) void releaseOrderStock(pending.orderId).catch(console.error);
          setError(message);
          showPaymentScreen('failed', message);
          setIsProcessing(false);
        }
      }
    };

    void verifyHostedPayment();
    return () => {
      cancelled = true;
    };
  }, [authLoading, clearCart, clearStockReleaseTimer, goToConfirmationSoon, persistCurrentCheckoutDetails, showPaymentScreen, user]);

  useEffect(() => {
    if (authLoading || user) return;
    const nextPath = `/checkout${window.location.search}`;
    sessionStorage.setItem('thealankar_post_auth_redirect', nextPath);
    setLocation(`/profile?next=${encodeURIComponent(nextPath)}`);
  }, [authLoading, user, setLocation]);

  useEffect(() => {
    try {
      const db = getDB();
      const unsub1 = onSnapshot(doc(db, 'settings', 'storeSettings'), snap => {
        if (snap.exists()) {
          const d = snap.data();
          setStoreSettings({
            minOrderAmount: d.minOrderAmount || 0,
            upiId: d.upiId || DEFAULT_UPI_ID,
            upiPayeeName: d.upiPayeeName || DEFAULT_UPI_PAYEE_NAME,
          });
        }
      });
      const q = query(collection(db, 'offers'), orderBy('order', 'asc'));
      const unsub2 = onSnapshot(q, snap => setAvailableOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((o: any) => o.active && o.code)));

      const qProd = query(collection(db, 'products'), limit(12));
      const unsub3 = onSnapshot(qProd, snap => {
        setRelatedProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((product: any) => {
          const image = product.images?.[0] || product.image;
          const hasStock = product.inStock !== false && (product.stockQuantity === undefined || Number(product.stockQuantity) > 0);
          return Boolean(product.id && product.name && Number(product.price) > 0 && image && hasStock);
        }));
      });

      return () => { unsub1(); unsub2(); unsub3(); };
    } catch { return undefined; }
  }, []);

  // Best offer logic for abandonment modal
  const eligibleOffers = useMemo(() => {
    return availableOffers.filter(o => !o.minOrderAmount || cartTotal >= o.minOrderAmount);
  }, [availableOffers, cartTotal]);

  const bestOffer = useMemo(() => {
    if (eligibleOffers.length === 0) return null;
    let best = null;
    let maxSaving = 0;
    for (const o of eligibleOffers) {
      const s = o.type === 'percentage' ? (cartTotal * o.discount) / 100 : o.discount;
      if (s > maxSaving) { maxSaving = s; best = o; }
    }
    return best;
  }, [eligibleOffers, cartTotal]);

  const checkoutProductIds = useMemo(() => new Set(items.map(item => item.productId)), [items]);
  const visibleRelatedProducts = useMemo(
    () => relatedProducts.filter(product => !checkoutProductIds.has(product.id)).slice(0, 8),
    [checkoutProductIds, relatedProducts]
  );

  const addRelatedProductToCart = useCallback((product: any) => {
    const image = product.images?.[0] || product.image || '';
    addToCart({
      productId: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      image,
      color: '',
      size: product.sizes?.[0] || 'Single',
      quantity: 1,
      rating: product.rating,
      reviews: product.reviews || product.reviewCount || 0,
      originalPrice: product.originalPrice,
      sku: product.sku || '',
      maxQuantity: product.stockQuantity,
    });
  }, [addToCart]);



  // Intercept back button
  useEffect(() => {
    if (bestOffer && !promoCode && step === 'form' && !hasGuardEntry.current) {
      window.history.pushState({ checkoutGuard: true }, '', '');
      hasGuardEntry.current = true;
    }
  }, [bestOffer, promoCode, step]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (step !== 'form') return;
      if (bestOffer && !promoCode) {
        window.history.pushState({ checkoutGuard: true }, '', '');
        setShowGoBackModal(true);
      } else {
        hasGuardEntry.current = false;
        setLocation('/shop');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [bestOffer, promoCode, step, setLocation]);

  const actuallyGoBack = () => {
    hasGuardEntry.current = false;
    setShowGoBackModal(false);
    setLocation('/shop');
  };

  // Pre-fill form with user profile
  useEffect(() => {
    if (user) {
      const loadProfile = async () => {
        try {
          const savedDetails = readSavedCheckoutDetails(user.uid);
          if (hasCheckoutDetails(savedDetails)) {
            setSavedCheckoutDetails(savedDetails);
          }

          const profile = await getUserProfile(user.uid, user.email || '', user.displayName || '');
          const defaultAddress = profile.savedAddresses?.find(a => a.isDefault)
            || (profile.savedAddresses && profile.savedAddresses.length > 0 ? profile.savedAddresses[0] : undefined);
          const profileAddress = profile.address || defaultAddress;
          let latestOrderDetails: CheckoutDetails | null = null;
          try {
            const orderSnap = await getDocs(query(
              collection(getDB(), 'orders'),
              where('userId', '==', user.uid),
              orderBy('createdAt', 'desc'),
              limit(1)
            ));
            const latestOrder = orderSnap.docs[0]?.data();
            latestOrderDetails = latestOrder ? checkoutDetailsFromOrder(latestOrder) : null;
          } catch (err) {
            console.error("Failed to load latest checkout details", err);
          }
          const profileDetails = checkoutDetailsFromProfileAddress(profile, profileAddress);
          const source = mergeCheckoutDetails(
            latestOrderDetails,
            profileDetails,
            {
              ...emptyCheckoutDetails,
              email: profile.email || '',
              firstName: profile.displayName?.split(' ')[0] || '',
              lastName: profile.displayName?.split(' ').slice(1).join(' ') || '',
              phone: profile.phoneNumber || '',
            },
            savedDetails
          );
          if (hasCheckoutDetails(source)) {
            setSavedCheckoutDetails(source);
            saveCheckoutDetails(user.uid, source);
          }

          setForm(p => ({
            ...p,
            email: p.email || source?.email || profile.email || '',
            firstName: p.firstName || source?.firstName || profile.displayName?.split(' ')[0] || '',
            lastName: p.lastName || source?.lastName || profile.displayName?.split(' ').slice(1).join(' ') || '',
            phone: p.phone || source?.phone || profile.phoneNumber || profileAddress?.phone || '',
            address: p.address || source?.address || '',
            city: p.city || source?.city || profileAddress?.city || '',
            district: p.district || source?.district || profileAddress?.district || '',
            state: p.state || source?.state || profileAddress?.state || '',
            zip: p.zip || source?.zip || profileAddress?.zipCode || '',
            saveInfo: p.saveInfo || hasCheckoutDetails(source)
          }));
          if (hasCheckoutDetails(source)) setAutoFilledDetails(true);
          setWalletBalance(profile.totalSavings || 0);
          setWalletUsagePercent(profile.walletUsagePercent || 50);
        } catch (err) {
          console.error("Failed to load user profile", err);
        }
      };
      loadProfile();
    }
  }, [user]);

  const handleApplyPromo = useCallback(async (code: string = promoInput) => {
    setPromoError(''); setPromoLoading(true);
    try {
      const result = await validatePromoCode(code, user?.uid);
      if (!result) { setPromoError('Invalid or expired promo code'); setPromoCode(null); setFreeProduct(null); }
      else if (result.minOrderAmount && cartTotal < result.minOrderAmount) { setPromoError(`Minimum order ₹${result.minOrderAmount} required`); setPromoCode(null); setFreeProduct(null); }
      else {
        // Handle Free Gift
        if (result.type === 'free_gift' && result.freeProductId) {
          const db = getDB();
          const { getDoc } = await import('@/lib/supabaseStore');
          const prodSnap = await getDoc(doc(db, 'products', result.freeProductId));
          if (prodSnap.exists()) {
            setFreeProduct({ id: prodSnap.id, ...prodSnap.data() });
          } else {
            setPromoError('Free gift product is no longer available.');
            setPromoCode(null);
            setFreeProduct(null);
            setPromoLoading(false);
            return;
          }
        } else {
          setFreeProduct(null);
        }

        setPromoCode(result);
        setPromoInput(code);
        setPromoError('');
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    } catch { setPromoError('Failed to validate. Try again.'); setFreeProduct(null); }
    setPromoLoading(false);
  }, [promoInput, user?.uid, cartTotal]);

  // Auto-apply promo from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const promo = params.get('promo');
    if (promo && !promoCode && !promoLoading) {
      handleApplyPromo(promo);
    }
  }, [handleApplyPromo, promoCode, promoLoading]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [k]: val }));
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.trim()) e.email = 'Required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.address.trim()) e.address = 'Required';
    if (!form.city.trim()) e.city = 'Required';
    if (!form.district.trim()) e.district = 'Required';
    if (!form.state.trim()) e.state = 'Required';
    if (!form.zip.trim()) e.zip = 'Required';
    return e;
  };

  const handleRazorpay = async (oid: string) => {
    setOrderId(oid);
    if (!isRazorpayConfigured) {
      const message = 'Online payment is not configured yet. Please use UPI payment.';
      setError(message);
      showPaymentScreen('failed', message);
      setIsProcessing(false);
      return;
    }
    showPaymentScreen('processing');
    if (shouldUseHostedRazorpay()) {
      sessionStorage.setItem(PENDING_RAZORPAY_LINK_KEY, JSON.stringify({
        orderId: oid,
        discount,
        walletDiscount,
      }));
      const paymentLink = await createRazorpayPaymentLink(oid, getRazorpayLinkCallbackUrl());
      showPaymentScreen('redirecting');
      await new Promise(resolve => window.setTimeout(resolve, 500));
      window.location.assign(paymentLink.shortUrl);
      return;
    }
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      const message = 'Failed to load payment gateway. Please check your connection and retry.';
      setError(message);
      showPaymentScreen('failed', message);
      setIsProcessing(false);
      return;
    }
    const paymentOrder = await createRazorpayOrder(oid);
    const razorpayKey = RAZORPAY_KEY_ID || paymentOrder.keyId;
    if (!razorpayKey) {
      const message = 'Razorpay key is missing. Please add the public Razorpay Key ID before accepting online payment.';
      setError(message);
      showPaymentScreen('failed', message);
      setIsProcessing(false);
      return;
    }
    const options = {
      key: razorpayKey,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      order_id: paymentOrder.razorpayOrderId,
      name: 'Thealankar', description: `Order ${oid}`,
      handler: async (response: any) => {
        showPaymentScreen('verifying');
        try {
          await verifyRazorpayPayment({ appOrderId: oid, ...response });
          clearStockReleaseTimer(oid);
          sessionStorage.setItem('last_order_id', oid);
          if (user) {
            if (discount > 0) await addSavings(user.uid, discount).catch(console.error);
            if (walletDiscount > 0) await deductWalletBalance(user.uid, walletDiscount, oid).catch(console.error);
            await persistCurrentCheckoutDetails();
          }
          setOrderId(oid);
          clearCart();
          showPaymentScreen('success');
          goToConfirmationSoon();
        } catch (err: any) {
          const message = err.message || 'Payment verification failed. Please try again or contact support.';
          setError(message);
          showPaymentScreen('failed', message);
          setIsProcessing(false);
        }
      },
      prefill: { name: `${form.firstName} ${form.lastName}`, email: form.email },
      hidden: { contact: true },
      theme: { color: '#B47A67' },
      modal: {
        ondismiss: () => {
          const message = 'Payment cancelled. No payment was captured. You can retry safely.';
          void releaseOrderStock(oid).catch(console.error);
          setError(message);
          showPaymentScreen('cancelled', message);
          setIsProcessing(false);
        }
      }
    };
    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', (r: any) => {
      const message = r.error.description || 'Payment failed. Please retry.';
      void releaseOrderStock(oid).catch(console.error);
      setError(message);
      showPaymentScreen('failed', message);
      rzp.close();
      setIsProcessing(false);
    });
    rzp.open();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBelowMin || items.length === 0) return;
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    rememberCurrentDetailsLocally();
    const selectedPaymentMethod = paymentMethod === 'upi' && !resolvedUpiId ? 'razorpay' : paymentMethod;
    if (selectedPaymentMethod === 'upi') {
      if (!resolvedUpiId) {
        setError('UPI ID is not configured. Add the store UPI ID in admin settings before accepting UPI payment.');
        paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      if (!isUpiPaymentOpen) {
        setError('');
        setIsUpiPaymentOpen(true);
        setTimeout(() => paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
        return;
      }

      if (!transactionId.trim()) {
        setError('Transaction ID is required after payment.');
        paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    setIsProcessing(true); setError('');
    if (selectedPaymentMethod === 'razorpay') showPaymentScreen('processing');
    try {
      const oid = generateOrderId();
      const orderItems = items.map(i => ({ id: i.productId, name: i.name, price: i.price, image: i.image || '', sku: i.sku || '', size: i.size || 'Single', color: i.color || '', quantity: i.quantity }));

      if (freeProduct) {
        orderItems.push({
          id: freeProduct.id,
          name: `[FREE GIFT] ${freeProduct.name}`,
          price: 0,
          image: freeProduct.images?.[0] || freeProduct.image || '',
          sku: freeProduct.sku || 'FREE-GIFT',
          size: 'Standard',
          color: '',
          quantity: 1
        });
      }

      await createOrder({
        orderId: oid,
        userId: user?.uid || undefined,
        customerName: `${form.firstName} ${form.lastName}`,
        email: form.email, phone: form.phone, address: form.address,
        city: form.city, district: form.district, state: form.state, pincode: form.zip,
        items: orderItems as any, subtotal: cartTotal, discount: discount + walletDiscount, shipping: deliveryCharge, total,
        promoCode: promoCode?.code || undefined,
        paymentMethod: selectedPaymentMethod === 'upi' ? 'Manual UPI' : 'Razorpay',
        deliveryType,
        orderStatus: 'Payment Pending',
        orderNote: orderNote.trim() || undefined,
      });
      scheduleStockRelease(oid);
      if (selectedPaymentMethod === 'razorpay') {
        await handleRazorpay(oid);
      } else {
        let screenshotUrl = '';
        if (screenshotFile) {
          try {
            const storage = getStorageInstance();
            const storageRef = ref(storage, `payment-screenshots/${oid}-${Date.now()}.jpg`);
            await uploadBytes(storageRef, screenshotFile);
            screenshotUrl = await getDownloadURL(storageRef);
          } catch { /* ignore */ }
        }
        await submitPaymentConfirmation(oid, transactionId.trim(), screenshotUrl);
        clearStockReleaseTimer(oid);
        sessionStorage.setItem('last_order_id', oid);
        if (user) {
          if (discount > 0) await addSavings(user.uid, discount).catch(console.error);
          if (walletDiscount > 0) await deductWalletBalance(user.uid, walletDiscount, oid).catch(console.error);
          await persistCurrentCheckoutDetails();
        }
        setOrderId(oid); clearCart(); setLocation('/order-confirmation');
      }
    } catch (err: any) {
      const message = err.message || 'Failed to start payment. Please retry.';
      setError(message);
      if (selectedPaymentMethod === 'razorpay') showPaymentScreen('failed', message);
      setIsProcessing(false);
    }
  };

  if (paymentScreen !== 'idle') {
    return (
      <RazorpayStatusScreen
        status={paymentScreen}
        amount={total}
        orderId={orderId}
        message={paymentScreenMessage || error}
        onRetry={() => {
          setPaymentScreen('idle');
          setPaymentScreenMessage('');
          setError('');
          setIsProcessing(false);
          paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        onBackToCheckout={returnToCheckout}
      />
    );
  }

  if (failurePhase === 'progress') {
    return <PaymentProgressAnimation amount={total} status="error" />;
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#F7F1EE] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8E5E4F]/20 border-t-[#8E5E4F] rounded-full animate-spin" />
      </div>
    );
  }

  if (failurePhase === 'cross') {
    return (
      <div className="fixed inset-0 bg-white z-[200] flex flex-col items-center justify-center">
        <AnimatedCross />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-6 text-center"
        >
          <h2 className="text-xl md:text-2xl font-bold text-[#EF4444] tracking-tight">Payment of ₹{total.toLocaleString()} failed</h2>
        </motion.div>
      </div>
    );
  }

  // ── Success Screen ──────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#F7F1EE]">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen px-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center bg-white border border-[#E8D8D1] rounded-sm p-10 shadow-lg">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h1 className="font-serif text-3xl text-[#8E5E4F] mb-3">Order Placed!</h1>
            <p className="text-[#8E5E4F]/60 text-sm mb-2">Your order <strong>{orderId}</strong> has been placed successfully.</p>
            <p className="text-[#8E5E4F]/50 text-xs mb-8">{paymentMethod === 'upi' ? 'We are verifying your payment. You will receive a confirmation shortly.' : 'Your payment was successful.'}</p>
            <Link href="/shop"><button className="w-full py-3.5 bg-[#B47A67] text-white text-sm tracking-widest uppercase hover:bg-[#A86F5C] transition-colors">Continue Shopping</button></Link>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Failed Screen ───────────────────────────────────────────────
  if (step === 'failed') {
    return (
      <div className="min-h-screen bg-[#F7F1EE]">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen px-6">
          <div className="max-w-md w-full text-center bg-white border border-[#E8D8D1] rounded-sm p-10 shadow-lg">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="font-serif text-3xl text-[#8E5E4F] mb-3">Payment Failed</h1>
            <p className="text-[#8E5E4F]/60 text-sm mb-8">{error || 'Something went wrong. Please try again.'}</p>
            <button onClick={() => { setStep('form'); setError(''); }} className="w-full py-3.5 bg-[#B47A67] text-white text-sm tracking-widest uppercase hover:bg-[#A86F5C] transition-colors">Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Checkout Form ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F7F1EE] pb-[100px] md:pb-[120px]">
      <SEO title="Checkout" noindex />
      {showConfetti && <SimpleConfetti />}

      {/* Don't Go Back Modal */}
      <AnimatePresence>
        {showGoBackModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowGoBackModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Themed header */}
              <div className="bg-gradient-to-b from-[#F7F1EE] to-white pt-8 pb-4 px-6 border-b border-[#E8D8D1]/30">
                <div className="flex justify-center mb-4">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-[#B47A67] bg-[#B47A67]/10 px-3 py-1.5 rounded-full border border-[#B47A67]/20">Exclusively for you</span>
                </div>
                <div className="flex justify-center mb-4">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                    className="w-16 h-16 bg-white border border-[#E8D8D1]/50 rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(180,122,103,0.1)]"
                  >
                    <svg className="w-8 h-8 text-[#B47A67]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                  </motion.div>
                </div>

                <h2 className="text-xl font-black text-[#8E5E4F] text-center tracking-tight">Wait! Don't Go Back</h2>
                <motion.p
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-2xl font-black text-[#B47A67] text-center mt-2 tracking-tight"
                >
                  Get ₹{bestOffer?.type === 'fixed'
                    ? bestOffer.discount
                    : Math.round((cartTotal * (bestOffer?.discount || 0)) / 100)
                  } OFF
                </motion.p>
                <p className="text-xs font-medium text-[#8E5E4F]/60 text-center mt-2">Instant savings applied to this order!</p>
              </div>

              {/* Info cards */}
              <div className="px-6 py-5 bg-[#FBF6F3]">
                <div className="flex gap-3">
                  <div className="flex-1 bg-white border border-[#E8D8D1]/50 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                    <div className="w-8 h-8 bg-[#B47A67]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[#B47A67]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[#8E5E4F]/60 tracking-widest mb-0.5">Risk of missing</p>
                      <p className="text-[13px] text-[#B47A67] font-black leading-none">₹{bestOffer?.type === 'fixed'
                        ? bestOffer.discount
                        : Math.round((cartTotal * (bestOffer?.discount || 0)) / 100)
                      } savings</p>
                    </div>
                  </div>
                  <div className="flex-1 bg-white border border-[#E8D8D1]/50 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                    <div className="w-8 h-8 bg-[#8E5E4F]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[#8E5E4F]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[#8E5E4F]/60 tracking-widest mb-0.5">Items may go</p>
                      <p className="text-[13px] text-[#8E5E4F] font-black leading-none">out of stock</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="px-6 pb-6 pt-2 bg-[#FBF6F3] space-y-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { handleApplyPromo(bestOffer.code); setShowGoBackModal(false); }}
                  className="w-full py-4 bg-[#B47A67] hover:bg-[#8E5E4F] text-white font-black uppercase tracking-widest text-sm rounded-xl transition-all shadow-xl shadow-[#B47A67]/20 flex items-center justify-center gap-2"
                >
                  Apply & Save ₹{bestOffer?.type === 'fixed'
                    ? bestOffer.discount
                    : Math.round((cartTotal * (bestOffer?.discount || 0)) / 100)
                  }
                </motion.button>
                <button
                  onClick={actuallyGoBack}
                  className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-[#8E5E4F]/40 hover:text-[#8E5E4F] transition-colors"
                >
                  No thanks, go back
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="md:hidden"><AnnouncementBar /></div>
      <div className="hidden md:block"><Navbar /></div>


      <div className="max-w-6xl mx-auto md:mt-48 md:px-6 pt-4 md:pt-0">

        <form id="checkout-form" onSubmit={handleSubmit} className="md:grid md:grid-cols-12 md:gap-8 items-start">
          {/* LEFT SIDE: Items & Offers */}
          <div className="md:col-span-7 space-y-4">
            {/* TOP HEADER (Mobile App Style) */}
            <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-30 md:static md:rounded-2xl border border-[#E8D8D1]/50 flex items-center justify-between cursor-pointer" onClick={() => setShowAddressModal(true)}>
              <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (bestOffer && !promoCode) {
                      setShowGoBackModal(true);
                    } else {
                      actuallyGoBack();
                    }
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-50 text-[#8E5E4F] shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#8E5E4F]/60 uppercase tracking-wider font-semibold truncate">Delivery in 4-6 Days</p>
                  <h2 className="text-sm font-bold text-[#8E5E4F] flex items-center gap-1 truncate">
                    <span className="truncate">to {form.firstName ? `${form.firstName}'s` : 'Your'} Address</span> <ChevronRight className="w-3 h-3 shrink-0" />
                  </h2>
                  <p className="text-xs text-[#8E5E4F]/60 truncate">{form.address ? `${form.address}, ${form.city}` : 'Add a delivery address'}</p>
                </div>
              </div>
              <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-[#8E5E4F] shrink-0">
                <MapPin className="w-4 h-4" />
              </button>
            </div>

            {/* SAVINGS BANNER */}
            {(discount > 0 || promoCode) && (
              <div className="bg-gradient-to-r from-[#FBF6F3] to-[#F7F1EE] p-3 text-sm font-semibold text-[#B47A67] flex items-center gap-2 border border-[#E8D8D1]/50 md:rounded-2xl">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                </div>
                You saved ₹{discount.toFixed(2)} with offers
              </div>
            )}

            <div className="space-y-4 p-3 md:p-0">
              {/* ITEMS CARD */}
              <div className="bg-white rounded-[20px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E8D8D1]/30">
                <div className="space-y-5">
                  {items.map((item, idx) => (
                    <div key={`${item.productId}-${item.size}-${item.color}-${idx}`} className="flex gap-3">
                      <div className="w-14 h-14 rounded-xl bg-[#FBF6F3] border border-[#E8D8D1] overflow-hidden shrink-0">
                        <FallbackImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className="w-3 h-3 flex items-center justify-center rounded-[3px] border border-green-500 bg-green-50">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          </div>
                          <h3 className="font-bold text-[#8E5E4F] text-sm leading-tight line-clamp-2">{item.name}</h3>
                        </div>
                        <p className="text-[11px] text-[#8E5E4F]/60">{item.size && `Size: ${item.size}`} {item.color && `| Color: ${item.color}`}</p>
                        <p className="text-[11px] text-[#B47A67] font-medium mt-1 cursor-pointer hover:underline">Edit ‣</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {/* Zomato style + - button */}
                        <div className="flex items-center bg-[#FBF6F3] border border-[#B47A67]/30 rounded-lg shadow-sm overflow-hidden h-7">
                          <button type="button" onClick={() => updateQuantity(item.productId, item.color, item.size, item.quantity - 1)} className="w-7 h-full flex items-center justify-center text-[#B47A67] font-medium hover:bg-white transition-colors">−</button>
                          <span className="w-5 text-center text-xs font-bold text-[#8E5E4F]">{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.productId, item.color, item.size, item.quantity + 1)} disabled={item.maxQuantity !== undefined && item.quantity >= item.maxQuantity} className="w-7 h-full flex items-center justify-center text-[#B47A67] font-medium hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">+</button>
                        </div>
                        <p className="text-sm font-semibold text-[#8E5E4F]">₹{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  {freeProduct && (
                    <div className="flex gap-3 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-[#B47A67] text-white text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-bl-lg rounded-tr-xl z-10">
                        Free Gift
                      </div>
                      <div className="w-14 h-14 rounded-xl bg-green-50 border border-green-200 overflow-hidden shrink-0 relative">
                        <FallbackImage src={freeProduct.images?.[0] || freeProduct.image} alt={freeProduct.name} className="w-full h-full object-cover opacity-90 mix-blend-multiply" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className="w-3 h-3 flex items-center justify-center rounded-[3px] border border-[#B47A67] bg-[#B47A67]/10">
                            <Sparkles className="w-2 h-2 text-[#B47A67]" />
                          </div>
                          <h3 className="font-bold text-[#8E5E4F] text-sm leading-tight line-clamp-2">{freeProduct.name}</h3>
                        </div>
                        <p className="text-[11px] text-[#8E5E4F]/60">Enjoy this exclusive free gift on us!</p>
                      </div>
                      <div className="flex flex-col items-end justify-center shrink-0">
                        <p className="text-sm font-black text-green-600 uppercase tracking-wider">Free</p>
                        <p className="text-[10px] text-[#8E5E4F]/40 line-through">₹{freeProduct.price}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Link href="/shop">
                  <button type="button" className="w-full mt-5 py-3 border border-dashed border-[#B47A67]/30 rounded-xl text-sm font-bold text-[#B47A67] flex items-center justify-center gap-2 hover:bg-[#FBF6F3] transition-colors">
                    <Plus className="w-4 h-4" /> Add more items
                  </button>
                </Link>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowNoteInput(v => !v)}
                    className={`shrink-0 flex items-center gap-2 px-4 py-2 border rounded-full text-xs font-medium transition-colors whitespace-nowrap ${showNoteInput || orderNote ? 'bg-[#B47A67]/10 border-[#B47A67] text-[#B47A67]' : 'bg-white border-[#E8D8D1] text-[#8E5E4F] hover:bg-gray-50'
                      }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {orderNote ? 'Note added ✓' : 'Add a note for the store'}
                  </button>
                  {showNoteInput && (
                    <div className="bg-[#FBF6F3] border border-[#E8D8D1] rounded-xl p-3">
                      <label className="text-[10px] uppercase tracking-widest text-[#8E5E4F]/50 font-bold mb-1 block">Note for the Store</label>
                      <textarea
                        value={orderNote}
                        onChange={e => setOrderNote(e.target.value)}
                        placeholder="E.g. Please gift wrap this order, or specific delivery instructions..."
                        rows={3}
                        maxLength={300}
                        className="w-full text-sm text-[#8E5E4F] bg-white border border-[#E8D8D1] rounded-lg px-3 py-2 outline-none focus:border-[#B47A67] resize-none transition-colors placeholder:text-[#8E5E4F]/30"
                      />
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-[#8E5E4F]/40">{orderNote.length}/300</span>
                        <button type="button" onClick={() => setShowNoteInput(false)} className="text-[10px] font-bold text-[#B47A67] hover:underline">Done</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CROSS-SELL CARD */}
              {visibleRelatedProducts.length > 0 && (
              <div className="bg-white rounded-[20px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E8D8D1]/30 overflow-hidden">
                <h3 className="font-bold text-[#8E5E4F] text-sm mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#B47A67]" /> Complete your look with
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                  {visibleRelatedProducts.map((product, idx) => (
                    <div key={product.id} className="group relative">
                      <Link href={`/product/${product.id}`} className={`w-[130px] md:w-[160px] shrink-0 border border-[#E8D8D1]/30 rounded-2xl overflow-hidden ${['bg-[#F2F8FB]', 'bg-[#FDF6E3]', 'bg-[#EAF5F2]', 'bg-[#F9F0F4]'][idx % 4]} block transition-all hover:shadow-md`}>
                        <div className="h-[130px] md:h-[160px] relative overflow-hidden">
                          <FallbackImage
                            src={product.images?.[0] || product.image}
                            alt={product.name}
                            className="w-full h-full object-cover mix-blend-multiply opacity-90 group-hover:scale-110 transition-transform duration-700"
                          />
                        </div>
                        <div className="p-3 bg-white/40 backdrop-blur-sm">
                          <h4 className="text-[11px] font-bold text-[#8E5E4F] line-clamp-1">{product.name}</h4>
                          <p className="text-[10px] font-black text-[#B47A67] mt-1">₹{product.price}</p>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addRelatedProductToCart(product);
                        }}
                        className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm text-[#B47A67] flex items-center justify-center font-bold hover:bg-[#B47A67] hover:text-white transition-all z-10 border border-[#E8D8D1]/50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              )}

              {/* OFFERS CARD */}
              <div className="bg-white rounded-[20px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E8D8D1]/30">
                {promoCode ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#8E5E4F]">'{promoCode.code}' applied</p>
                        <p className="text-xs text-[#8E5E4F]/60">₹{discount.toFixed(2)} savings</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setPromoCode(null)} className="text-xs font-bold text-red-500 uppercase tracking-widest hover:underline">Remove</button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <Ticket className="w-5 h-5 text-[#B47A67]" />
                      <h3 className="font-bold text-[#8E5E4F] text-sm">Offers & Benefits</h3>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())} placeholder="Enter promo code" className="flex-1 bg-[#FBF6F3] border border-[#E8D8D1] rounded-xl px-4 py-3 text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors placeholder:text-[#8E5E4F]/40 uppercase" />
                      <button type="button" onClick={() => handleApplyPromo()} disabled={!promoInput || promoLoading} className="px-6 bg-white border border-[#B47A67] text-[#B47A67] rounded-xl text-xs font-bold uppercase tracking-widest disabled:opacity-50 hover:bg-[#FBF6F3] transition-colors">
                        {promoLoading ? '...' : 'Apply'}
                      </button>
                    </div>
                    {promoError && <p className="text-red-500 text-xs mt-2">{promoError}</p>}
                    {availableOffers.length > 0 && !promoCode && (
                      <div className="mt-4 space-y-3">
                        {availableOffers.map((offer, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 border border-[#E8D8D1]/50 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleApplyPromo(offer.code)}>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#B47A67]/10 flex items-center justify-center text-[#B47A67]">
                                <Ticket className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-[#8E5E4F]">{offer.title}</p>
                                <p className="text-xs text-[#8E5E4F]/60">Save with '{offer.code}'</p>
                              </div>
                            </div>
                            <span className="text-[#B47A67] text-xs font-bold uppercase">Apply</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* WALLET CARD */}
              {user && walletBalance > 0 && (
                <div className="bg-white rounded-[20px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E8D8D1]/30 mt-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FBF6F3] flex items-center justify-center border border-[#E8D8D1]/50">
                          <Wallet className="w-4 h-4 text-[#B47A67]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[#8E5E4F] text-sm leading-none">Eclat Wallet</h3>
                          <p className="text-xs text-[#8E5E4F]/60 mt-1">Balance: ₹{walletBalance.toFixed(2)}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#B47A67]"></div>
                      </label>
                    </div>
                    {useWallet && (
                      <div className="mt-2 text-xs text-[#8E5E4F] bg-[#FBF6F3] p-2 rounded-lg border border-[#E8D8D1]/50">
                        Using ₹{walletDiscount.toFixed(2)} from your wallet ({walletUsagePercent}% of subtotal).
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: Address & Payment */}
          <div className="md:col-span-5 space-y-4 sticky top-24">
            {/* DELIVERY ADDRESS */}
            <div ref={paymentSectionRef} className="bg-white rounded-[20px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E8D8D1]/30">
              <h3 className="font-bold text-[#8E5E4F] text-sm mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#B47A67]" /> Delivery Location
              </h3>
              {hasCheckoutDetails(savedCheckoutDetails) && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#E8D8D1] bg-[#FBF6F3] px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#8E5E4F] truncate">
                      {savedCheckoutDetails?.firstName} {savedCheckoutDetails?.lastName}
                    </p>
                    <p className="text-[11px] text-[#8E5E4F]/60 truncate">
                      {autoFilledDetails ? 'Saved details applied' : savedCheckoutDetails?.phone || savedCheckoutDetails?.address}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => savedCheckoutDetails && applySavedCheckoutDetails(savedCheckoutDetails)}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#B47A67] border border-[#E8D8D1] hover:border-[#B47A67] transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-fill
                  </button>
                </div>
              )}
              {form.address ? (
                <div className="border border-[#E8D8D1] rounded-xl p-4 flex gap-3 items-center overflow-hidden bg-white group shadow-sm mb-6">
                  <div className="w-10 h-10 rounded-full bg-[#FBF6F3] flex items-center justify-center shrink-0 border border-[#E8D8D1]/50">
                    <MapPin className="w-5 h-5 text-[#B47A67]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-[#8E5E4F] truncate">{form.address}</h4>
                    <p className="text-xs text-[#8E5E4F]/60 mt-1 truncate">{[form.city, form.district, form.state].filter(Boolean).join(', ')} {form.zip}</p>
                  </div>
                  <button type="button" onClick={() => setShowAddressModal(true)} className="shrink-0 text-xs font-bold text-[#B47A67] uppercase tracking-widest hover:underline bg-white py-1 px-2 rounded-md">Change</button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowAddressModal(true)} className="w-full py-5 border-2 border-dashed border-[#B47A67]/40 bg-[#FBF6F3] rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-[#F7F1EE] transition-colors mb-6 shadow-inner">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-[#E8D8D1] flex items-center justify-center mb-1">
                    <MapPin className="w-6 h-6 text-[#B47A67]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#8E5E4F]">Select Delivery Location</p>
                    <p className="text-xs text-[#8E5E4F]/60 mt-0.5">Use the map to pick your address easily</p>
                  </div>
                </button>
              )}

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#8E5E4F] uppercase tracking-widest border-b border-[#E8D8D1]/50 pb-2 mb-3">Contact Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First Name" value={form.firstName} onChange={set('firstName')} placeholder="name" error={errors.firstName} required />
                  <Field label="Last Name" value={form.lastName} onChange={set('lastName')} placeholder="surname" error={errors.lastName} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                  <Field label="Phone Number" type="tel" value={form.phone} onChange={set('phone')} placeholder="phone" required />
                  <Field label="Email Address" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" error={errors.email} required />
                </div>
                <div className="mt-4 pt-4 border-t border-[#E8D8D1]/50">
                  <h4 className="text-xs font-bold text-[#8E5E4F] uppercase tracking-widest mb-3 opacity-60">Manual Address Details</h4>
                  <div className="space-y-3 opacity-80 focus-within:opacity-100 transition-opacity">
                    <Field label="Full Address / Flat No." value={form.address} onChange={set('address')} placeholder="123 Street Name, Flat No." error={errors.address} required />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="col-span-1"><Field label="PIN Code" value={form.zip} onChange={set('zip')} placeholder="560001" error={errors.zip} required /></div>
                      <div className="col-span-1"><Field label="City" value={form.city} onChange={set('city')} placeholder="City" error={errors.city} required /></div>
                      <div className="col-span-1"><Field label="District" value={form.district} onChange={set('district')} placeholder="District" error={errors.district} required /></div>
                      <div className="col-span-1"><Field label="State" value={form.state} onChange={set('state')} placeholder="State" error={errors.state} required /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DELIVERY METHOD */}
            {deliverySettings.expressDeliveryEnabled && (
              <div className="bg-white rounded-[20px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E8D8D1]/30">
                <h3 className="font-bold text-[#8E5E4F] text-sm mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#B47A67]" /> Delivery Speed
                </h3>
                <div className="space-y-3">
                  <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${deliveryType === 'Standard' ? 'border-[#B47A67] bg-[#B47A67]/5' : 'border-[#E8D8D1] bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-[#E8D8D1]">
                        <Truck className={`w-4 h-4 ${deliveryType === 'Standard' ? 'text-[#B47A67]' : 'text-[#8E5E4F]/40'}`} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#8E5E4F]">Standard Delivery</div>
                        <div className="text-[10px] text-[#8E5E4F]/60">4-6 Business Days</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-black text-[#8E5E4F]">{standardDelivery === 0 ? <span className="text-green-600 uppercase">Free</span> : `+₹${standardDelivery}`}</div>
                      <input type="radio" name="deliverySpeed" checked={deliveryType === 'Standard'} onChange={() => setDeliveryType('Standard')} className="accent-[#B47A67] w-4 h-4" />
                    </div>
                  </label>

                  <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${deliveryType === 'Express' ? 'border-[#B47A67] bg-[#B47A67]/5' : 'border-[#E8D8D1] bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-[#E8D8D1]">
                        <Zap className={`w-4 h-4 ${deliveryType === 'Express' ? 'text-[#B47A67]' : 'text-[#8E5E4F]/40'}`} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#8E5E4F]">Express Delivery</div>
                        <div className="text-[10px] text-[#8E5E4F]/60">3-4 Business Days</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-black text-[#8E5E4F]">+₹{expressDelivery}</div>
                      <input type="radio" name="deliverySpeed" checked={deliveryType === 'Express'} onChange={() => setDeliveryType('Express')} className="accent-[#B47A67] w-4 h-4" />
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* PAYMENT METHODS */}
            <div className="bg-white rounded-[20px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E8D8D1]/30">
              <h3 className="font-bold text-[#8E5E4F] text-sm mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#B47A67]" /> Payment Method
              </h3>
              <div className="space-y-3">
                <label className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${isRazorpayConfigured ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${paymentMethod === 'razorpay' ? 'border-[#B47A67] bg-[#B47A67]/5' : 'border-[#E8D8D1] bg-white'}`}>
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-[#E8D8D1]">
                    <CreditCard className={`w-4 h-4 ${paymentMethod === 'razorpay' ? 'text-[#B47A67]' : 'text-[#8E5E4F]/40'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-[#8E5E4F]">Pay Online</div>
                    <div className="text-xs text-[#8E5E4F]/50">{isRazorpayConfigured ? 'Cards, UPI, Net Banking via Razorpay' : 'Coming soon'}</div>
                  </div>
                  <input type="radio" name="payment" checked={paymentMethod === 'razorpay'} onChange={() => { if (isRazorpayConfigured) { setPaymentMethod('razorpay'); setIsUpiPaymentOpen(false); } }} disabled={!isRazorpayConfigured} className="accent-[#B47A67] w-4 h-4" />
                </label>

                {resolvedUpiId && (
                  <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'upi' ? 'border-[#B47A67] bg-[#B47A67]/5' : 'border-[#E8D8D1] bg-white'}`}>
                    <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-[#E8D8D1]">
                      <Smartphone className={`w-4 h-4 ${paymentMethod === 'upi' ? 'text-[#B47A67]' : 'text-[#8E5E4F]/40'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-[#8E5E4F]">Pay by UPI QR</div>
                      <div className="text-xs text-[#8E5E4F]/50">Scan QR, then enter transaction ID</div>
                    </div>
                    <input type="radio" name="payment" checked={paymentMethod === 'upi'} onChange={() => { setPaymentMethod('upi'); setIsUpiPaymentOpen(false); }} className="accent-[#B47A67] w-4 h-4" />
                  </label>
                )}

                {paymentMethod === 'upi' && isUpiPaymentOpen && (
                  <div className="rounded-2xl border border-[#E8D8D1] bg-[#FBF6F3] p-4">
                    {resolvedUpiId ? (
                      <div className="text-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`}
                          alt="UPI QR Code"
                          className="w-44 h-44 mx-auto rounded-xl border border-[#E8D8D1] bg-white p-2"
                        />
                        <p className="mt-3 text-xs text-[#8E5E4F]/60">UPI ID</p>
                        <p className="font-mono text-sm font-bold text-[#8E5E4F] break-all">{resolvedUpiId}</p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => openUpiLink(upiLink, "gpay")}
                            className="rounded-xl bg-white border border-[#E8D8D1] px-3 py-2 text-sm font-bold text-[#8E5E4F] hover:border-[#B47A67] hover:text-[#B47A67] transition-colors"
                          >
                            GPay
                          </button>
                          <button
                            type="button"
                            onClick={() => openUpiLink(upiLink, "upi")}
                            className="rounded-xl bg-[#B47A67] px-3 py-2 text-sm font-bold text-white hover:bg-[#8E5E4F] transition-colors"
                          >
                            Any UPI App
                          </button>
                        </div>
                        <p className="mt-2 text-[10px] text-[#8E5E4F]/45">On mobile, GPay opens the app with this amount filled.</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        UPI ID is not configured in admin settings, so QR cannot be shown yet.
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="block text-[10px] uppercase tracking-widest text-[#8E5E4F]/50 font-bold mb-2">Transaction ID</label>
                      <input
                        type="text"
                        value={transactionId}
                        onChange={e => setTransactionId(e.target.value)}
                        placeholder="Enter UPI transaction/reference ID"
                        className="w-full bg-white border border-[#E8D8D1] focus:border-[#B47A67] rounded-xl px-4 py-3 text-sm text-[#8E5E4F] placeholder:text-[#8E5E4F]/30 focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="mt-3">
                      <label className="block text-[10px] uppercase tracking-widest text-[#8E5E4F]/50 font-bold mb-2">Payment Screenshot (optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => setScreenshotFile(e.target.files?.[0] || null)}
                        className="block w-full text-xs text-[#8E5E4F] file:mr-3 file:rounded-lg file:border-0 file:bg-[#B47A67] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MOBILE PRICE SUMMARY (Hidden on Desktop) */}
            <div className="md:hidden bg-white rounded-[20px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E8D8D1]/30 mt-4">
              <h3 className="font-bold text-[#8E5E4F] text-sm mb-4 flex items-center gap-2">Bill Details</h3>
              <div className="flex flex-col space-y-2.5">
                <div className="flex justify-between text-sm text-[#8E5E4F]">
                  <span>Item Total</span>
                  <span>₹{cartTotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                {walletDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Wallet Used</span>
                    <span>-₹{walletDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-[#8E5E4F]">
                  <span>Packing Charge</span>
                  <span className="text-green-600 font-bold uppercase text-xs flex items-center">Free</span>
                </div>
                <div className="flex justify-between text-sm text-[#8E5E4F]">
                  <span>Delivery Charge</span>
                  <span className={deliveryCharge === 0 ? "text-green-600 font-bold uppercase text-xs" : ""}>{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toFixed(2)}`}</span>
                </div>
                <div className="h-px bg-[#E8D8D1]/50 my-1" />
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#8E5E4F]">To Pay</span>
                  <span className="text-lg font-black text-[#8E5E4F]">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* DESKTOP PRICE SUMMARY & PLACE ORDER */}
            <div className="hidden md:block bg-white rounded-[20px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-[#E8D8D1]/30">
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col w-full space-y-2">
                  <div className="flex justify-between text-sm text-[#8E5E4F]">
                    <span>Subtotal</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  {walletDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Wallet Used</span>
                      <span>-₹{walletDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-[#8E5E4F]">
                    <span>Packing Charge</span>
                    <span className="text-green-600 font-bold uppercase text-xs flex items-center">Free</span>
                  </div>
                  <div className="flex justify-between text-sm text-[#8E5E4F]">
                    <span>Delivery Charge</span>
                    <span className={deliveryCharge === 0 ? "text-green-600 font-bold uppercase text-xs" : ""}>{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toFixed(2)}`}</span>
                  </div>
                  <div className="h-px bg-[#E8D8D1]/50 my-2" />
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] uppercase tracking-widest text-[#8E5E4F]/60 font-semibold mb-0.5">Total Payable Amount</span>
                    <span className="text-2xl font-black text-[#8E5E4F]">₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={isBelowMin || items.length === 0 || isProcessing}
                className="w-full py-4 bg-[#B47A67] text-white rounded-xl text-sm font-black tracking-widest uppercase hover:bg-[#8E5E4F] transition-all shadow-xl shadow-[#B47A67]/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{isBelowMin ? 'Below Minimum Amount' : paymentMethod === 'upi' && isUpiPaymentOpen ? 'Confirm UPI Payment' : 'Place Order'} <ChevronRight className="w-5 h-5" /></>}
              </button>
            </div>
          </div>

          {/* MOBILE STICKY BOTTOM BAR (Hidden on Desktop) */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8D8D1] p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-[100] md:hidden" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 16px)' }}>
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
              <div className="shrink-0 flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-[#8E5E4F]/60 font-semibold mb-0.5">Pay Using {paymentMethod === 'razorpay' ? 'Online' : 'UPI'}</span>
                <div className="flex items-end gap-2">
                  <span className="text-lg font-black text-[#8E5E4F] tracking-tight leading-none">₹{total.toFixed(2)}</span>
                </div>
                <button type="button" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="text-[10px] text-[#B47A67] font-bold mt-1 text-left">View Bill Details ▲</button>
              </div>
              <button
                form="checkout-form"
                type="submit"
                disabled={isBelowMin || items.length === 0 || isProcessing}
                className="flex-1 py-3.5 bg-[#B47A67] text-white rounded-xl text-sm font-bold tracking-widest uppercase hover:bg-[#8E5E4F] transition-all shadow-md shadow-[#B47A67]/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{isBelowMin ? 'Below Min' : paymentMethod === 'upi' && isUpiPaymentOpen ? 'Confirm Pay' : 'Place Order'} <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>

          {/* Minimal Error Banner */}
          {error && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full text-sm shadow-xl z-[110] flex items-center gap-2 whitespace-nowrap">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}
          {Object.keys(errors).length > 0 && !error && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full text-sm shadow-xl z-[110] flex items-center gap-2 whitespace-nowrap">
              <AlertTriangle className="w-4 h-4" /> Please fill all required delivery details
            </div>
          )}
        </form>
      </div>

      <AddressMapModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        initialName={`${form.firstName} ${form.lastName}`.trim()}
        initialPhone={form.phone}
        onSave={(newAddress) => {
          setForm(p => ({
            ...p,
            firstName: newAddress.name?.split(' ')[0] || p.firstName,
            lastName: newAddress.name?.split(' ').slice(1).join(' ') || p.lastName,
            phone: newAddress.phone || p.phone,
            address: newAddress.street ? `${newAddress.street}, ${newAddress.fullAddress}` : newAddress.fullAddress,
            city: newAddress.city || p.city,
            district: newAddress.district || p.district,
            state: newAddress.state || p.state,
            zip: newAddress.zipCode || p.zip
          }));
          setShowAddressModal(false);
        }}
      />

      {qvProduct && (
        <QuickView
          product={qvProduct}
          open={!!qvProduct}
          onClose={() => setQvProduct(null)}
        />
      )}
    </div>
  );
}
