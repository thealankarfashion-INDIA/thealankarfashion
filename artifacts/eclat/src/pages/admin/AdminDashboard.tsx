import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, Grid, Play, Award, Tag, Megaphone,
  ShoppingCart, FileText, LogOut, Menu, Sparkles, TrendingUp,
  Users, DollarSign, ChevronRight, Settings, Star, ArrowUpRight,
  ArrowDownRight, AlertCircle
} from "lucide-react";
import { ProductsSection } from "./sections/ProductsSection";
import { CategoriesSection } from "./sections/CategoriesSection";
import { VideosSection } from "./sections/VideosSection";
import { BrandsSection } from "./sections/BrandsSection";
import { OffersSection } from "./sections/OffersSection";
import { AnnouncementsSection } from "./sections/AnnouncementsSection";
import { OrdersSection } from "./sections/OrdersSection";
import { InvoicesSection } from "./sections/InvoicesSection";
import { SettingsSection } from "./sections/SettingsSection";
import { DeliverySettingsSection } from "./sections/DeliverySettingsSection";
import { MainBannersSection } from "./sections/MainBannersSection";
import { CouponsSection } from "./sections/CouponsSection";
import { ReferralsSection } from "./sections/ReferralsSection";
import { RatingsSection } from "./sections/RatingsSection";
import { SupportSection } from "./sections/SupportSection";
import { ImageIcon, Gift, Share2, MessageSquare, Truck } from "lucide-react";

type Section = "overview" | "mainBanners" | "products" | "categories" | "videos" | "brands" | "offers" | "coupons" | "announcements" | "orders" | "invoices" | "referrals" | "ratings" | "support" | "settings" | "delivery";

const NAV = [
  { id: "overview" as Section, label: "Overview", icon: LayoutDashboard },
  { id: "mainBanners" as Section, label: "Main Banners", icon: ImageIcon },
  { id: "products" as Section, label: "Products", icon: Package },
  { id: "categories" as Section, label: "Categories", icon: Grid },
  { id: "videos" as Section, label: "Demo Videos", icon: Play },
  { id: "brands" as Section, label: "Brands", icon: Award },
  { id: "offers" as Section, label: "Offers & Promotions", icon: Tag },
  { id: "coupons" as Section, label: "Coupon Codes", icon: Gift },
  { id: "announcements" as Section, label: "Announcements", icon: Megaphone },
  { id: "orders" as Section, label: "Orders", icon: ShoppingCart },
  { id: "invoices" as Section, label: "Invoices", icon: FileText },
  { id: "referrals" as Section, label: "Referrals", icon: Share2 },
  { id: "ratings" as Section, label: "App Ratings", icon: Star },
  { id: "support" as Section, label: "Help & Support", icon: MessageSquare },
  { id: "settings" as Section, label: "Store Settings", icon: Settings },
  { id: "delivery" as Section, label: "Delivery Charges", icon: Truck },
];

