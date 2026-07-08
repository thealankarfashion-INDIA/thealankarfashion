import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowLeft, Lock, CreditCard, ShieldCheck, Smartphone, CheckCircle, AlertTriangle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import Navbar from '@/components/layout/Navbar';
import { generateOrderId, createOrder, submitRazorpaySuccess, submitPaymentConfirmation, buildUpiLink } from '@/lib/orders';
import { loadRazorpayScript } from '@/lib/razorpay';
import { createRazorpayOrder, verifyRazorpayPayment } from '@/lib/payments';
import { getDB, getStorageInstance } from '@/lib/supabase';
import { doc, onSnapshot } from '@/lib/supabaseStore';
import { ref, uploadBytes, getDownloadURL } from '@/lib/supabaseStorage';
import PaymentProgressAnimation from '@/components/payment/PaymentProgressAnimation';
import AnimatedCross from '@/components/payment/AnimatedCross';
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" as const } }),
};
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "";
const DEFAULT_UPI_ID = import.meta.env.VITE_UPI_ID || "";
const DEFAULT_UPI_PAYEE_NAME = import.meta.env.VITE_UPI_PAYEE_NAME || "Thealankar";
const isRazorpayConfigured = true;

const getGPayLink = (upiLink: string) => {
  const query = upiLink.split("?")[1] || "";
  return query ? `tez://upi/pay?${query}` : upiLink;
};

const openUpiLink = (upiLink: string, app: "gpay" | "upi") => {
  if (!upiLink) return;
  window.location.href = app === "gpay" ? getGPayLink(upiLink) : upiLink;
};

