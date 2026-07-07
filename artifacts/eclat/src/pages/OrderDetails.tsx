import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRoute, Link, useLocation } from 'wouter';
import { doc, onSnapshot, query, collection, where } from '@/lib/supabaseStore';
import { getDB } from '@/lib/supabase';
import { printInvoice } from '@/lib/invoice';
import type { Order } from '@/lib/types';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CompactOffersSlider from '@/components/order/CompactOffersSlider';
import RateAppModal from '@/components/profile/RateAppModal';
import SEO from '@/components/seo/SEO';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  ArrowLeft, Package, MapPin, ChevronRight, ShoppingBag,
  Copy, Check, HelpCircle, Share2, Home, User, Phone,
  Info, ChevronDown, Trophy, Printer, ThumbsUp, CheckCircle2
} from 'lucide-react';

/* ── Horizontal tracking stepper ── */
function OrderTracker({ status }: { status: string }) {
  const steps = [
    { label: 'Order Confirmed', key: 'confirmed' },
    { label: 'Shipped', key: 'shipped' },
    { label: 'Delivered', key: 'delivered' },
  ];

  const statusMap: Record<string, number> = {
    'Payment Pending': 0, 'Under Verification': 0, 'Verified': 1,
    'Processing': 1, 'Shipped': 2, 'Delivered': 3,
    'Rejected': -1, 'Cancelled': -1,
  };
  const activeStep = statusMap[status] ?? 0;

  const getStepDate = (idx: number) => {
    const d = new Date();
    if (idx === 0) return format(d, 'EEE MMM dd');
    if (idx === 1) return format(new Date(d.getTime() + 86400000), 'MMM dd');
    return format(new Date(d.getTime() + 3 * 86400000), 'EEE MMM dd');
  };

  return (
    <div className="flex items-start justify-between relative px-2 mt-2 mb-1">
      {steps.map((step, i) => {
        const done = i < activeStep;
        const current = i === activeStep - 1;
        return (
          <div key={step.key} className="flex flex-col items-center text-center relative z-10" style={{ width: `${100 / steps.length}%` }}>
            {/* Circle */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${done ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'
              }`}>
              {done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </div>
            {/* Label */}
            <span className={`text-[10px] mt-2 leading-tight ${done ? 'text-[#8E5E4F] font-medium' : 'text-[#8E5E4F]/50'}`}>
              {step.label}
            </span>
            <span className="text-[9px] text-[#8E5E4F]/40 mt-0.5">{getStepDate(i)}</span>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="absolute top-3 left-[55%] h-0.5 z-0" style={{ width: 'calc(100% - 10%)' }}>
                <div className={`h-full ${done ? 'bg-emerald-500' : i === activeStep - 1 ? 'border-t-2 border-dashed border-[#B47A67]' : 'bg-gray-200'}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetails({ params }: { params?: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [, routeParams] = useRoute('/order/:id');
  const [, trackParams] = useRoute('/track/:id');
  
  const orderId = params?.id || routeParams?.id || trackParams?.id || window.location.pathname.split('/').pop() || '';
  const isTrackRoute = location.startsWith('/track');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [showPriceExpand, setShowPriceExpand] = useState(false);
  const [showRateAppModal, setShowRateAppModal] = useState(false);

  // A guest user is allowed to view the order if the orderId matches the
  // last_order_id stored in sessionStorage (set right after checkout).
  const isGuestOrder = !user && orderId === sessionStorage.getItem('last_order_id');

  useEffect(() => {
    // Only redirect to login if: not logged in, not a /track route, AND not their own fresh guest order
    if (!isTrackRoute && !authLoading && !user && !isGuestOrder) {
      setLocation('/profile');
    }
  }, [user, authLoading, setLocation, isTrackRoute, isGuestOrder]);

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }

    // For logged-in users, wait for auth to resolve before querying
    if (!isTrackRoute && !isGuestOrder && !user) return;

    const db = getDB();
    let q;

    if (isTrackRoute || isGuestOrder) {
      // Guest order or public track route: query by orderId only
      q = query(
        collection(db, 'orders'),
        where('orderId', '==', orderId)
      );
    } else {
      // Logged-in user: scope to their userId for security
      q = query(
        collection(db, 'orders'),
        where('orderId', '==', orderId),
        where('userId', '==', user!.uid)
      );
    }

    const unsub = onSnapshot(q,
      (snap) => {
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
        } else {
          setOrder(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Firestore Error in OrderDetails:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [orderId, user, isTrackRoute, isGuestOrder]);

  const handleCopy = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white md:bg-[#F7F1EE] flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#B47A67]/30 border-t-[#B47A67] rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white md:bg-[#F7F1EE] flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center pt-40 pb-20 px-4">
          <div className="text-center">
            <Package className="w-14 h-14 text-[#8E5E4F]/20 mx-auto mb-4" />
            <h2 className="font-semibold text-lg text-[#8E5E4F] mb-2">Order not found</h2>
            <Link href="/my-orders">
              <button className="mt-4 px-8 py-3 bg-[#B47A67] text-white rounded-lg text-sm font-medium">Back to Orders</button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const date = order.createdAt?.toDate ? order.createdAt.toDate()
    : order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date();
  const updatedDate = order.updatedAt?.toDate ? order.updatedAt.toDate()
    : order.updatedAt?.seconds ? new Date(order.updatedAt.seconds * 1000) : date;
  const isOnTime = ['Shipped', 'Processing', 'Verified', 'Delivered'].includes(order.orderStatus);
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  const Content = (
    <>
      {/* ── Product Items ── */}
      <div className="bg-white md:rounded-xl md:border md:border-[#E8D8D1] md:mb-3">
        {order.items.map((item, i) => (
          <div key={i} className={`px-4 md:px-6 py-4 flex gap-4 items-center ${i < order.items.length - 1 ? 'border-b border-[#E8D8D1]/40' : ''}`}>
            <div className="w-14 h-14 md:w-16 md:h-16 bg-[#F7F1EE] rounded-lg overflow-hidden shrink-0">
              {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-[#8E5E4F]/20" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-[#8E5E4F] truncate">{item.name}</h3>
              <p className="text-xs text-[#8E5E4F]/50 mt-0.5">
                {item.size && item.size !== 'Single' ? `Size: ${item.size}` : ''}{item.color ? ` · ${item.color}` : ''} · Qty: {item.quantity}
              </p>
              <p className="text-sm font-semibold text-[#8E5E4F] mt-1">₹{(item.price * item.quantity).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Order ID + Tracking Card ── */}
      <div className="px-4 md:px-6 pt-5 pb-2 bg-white md:rounded-xl md:border md:border-[#E8D8D1] md:mt-0 md:mb-3">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-[#8E5E4F]/50">Order #{orderId}</span>
          <button onClick={handleCopy} className="text-[#8E5E4F]/30 hover:text-[#B47A67]">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Tracking box */}
        <div className="border border-[#E8D8D1] rounded-xl overflow-hidden mb-4" style={{ borderLeft: '3px solid #B47A67' }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-[#8E5E4F]">{order.orderStatus}</h3>
              {isOnTime && (
                <span className="text-[10px] font-bold text-white bg-emerald-500 px-2.5 py-0.5 rounded-full uppercase">On Time</span>
              )}
            </div>
            <p className="text-xs text-[#8E5E4F]/60 mb-5">
              {format(date, "'Today,' MMMM dd")}: Order is {order.orderStatus.toLowerCase()}
            </p>
            <OrderTracker status={order.orderStatus} />
            <div className="flex items-start gap-2 mt-5 pt-3 border-t border-[#E8D8D1]/40">
              <Info className="w-3.5 h-3.5 text-[#8E5E4F]/30 mt-0.5 shrink-0" />
              <p className="text-[11px] text-[#8E5E4F]/50 leading-relaxed">
                Delivery Executive details will be available once the order is out for delivery
              </p>
            </div>
          </div>
          <button onClick={() => setShowTracking(true)} className="w-full py-3 text-center text-sm font-medium text-[#B47A67] border-t border-[#E8D8D1]/40 hover:bg-[#F7F1EE]/50 transition-colors">
            See all updates
          </button>
        </div>
      </div>

      {/* ── Rate your experience ── */}
      <div className="px-4 md:px-6 py-5 bg-white md:rounded-xl md:border md:border-[#E8D8D1] md:mb-3 border-t border-b border-[#E8D8D1]/40 md:border-t-0">
        <h3 className="text-base font-bold text-[#8E5E4F] mb-3">Rate your experience</h3>
        <button onClick={() => setShowRateAppModal(true)} className="w-full flex items-center justify-between py-3 px-4 bg-[#F7F1EE]/60 rounded-xl border border-[#E8D8D1]/50 hover:bg-[#F7F1EE] transition-colors">
          <div className="flex items-center gap-3">
            <ThumbsUp className="w-5 h-5 text-[#B47A67]" />
            <span className="text-sm text-[#8E5E4F]">Did you find this page helpful?</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8E5E4F]/30" />
        </button>
      </div>

      {/* ── Offers Slider (edge-to-edge on mobile) ── */}
      <div className="md:px-0">
        <CompactOffersSlider />
      </div>

      {/* ── Delivery details ── */}
      <div className="px-4 md:px-6 py-5 bg-white md:rounded-xl md:border md:border-[#E8D8D1] md:mb-3">
        <h3 className="text-base font-bold text-[#8E5E4F] mb-3">Delivery details</h3>
        <div className="border border-[#E8D8D1]/60 rounded-xl overflow-hidden">
          <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#F7F1EE]/30 transition-colors border-b border-[#E8D8D1]/40">
            <Home className="w-4 h-4 text-[#8E5E4F]/50" />
            <span className="text-xs font-semibold text-[#8E5E4F] mr-1">Home</span>
            <span className="flex-1 text-xs text-[#8E5E4F]/60 truncate text-left">{order.address}, {order.city}...</span>
            <ChevronRight className="w-4 h-4 text-[#8E5E4F]/30 shrink-0" />
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#F7F1EE]/30 transition-colors">
            <User className="w-4 h-4 text-[#8E5E4F]/50" />
            <span className="flex-1 text-xs text-[#8E5E4F] font-medium text-left">{order.customerName}</span>
            <span className="text-xs text-[#8E5E4F]/50 mr-2">{order.phone}</span>
            <ChevronRight className="w-4 h-4 text-[#8E5E4F]/30 shrink-0" />
          </button>
        </div>
      </div>

      {/* ── Price details ── */}
      <div className="px-4 md:px-6 py-5 bg-white md:rounded-xl md:border md:border-[#E8D8D1] md:mb-3">
        <h3 className="text-base font-bold text-[#8E5E4F] mb-3">Price details</h3>
        <div className="border border-[#E8D8D1]/60 rounded-xl overflow-hidden">
          <div className="px-4 py-3 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#8E5E4F]/70">Listing price</span>
              <span className="text-[#8E5E4F]">₹{order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#8E5E4F]/70">Selling price</span>
              <span className="text-[#8E5E4F]">₹{order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <button onClick={() => setShowPriceExpand(!showPriceExpand)} className="flex items-center gap-1 text-[#8E5E4F]/70">
                Shipping fees <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPriceExpand ? 'rotate-180' : ''}`} />
              </button>
              <span className="text-[#8E5E4F]">₹{order.shipping === 0 ? 'Free' : order.shipping.toLocaleString()}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#8E5E4F]/70 flex items-center gap-1">Discount <ChevronDown className="w-3.5 h-3.5" /></span>
                <span className="text-emerald-600 font-medium">−₹{order.discount.toLocaleString()}</span>
              </div>
            )}
          </div>
          <div className="border-t border-dashed border-[#E8D8D1] mx-4" />
          <div className="px-4 py-3 flex justify-between text-sm">
            <span className="font-bold text-[#8E5E4F]">Total amount</span>
            <span className="font-bold text-[#8E5E4F]">₹{order.total.toLocaleString()}</span>
          </div>
          <div className="mx-4 mb-3 px-4 py-3 bg-[#F7F1EE]/60 rounded-lg border border-[#E8D8D1]/40 flex justify-between items-center">
            <span className="text-xs text-[#8E5E4F]/70">Paid By</span>
            <span className="text-xs font-medium text-[#8E5E4F]">{order.paymentMethod}</span>
          </div>
        </div>
      </div>

      {/* ── Order ID (bottom) ── */}
      <div className="px-4 md:px-6 py-5 bg-white md:rounded-xl md:border md:border-[#E8D8D1] md:mb-3">
        <h3 className="text-sm font-bold text-[#8E5E4F] mb-1">Order ID</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8E5E4F]/50 font-mono">{orderId}</span>
          <button onClick={handleCopy}>
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-[#8E5E4F]/30" />}
          </button>
        </div>
      </div>

      {/* ── Download Invoice (mobile only — desktop has it in sidebar) ── */}
      <div className="px-4 py-4 bg-white md:hidden">
        <button
          onClick={() => printInvoice(order)}
          className="w-full py-3.5 bg-[#B47A67] text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-[#8E5E4F] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#B47A67]/20"
        >
          <Printer className="w-4 h-4" />
          Download Invoice
        </button>
      </div>

      {/* ── Shop more CTA ── */}
      <div className="px-4 md:px-6 py-5 bg-white md:rounded-xl md:border md:border-[#E8D8D1] md:mb-3">
        <Link href="/shop">
          <button className="w-full py-3 border-2 border-[#B47A67] rounded-xl text-sm font-bold text-[#B47A67] hover:bg-[#B47A67] hover:text-white transition-all">
            Shop more from Thealankar
          </button>
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-[#F5F5F5] font-sans pb-[100px] md:pb-0">
      <SEO title="Order Details" noindex />
      {/* ─── STICKY HEADER (Mobile + Desktop) ─── */}
      <div className="hidden md:block"><Navbar /></div>

      {/* ── Detailed Tracking Overlay ── */}
      {showTracking && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto flex flex-col md:p-8">
          <div className="hidden md:block fixed inset-0 bg-black/40 backdrop-blur-sm z-[-1]" onClick={() => setShowTracking(false)} />
          <div className="bg-white md:max-w-2xl md:mx-auto md:w-full md:rounded-2xl md:shadow-2xl md:min-h-0 flex-1 md:flex-none flex flex-col relative">
            <div className="px-4 py-4 md:py-6 md:px-8 flex items-center bg-white sticky top-0 z-10 md:rounded-t-2xl">
              <button onClick={() => setShowTracking(false)} className="p-1 -ml-1 hover:bg-[#F7F1EE] rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-[#333]" />
              </button>
              <span className="hidden md:block ml-4 font-bold text-lg text-[#8E5E4F]">Tracking Details</span>
            </div>

            <div className="flex-1 px-6 pb-6 md:px-8 md:pb-8 overflow-y-auto mt-2">
              <div className="relative pl-6">
                {/* Vertical Line */}
                <div className="absolute top-2 bottom-6 left-[7px] w-0.5 bg-[#E8D8D1] z-0"></div>
                <div className={`absolute top-2 left-[7px] w-0.5 bg-[#8E5E4F] z-0 transition-all duration-500
                  ${order.orderStatus === 'Delivered' ? 'bottom-6' :
                    ['Shipped', 'Processing'].includes(order.orderStatus) ? 'bottom-1/2' : 'bottom-[80%]'}`}
                />

                {/* Step 1: Order Confirmed */}
                <div className="relative mb-8">
                  <div className="absolute -left-[27px] top-1.5 w-[11px] h-[11px] bg-[#8E5E4F] rounded-full z-10 border-2 border-white shadow-sm" />
                  <h3 className="text-[15px] font-medium text-[#222]">Order Confirmed <span className="font-normal text-[#888] ml-1">{format(date, "EEE, do MMM ''yy")}</span></h3>

                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-[13px] text-[#333]">Your Order has been placed.</p>
                      <p className="text-[11px] text-[#888] mt-0.5">{format(date, "EEE, do MMM ''yy - h:mma").toLowerCase()}</p>
                    </div>
                    {['Processing', 'Shipped', 'Delivered'].includes(order.orderStatus) && (
                      <div>
                        <p className="text-[13px] text-[#333]">Seller has processed your order.</p>
                        {order.orderStatus === 'Processing' && <p className="text-[11px] text-[#888] mt-0.5">{format(updatedDate, "EEE, do MMM ''yy - h:mma").toLowerCase()}</p>}
                      </div>
                    )}
                    {['Shipped', 'Delivered'].includes(order.orderStatus) && (
                      <div>
                        <p className="text-[13px] text-[#333]">Your item has been picked up by delivery partner.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 2: Shipped */}
                <div className="relative mb-8">
                  {['Shipped', 'Delivered'].includes(order.orderStatus) ? (
                    <div className="absolute -left-[33px] top-0 w-6 h-6 bg-[#F7F1EE] rounded-full flex items-center justify-center z-10">
                      <div className="w-[11px] h-[11px] bg-[#8E5E4F] rounded-full" />
                    </div>
                  ) : (
                    <div className="absolute -left-[27px] top-1.5 w-[11px] h-[11px] bg-white border-2 border-[#E8D8D1] rounded-full z-10" />
                  )}
                  <h3 className={`text-[15px] font-medium ${['Shipped', 'Delivered'].includes(order.orderStatus) ? 'text-[#222]' : 'text-[#888]'}`}>
                    Shipped {['Shipped', 'Delivered'].includes(order.orderStatus) && <span className="font-normal text-[#888] ml-1">{order.orderStatus === 'Shipped' ? format(updatedDate, "EEE, do MMM ''yy") : ''}</span>}
                  </h3>

                  {['Shipped', 'Delivered'].includes(order.orderStatus) && (
                    <div className="mt-3">
                      <p className="text-[14px] text-[#333] mb-1">Logistics Partner - SHT-{order.orderId.replace(/[^0-9]/g, '').slice(0, 10)}</p>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[13px] text-[#333]">Your item has been shipped.</p>
                          {order.orderStatus === 'Shipped' && <p className="text-[11px] text-[#888] mt-0.5">{format(updatedDate, "EEE, do MMM ''yy - h:mma").toLowerCase()}</p>}
                        </div>
                        <div className="pl-4 border-l-2 border-[#E8D8D1]/40 ml-1">
                          <div className="mb-3">
                            <p className="text-[13px] text-[#555]">Your item has arrived at a sorting facility</p>
                          </div>
                          <div>
                            <p className="text-[13px] text-[#555]">Your item has left the sorting facility</p>
                          </div>
                        </div>
                      </div>
                      {order.orderStatus !== 'Delivered' && <p className="text-[13px] text-[#333] mt-4 font-medium">Item yet to reach hub nearest to you.</p>}
                    </div>
                  )}
                </div>

                {/* Step 3: Out For Delivery */}
                <div className="relative mb-8">
                  {order.orderStatus === 'Delivered' ? (
                    <div className="absolute -left-[27px] top-1.5 w-[11px] h-[11px] bg-[#8E5E4F] rounded-full z-10 border-2 border-white shadow-sm" />
                  ) : (
                    <div className="absolute -left-[27px] top-1.5 w-[11px] h-[11px] bg-white border-2 border-[#E8D8D1] rounded-full z-10" />
                  )}
                  <h3 className={`text-[15px] ${order.orderStatus === 'Delivered' ? 'font-medium text-[#222]' : 'text-[#888]'}`}>Out For Delivery</h3>
                  {order.orderStatus !== 'Delivered' && <p className="text-[13px] text-[#888] mt-2">Item yet to be delivered.</p>}
                  {order.orderStatus === 'Delivered' && (
                    <div className="mt-2">
                      <p className="text-[13px] text-[#333]">Out for delivery</p>
                    </div>
                  )}
                </div>

                {/* Step 4: Expected Delivery */}
                <div className="relative">
                  {order.orderStatus === 'Delivered' ? (
                    <div className="absolute -left-[27px] top-1.5 w-[11px] h-[11px] bg-[#8E5E4F] rounded-full z-10 border-2 border-white shadow-sm" />
                  ) : (
                    <div className="absolute -left-[27px] top-1.5 w-[11px] h-[11px] bg-white border-2 border-[#E8D8D1] rounded-full z-10" />
                  )}
                  <h3 className={`text-[15px] ${order.orderStatus === 'Delivered' ? 'font-medium text-[#222]' : 'text-[#888]'}`}>
                    {order.orderStatus === 'Delivered' ? 'Delivered' : `Delivery Expected By ${format(new Date(date.getTime() + 1000 * 60 * 60 * 96), "EEE do MMM")}`}
                  </h3>
                  {order.orderStatus !== 'Delivered' && (
                    <div className="mt-2">
                      <p className="text-[13px] text-[#888]">Item yet to be delivered.</p>
                      <p className="text-[11px] text-[#999] mt-0.5">Expected by {format(new Date(date.getTime() + 1000 * 60 * 60 * 96), "EEE, do MMM")}</p>
                    </div>
                  )}
                  {order.orderStatus === 'Delivered' && (
                    <div className="mt-2">
                      <p className="text-[13px] text-[#333]">Your item has been delivered.</p>
                      <p className="text-[11px] text-[#888] mt-0.5">{format(updatedDate, "EEE, do MMM ''yy - h:mma").toLowerCase()}</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Header ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E8D8D1]/60 px-3 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Link href="/my-orders"><a className="p-1"><ArrowLeft className="w-5 h-5 text-[#8E5E4F]" /></a></Link>
          <h1 className="text-base font-bold text-[#8E5E4F]">Order Details</h1>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/contact">
            <a className="px-3 py-1.5 border border-[#E8D8D1] rounded-full text-xs font-medium text-[#8E5E4F]">Help</a>
          </Link>
          <button onClick={() => printInvoice(order)} className="p-2 text-[#8E5E4F]/60"><Printer className="w-4 h-4" /></button>
        </div>
      </div>



      {/* ── Main ── */}
      <main className="flex-1 pt-[80px] md:pt-44 pb-20 md:pb-16">
        {/* Mobile: full-width stacked sections with faint dividers */}
        <div className="md:hidden bg-white flex flex-col divide-y divide-[#E8D8D1]/50">
          {Content}
        </div>

        {/* Desktop: centered two-column card layout */}
        <div className="hidden md:block max-w-5xl mx-auto px-8">
          <div className="mb-6">
            <Link href="/my-orders">
              <a className="inline-flex items-center gap-1.5 text-xs text-[#8E5E4F]/50 hover:text-[#B47A67] transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders
              </a>
            </Link>
            <div className="flex items-center justify-between mt-3">
              <h1 className="font-serif text-2xl text-[#8E5E4F]">Order Details</h1>
              <div className="flex items-center gap-2">
                <Link href="/contact">
                  <a className="px-4 py-2 border border-[#E8D8D1] rounded-lg text-xs font-medium text-[#8E5E4F] hover:bg-[#F7F1EE] transition-colors">Help</a>
                </Link>
                <button onClick={() => printInvoice(order)} className="px-4 py-2 border border-[#E8D8D1] rounded-lg text-xs font-medium text-[#8E5E4F] hover:bg-[#F7F1EE] transition-colors flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5" /> Invoice
                </button>
              </div>
            </div>
          </div>
          {/* Desktop 2-column grid */}
          <div className="grid grid-cols-5 gap-6 items-start">
            {/* Left column: main content (3/5) */}
            <div className="col-span-3 space-y-4">{Content}</div>
            {/* Right column: sidebar summary (2/5) */}
            <div className="col-span-2 sticky top-48 space-y-4">
              {/* Quick summary card */}
              <div className="bg-white rounded-xl border border-[#E8D8D1] p-5">
                <h3 className="text-sm font-bold text-[#8E5E4F] mb-4 uppercase tracking-wider">Order Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-[#8E5E4F]/60">Order ID</span><span className="font-mono text-[#8E5E4F] text-xs">{orderId}</span></div>
                  <div className="flex justify-between"><span className="text-[#8E5E4F]/60">Date</span><span className="text-[#8E5E4F]">{format(date, 'dd MMM yyyy')}</span></div>
                  <div className="flex justify-between"><span className="text-[#8E5E4F]/60">Items</span><span className="text-[#8E5E4F]">{itemCount}</span></div>
                  <div className="flex justify-between"><span className="text-[#8E5E4F]/60">Payment</span><span className="text-[#8E5E4F]">{order.paymentMethod}</span></div>
                  <div className="border-t border-dashed border-[#E8D8D1] pt-3 mt-3 flex justify-between">
                    <span className="font-bold text-[#8E5E4F]">Total</span>
                    <span className="font-bold text-[#B47A67] text-lg">₹{order.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              {/* Download invoice */}
              <button onClick={() => printInvoice(order)} className="w-full py-3 bg-[#B47A67] text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-[#8E5E4F] transition-colors">
                Download Invoice
              </button>
              {/* Need help */}
              <div className="bg-[#2C1E16] rounded-xl p-5 text-white">
                <h4 className="text-sm font-bold mb-2">Need Help?</h4>
                <p className="text-xs text-white/60 mb-3">Have questions about your order?</p>
                <Link href="/contact"><a className="block w-full py-2.5 bg-[#B47A67] rounded-lg text-xs font-bold text-center uppercase tracking-widest hover:bg-[#A86F5C] transition-colors">Contact Support</a></Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="hidden md:block"><Footer /></div>
      <RateAppModal isOpen={showRateAppModal} onClose={() => setShowRateAppModal(false)} />
    </div>
  );
}