interface AdminDashboardProps { onLogout: () => void; }

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [section, setSection] = useState<Section>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  const SectionContent = () => {
    switch (section) {
      case "mainBanners": return <MainBannersSection />;
      case "products": return <ProductsSection />;
      case "categories": return <CategoriesSection />;
      case "videos": return <VideosSection />;
      case "brands": return <BrandsSection />;
      case "offers": return <OffersSection />;
      case "coupons": return <CouponsSection />;
      case "announcements": return <AnnouncementsSection />;
      case "orders": return <OrdersSection />;
      case "invoices": return <InvoicesSection />;
      case "referrals": return <ReferralsSection />;
      case "ratings": return <RatingsSection />;
      case "support": return <SupportSection />;
      case "settings": return <SettingsSection />;
      case "delivery": return <DeliverySettingsSection />;
      default: return <Overview setSection={setSection} />;
    }
  };

  const Sidebar = ({ mobile = false }) => (
    <div className={`${mobile ? "flex flex-col h-full" : "hidden lg:flex flex-col h-full"}`}>
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl overflow-hidden">
            <img src="/images/tamil-jewelry/PHOTO-2026-05-30-12-48-46.jpg" alt="Thealankar" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="font-serif italic text-white text-sm">Thealankar</div>
            <div className="text-white/40 text-[9px] tracking-widest uppercase">Admin Panel</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {NAV.map(item => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button key={item.id} onClick={() => { setSection(item.id); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all text-left ${active ? "bg-white/15 text-white" : "text-white/50 hover:bg-white/8 hover:text-white/80"}`}>
              <Icon className={`h-4 w-4 flex-shrink-0 ${active ? "text-[#E4C7BC]" : ""}`} />
              <span>{item.label}</span>
              {active && <ChevronRight className="h-3 w-3 ml-auto opacity-60" />}
            </button>
          );
        })}
      </nav>
      <div className="px-3 py-5 border-t border-white/10 space-y-1">
        <a href="/" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/50 hover:bg-white/8 hover:text-white/80 transition-all">
          <Sparkles className="h-4 w-4" /> View Site
        </a>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/50 hover:bg-red-500/20 hover:text-red-300 transition-all">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F7F1EE] overflow-hidden">
      <aside className="hidden lg:flex w-64 bg-[#8E5E4F] flex-col flex-shrink-0">
        <Sidebar />
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden" />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.25 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-[#8E5E4F] flex flex-col lg:hidden">
              <Sidebar mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-[#E8D8D1] px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 hover:bg-[#F7F1EE] rounded-lg transition-colors">
              <Menu className="h-5 w-5 text-[#8E5E4F]" />
            </button>
            <div>
              <h1 className="font-serif text-lg text-[#8E5E4F]">{NAV.find(n => n.id === section)?.label || "Overview"}</h1>
              <p className="text-[10px] text-[#8E5E4F]/50 tracking-wider uppercase hidden sm:block">Thealankar · Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-[#F7F1EE] px-4 py-2 rounded-xl">
              <div className="h-7 w-7 bg-[#B47A67] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-medium">A</span>
              </div>
              <span className="text-sm text-[#8E5E4F]">Admin</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <SectionContent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ─── Animated counter ────────────────────────────────────────────────────────
function AnimCount({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (value === 0) { setN(0); return; }
    let cur = 0;
    const step = value / 55;
    const t = setInterval(() => {
      cur += step;
      if (cur >= value) { setN(value); clearInterval(t); }
      else setN(Math.floor(cur));
    }, 16);
    return () => clearInterval(t);
  }, [value]);
  return <>{prefix}{n.toLocaleString()}</>;
}

// ─── Spark bars (brand palette only) ─────────────────────────────────────────
function Spark({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[3px] h-6 mt-3">
      {data.map((v, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.2 + i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
          style={{ height: `${Math.max((v / max) * 100, 10)}%`, transformOrigin: 'bottom' }}
          className={`flex-1 rounded-[2px] ${i === data.length - 1 ? 'bg-[#B47A67]' : 'bg-[#E8D8D1]'}`}
        />
      ))}
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function Overview({ setSection }: { setSection: (s: Section) => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState(0);
  const [referrals, setReferrals] = useState(0);
  const [ratings, setRatings] = useState({ count: 0, avg: 0 });

  useEffect(() => {
    (async () => {
      try {
        const { getDB } = await import("@/lib/supabase");
        const { collection, onSnapshot, query } = await import("@/lib/supabaseStore");
        const db = getDB();
        const u1 = onSnapshot(collection(db, "products"), s => setProducts(s.size));
        const u2 = onSnapshot(query(collection(db, "orders")), s => {
          const arr = s.docs.map(d => ({ id: d.id, ...d.data() }));
          arr.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
          setOrders(arr);
        });
        const u3 = onSnapshot(collection(db, "referrals"), s => setReferrals(s.size));
        const u4 = onSnapshot(collection(db, "appRatings"), s => {
          const docs = s.docs.map(d => d.data() as any);
          const avg = docs.length > 0 ? docs.reduce((sum, d) => sum + (d.rating || 0), 0) / docs.length : 0;
          setRatings({ count: docs.length, avg: parseFloat(avg.toFixed(1)) });
        });
        return () => { u1(); u2(); u3(); u4(); };
      } catch { return undefined; }
    })();
  }, []);

  const now = new Date();
  const totalRev = orders.reduce((s, o) => s + (o.total || 0), 0);

  const inMonth = (o: any, offset = 0) => {
    const ts = o.createdAt?.toDate?.() || o.createdAt;
    if (!ts) return false;
    const d = new Date(ts);
    const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
  };

  const thisMonth  = orders.filter(o => inMonth(o, 0));
  const lastMonth  = orders.filter(o => inMonth(o, 1));
  const thisRev    = thisMonth.reduce((s, o) => s + (o.total || 0), 0);
  const lastRev    = lastMonth.reduce((s, o) => s + (o.total || 0), 0);
  const revGrowth  = lastRev > 0 ? ((thisRev - lastRev) / lastRev * 100) : 0;
  const ordGrowth  = lastMonth.length > 0 ? ((thisMonth.length - lastMonth.length) / lastMonth.length * 100) : 0;

  const dayRevenue = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return orders.filter(o => {
      const ts = o.createdAt?.toDate?.() || o.createdAt;
      return ts && new Date(ts).toDateString() === d.toDateString();
    }).reduce((s, o) => s + (o.total || 0), 0);
  });

  const dayOrders = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return orders.filter(o => {
      const ts = o.createdAt?.toDate?.() || o.createdAt;
      return ts && new Date(ts).toDateString() === d.toDateString();
    }).length;
  });

  const sc = {
    pending:      orders.filter(o => o.orderStatus === 'Payment Pending').length,
    verifying:    orders.filter(o => o.orderStatus === 'Under Verification').length,
    processing:   orders.filter(o => o.orderStatus === 'Processing').length,
    shipped:      orders.filter(o => o.orderStatus === 'Shipped').length,
    delivered:    orders.filter(o => o.orderStatus === 'Delivered').length,
    cancelled:    orders.filter(o => o.orderStatus === 'Cancelled').length,
  };
  const actionNeeded = sc.pending + sc.verifying;

  const recentOrders = orders.slice(0, 5).map(o => ({
    id: o.orderId || o.id,
    customer: o.customerName || 'Unknown',
    amount: o.total || 0,
    status: o.orderStatus || 'Pending',
  }));

  const STATUS_LABEL: Record<string, string> = {
    'Delivered': 'Delivered', 'Shipped': 'Shipped', 'Processing': 'Processing',
    'Payment Pending': 'Pending', 'Under Verification': 'Verifying',
    'Verified': 'Verified', 'Rejected': 'Rejected', 'Cancelled': 'Cancelled',
  };

  // Slide-up fade helper
  const su = (delay = 0) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] as any },
  });

  return (
    <div className="space-y-5">

      {/* ── Header ───────────────────────────────────────────────── */}
      <motion.div {...su(0)} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute h-full w-full rounded-full bg-[#B47A67] opacity-50" />
              <span className="relative flex h-2 w-2 rounded-full bg-[#B47A67]" />
            </span>
            <span className="text-[9px] tracking-[0.3em] uppercase text-[#8E5E4F]/40">Live · {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
          <h2 className="font-serif text-[26px] text-[#2C1E16]">Dashboard</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {actionNeeded > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setSection("orders")}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F7F1EE] border border-[#E8D8D1] text-[#8E5E4F] rounded-xl text-sm hover:bg-[#E8D8D1] transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5 text-[#B47A67]" />
              {actionNeeded} need action
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setSection("orders")}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#8E5E4F] text-white rounded-xl text-sm font-medium hover:bg-[#7A5144] transition-colors"
          >
            <ShoppingCart className="w-4 h-4" /> Manage Orders
          </motion.button>
        </div>
      </motion.div>

      {/* ── 4 KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Revenue', value: totalRev, prefix: '₹',
            sub: `₹${thisRev.toLocaleString()} this month`,
            growth: revGrowth, spark: dayRevenue, icon: DollarSign,
          },
          {
            label: 'Total Orders', value: orders.length, prefix: '',
            sub: `${thisMonth.length} this month`,
            growth: ordGrowth, spark: dayOrders, icon: ShoppingCart,
          },
          {
            label: 'Products', value: products, prefix: '',
            sub: 'in catalogue',
            growth: 0, spark: new Array(7).fill(products || 1), icon: Package,
          },
          {
            label: 'Referrals', value: referrals, prefix: '',
            sub: `${ratings.count} ratings · ${ratings.avg || '—'}★`,
            growth: 0, spark: [1, 2, 2, 3, 2, 4, referrals || 1], icon: Users,
          },
        ].map((s, i) => {
          const Icon = s.icon;
          const up = s.growth >= 0;
          return (
            <motion.div
              key={s.label}
              {...su(0.05 + i * 0.07)}
              whileHover={{ y: -3, boxShadow: '0 8px 24px -6px rgba(142,94,79,0.12)', transition: { duration: 0.2 } }}
              className="bg-white border border-[#E8D8D1] rounded-2xl p-4 sm:p-5 cursor-default"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#F7F1EE] rounded-xl flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#B47A67]" />
                </div>
                {s.growth !== 0 && (
                  <div className="flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F7F1EE] border border-[#E8D8D1] text-[#8E5E4F]">
                    {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3 opacity-50" />}
                    {Math.abs(s.growth).toFixed(0)}%
                  </div>
                )}
              </div>
              <div className="font-serif text-xl sm:text-2xl text-[#2C1E16] tabular-nums">
                <AnimCount value={s.value} prefix={s.prefix} />
              </div>
              <div className="text-xs text-[#8E5E4F] mt-0.5">{s.label}</div>
              <div className="text-[10px] text-[#8E5E4F]/40 mt-0.5">{s.sub}</div>
              <Spark data={s.spark} />
            </motion.div>
          );
        })}
      </div>

      {/* ── Pipeline + Snapshot ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Order pipeline */}
        <motion.div {...su(0.28)} className="lg:col-span-2 bg-white border border-[#E8D8D1] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif text-[15px] text-[#2C1E16]">Order Pipeline</h3>
            <button onClick={() => setSection("orders")} className="text-xs text-[#B47A67] hover:text-[#8E5E4F] transition-colors">
              View all →
            </button>
          </div>

          {/* Progress bars */}
          <div className="space-y-3.5 mb-6">
            {[
              { label: 'Delivered', count: sc.delivered },
              { label: 'Shipped', count: sc.shipped },
              { label: 'Processing', count: sc.processing },
              { label: 'Action needed', count: actionNeeded },
            ].map((row, i) => {
              const pct = orders.length > 0 ? Math.round((row.count / orders.length) * 100) : 0;
              return (
                <motion.div key={row.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 + i * 0.07 }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[#8E5E4F]/70">{row.label}</span>
                    <span className="text-xs font-semibold text-[#2C1E16]">{row.count}
                      <span className="text-[#8E5E4F]/30 font-normal ml-1">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#F7F1EE] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.38 + i * 0.09, duration: 0.7, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #E8D8D1, #B47A67)' }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Status mini-tiles */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-5 border-t border-[#F7F1EE]">
            {[
              { label: 'Pending',    count: sc.pending },
              { label: 'Verifying', count: sc.verifying },
              { label: 'Processing',count: sc.processing },
              { label: 'Shipped',   count: sc.shipped },
              { label: 'Delivered', count: sc.delivered },
              { label: 'Cancelled', count: sc.cancelled },
            ].map((s, i) => (
              <motion.button
                key={s.label}
                initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.42 + i * 0.05 }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                onClick={() => setSection("orders")}
                className="bg-[#F7F1EE] hover:bg-[#E8D8D1] rounded-xl p-3 text-center transition-colors"
              >
                <div className="font-serif text-[18px] text-[#2C1E16]">{s.count}</div>
                <div className="text-[9px] tracking-wide uppercase text-[#8E5E4F]/45 mt-0.5 leading-tight">{s.label}</div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Store snapshot */}
        <motion.div {...su(0.32)} className="bg-white border border-[#E8D8D1] rounded-2xl p-5">
          <h3 className="font-serif text-[15px] text-[#2C1E16] mb-4">Store Snapshot</h3>
          <div className="divide-y divide-[#F7F1EE]">
            {[
              {
                label: 'Avg Order Value',
                value: orders.length > 0 ? `₹${Math.round(totalRev / orders.length).toLocaleString()}` : '—',
                sec: 'orders' as Section,
              },
              {
                label: 'Monthly Revenue',
                value: `₹${thisRev.toLocaleString()}`,
                sec: 'invoices' as Section,
              },
              {
                label: 'App Ratings',
                value: `${ratings.count} reviews · ${ratings.avg || '—'}★`,
                sec: 'ratings' as Section,
              },
              {
                label: 'Total Referrals',
                value: `${referrals} referrals`,
                sec: 'referrals' as Section,
              },
            ].map((m, i) => (
              <motion.button
                key={m.label}
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.38 + i * 0.07 }}
                onClick={() => setSection(m.sec)}
                className="w-full flex items-center justify-between group py-3.5 text-left"
              >
                <div>
                  <div className="text-[10px] tracking-wide uppercase text-[#8E5E4F]/40">{m.label}</div>
                  <div className="text-sm font-medium text-[#2C1E16] mt-0.5">{m.value}</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#E8D8D1] group-hover:text-[#B47A67] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Recent Orders + Quick Nav ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent orders */}
        <motion.div {...su(0.38)} className="lg:col-span-2 bg-white border border-[#E8D8D1] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8D8D1]">
            <h3 className="font-serif text-[15px] text-[#2C1E16]">Recent Orders</h3>
            <button onClick={() => setSection("orders")} className="text-xs text-[#B47A67] hover:text-[#8E5E4F] transition-colors">
              View all →
            </button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="py-14 text-center">
              <ShoppingCart className="w-8 h-8 text-[#E8D8D1] mx-auto mb-2" />
              <p className="text-sm text-[#8E5E4F]/40">No orders yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F7F1EE]">
              {recentOrders.map((o, i) => (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42 + i * 0.06 }}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F7F1EE]/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-[#F7F1EE] rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 text-[#B47A67]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-medium text-[#2C1E16] truncate">{o.id}</div>
                      <div className="text-[11px] text-[#8E5E4F]/50 truncate">{o.customer}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="hidden sm:inline text-[10px] text-[#8E5E4F]/60 bg-[#F7F1EE] border border-[#E8D8D1] px-2.5 py-1 rounded-full whitespace-nowrap">
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                    <span className="font-serif text-sm text-[#2C1E16]">₹{o.amount.toLocaleString()}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick Navigate */}
        <motion.div {...su(0.43)} className="bg-white border border-[#E8D8D1] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8D8D1]">
            <h3 className="font-serif text-[15px] text-[#2C1E16]">Navigate</h3>
          </div>
          <div className="p-3 grid grid-cols-2 gap-1">
            {NAV.filter(n => n.id !== "overview").slice(0, 8).map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.46 + i * 0.04 }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setSection(item.id)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-[#F7F1EE] transition-colors group text-left"
                >
                  <div className="w-7 h-7 bg-[#F7F1EE] group-hover:bg-[#E8D8D1] rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-[#8E5E4F]" />
                  </div>
                  <span className="text-[11px] text-[#8E5E4F]/60 group-hover:text-[#8E5E4F] leading-tight transition-colors line-clamp-1">{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