export default function Payment() {
  const { items, cartTotal, clearCart } = useCart();
  const [, setLocation] = useLocation();

  const checkoutRaw = sessionStorage.getItem('thealankar_checkout');
  const checkout = checkoutRaw ? JSON.parse(checkoutRaw) : null;
  const shippingCost = checkout?.shippingCost ?? 0;
  // Apply any promo code discount here if it exists in sessionStorage, currently we assume it's just base + shipping
  const discount = checkout?.discount ?? 0;
  const orderTotal = Math.max(0, cartTotal - discount) + shippingCost;

  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'upi'>(isRazorpayConfigured ? 'razorpay' : 'upi');
  const [transactionId, setTransactionId] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [failurePhase, setFailurePhase] = useState<'idle' | 'progress' | 'cross'>('idle');

  const triggerFailureAnimation = () => {
    console.log('Triggering failure animation sequence...');
    setFailurePhase('progress');
    setTimeout(() => {
      console.log('Transitioning to failure cross...');
      setFailurePhase('cross');
      setTimeout(() => {
        console.log('Failure animation complete, resetting...');
        setFailurePhase('idle');
      }, 3000);
    }, 2500);
  };

  const [storeSettings, setStoreSettings] = useState({ upiId: DEFAULT_UPI_ID, upiPayeeName: DEFAULT_UPI_PAYEE_NAME });

  useEffect(() => {
    try {
      const db = getDB();
      const docRef = doc(db, 'settings', 'storeSettings');
      const unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setStoreSettings({ upiId: data.upiId || DEFAULT_UPI_ID, upiPayeeName: data.upiPayeeName || DEFAULT_UPI_PAYEE_NAME });
        }
      });
      return () => unsub();
    } catch { return undefined; }
  }, []);

  const handleRazorpay = async (oid: string) => {
    if (!isRazorpayConfigured) {
      setError('Online payment is not configured yet. Please use UPI payment.');
      setIsProcessing(false);
      return;
    }
    const loaded = await loadRazorpayScript();
    if (!loaded) { setError('Failed to load payment gateway. Please try again.'); setIsProcessing(false); return; }
    const paymentOrder = await createRazorpayOrder(oid);
    const razorpayKey = RAZORPAY_KEY_ID || paymentOrder.keyId;
    if (!razorpayKey) {
      setError('Razorpay key is missing. Please add the public Razorpay Key ID before accepting online payment.');
      setIsProcessing(false);
      return;
    }

    const options = {
      key: razorpayKey,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      order_id: paymentOrder.razorpayOrderId,
      name: 'Thealankar',
      description: `Order ${oid}`,
      handler: async (response: any) => {
        try {
          await verifyRazorpayPayment({ appOrderId: oid, ...response });
          sessionStorage.setItem('last_order_id', oid);
          sessionStorage.setItem('thealankar_order', JSON.stringify({ orderNumber: oid, items, checkout, orderTotal, shippingCost, placedAt: new Date().toISOString() }));
          clearCart();
          setLocation('/order-confirmation');
        } catch (err: any) { setError(err.message || 'Payment verification failed. Please try again or contact support.'); setIsProcessing(false); }
      },
      prefill: { name: checkout?.firstName + " " + checkout?.lastName, email: checkout?.email, contact: checkout?.phone },
      theme: { color: '#B47A67' },
      modal: { ondismiss: () => { setError('Payment cancelled. You can retry safely.'); setIsProcessing(false); } }
    };
    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', (response: any) => { setError(response.error.description || 'Payment failed. Please retry.'); rzp.close(); setIsProcessing(false); });
    rzp.open();
  };

  const compressImage = async (file: File) => {
    return new Promise<Blob>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d')!;
          const MAX_WIDTH = 800; const MAX_HEIGHT = 800; let width = img.width; let height = img.height;
          if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
          else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
          canvas.width = width; canvas.height = height; ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.7);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkout || items.length === 0) return;
    const selectedPaymentMethod = paymentMethod === 'upi' && !storeSettings.upiId.trim() ? 'razorpay' : paymentMethod;
    if (selectedPaymentMethod === 'upi' && !storeSettings.upiId.trim()) { setError('UPI ID is not configured. Add the store UPI ID in admin settings before accepting UPI payment.'); return; }
    if (selectedPaymentMethod === 'upi' && !transactionId.trim()) { setError('Transaction ID is required for UPI payments.'); return; }
    
    setIsProcessing(true); setError('');

    try {
      const oid = generateOrderId();
      const orderItems = items.map(i => ({ id: i.productId, name: i.name, price: i.price, image: i.image || '', size: i.size || 'Single', color: i.color || '', quantity: i.quantity }));
      const orderData = {
        orderId: oid,
        customerName: `${checkout.firstName} ${checkout.lastName}`,
        email: checkout.email,
        phone: checkout.phone,
        address: checkout.address,
        city: checkout.city,
        state: checkout.state,
        pincode: checkout.zip,
        items: orderItems,
        subtotal: cartTotal,
        discount,
        shipping: shippingCost,
        total: orderTotal,
        paymentMethod: selectedPaymentMethod === 'upi' ? 'Manual UPI' as const : 'Razorpay' as const,
        orderStatus: 'Payment Pending' as const,
      };

      await createOrder(orderData);

      if (selectedPaymentMethod === 'razorpay') {
        await handleRazorpay(oid);
      } else {
        let screenshotUrl = '';
        if (screenshotFile) {
          try {
            const compressed = await compressImage(screenshotFile);
            const storage = getStorageInstance();
            const storageRef = ref(storage, `payment-screenshots/${oid}-${Date.now()}.jpg`);
            await uploadBytes(storageRef, compressed);
            screenshotUrl = await getDownloadURL(storageRef);
          } catch(err) { console.error("Screenshot upload failed", err); }
        }
        await submitPaymentConfirmation(oid, transactionId.trim(), screenshotUrl);
        sessionStorage.setItem('last_order_id', oid);
        sessionStorage.setItem('thealankar_order', JSON.stringify({ orderNumber: oid, items, checkout, orderTotal, shippingCost, placedAt: new Date().toISOString() }));
        clearCart();
        setLocation('/order-confirmation');
      }
    } catch (err: any) { setError(err.message || 'Failed to start payment. Please retry.'); setIsProcessing(false); }
  };

  if (!checkout || items.length === 0) {
    return <div className="min-h-screen bg-[#F7F1EE] pt-40 text-center"><p className="text-[#8E5E4F] mb-4">Your cart is empty or missing details.</p><Link href="/shop" className="text-sm underline text-[#B47A67]">Return to Shop</Link></div>;
  }

  if (failurePhase === 'progress') {
    return <PaymentProgressAnimation amount={orderTotal} status="error" />;
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
          <h2 className="text-xl md:text-2xl font-bold text-[#EF4444] tracking-tight">Payment of ₹{orderTotal.toLocaleString()} failed</h2>
        </motion.div>
      </div>
    );
  }

  const resolvedUpiId = storeSettings.upiId.trim();
  const resolvedUpiPayeeName = storeSettings.upiPayeeName.trim() || DEFAULT_UPI_PAYEE_NAME;
  const upiLink = resolvedUpiId ? buildUpiLink(resolvedUpiId, resolvedUpiPayeeName, orderTotal, 'ODR') : '';

  return (
    <div className="min-h-screen bg-[#F7F1EE]">
      <Navbar />
      <div className="pt-40 md:pt-48 pb-2 border-b border-[#E8D8D1]"><div className="max-w-6xl mx-auto px-4 md:px-8 py-3"><nav className="flex items-center gap-2 text-xs tracking-widest uppercase text-[#8E5E4F]/60"><Link href="/shop" className="hover:text-[#B47A67] transition-colors">Shop</Link><ChevronRight className="w-3 h-3" /><Link href="/checkout" className="hover:text-[#B47A67] transition-colors">Checkout</Link><ChevronRight className="w-3 h-3" /><span className="text-[#B47A67]">Payment</span><ChevronRight className="w-3 h-3 opacity-30" /><span className="opacity-30">Confirmation</span></nav></div></div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-16">
        <form onSubmit={handleSubmit}><div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 lg:gap-16">
          <div className="space-y-10">
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              <Link href="/checkout" className="inline-flex items-center gap-2 text-sm text-[#8E5E4F]/60 hover:text-[#B47A67] transition-colors mb-8"><ArrowLeft className="w-4 h-4" /> Return to checkout</Link>
              <h1 className="font-serif text-3xl md:text-4xl text-[#8E5E4F] mb-1">Payment Method</h1><p className="text-sm text-[#8E5E4F]/60 tracking-wide">All transactions are secure and encrypted.</p>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0.5} className="bg-[#FBF6F3] border border-[#E8D8D1] rounded-sm px-5 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0"><p className="text-xs tracking-widest uppercase text-[#8E5E4F]/50 mb-1">Shipping to</p><p className="text-sm text-[#8E5E4F] truncate">{checkout.firstName} {checkout.lastName} · {checkout.address}, {checkout.city}</p></div>
              <Link href="/checkout" className="text-xs tracking-widest uppercase text-[#B47A67] hover:opacity-80">Edit</Link>
            </motion.div>

            <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={1} className="space-y-4">
              <label className={`flex items-center gap-4 p-5 rounded-sm border transition-all ${isRazorpayConfigured ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${paymentMethod === 'razorpay' ? 'border-[#B47A67] bg-[#B47A67]/5' : 'border-[#E8D8D1] bg-white/40'}`}>
                <input type="radio" name="payment" checked={paymentMethod === 'razorpay'} onChange={() => isRazorpayConfigured && setPaymentMethod('razorpay')} disabled={!isRazorpayConfigured} className="accent-[#B47A67] w-4 h-4" />
                <CreditCard className={`w-6 h-6 ${paymentMethod === 'razorpay' ? 'text-[#B47A67]' : 'text-[#8E5E4F]/40'}`} />
                <div><div className="text-sm font-medium text-[#8E5E4F]">Pay with Online Payment</div><div className="text-xs text-[#8E5E4F]/60 mt-0.5">{isRazorpayConfigured ? 'Cards, UPI, Net Banking via Razorpay' : 'Coming soon'}</div></div>
              </label>

              {resolvedUpiId && (
                <label className={`flex items-center gap-4 p-5 rounded-sm border cursor-pointer transition-all ${paymentMethod === 'upi' ? 'border-[#B47A67] bg-[#B47A67]/5' : 'border-[#E8D8D1] bg-white/40'}`}>
                  <input type="radio" name="payment" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} className="accent-[#B47A67] w-4 h-4" />
                  <Smartphone className={`w-6 h-6 ${paymentMethod === 'upi' ? 'text-[#B47A67]' : 'text-[#8E5E4F]/40'}`} />
                  <div><div className="text-sm font-medium text-[#8E5E4F]">Manual UPI Payment</div><div className="text-xs text-[#8E5E4F]/60 mt-0.5">Scan QR or use any UPI app</div></div>
                </label>
              )}

              <AnimatePresence>
                {paymentMethod === 'upi' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="p-6 border border-[#E8D8D1] rounded-sm bg-white mt-2 space-y-6">
                      <div className="text-center">
                        <p className="text-sm text-[#8E5E4F] mb-4">Scan the QR code below using your UPI app (GPay, PhonePe, Paytm) to pay <strong>₹{orderTotal.toFixed(2)}</strong></p>
                        {resolvedUpiId ? <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiLink)}`} alt="UPI QR Code" className="w-40 h-40 mx-auto border border-[#E8D8D1] rounded-sm mb-4" /> : <div className="text-[#8E5E4F]/40 text-sm py-4">UPI ID not configured in admin settings.</div>}
                        <p className="text-xs text-[#8E5E4F]/60 font-mono bg-[#F7F1EE] py-2 rounded-sm">{resolvedUpiId || 'Not Configured'}</p>
                        {resolvedUpiId && (
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => openUpiLink(upiLink, "gpay")}
                              className="rounded-sm bg-[#B47A67] px-4 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#A86F5C]"
                            >
                              Open GPay
                            </button>
                            <button
                              type="button"
                              onClick={() => openUpiLink(upiLink, "upi")}
                              className="rounded-sm border border-[#D8B8AA] bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8E5E4F] transition-colors hover:border-[#B47A67]"
                            >
                              Any UPI App
                            </button>
                            <p className="sm:col-span-2 text-[11px] text-[#8E5E4F]/55">
                              On mobile, GPay opens with this amount filled.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4 pt-4 border-t border-[#E8D8D1]">
                        <div>
                          <label className="block text-xs tracking-widest uppercase text-[#8E5E4F]/70 mb-2">Transaction ID / UTR <span className="text-[#B47A67]">*</span></label>
                          <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="e.g. 123456789012" className="w-full bg-white/60 border border-[#E8D8D1] focus:border-[#B47A67] rounded-sm px-4 py-3 text-sm text-[#8E5E4F] placeholder:text-[#8E5E4F]/30 focus:outline-none transition-colors" />
                        </div>
                        <div>
                          <label className="block text-xs tracking-widest uppercase text-[#8E5E4F]/70 mb-2">Payment Screenshot (Optional)</label>
                          <input type="file" accept="image/*" onChange={e => setScreenshotFile(e.target.files?.[0] || null)} className="w-full text-sm text-[#8E5E4F]/60 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:bg-[#B47A67]/10 file:text-[#B47A67] hover:file:bg-[#B47A67]/20" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="pb-8">
              {error && <div className="mb-4 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-sm text-sm flex gap-3"><AlertTriangle className="w-5 h-5 shrink-0" />{error}</div>}
              <button type="submit" disabled={isProcessing} className="w-full py-4 bg-[#B47A67] text-white text-sm tracking-widest uppercase hover:bg-[#A86F5C] transition-colors duration-300 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed">
                {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Lock className="w-4 h-4" /> {paymentMethod === 'razorpay' ? 'Proceed to Secure Payment' : 'Confirm UPI Payment'} · ₹{orderTotal.toFixed(2)}</>}
              </button>
              <div className="flex items-center justify-center gap-2 mt-4"><ShieldCheck className="w-4 h-4 text-[#8E5E4F]/40" /><span className="text-xs text-[#8E5E4F]/50 tracking-wide">256-bit SSL · PCI-DSS Compliant · Secured</span></div>
            </motion.div>
          </div>

          <motion.aside variants={fadeUp} initial="hidden" animate="visible" custom={1} className="lg:sticky lg:top-44 h-fit">
            <div className="bg-[#FBF6F3] border border-[#E8D8D1] rounded-sm p-6 md:p-8">
              <h3 className="font-serif text-xl text-[#8E5E4F] mb-6 pb-4 border-b border-[#E8D8D1]">Order Summary</h3>
              <div className="space-y-5 mb-6">
                {items.map(item => (
                  <div key={`${item.productId}-${item.color}-${item.size}`} className="flex gap-4">
                    <div className="relative w-16 h-20 flex-shrink-0 rounded-sm overflow-hidden bg-[#F7F1EE]"><img src={item.image} alt={item.name} className="w-full h-full object-cover" /><span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#8E5E4F] text-white text-[10px] rounded-full flex items-center justify-center font-medium">{item.quantity}</span></div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-[#8E5E4F] truncate">{item.name}</p><p className="text-xs text-[#8E5E4F]/55 mt-1">{item.color} · {item.size}</p><p className="text-sm text-[#8E5E4F] mt-2 font-medium">₹{(item.price * item.quantity).toFixed(2)}</p></div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#E8D8D1] pt-5 space-y-3">
                <div className="flex justify-between"><span className="text-sm text-[#8E5E4F]/60">Subtotal</span><span className="text-sm text-[#8E5E4F]">₹{cartTotal.toFixed(2)}</span></div>
                {discount > 0 && <div className="flex justify-between text-green-600"><span className="text-sm">Discount</span><span className="text-sm">-₹{discount.toFixed(2)}</span></div>}
                <div className="flex justify-between"><span className="text-sm text-[#8E5E4F]/60">Shipping</span><span className="text-sm text-[#8E5E4F]">{shippingCost === 0 ? 'Free' : `₹${shippingCost}`}</span></div>
              </div>
              <div className="border-t border-[#E8D8D1] mt-5 pt-5 flex justify-between items-center"><span className="font-serif text-lg text-[#8E5E4F]">Total</span><span className="font-serif text-2xl text-[#8E5E4F]">₹{orderTotal.toFixed(2)}</span></div>
            </div>
          </motion.aside>
        </div></form>
      </div>
    </div>
  );
}
