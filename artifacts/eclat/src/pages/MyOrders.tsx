import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Link, useLocation } from 'wouter';
import { Package, ChevronRight, ArrowLeft, ShoppingBag, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { subscribeToUserOrders } from '@/lib/orders';
import type { Order } from '@/lib/types';
import CompactOffersSlider from '@/components/order/CompactOffersSlider';
import Footer from '@/components/layout/Footer';

const STATUS_DOT: Record<string, string> = {
  Delivered: 'bg-emerald-500',
  Shipped: 'bg-blue-500',
  Processing: 'bg-amber-500',
  Verified: 'bg-emerald-500',
  'Payment Pending': 'bg-orange-400',
  'Under Verification': 'bg-yellow-500',
  Rejected: 'bg-red-500',
  Cancelled: 'bg-red-500',
};

const FILTERS = ['All', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as const;

export default function MyOrders() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQ, setSearchQ] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) setLocation('/profile');
  }, [user, authLoading, setLocation]);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const unsub = subscribeToUserOrders(user.uid, (data) => { setOrders(data); setLoading(false); });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filtered = orders.filter(o => {
    const matchFilter = activeFilter === 'All' || o.orderStatus === activeFilter;
    const matchSearch = !searchQ || o.orderId.toLowerCase().includes(searchQ.toLowerCase()) ||
      o.items.some(it => it.name.toLowerCase().includes(searchQ.toLowerCase()));
    return matchFilter && matchSearch;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FBF8F6] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#B47A67]/30 border-t-[#B47A67] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const isDataLoading = loading && orders.length === 0;

  return (
    <div className="min-h-screen bg-[#FBF8F6] flex flex-col font-sans">
      
      {/* ── Unified App-like Header ── */}
      <div className={`fixed top-0 left-0 right-0 z-50 bg-white transition-all duration-300 ${isScrolled ? 'shadow-sm border-b border-[#E8D8D1]' : ''}`}>
        <div className="max-w-4xl mx-auto w-full">
          {/* Top Bar */}
          <div className="px-4 py-3.5 flex items-center gap-3">
            <Link href="/profile">
              <a className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-[#F7F1EE] transition-colors active:scale-95">
                <ArrowLeft className="w-5 h-5 text-[#8E5E4F]" />
              </a>
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-[#8E5E4F] leading-tight">My Orders</h1>
              <p className="text-[11px] text-[#8E5E4F]/50 font-medium">{orders.length} total order{orders.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="relative flex-1 max-w-[200px] hidden sm:block">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E5E4F]/40" />
              <input type="text" placeholder="Search orders..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                className="w-full pl-8 pr-4 py-2 bg-[#F7F1EE] border border-transparent rounded-full text-xs text-[#8E5E4F] placeholder-[#8E5E4F]/40 outline-none focus:bg-white focus:border-[#B47A67] transition-all" />
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="px-4 pb-2 sm:hidden">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E5E4F]/40" />
              <input type="text" placeholder="Search by item name or order ID..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F7F1EE] border border-transparent rounded-xl text-sm text-[#8E5E4F] placeholder-[#8E5E4F]/40 outline-none focus:bg-white focus:border-[#B47A67] transition-all" />
            </div>
          </div>

          {/* Filter Chips */}
          {orders.length > 0 && (
            <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 pb-3.5 pt-1">
              {FILTERS.map(f => {
                const count = orders.filter(o => o.orderStatus === f).length;
                if (f !== 'All' && count === 0) return null; // Hide empty filters
                return (
                  <button key={f} onClick={() => setActiveFilter(f)}
                    className={`flex-none px-4 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                      activeFilter === f
                        ? 'bg-[#8E5E4F] text-white border-[#8E5E4F] shadow-md shadow-[#8E5E4F]/20'
                        : 'bg-white text-[#8E5E4F]/60 border-[#E8D8D1] hover:border-[#B47A67]/40 hover:bg-[#FBF8F6]'
                    }`}>
                    {f} {f !== 'All' && <span className={`ml-1 text-[10px] ${activeFilter === f ? 'text-white/80' : 'text-[#8E5E4F]/40'}`}>({count})</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 pt-[170px] sm:pt-[130px] pb-24">
        <div className="max-w-4xl mx-auto w-full px-4">
          
          {/* State Rendering */}
          {isDataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {[1, 2, 3, 4].map(i => (
                 <div key={i} className="bg-white rounded-[20px] border border-[#E8D8D1]/60 p-5 animate-pulse">
                   <div className="flex gap-4">
                     <div className="w-16 h-16 bg-[#FBF8F6] rounded-xl shrink-0" />
                     <div className="flex-1 space-y-3 py-1">
                       <div className="h-3 bg-[#FBF8F6] rounded w-1/3" />
                       <div className="h-4 bg-[#FBF8F6] rounded w-3/4" />
                       <div className="h-4 bg-[#FBF8F6] rounded w-1/4" />
                     </div>
                   </div>
                 </div>
               ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E8D8D1]/50 p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-[#FBF8F6] rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-10 h-10 text-[#8E5E4F]/20" />
              </div>
              <h2 className="font-serif text-2xl text-[#8E5E4F] mb-2">No orders yet</h2>
              <p className="text-[#8E5E4F]/50 text-sm mb-8 max-w-[240px] mx-auto leading-relaxed">Looks like you haven't made your first purchase with us.</p>
              <Link href="/shop">
                <button className="px-8 py-3.5 bg-[#B47A67] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#B47A67]/20 hover:bg-[#A86F5C] active:scale-95 transition-all">
                  Start Shopping
                </button>
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E8D8D1]/50 p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-[#FBF8F6] rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-[#8E5E4F]/20" />
              </div>
              <h3 className="font-bold text-lg text-[#8E5E4F] mb-1">No matching orders</h3>
              <p className="text-sm text-[#8E5E4F]/50">We couldn't find any orders matching your search or filter.</p>
              <button onClick={() => { setSearchQ(''); setActiveFilter('All'); }} className="mt-6 text-sm font-bold text-[#B47A67] hover:underline">
                Clear Filters
              </button>
            </div>
          ) : (
            /* ── Order Cards ── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {filtered.map((order, idx) => {
                  const d = order.createdAt?.toDate ? order.createdAt.toDate()
                    : order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date();
                  const firstImg = order.items.find(i => i.image)?.image;
                  const dotColor = STATUS_DOT[order.orderStatus] || 'bg-gray-400';
                  const isDelivered = order.orderStatus === 'Delivered';

                  return (
                    <motion.div key={order.id || order.orderId}
                      layout
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.3) }}>
                      <Link href={`/order/${order.orderId}`}>
                        <a className="block bg-white rounded-[20px] border border-[#E8D8D1]/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-[#E8D8D1] transition-all cursor-pointer group overflow-hidden">
                          {/* Order Header */}
                          <div className={`px-5 py-3 border-b border-[#E8D8D1]/40 flex items-center justify-between ${isDelivered ? 'bg-emerald-50/30' : 'bg-[#FBF8F6]'}`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                              <span className="text-xs font-bold text-[#8E5E4F]">{order.orderStatus}</span>
                            </div>
                            <span className="text-[11px] font-medium text-[#8E5E4F]/50">{format(d, 'dd MMM yyyy')}</span>
                          </div>

                          {/* Order Body */}
                          <div className="px-5 py-4 flex items-center gap-4">
                            {/* Thumbnail */}
                            <div className="w-16 h-16 rounded-xl bg-[#FBF8F6] border border-[#E8D8D1]/50 overflow-hidden shrink-0 relative group-hover:border-[#B47A67]/30 transition-colors">
                              {firstImg ? <img src={firstImg} alt="" className="w-full h-full object-cover mix-blend-multiply" />
                                : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-[#8E5E4F]/20" /></div>}
                              {order.items.length > 1 && (
                                <div className="absolute bottom-0 right-0 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-tl-lg">
                                  +{order.items.length - 1}
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-[#8E5E4F]/40 font-mono tracking-wider mb-1">ID: {order.orderId}</p>
                              <h3 className="text-sm font-bold text-[#8E5E4F] truncate mb-1">
                                {order.items.map(i => i.name).join(', ')}
                              </h3>
                              <p className="text-sm font-black text-[#B47A67]">₹{order.total.toLocaleString()}</p>
                            </div>

                            <div className="w-8 h-8 rounded-full bg-[#FBF8F6] flex items-center justify-center shrink-0 group-hover:bg-[#B47A67] group-hover:text-white transition-colors text-[#8E5E4F]/40">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </a>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* ── Shop more ── */}
          {orders.length > 0 && (
            <div className="mt-8 mb-6">
              <Link href="/shop">
                <button className="w-full py-4 bg-white border-2 border-dashed border-[#B47A67]/30 rounded-2xl text-sm font-bold text-[#B47A67] hover:bg-[#FBF8F6] hover:border-[#B47A67]/50 active:scale-95 transition-all">
                  Shop more from Thealankar
                </button>
              </Link>
            </div>
          )}
          
          {/* ── Offers slider ── */}
          <div className="mt-6 mb-4">
            <CompactOffersSlider />
          </div>

        </div>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
