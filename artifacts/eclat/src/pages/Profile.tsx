import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Link, useLocation, useSearch } from 'wouter';
import {
  LogOut, Package, ChevronRight, User as UserIcon,
  Mail, Lock, Eye, EyeOff, Sparkles, Heart,
  Settings as SettingsIcon, MessageSquare, ShoppingBag, MapPin, Send, Paperclip,
  Wallet, Ticket, Crown, Bell, Building, Briefcase, Plus, MoreHorizontal, MoreVertical, Share2, Home,
  ArrowLeft, ArrowUp, Edit2, X, ChevronDown, Search as SearchIcon, CreditCard, Banknote, Star, HelpCircle, Navigation, Calendar, Loader2, CheckCircle2
} from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/seo/SEO';
import { useWishlist } from '@/context/WishlistContext';
import useStoreProducts from '@/hooks/useStoreProducts';
import useStoreCategories from '@/hooks/useStoreCategories';
import ProductCard from '@/components/product/ProductCard';
import { subscribeToUserOrders } from '@/lib/orders';
import { printInvoice } from '@/lib/invoice';
import { Order } from '@/lib/types';
import TrackingAnimation from '@/components/order/TrackingAnimation';
import { getUserProfile, updateUserProfile, saveUserAddress, deleteUserAddress, UserProfile, UserAddress } from '@/lib/user';
import MapPicker from '@/components/profile/MapPicker';
import AddressMapModal from '@/components/profile/AddressMapModal';
import CouponScratchCard from '@/components/profile/CouponScratchCard';
import CouponDetailsModal from '@/components/profile/CouponDetailsModal';
import { ProfileDashboardSkeleton, LoginPageSkeleton } from '@/components/ui/SkeletonLoaders';
import { collection, onSnapshot, query, orderBy, getDocs } from '@/lib/supabaseStore';
import { getDB } from '@/lib/supabase';
import RateAppModal from '@/components/profile/RateAppModal';

const FloatingInput = ({ label, value, onChange, actionText, isClearable, type = "text", disabled = false, options = [], ...props }: any) => (
  <div className="relative mt-4">
    <div className="absolute -top-2 left-3 bg-white px-1 z-10">
      <span className="text-[10px] text-[#8E5E4F]/40 tracking-wide font-medium">{label}</span>
    </div>
    <div className="flex items-center border border-[#E8D8D1] rounded-xl overflow-hidden focus-within:border-[#B47A67] transition-colors bg-white h-[52px]">
      {options.length > 0 ? (
        <select value={value} onChange={onChange} className="flex-1 w-full px-4 h-full text-sm font-medium text-[#8E5E4F] outline-none bg-transparent appearance-none">
          {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="flex-1 w-full px-4 h-full text-sm font-medium text-[#8E5E4F] outline-none bg-transparent disabled:opacity-50"
          {...props}
        />
      )}

      {options.length > 0 && (
        <div className="px-4 pointer-events-none text-[#8E5E4F]/50"><ChevronDown className="w-4 h-4" /></div>
      )}

      {actionText && (
        <button type="button" className="px-4 text-xs font-bold tracking-widest text-[#B47A67] uppercase hover:opacity-70 h-full flex items-center">
          {actionText}
        </button>
      )}
      {isClearable && value && (
        <button type="button" onClick={() => onChange({ target: { value: '' } })} className="px-4 text-[#8E5E4F]/40 hover:text-[#8E5E4F] h-full flex items-center">
          <div className="bg-[#8E5E4F]/10 rounded-full p-0.5"><X className="w-3 h-3" /></div>
        </button>
      )}
    </div>
  </div>
);

export default function Profile() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, logout, loading, error, clearError, googleAuthEnabled } = useAuth();
  const { items: wishlistIds } = useWishlist();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();

  // Auth Form State
  const [authStep, setAuthStep] = useState<'email' | 'password'>('email');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Dashboard State
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'wishlist' | 'stylist' | 'settings' | 'addresses' | 'coupons' | 'payment'>('overview');
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userCoupons, setUserCoupons] = useState<any[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<any | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [openAddressMenuId, setOpenAddressMenuId] = useState<string | null>(null);
  const [showRateAppModal, setShowRateAppModal] = useState(false);
  const checkoutNextPath = new URLSearchParams(searchParams).get('next');
  const shouldLoadProducts = activeTab === 'stylist' || (activeTab === 'wishlist' && wishlistIds.length > 0);
  const shouldLoadCategories = activeTab === 'stylist';
  const { products } = useStoreProducts(shouldLoadProducts);
  const { categories } = useStoreCategories(shouldLoadCategories);
  const wishlistProducts = useMemo(
    () => products.filter((product) => wishlistIds.includes(product.id)),
    [products, wishlistIds]
  );

  useEffect(() => {
    if (checkoutNextPath?.startsWith('/')) {
      sessionStorage.setItem('thealankar_post_auth_redirect', checkoutNextPath);
    }
  }, [checkoutNextPath]);

  useEffect(() => {
    if (!user?.uid) {
      setUserProfile(null);
      setUserOrders([]);
      setUserCoupons([]);
      return;
    }

    setUserProfile(prev => prev?.uid === user.uid ? prev : {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email || 'Thealankar',
      totalSavings: 0,
      wishlist: [],
      walletUsagePercent: 50,
      savedAddresses: [],
    });

    getUserProfile(user.uid, user.email || '', user.displayName || '')
      .then(setUserProfile)
      .catch(console.error);
    
    // Subscribe to orders
    const unsubOrders = subscribeToUserOrders(user.uid, setUserOrders);
    
    // Subscribe to coupons — filter out orphans in real-time
    const db = getDB();
    const couponsQuery = query(collection(db, 'users', user.uid, 'coupons'), orderBy('assignedAt', 'desc'));
    const unsubCoupons = onSnapshot(couponsQuery, async (snap) => {
      const userCouponDocs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      // Fetch valid master coupon IDs
      try {
        const masterSnap = await getDocs(collection(db, 'coupons'));
        const validIds = new Set(masterSnap.docs.map(d => d.id));
        // Only keep coupons whose parent coupon still exists
        setUserCoupons(userCouponDocs.filter(c => validIds.has(c.couponId)));
      } catch {
        // On error fallback: show all
        setUserCoupons(userCouponDocs);
      }
    });

    return () => {
      if (typeof unsubOrders === 'function') unsubOrders();
      unsubCoupons();
    };
  }, [user?.uid]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const tab = params.get('tab');
    if (tab && ['overview', 'orders', 'wishlist', 'stylist', 'settings', 'addresses', 'payment'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  useEffect(() => {
    if (loading || !user) return;
    const pendingRedirect = checkoutNextPath || sessionStorage.getItem('thealankar_post_auth_redirect');
    if (pendingRedirect && pendingRedirect.startsWith('/')) {
      sessionStorage.removeItem('thealankar_post_auth_redirect');
      setLocation(pendingRedirect);
    }
  }, [checkoutNextPath, loading, setLocation, user]);

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!user || !userProfile) return;
    const updatedAddresses = userProfile.savedAddresses?.map(addr => ({
      ...addr,
      isDefault: addr.id === addressId
    })) || [];
    setUserProfile({ ...userProfile, savedAddresses: updatedAddresses });
    await updateUserProfile(user.uid, { savedAddresses: updatedAddresses });
  };

  useEffect(() => {
    // Instantly reset scroll to top when changing tabs so it feels like a new page
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' } as any);
  }, [activeTab]);

  // Stylist Chat State
  type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
    products?: { name: string; image: string; price: number; link: string }[];
  }
  const [isChatting, setIsChatting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Vanakkam! 💛 I'm your Thealankar Stylist Jewellery Stylist. I can help you find the perfect Necklace, Earrings, Hair Clips, or Rings from our Tamil Nadu collection. What are you looking for today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isStylistTyping, setIsStylistTyping] = useState(false);

  const handleSendChatMessage = (e?: React.FormEvent, content?: string) => {
    if (e) e.preventDefault();
    const text = content || chatInput;
    if (!text.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setChatInput('');
    setIsStylistTyping(true);

    setTimeout(() => {
      const lowerText = text.toLowerCase();
      let responseContent = "";
      let responseProducts: { name: string; image: string; price: number; link: string }[] = [];

      // Helper: Format real store products for the chat card
      const formatProducts = (prods: typeof products, limit = 2) =>
        prods.slice(0, limit).map(p => ({
          name: p.name,
          image: p.image || (p.images && p.images[0]) || "",
          price: p.price,
          link: `/product/${p.id}`
        }));

      // Helper: Find a real store category by name keyword
      const findCategory = (keyword: string) =>
        categories.find(cat => cat.name.toLowerCase().includes(keyword) || keyword.includes(cat.name.toLowerCase()));

      // Helper: Filter products by category ID
      const productsByCategory = (catId: string) =>
        products.filter(p => p.category === catId || p.category.toLowerCase() === catId.toLowerCase());

      // Helper: Filter products by name keyword
      const productsByName = (keyword: string) =>
        products.filter(p => p.name.toLowerCase().includes(keyword));

      // Helper: Get bestseller/featured products as fallback
      const getFallback = () => {
        const bs = products.filter(p => p.isBestseller || p.featured);
        return bs.length > 0 ? bs : products;
      };

      // ── EARRINGS intent ──
      if (lowerText.includes("earring") || lowerText.includes("jhumka") || lowerText.includes("ear ring") ||
        lowerText.includes("hoops") || lowerText.includes("peacock") || lowerText.includes("lotus") ||
        lowerText.includes("silver jhumka") || lowerText.includes("butterfly earring")) {
        const cat = findCategory("earring");
        const earrings = cat ? productsByCategory(cat.id) : productsByName("earring").concat(productsByName("jhumka"));
        if (lowerText.includes("peacock")) {
          responseContent = "Our Peacock Jhumkas are absolutely stunning! 🦚 Available in 6 vibrant colors — Pink, Aqua Blue, Red, Black, Green, and Brown. Perfect for any traditional occasion!";
          const peacock = productsByName("peacock");
          responseProducts = formatProducts(peacock.length > 0 ? peacock : earrings);
        } else if (lowerText.includes("lotus")) {
          responseContent = "The Lotus Jhumka is one of our most loved designs! 🌸 Available in Red, Green, Pink, and Blue — a beautiful symbol of Tamil Nadu's floral heritage.";
          const lotus = productsByName("lotus");
          responseProducts = formatProducts(lotus.length > 0 ? lotus : earrings);
        } else if (lowerText.includes("butterfly")) {
          responseContent = "Our Butterfly Earrings are delicate and gorgeous! 🦋 Available in multiple styles — single, combo packs, and more. A bestseller for a reason!";
          const butterfly = productsByName("butterfly").filter(p => p.name.toLowerCase().includes("ear"));
          responseProducts = formatProducts(butterfly.length > 0 ? butterfly : earrings);
        } else if (lowerText.includes("silver") || lowerText.includes("long")) {
          responseContent = "Looking for a classic piece? Our Silver Long Jhumka and Silver Jhumka are timeless beauties that pair with any outfit — traditional or modern! ✨";
          const silver = productsByName("silver jhumka");
          responseProducts = formatProducts(silver.length > 0 ? silver : earrings);
        } else {
          responseContent = "We have a stunning collection of Earrings! 💛 From Peacock Jhumkas to Lotus Jhumkas, Butterfly Earrings, Silver Jhumkas, and Hoops — there's something for every mood and occasion. Here are some favorites:";
          responseProducts = formatProducts(earrings.length > 0 ? earrings : getFallback());
        }
      }
      // ── NECKLACE intent ──
      else if (lowerText.includes("necklace") || lowerText.includes("chain") || lowerText.includes("pendant") || lowerText.includes("choker")) {
        const cat = findCategory("necklace");
        const necklaces = cat ? productsByCategory(cat.id) : productsByName("necklace");
        responseContent = "Our Necklace collection is perfect for any look — from everyday elegance to festive glam! 💛 The Butterfly Necklace Clip is one of our most unique pieces. Check it out:";
        responseProducts = formatProducts(necklaces.length > 0 ? necklaces : getFallback());
      }
      // ── CLIPS intent ──
      else if (lowerText.includes("clip") || lowerText.includes("hair clip") || lowerText.includes("clutcher") ||
        lowerText.includes("hair") || lowerText.includes("3 in 1") || lowerText.includes("7 in 1") ||
        lowerText.includes("flower") || lowerText.includes("clutch")) {
        const cat = findCategory("clip");
        const clips = cat ? productsByCategory(cat.id) : productsByName("clip");
        if (lowerText.includes("flower") || lowerText.includes("clutcher")) {
          responseContent = "Our Flower Hair Clutchers are absolutely beautiful! 🌸 Available in multiple gorgeous color combinations like Pink+Green+Violet, Red+Blue+Violet, Green+Blue+Red, and more. Perfect for a traditional look!";
          const flower = productsByName("flower");
          responseProducts = formatProducts(flower.length > 0 ? flower : clips);
        } else if (lowerText.includes("3 in 1") || lowerText.includes("7 in 1") || lowerText.includes("combo")) {
          responseContent = "Our Clip Combos are the best value! 🎉 The 3-in-1 and 7-in-1 clip sets give you multiple stylish clips in one pack. Perfect for gifting too!";
          const combo = productsByName("in 1");
          responseProducts = formatProducts(combo.length > 0 ? combo : clips);
        } else {
          responseContent = "Our Hair Clips collection has something for everyone! 📎 From simple Clips to 3-in-1 & 7-in-1 combos, and stunning Flower Hair Clutchers in multiple colors. Here are some top picks:";
          responseProducts = formatProducts(clips.length > 0 ? clips : getFallback());
        }
      }
      // ── RINGS intent ──
      else if (lowerText.includes("ring") || lowerText.includes("finger")) {
        const cat = findCategory("ring");
        const rings = cat ? productsByCategory(cat.id) : productsByName("ring");
        responseContent = "Our Rings collection has beautiful pieces for every finger! 💍 Check out our latest designs:";
        responseProducts = formatProducts(rings.length > 0 ? rings : getFallback());
      }
      // ── WEDDING / MUHURTHAM intent ──
      else if (lowerText.includes("wedding") || lowerText.includes("muhurtham") || lowerText.includes("marriage") || lowerText.includes("bride") || lowerText.includes("bridal")) {
        responseContent = "Attending a traditional Muhurtham or wedding in Chennai? 💛 A classic Peacock Jhumka or a beautiful Lotus Jhumka is the perfect finishing touch to your pattu saree look. Here are our most loved bridal pieces:";
        const jhumkas = productsByName("jhumka");
        responseProducts = formatProducts(jhumkas.length > 0 ? jhumkas : getFallback());
      }
      // ── FESTIVAL intent ──
      else if (lowerText.includes("festival") || lowerText.includes("pongal") || lowerText.includes("deepavali") ||
        lowerText.includes("diwali") || lowerText.includes("onam") || lowerText.includes("navratri")) {
        responseContent = "Brighten up your festive look this Pongal or Deepavali! ✨ Our vibrant Lotus Jhumkas and Peacock Jhumkas are available in multiple colors — perfectly match your pattu pavadai or silk saree. Here are some festive favorites:";
        const festive = productsByName("jhumka").concat(productsByName("lotus"));
        responseProducts = formatProducts(festive.length > 0 ? festive : getFallback());
      }
      // ── GIFT intent ──
      else if (lowerText.includes("gift") || lowerText.includes("birthday") || lowerText.includes("anniversary") || lowerText.includes("surprise") || lowerText.includes("present")) {
        responseContent = "Looking for the perfect jewellery gift? 🎁 Our Peacock Jhumka sets and Butterfly Necklace Clips are bestsellers for gifting — beautifully crafted and loved by everyone. Here are our top gifting picks:";
        const gifting = products.filter(p => p.isBestseller || p.featured);
        responseProducts = formatProducts(gifting.length > 0 ? gifting : getFallback());
      }
      // ── COMBO / SET intent ──
      else if (lowerText.includes("combo") || lowerText.includes("set") || lowerText.includes("bundle")) {
        responseContent = "Love a great deal? 🎉 Our Combo sets are fantastic value! We have 2-Butterfly Combos, 1-Butterfly Combos, and our 3-in-1 and 7-in-1 Clip Combos. Here they are:";
        const combos = productsByName("combo").concat(productsByName("in 1"));
        responseProducts = formatProducts(combos.length > 0 ? combos : getFallback());
      }
      // ── NEW ARRIVALS intent ──
      else if (lowerText.includes("new") || lowerText.includes("latest") || lowerText.includes("trending") || lowerText.includes("arrivals")) {
        responseContent = "Check out our freshest arrivals! 🌟 These are the newest additions to the Thealankar jewellery family:";
        const newProds = products.filter(p => p.isNew);
        responseProducts = formatProducts(newProds.length > 0 ? newProds : getFallback());
      }
      // ── GENERAL / FALLBACK ──
      else {
        responseContent = "At Thealankar, we craft beautiful jewellery inspired by Tamil Nadu's rich heritage — from handcrafted Peacock Jhumkas to elegant Butterfly Necklaces and vibrant Hair Clips. 💛 Here are some of our bestsellers to get you started:";
        responseProducts = formatProducts(getFallback());
      }

      setMessages(prev => [...prev, { role: 'assistant', content: responseContent, products: responseProducts }]);
      setIsStylistTyping(false);
    }, 1500);
  };

  useEffect(() => {
    clearError();
    setFormError('');
  }, [isSignUp, clearError]);

  const handleLogout = async () => {
    await logout();
    setLocation('/');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (authStep === 'email') {
      if (!formData.email) {
        setFormError('Please enter a valid email address');
        return;
      }
      // Simple logic: we move to password step. We ask the user to toggle "sign up" if they don't have an account
      setAuthStep('password');
      return;
    }

    if (isSignUp && formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(formData.name, formData.email, formData.password);
      } else {
        await signInWithEmail(formData.email, formData.password);
      }
    } catch (err: any) {
      // Error is handled by AuthContext, but we can catch it here if we want to stop loading
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show skeleton only while auth itself is resolving.
  if (loading) {
    return <ProfileDashboardSkeleton />;
  }

  // LOGGED OUT: show login page if auth is done and no user found
  if (!user) {
    const AuthForm = (
      <div className="flex flex-col h-full">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6 md:hidden" />

        <h2 className="text-center text-lg font-semibold text-[#8E5E4F] mb-6">
          {authStep === 'email' ? 'Log in or sign up' : (isSignUp ? 'Create Account' : 'Enter Password')}
        </h2>

        {(error || formError) && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl text-center font-medium border border-red-100">
            {formError || error}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4 flex flex-col items-center w-full">
          {authStep === 'email' ? (
            <div className="w-full relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-gray-300 pr-3">
                <Mail className="w-5 h-5 text-[#8E5E4F]/50" />
              </div>
              <input
                type="email" required
                placeholder="Enter Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-[60px] pr-4 py-3.5 bg-white border border-[#E8D8D1] rounded-xl text-lg text-[#8E5E4F] placeholder-[#8E5E4F]/40 outline-none focus:border-[#B47A67] focus:ring-1 focus:ring-[#B47A67] transition-all"
              />
            </div>
          ) : (
            <div className="w-full space-y-3">
              <div className="text-sm text-center text-[#8E5E4F] mb-2 font-medium">
                {formData.email} <button type="button" onClick={() => setAuthStep('email')} className="text-[#B47A67] underline ml-2 text-xs">Edit</button>
              </div>
              {isSignUp && (
                <input type="text" required placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3.5 bg-white border border-[#E8D8D1] rounded-xl text-md text-[#8E5E4F] placeholder-[#8E5E4F]/40 outline-none focus:border-[#B47A67] transition-all"
                />
              )}
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-4 pr-11 py-3.5 bg-white border border-[#E8D8D1] rounded-xl text-md text-[#8E5E4F] placeholder-[#8E5E4F]/40 outline-none focus:border-[#B47A67] transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E5E4F]/40 hover:text-[#B47A67] transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {isSignUp && (
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-4 pr-11 py-3.5 bg-white border border-[#E8D8D1] rounded-xl text-md text-[#8E5E4F] placeholder-[#8E5E4F]/40 outline-none focus:border-[#B47A67] transition-all"
                  />
                </div>
              )}
              <div className="flex justify-center mt-2">
                <button type="button" onClick={() => setIsSignUp(!isSignUp)}
                  className="text-xs text-[#8E5E4F] underline hover:text-[#B47A67]">
                  {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </div>
          )}

          {authStep === 'email' && (
            <div className="flex items-start gap-2 w-full mt-2">
              <input type="checkbox" id="remember" className="mt-1 w-4 h-4 rounded text-[#B47A67] border-gray-300 focus:ring-[#B47A67]" defaultChecked />
              <label htmlFor="remember" className="text-sm text-[#8E5E4F]/80">Remember my login for faster sign-in</label>
            </div>
          )}

          <button type="submit" disabled={isSubmitting || !formData.email}
            className="w-full py-3.5 mt-2 bg-[#B47A67] text-white rounded-xl text-lg font-bold tracking-wide hover:bg-[#8E5E4F] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
            {isSubmitting ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Continue'}
          </button>
        </form>

        {authStep === 'email' && (
          <>
            <div className="flex items-center gap-4 my-6 opacity-60">
              <div className="flex-1 h-[1px] bg-gray-300" />
              <span className="text-sm text-[#8E5E4F] font-medium">or</span>
              <div className="flex-1 h-[1px] bg-gray-300" />
            </div>
            <div className="flex justify-center gap-4 mb-6">
              <button onClick={signInWithGoogle} disabled={!googleAuthEnabled}
                className={`flex items-center gap-3 px-5 py-3 rounded-xl border shadow-sm transition-all group ${googleAuthEnabled ? 'border-gray-200 hover:bg-gray-50 hover:shadow-md' : 'border-gray-200 bg-gray-100 text-[#8E5E4F]/50 cursor-not-allowed'}`}>
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="text-sm font-semibold text-[#8E5E4F]">{googleAuthEnabled ? 'Sign in with Google' : 'Google sign-in not enabled'}</span>
              </button>
            </div>
            {!googleAuthEnabled && (
              <p className="text-center text-xs text-[#8E5E4F]/60 -mt-3 mb-6">
                Email login is active now. Google sign-in can be turned on later from Supabase auth providers.
              </p>
            )}
          </>
        )}

        <div className="mt-auto pt-4 text-center">
          <p className="text-[11px] text-[#8E5E4F]/70 leading-relaxed">
            By continuing, you agree to our<br />
            <Link href="/terms" className="border-b border-[#8E5E4F]/40 hover:text-[#8E5E4F] transition-colors pb-0.5 mx-1">Terms of Service</Link>
            <Link href="/privacy" className="border-b border-[#8E5E4F]/40 hover:text-[#8E5E4F] transition-colors pb-0.5 mx-1">Privacy Policy</Link>
          </p>
        </div>
      </div>
    );

    return (
      <>
        {/* ─── MOBILE LAYOUT (unchanged) ─── */}
        <div className="md:hidden min-h-screen bg-[#111111] flex flex-col">
          <div className="flex-1 flex flex-col">
            <div className="pt-10 pb-6 px-6 relative z-10 flex flex-col items-center">
              <h1 className="text-white text-3xl font-black text-center leading-tight tracking-tight mt-4 drop-shadow-md">
                INDIA'S #1 LUXURY <br /> FASHION APP
              </h1>
              <div className="mt-3 bg-[#B47A67] px-4 py-1.5 transform -skew-x-6 shadow-lg">
                <span className="text-white font-serif text-xl italic font-bold tracking-widest block transform skew-x-6">Thealankar</span>
              </div>
            </div>
            <div className="relative w-full flex-1 min-h-[300px] bg-gradient-to-b from-[#111111] to-[#E8D8D1] -mt-10">
              <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1200&auto=format&fit=crop"
                alt="Luxury Fashion" className="absolute inset-0 w-full h-full object-cover object-top mix-blend-overlay opacity-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-[#111111]/80 pointer-events-none" />
            </div>
            <div className="bg-white rounded-t-[24px] px-6 pt-6 pb-8 z-20 w-full -mt-6 flex flex-col">
              {AuthForm}
            </div>
          </div>
        </div>

        {/* ─── DESKTOP LAYOUT ─── */}
        <div className="hidden md:flex min-h-screen bg-[#F7F1EE]">
          {/* Left: Hero Branding Panel */}
          <div className="w-[55%] relative overflow-hidden bg-[#111111] flex flex-col justify-between p-12">
            <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1600&auto=format&fit=crop"
              alt="Luxury Fashion" className="absolute inset-0 w-full h-full object-cover object-top opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#111111]/90 via-[#2C1E16]/70 to-transparent pointer-events-none" />

            {/* Brand Name */}
            <div className="relative z-10">
              <div className="bg-[#B47A67] px-5 py-2 transform -skew-x-6 shadow-xl inline-block">
                <span className="text-white font-serif text-2xl italic font-bold tracking-widest block transform skew-x-6">Thealankar</span>
              </div>
            </div>

            {/* Central Headline */}
            <div className="relative z-10">
              <h1 className="text-white text-5xl font-black leading-tight tracking-tight drop-shadow-lg mb-6">
                INDIA'S #1<br />LUXURY<br />FASHION
              </h1>
              <p className="text-white/60 text-base leading-relaxed max-w-xs">
                Discover curated collections of premium jewellery, sarees, and fashion crafted for the modern Indian woman.
              </p>
            </div>

            {/* Bottom Feature Pills */}
            <div className="relative z-10 flex flex-wrap gap-3">
              {['✦ Premium Brands', '✦ Luxury Jewellery', '✦ Exclusive Offers'].map(f => (
                <div key={f} className="bg-white/10 border border-white/20 text-white/80 text-xs font-semibold px-4 py-2 rounded-full backdrop-blur-sm">
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Auth Card */}
          <div className="w-[45%] flex items-center justify-center p-12">
            <div className="w-full max-w-[420px]">
              {/* Logo on right side */}
              <div className="mb-8">
                <div className="font-serif text-3xl text-[#8E5E4F] italic font-bold tracking-wider mb-1">Thealankar</div>
                <p className="text-[#8E5E4F]/60 text-sm">Welcome back — Sign in to your account</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-[#E8D8D1]/50">
                {AuthForm}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }


  // Menu Item Component

  const MenuItem = ({ icon: Icon, title, subtitle, rightText, hasToggle, onClick }: any) => (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 bg-white border-b border-[#E8D8D1]/50 hover:bg-[#F7F1EE]/50 transition-colors last:border-b-0">
      <div className="flex items-center gap-4">
        <Icon className="w-5 h-5 text-[#8E5E4F]/70" />
        <div className="text-left">
          <div className="text-sm md:text-base font-medium text-[#8E5E4F]">{title}</div>
          {subtitle && <div className="text-xs text-[#8E5E4F]/60 mt-0.5">{subtitle}</div>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {rightText && <span className="text-xs font-medium text-[#8E5E4F]/50">{rightText}</span>}
        {hasToggle ? (
          <div className="w-10 h-6 bg-[#E8D8D1] rounded-full relative">
            <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm"></div>
          </div>
        ) : (
          <ChevronRight className="w-4 h-4 text-[#8E5E4F]/40" />
        )}
      </div>
    </button>
  );

  // ── New list-row component (redBus-style) ──
  const ProfileListItem = ({ icon: Icon, title, subtitle, last = false, onClick }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#F7F1EE]/70 active:bg-[#F7F1EE] transition-colors group ${!last ? 'border-b border-[#E8D8D1]/70' : ''
        }`}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-full bg-[#F7F1EE] flex items-center justify-center shrink-0 group-hover:bg-[#E8D8D1] transition-colors">
          <Icon className="w-[18px] h-[18px] text-[#8E5E4F]" />
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-[#2C1E16]">{title}</div>
          {subtitle && <div className="text-xs text-[#8E5E4F]/60 mt-0.5">{subtitle}</div>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-[#8E5E4F]/40 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );

  const TabHeader = ({ title }: { title: string }) => (
    <div className="flex items-center gap-4 mb-6 sticky top-[152px] bg-[#F7F1EE] pt-4 pb-2 z-10 md:hidden">
      <button onClick={() => setActiveTab('overview')} className="p-2 -ml-2 hover:bg-[#E8D8D1]/50 rounded-full transition-colors text-[#8E5E4F]">
        <ChevronRight className="w-6 h-6 rotate-180" />
      </button>
      <h2 className="font-serif text-2xl text-[#8E5E4F]">{title}</h2>
    </div>
  );

  // Desktop Sidebar Nav Item
  const DesktopNavItem = ({ tab, icon: Icon, label, href }: { tab: string; icon: any; label: string; href?: string }) => (
    href ? (
      <Link href={href} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab
        ? 'bg-[#2C1E16] text-white shadow-md'
        : 'text-[#8E5E4F] hover:bg-[#E8D8D1]/50'
        }`}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        {label}
      </Link>
    ) : (
      <button
        onClick={() => setActiveTab(tab as any)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab
          ? 'bg-[#2C1E16] text-white shadow-md'
          : 'text-[#8E5E4F] hover:bg-[#E8D8D1]/50'
          }`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {label}
      </button>
    )
  );

  // Full Page Settings View (Bypasses Dashboard Layout — Mobile Only)
  if (user && activeTab === 'settings') {
    const isFormValid = userProfile?.displayName && userProfile?.phoneNumber;

    return (
      <div className="min-h-[100dvh] bg-white md:bg-[#F7F1EE] flex flex-col font-sans selection:bg-[#B47A67]/20">
        {/* Desktop Navbar */}
        <div className="hidden md:block">
          <Navbar />
        </div>

              {/* Mobile Top Header */}
        <div className="px-2 py-3 flex items-center bg-white border-b border-[#E8D8D1]/40 md:hidden">
          <button onClick={() => setActiveTab('overview')} className="p-2 -ml-1 text-[#2C1E16] hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" strokeWidth={2} />
          </button>
          <h1 className="text-[17px] font-semibold text-[#2C1E16] ml-2">Personal information</h1>
        </div>

        {/* Desktop: sidebar + form / Mobile: full-page form */}
        <div className="flex-1 md:pt-48 pb-24 md:pb-12">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="md:flex md:gap-8 md:items-start">

              {/* Desktop Left Sidebar */}
              <aside className="hidden md:flex flex-col gap-2 w-64 shrink-0 sticky top-48">
                <div className="bg-[#2C1E16] rounded-2xl p-5 text-white mb-4">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full object-cover border-2 border-[#D4AF37]/50" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FBF6F3] to-[#E8D8D1] text-[#8E5E4F] flex items-center justify-center text-xl font-serif border-2 border-[#D4AF37]/50 shrink-0">
                        {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{user.displayName || 'Guest'}</div>
                      <div className="text-white/50 text-xs truncate">{user.email}</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-[#D4AF37]">
                    <Crown className="w-4 h-4" />
                    <span className="text-xs font-semibold">Gold Member</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-3 border border-[#E8D8D1] shadow-sm space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-[#8E5E4F]/40 px-4 pb-1">Shopping</p>
                  <DesktopNavItem tab="overview" icon={UserIcon} label="Overview" />
                  <DesktopNavItem tab="orders" icon={Package} label="My Orders" href="/my-orders" />
                  <DesktopNavItem tab="wallet" icon={Wallet} label="Eclat Wallet" href="/wallet" />
                  <DesktopNavItem tab="wishlist" icon={Heart} label="Wishlist" />
                  <DesktopNavItem tab="stylist" icon={Sparkles} label="Virtual Stylist" />
                </div>

                <div className="bg-white rounded-2xl p-3 border border-[#E8D8D1] shadow-sm space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-[#8E5E4F]/40 px-4 pb-1">Account</p>
                  <DesktopNavItem tab="settings" icon={SettingsIcon} label="Personal Details" />
                  <DesktopNavItem tab="addresses" icon={MapPin} label="Address Book" />
                </div>

                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all">
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </aside>

              {/* Main Content */}
              <div className="flex-1 min-w-0 relative pb-24 md:pb-0">
                {/* Desktop Section Title */}
                <div className="hidden md:flex items-center justify-between mb-6">
                  <h2 className="font-serif text-2xl text-[#8E5E4F]">Personal Details</h2>
                  {formError && (
                    <div className="px-4 py-2 bg-green-50 text-green-700 text-sm rounded-xl border border-green-200 font-medium">
                      {formError}
                    </div>
                  )}
                </div>

                {/* Form Container */}
                <div className="max-w-md md:max-w-none w-full mx-auto flex-1 flex flex-col relative px-4 md:px-0 mt-2 md:mt-0">

                  {/* Avatar - desktop only */}
                  <div className="relative z-20 hidden md:flex justify-start pb-6">
                    <div className="relative">
                      <div className="w-[120px] h-[120px] rounded-full bg-gradient-to-br from-[#FBF6F3] to-[#E8D8D1] flex items-center justify-center border-4 border-white shadow-sm ring-1 ring-[#D4AF37]/50 overflow-hidden">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-5xl font-serif text-[#B47A67]">{userProfile?.displayName?.[0] || 'K'}</span>
                        )}
                      </div>
                      <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-md border border-[#E8D8D1]/60 flex items-center justify-center text-[#B47A67] hover:bg-gray-50 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile success message */}
                  {formError && (
                    <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-xl border border-green-200 text-center font-medium md:hidden">
                      {formError}
                    </div>
                  )}

                  {/* Form Container */}
                  <div className="bg-white md:rounded-2xl flex-1 -mx-4 px-5 pt-6 pb-32 md:mx-0 md:px-8 md:pt-6 md:pb-8 md:shadow-sm md:border md:border-[#E8D8D1]/40 text-left">
                    <h3 className="font-bold text-lg md:text-xl text-[#2C1E16] mb-5">Personal details</h3>
                    
                    <div className="space-y-4">
                      {/* Name */}
                      <div className="relative">
                        <input
                          value={userProfile?.displayName || ''}
                          onChange={(e) => setUserProfile(p => p ? { ...p, displayName: e.target.value } : null)}
                          placeholder="Name"
                          className="w-full border border-[#E8D8D1] rounded-[10px] px-4 py-3.5 text-[15px] focus:outline-none focus:border-[#B47A67] focus:ring-1 focus:ring-[#B47A67] text-[#2C1E16] placeholder-gray-400"
                        />
                      </div>

                      {/* Date of Birth */}
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={userProfile?.dob || ''}
                          onChange={(e) => setUserProfile(p => p ? { ...p, dob: e.target.value } : null)}
                          placeholder="Date of birth"
                          className="w-full border border-[#E8D8D1] rounded-[10px] pl-4 pr-12 py-3.5 text-[15px] focus:outline-none focus:border-[#B47A67] focus:ring-1 focus:ring-[#B47A67] text-[#2C1E16] placeholder-gray-400"
                        />
                        <Calendar className="absolute right-4 w-5 h-5 text-[#8E5E4F]" />
                      </div>

                      {/* Gender */}
                      <div>
                        <p className="text-[13px] text-gray-500 mb-2.5">Gender</p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setUserProfile(p => p ? { ...p, gender: 'Male' } : null)}
                            className={`flex-1 flex items-center justify-between border rounded-full px-4 py-3 ${userProfile?.gender === 'Male' ? 'border-[#B47A67] text-[#B47A67]' : 'border-[#E8D8D1] text-[#2C1E16]'}`}
                          >
                            <span className="text-[15px]">Male</span>
                            <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center ${userProfile?.gender === 'Male' ? 'border-[#B47A67]' : 'border-gray-300'}`}>
                              {userProfile?.gender === 'Male' && <div className="w-3 h-3 rounded-full bg-[#B47A67]" />}
                            </div>
                          </button>
                          <button
                            onClick={() => setUserProfile(p => p ? { ...p, gender: 'Female' } : null)}
                            className={`flex-1 flex items-center justify-between border rounded-full px-4 py-3 ${userProfile?.gender === 'Female' ? 'border-[#B47A67] text-[#B47A67]' : 'border-[#E8D8D1] text-[#2C1E16]'}`}
                          >
                            <span className="text-[15px]">Female</span>
                            <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center ${userProfile?.gender === 'Female' ? 'border-[#B47A67]' : 'border-gray-300'}`}>
                              {userProfile?.gender === 'Female' && <div className="w-3 h-3 rounded-full bg-[#B47A67]" />}
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-[#E8D8D1]/50 my-8 -mx-6 md:-mx-8" />

                    <h3 className="font-bold text-lg md:text-xl text-[#2C1E16] mb-5">Contact details</h3>

                    <div className="space-y-4">
                      {/* State of residence */}
                      <div>
                        <div className="relative flex items-center">
                          <select
                            className="w-full border border-[#E8D8D1] rounded-[10px] px-4 py-3.5 text-[15px] appearance-none focus:outline-none focus:border-[#B47A67] focus:ring-1 focus:ring-[#B47A67] bg-transparent z-10 text-[#2C1E16]"
                            value={userProfile?.state || ''}
                            onChange={(e: any) => setUserProfile(p => p ? { ...p, state: e.target.value } : null)}
                          >
                            <option value="" disabled hidden>State of residence</option>
                            <option value="Tamil Nadu">Tamil Nadu</option>
                            <option value="Kerala">Kerala</option>
                            <option value="Karnataka">Karnataka</option>
                            <option value="Maharashtra">Maharashtra</option>
                            <option value="Delhi">Delhi</option>
                          </select>
                          <ChevronDown className="absolute right-4 w-5 h-5 text-[#8E5E4F] z-0" />
                        </div>
                        <p className="text-[13px] text-gray-500 mt-1.5 ml-1">Required for GST Tax Invoicing</p>
                      </div>

                      {/* Mobile */}
                      <div className="flex border border-[#E8D8D1] rounded-[10px] focus-within:border-[#B47A67] focus-within:ring-1 focus-within:ring-[#B47A67]">
                        <div className="relative flex flex-col justify-center pl-4 pr-3 py-1.5 border-r border-[#E8D8D1]">
                          <span className="text-[11px] text-gray-500">Country Code</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[15px] font-medium text-[#2C1E16]">+91 (IND)</span>
                            <ChevronDown className="w-4 h-4 text-[#2C1E16]" />
                          </div>
                        </div>
                        <div className="relative flex flex-col justify-center px-4 py-1.5 flex-1">
                          <span className="text-[11px] text-gray-500">Mobile number</span>
                          <input
                            type="tel"
                            value={userProfile?.phoneNumber || ''}
                            onChange={(e) => setUserProfile(p => p ? { ...p, phoneNumber: e.target.value } : null)}
                            className="w-full border-none p-0 text-[15px] font-medium text-[#2C1E16] focus:outline-none focus:ring-0 mt-0.5 bg-transparent"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <input
                          type="email"
                          value={userProfile?.email || ''}
                          onChange={(e) => setUserProfile(p => p ? { ...p, email: e.target.value } : null)}
                          placeholder="Email"
                          disabled
                          className="w-full border border-[#E8D8D1] rounded-[10px] px-4 py-3.5 text-[15px] focus:outline-none focus:border-[#B47A67] bg-[#F7F1EE]/50 text-[#2C1E16]"
                        />
                        <p className="text-[13px] text-gray-500 mt-1.5 ml-1">Optional</p>
                      </div>
                    </div>

                    {/* Desktop Save Button */}
                    <div className="hidden md:block mt-8">
                      <button
                        onClick={async () => {
                          if (!user || !userProfile) return;
                          setIsSubmitting(true);
                          try {
                            await updateUserProfile(user.uid, {
                              displayName: userProfile.displayName,
                              phoneNumber: userProfile.phoneNumber,
                              dob: userProfile.dob,
                              anniversary: userProfile.anniversary,
                              gender: userProfile.gender
                            });
                            setFormError('Profile updated successfully!');
                            setTimeout(() => setFormError(''), 3000);
                          } catch (e) { console.error(e); }
                          setIsSubmitting(false);
                        }}
                        disabled={isSubmitting || !isFormValid}
                        className={`w-full py-3.5 rounded-full text-[15px] font-semibold transition-all flex items-center justify-center gap-2 ${isFormValid && !isSubmitting
                          ? 'bg-[#B47A67] text-white hover:bg-[#8E5E4F] shadow-sm'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }`}
                      >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save changes'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Sticky Action Bar */}
                <div
                  className="fixed left-0 right-0 bg-white px-5 pt-3 pb-3 z-[60] md:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
                  style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
                >
                    <button
                      onClick={async () => {
                        if (!user || !userProfile) return;
                        setIsSubmitting(true);
                        try {
                          await updateUserProfile(user.uid, {
                            displayName: userProfile.displayName,
                            phoneNumber: userProfile.phoneNumber,
                            dob: userProfile.dob,
                            anniversary: userProfile.anniversary,
                            gender: userProfile.gender,
                            state: userProfile.state
                          });
                          setFormError('Profile updated successfully!');
                          setTimeout(() => setFormError(''), 3000);
                        } catch (e) { console.error(e); }
                        setIsSubmitting(false);
                      }}
                      disabled={isSubmitting}
                      className="w-full py-4 rounded-full text-[15px] font-semibold bg-[#B47A67] text-white hover:bg-[#8E5E4F] transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save changes'}
                    </button>
                  </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // LOGGED IN STATE: Profile Dashboard with Desktop Sidebar Layout

  return (
    <div className="min-h-screen bg-[#F7F1EE] flex flex-col">
      <SEO title="Profile" noindex />
      <div className={activeTab === 'stylist' || activeTab === 'wishlist' || activeTab === 'coupons' || activeTab === 'payment' ? "hidden md:block" : ""}>
        <Navbar />
      </div>

      <main className={`flex-1 w-full ${activeTab === 'stylist' || activeTab === 'wishlist' || activeTab === 'coupons' || activeTab === 'payment'
        ? 'pt-0 md:pt-48 pb-16 md:pb-12'
        : 'pt-24 md:pt-48 pb-24 md:pb-12'
        }`}>

        <div className={activeTab === 'stylist' || activeTab === 'coupons' ? "w-full" : "max-w-7xl mx-auto px-4 md:px-8"}>

          {/* Desktop Layout: Sidebar + Content */}
          <div className={activeTab === 'stylist' || activeTab === 'coupons' ? "w-full" : "md:flex md:gap-8 md:items-start"}>

            {/* Desktop Left Sidebar */}
            {activeTab !== 'stylist' && activeTab !== 'coupons' && activeTab !== 'addresses' && activeTab !== 'payment' && (
              <aside className="hidden md:flex flex-col gap-2 w-64 shrink-0 sticky top-48">
                {/* Mini Profile Card */}
                <div className="bg-[#2C1E16] rounded-2xl p-5 text-white mb-4">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full object-cover border-2 border-[#D4AF37]/50" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FBF6F3] to-[#E8D8D1] text-[#8E5E4F] flex items-center justify-center text-xl font-serif border-2 border-[#D4AF37]/50 shrink-0">
                        {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{user.displayName || 'Guest'}</div>
                      <div className="text-white/50 text-xs truncate">{user.email}</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-[#D4AF37]">
                    <Crown className="w-4 h-4" />
                    <span className="text-xs font-semibold">Gold Member</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-3 border border-[#E8D8D1] shadow-sm space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-[#8E5E4F]/40 px-4 pb-1">Shopping</p>
                  <DesktopNavItem tab="overview" icon={UserIcon} label="Overview" />
                  <DesktopNavItem tab="orders" icon={Package} label="My Orders" href="/my-orders" />
                  <DesktopNavItem tab="wallet" icon={Wallet} label="Eclat Wallet" href="/wallet" />
                  <DesktopNavItem tab="wishlist" icon={Heart} label="Wishlist" />
                  <DesktopNavItem tab="stylist" icon={Sparkles} label="Virtual Stylist" />
                </div>

                <div className="bg-white rounded-2xl p-3 border border-[#E8D8D1] shadow-sm space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-[#8E5E4F]/40 px-4 pb-1">Account</p>
                  <DesktopNavItem tab="settings" icon={SettingsIcon} label="Personal Details" />
                  <DesktopNavItem tab="addresses" icon={MapPin} label="Address Book" />
                </div>

                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all">
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </aside>
            )}

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {activeTab === 'overview' ? (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {/* ── 1. Hero Banner ── */}
                    <div className="-mx-4 md:mx-0 relative overflow-hidden md:rounded-2xl h-[220px] md:h-[210px] shadow-lg">
                      {/* Animated gradient background */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(135deg, #1A0F09 0%, #2C1E16 25%, #4A2C1E 50%, #6B4C3E 75%, #2C1E16 100%)',
                          backgroundSize: '400% 400%',
                          animation: 'gradientShift 8s ease infinite',
                        }}
                      />

                      {/* Floating gold particles */}
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={`particle-${i}`}
                          className="absolute rounded-full"
                          style={{
                            width: `${2 + (i % 4)}px`,
                            height: `${2 + (i % 4)}px`,
                            background: `radial-gradient(circle, ${i % 3 === 0 ? '#D4AF37' : i % 3 === 1 ? '#F5E6B8' : '#B47A67'} 0%, transparent 70%)`,
                            left: `${8 + (i * 7.5)}%`,
                            top: `${15 + ((i * 17) % 65)}%`,
                            opacity: 0.4 + (i % 4) * 0.15,
                            animation: `floatParticle ${3 + (i % 3)}s ease-in-out ${i * 0.4}s infinite alternate`,
                          }}
                        />
                      ))}

                      {/* Animated sparkle SVGs */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                        {/* Large diamond sparkle */}
                        <g style={{ animation: 'sparkle 3s ease-in-out infinite', transformOrigin: '85% 25%' }}>
                          <path d="M340 50 L343 56 L340 62 L337 56 Z" fill="#D4AF37" opacity="0.7" />
                          <line x1="340" y1="44" x2="340" y2="48" stroke="#D4AF37" strokeWidth="1" opacity="0.5" />
                          <line x1="340" y1="64" x2="340" y2="68" stroke="#D4AF37" strokeWidth="1" opacity="0.5" />
                          <line x1="332" y1="56" x2="336" y2="56" stroke="#D4AF37" strokeWidth="1" opacity="0.5" />
                          <line x1="344" y1="56" x2="348" y2="56" stroke="#D4AF37" strokeWidth="1" opacity="0.5" />
                        </g>

                        {/* Small sparkles */}
                        <circle cx="120" cy="35" r="1.5" fill="#F5E6B8" style={{ animation: 'twinkle 2s ease-in-out 0.5s infinite' }} />
                        <circle cx="260" cy="28" r="1" fill="#D4AF37" style={{ animation: 'twinkle 2.5s ease-in-out 1s infinite' }} />
                        <circle cx="380" cy="80" r="1.5" fill="#F5E6B8" style={{ animation: 'twinkle 2s ease-in-out 1.5s infinite' }} />
                        <circle cx="50" cy="60" r="1" fill="#D4AF37" style={{ animation: 'twinkle 3s ease-in-out 0.8s infinite' }} />
                        <circle cx="200" cy="45" r="1.2" fill="#F5E6B8" style={{ animation: 'twinkle 2.2s ease-in-out 0.2s infinite' }} />

                        {/* Elegant curved jewelry line */}
                        <path
                          d="M 0 120 Q 100 80, 200 100 T 400 85"
                          fill="none"
                          stroke="url(#goldLine)"
                          strokeWidth="1"
                          opacity="0.3"
                          style={{ animation: 'drawLine 4s ease-in-out infinite alternate' }}
                          strokeDasharray="600"
                          strokeDashoffset="0"
                        />
                        <path
                          d="M 0 140 Q 150 110, 250 130 T 400 110"
                          fill="none"
                          stroke="url(#goldLine)"
                          strokeWidth="0.5"
                          opacity="0.2"
                          style={{ animation: 'drawLine 5s ease-in-out 1s infinite alternate' }}
                          strokeDasharray="600"
                          strokeDashoffset="0"
                        />

                        {/* Necklace pendant shape */}
                        <g style={{ animation: 'pendantSwing 4s ease-in-out infinite', transformOrigin: '320px 15px' }}>
                          <path d="M310 15 Q320 10, 330 15" fill="none" stroke="#D4AF37" strokeWidth="0.8" opacity="0.4" />
                          <circle cx="320" cy="22" r="3" fill="none" stroke="#D4AF37" strokeWidth="0.8" opacity="0.35" />
                          <circle cx="320" cy="22" r="1" fill="#D4AF37" opacity="0.5" />
                        </g>

                        {/* Shopping bag icon */}
                        <g style={{ animation: 'floatBag 5s ease-in-out infinite', transformOrigin: '75px 75px' }} opacity="0.35">
                          <rect x="62" y="72" width="26" height="22" rx="2" fill="none" stroke="#D4AF37" strokeWidth="0.8" />
                          <path d="M68 72 L68 66 Q75 58, 82 66 L82 72" fill="none" stroke="#D4AF37" strokeWidth="0.8" />
                          <circle cx="75" cy="82" r="2" fill="#D4AF37" opacity="0.4" />
                        </g>

                        {/* Earring drop */}
                        <g style={{ animation: 'earringDangle 3.5s ease-in-out 0.5s infinite', transformOrigin: '160px 30px' }} opacity="0.3">
                          <circle cx="160" cy="30" r="2" fill="#F5E6B8" />
                          <line x1="160" y1="32" x2="160" y2="48" stroke="#D4AF37" strokeWidth="0.6" />
                          <path d="M155 48 Q160 56, 165 48" fill="none" stroke="#D4AF37" strokeWidth="0.8" />
                          <circle cx="160" cy="55" r="2.5" fill="#D4AF37" opacity="0.5" />
                        </g>

                        {/* Diamond ring */}
                        <g style={{ animation: 'sparkle 4s ease-in-out 1.5s infinite', transformOrigin: '240px 70px' }} opacity="0.3">
                          <ellipse cx="240" cy="75" rx="8" ry="5" fill="none" stroke="#D4AF37" strokeWidth="0.7" />
                          <path d="M235 70 L237 65 L240 62 L243 65 L245 70" fill="none" stroke="#F5E6B8" strokeWidth="0.8" />
                          <path d="M237 65 L243 65" fill="none" stroke="#F5E6B8" strokeWidth="0.5" />
                          <circle cx="240" cy="63" r="1" fill="#F5E6B8" opacity="0.6" />
                        </g>

                        {/* Gift box */}
                        <g style={{ animation: 'giftBounce 3s ease-in-out 2s infinite', transformOrigin: '390px 100px' }} opacity="0.25">
                          <rect x="380" y="100" width="20" height="16" rx="1.5" fill="none" stroke="#D4AF37" strokeWidth="0.8" />
                          <rect x="378" y="96" width="24" height="5" rx="1" fill="none" stroke="#D4AF37" strokeWidth="0.8" />
                          <line x1="390" y1="96" x2="390" y2="116" stroke="#F5E6B8" strokeWidth="0.6" />
                          <path d="M385 96 Q390 89, 390 96" fill="none" stroke="#F5E6B8" strokeWidth="0.7" />
                          <path d="M395 96 Q390 89, 390 96" fill="none" stroke="#F5E6B8" strokeWidth="0.7" />
                        </g>

                        {/* Price tag */}
                        <g style={{ animation: 'tagSwing 4s ease-in-out 0.8s infinite', transformOrigin: '28px 38px' }} opacity="0.25">
                          <path d="M20 38 L28 30 L40 30 L40 48 L28 48 Z" fill="none" stroke="#D4AF37" strokeWidth="0.7" />
                          <circle cx="33" cy="36" r="1.5" fill="#D4AF37" opacity="0.5" />
                          <line x1="28" y1="41" x2="38" y2="41" stroke="#F5E6B8" strokeWidth="0.4" opacity="0.5" />
                          <line x1="30" y1="44" x2="36" y2="44" stroke="#F5E6B8" strokeWidth="0.4" opacity="0.4" />
                        </g>

                        {/* Elegant Woman Line Art Sketch (Animated Drawing) */}
                        <g opacity="0.3" transform="translate(290, 40) scale(0.7)">
                          {/* Flowing Hat Brim */}
                          <path
                            d="M 0 50 C 40 10, 100 10, 140 50 C 160 70, 170 90, 150 100 C 130 110, 80 80, 40 80 C 10 80, -20 100, -10 80 C -5 70, -10 60, 0 50 Z"
                            fill="none" stroke="#D4AF37" strokeWidth="1.2" strokeDasharray="400" strokeDashoffset="400"
                            style={{ animation: 'drawSketch 7s ease-in-out infinite alternate' }}
                          />
                          {/* Hat Crown */}
                          <path
                            d="M 40 50 C 50 10, 90 10, 100 50"
                            fill="none" stroke="#D4AF37" strokeWidth="1.2" strokeDasharray="150" strokeDashoffset="150"
                            style={{ animation: 'drawSketch 6s ease-in-out 0.5s infinite alternate' }}
                          />
                          {/* Elegant Face & Neck Profile */}
                          <path
                            d="M 60 85 Q 50 110, 65 125 C 75 135, 90 135, 100 130 C 110 125, 115 140, 115 160"
                            fill="none" stroke="#F5E6B8" strokeWidth="1" strokeDasharray="150" strokeDashoffset="150"
                            style={{ animation: 'drawSketch 5s ease-in-out 1s infinite alternate' }}
                          />
                          {/* Dangle Earring on the sketch */}
                          <g style={{ animation: 'earringDangle 3s ease-in-out infinite', transformOrigin: '95px 115px' }}>
                            <line x1="95" y1="115" x2="95" y2="125" stroke="#D4AF37" strokeWidth="0.6" />
                            <circle cx="95" cy="127" r="2" fill="#D4AF37" opacity="0.7" />
                          </g>
                        </g>

                        <defs>
                          <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
                            <stop offset="30%" stopColor="#D4AF37" stopOpacity="1" />
                            <stop offset="70%" stopColor="#F5E6B8" stopOpacity="1" />
                            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>

                      {/* Bottom gradient for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1A0F09]/90 via-[#1A0F09]/20 to-transparent" />

                      {/* Brand name with shimmer */}
                      <motion.div
                        className="absolute top-4 right-5 z-10"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <span
                          className="font-serif text-[22px] md:text-[26px] italic tracking-wider drop-shadow-lg"
                          style={{
                            background: 'linear-gradient(90deg, #D4AF37 0%, #F5E6B8 40%, #D4AF37 60%, #F5E6B8 100%)',
                            backgroundSize: '200% 100%',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            animation: 'shimmerText 3s linear infinite',
                          }}
                        >
                          Thealankar
                        </span>
                      </motion.div>

                      {/* User info - bottom */}
                      <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
                        <div className="flex items-end gap-3.5">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="shrink-0"
                          >
                            {user.photoURL ? (
                              <img
                                src={user.photoURL}
                                alt="Profile"
                                className="w-[58px] h-[58px] rounded-full border-[2.5px] border-[#D4AF37]/50 shadow-xl object-cover ring-2 ring-white/10"
                              />
                            ) : (
                              <div className="w-[58px] h-[58px] rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B47A67] text-white flex items-center justify-center text-2xl font-serif border-[2.5px] border-[#D4AF37]/50 shadow-xl ring-2 ring-white/10">
                                {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                          </motion.div>
                          <motion.div
                            className="flex-1 min-w-0 pb-0.5"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                          >
                            <h1 className="text-white text-[22px] font-bold leading-tight truncate drop-shadow-lg">
                              {user.displayName || 'Thealankar Guest'}
                            </h1>
                            <p className="text-white/65 text-xs truncate mt-0.5">{user.email}</p>
                            <p className="text-[#D4AF37]/70 text-[11px] mt-1 font-medium tracking-wide">
                              ✦ Member since {(() => { try { return new Date((user as any).metadata?.creationTime || '').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); } catch { return 'Jun 2024'; } })()}
                            </p>
                          </motion.div>
                          <motion.button
                            onClick={() => setActiveTab('settings')}
                            className="mb-1 p-2.5 bg-white/10 hover:bg-white/25 rounded-full transition-all shrink-0 border border-[#D4AF37]/30 backdrop-blur-sm hover:border-[#D4AF37]/60"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.7, duration: 0.5 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Edit2 className="w-4 h-4 text-[#D4AF37]/80" />
                          </motion.button>
                        </div>
                      </div>

                      {/* CSS Keyframes */}
                      <style>{`
                        @keyframes gradientShift {
                          0% { background-position: 0% 50%; }
                          50% { background-position: 100% 50%; }
                          100% { background-position: 0% 50%; }
                        }
                        @keyframes floatParticle {
                          0% { transform: translateY(0px) scale(1); opacity: 0.3; }
                          100% { transform: translateY(-18px) scale(1.3); opacity: 0.7; }
                        }
                        @keyframes sparkle {
                          0%, 100% { transform: scale(1); opacity: 0.5; }
                          50% { transform: scale(1.4); opacity: 1; }
                        }
                        @keyframes twinkle {
                          0%, 100% { opacity: 0.2; r: 1; }
                          50% { opacity: 1; r: 2; }
                        }
                        @keyframes drawLine {
                          0% { stroke-dashoffset: 600; }
                          100% { stroke-dashoffset: 0; }
                        }
                        @keyframes pendantSwing {
                          0%, 100% { transform: rotate(-2deg); }
                          50% { transform: rotate(2deg); }
                        }
                        @keyframes shimmerText {
                          0% { background-position: -200% 0; }
                          100% { background-position: 200% 0; }
                        }
                        @keyframes floatBag {
                          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
                          50% { transform: translateY(-10px) rotate(3deg); opacity: 0.5; }
                        }
                        @keyframes earringDangle {
                          0%, 100% { transform: rotate(-3deg); }
                          50% { transform: rotate(3deg); }
                        }
                        @keyframes giftBounce {
                          0%, 100% { transform: translateY(0px) scale(1); }
                          30% { transform: translateY(-6px) scale(1.05); }
                          60% { transform: translateY(-2px) scale(1); }
                        }
                        @keyframes tagSwing {
                          0%, 100% { transform: rotate(-5deg); }
                          50% { transform: rotate(5deg); }
                        }
                        @keyframes drawSketch {
                          0% { stroke-dashoffset: 400; opacity: 0; }
                          20% { opacity: 0.8; }
                          80% { opacity: 0.8; }
                          100% { stroke-dashoffset: 0; opacity: 1; }
                        }
                      `}</style>
                    </div>

                    {/* ── 2. Stats Bar ── */}
                    <div className="-mx-4 md:mx-0 bg-white md:rounded-2xl md:border md:border-[#E8D8D1] md:shadow-sm border-b border-[#E8D8D1] overflow-hidden">
                      <div className="grid grid-cols-3 divide-x divide-[#E8D8D1]">
                        {[
                          { value: String(userOrders.length), label: 'Total orders' },
                          { value: String(wishlistIds.length), label: 'Wishlist items' },
                          { value: `₹${userProfile?.totalSavings?.toFixed(0) || '0'}`, label: 'Total savings' },
                        ].map((stat, i) => (
                          <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 + 0.15 }}
                            className="flex flex-col items-center justify-center py-4 px-2"
                          >
                            <span className="text-[20px] md:text-2xl font-bold text-[#2C1E16]">{stat.value}</span>
                            <span className="text-[11px] text-[#8E5E4F]/60 mt-0.5 text-center leading-tight">{stat.label}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* ── 3. Store Credit Card ── */}
                    <div className="mt-4 md:mt-0">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                        className="bg-white rounded-[20px] border border-[#E8D8D1] shadow-sm overflow-hidden"
                      >
                        <div className="p-5 flex items-start justify-between">
                          <div>
                            <div className="text-2xl font-bold text-[#2C1E16]">₹{userProfile?.totalSavings?.toFixed(2) || '0.00'}</div>
                            <div className="text-sm text-[#8E5E4F]/70 mt-0.5">Thealankar store credit</div>
                          </div>
                          <div className="w-12 h-14 bg-[#2C1E16] rounded-xl flex flex-col items-center justify-center shadow-lg gap-1 shrink-0">
                            <Crown className="w-5 h-5 text-[#D4AF37]" />
                            <span className="text-[7px] text-[#D4AF37] font-bold tracking-widest leading-none uppercase">Gold</span>
                          </div>
                        </div>
                        <div className="bg-[#B47A67] hover:bg-[#8E5E4F] transition-colors px-5 py-2.5 flex items-center justify-center cursor-pointer">
                          <span className="text-white text-xs font-semibold tracking-wide">Credits valid through Dec 2026 →</span>
                        </div>
                      </motion.div>
                    </div>

                    {/* ── 4. Style Preference Chips ── */}
                    <div className="mt-5">
                      <h2 className="text-[15px] font-bold text-[#2C1E16] mb-3">Shop in your style</h2>
                      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-1 px-1">
                        {[
                          { label: 'Luxury', active: true },
                          { label: 'Ethnic', active: false },
                          { label: 'Casual', active: false },
                          { label: 'Western', active: false },
                          { label: 'Bridal', active: false },
                          { label: 'Festive', active: false },
                        ].map(({ label, active }) => (
                          <button
                            key={label}
                            className={`flex-none px-4 py-[7px] rounded-full text-[13px] font-medium border transition-all ${active
                                ? 'bg-[#B47A67] text-white border-[#B47A67] shadow-sm'
                                : 'bg-white text-[#8E5E4F] border-[#E8D8D1] hover:border-[#B47A67] hover:text-[#B47A67]'
                              }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ── 5. My Details Section ── */}
                    <div className="mt-5">
                      <h2 className="text-[15px] font-bold text-[#2C1E16] mb-3">My details</h2>
                      <div className="-mx-4 md:mx-0 bg-white md:rounded-2xl md:border md:border-[#E8D8D1] md:shadow-sm md:overflow-hidden border-y border-[#E8D8D1]">
                        <ProfileListItem icon={Package} title="My Orders" onClick={() => setLocation('/my-orders')} />
                        <ProfileListItem icon={Heart} title="My Wishlist" onClick={() => setActiveTab('wishlist')} />
                        <ProfileListItem icon={UserIcon} title="Personal information" onClick={() => setActiveTab('settings')} />
                        <ProfileListItem icon={MapPin} title="My Addresses" onClick={() => setActiveTab('addresses')} last />
                      </div>
                    </div>

                    <div className="mt-5">
                      <h2 className="text-[15px] font-bold text-[#2C1E16] mb-3">Shopping</h2>
                      <div className="-mx-4 md:mx-0 bg-white md:rounded-2xl md:border md:border-[#E8D8D1] md:shadow-sm md:overflow-hidden border-y border-[#E8D8D1]">
                        <ProfileListItem icon={Wallet} title="Thealankar Wallet" onClick={() => setLocation('/wallet')} />
                        <ProfileListItem icon={Ticket} title="Offers & Coupons" onClick={() => setActiveTab('coupons')} />
                        <ProfileListItem icon={CreditCard} title="Payment methods" onClick={() => setActiveTab('payment')} last />
                      </div>
                    </div>

                    {/* ── 7. More Section ── */}
                    <div className="mt-5">
                      <h2 className="text-[15px] font-bold text-[#2C1E16] mb-3">More</h2>
                      <div className="-mx-4 md:mx-0 bg-white md:rounded-2xl md:border md:border-[#E8D8D1] md:shadow-sm md:overflow-hidden border-y border-[#E8D8D1]">
                        <ProfileListItem icon={Sparkles} title="Virtual Style Consultant" onClick={() => setActiveTab('stylist')} />
                        <ProfileListItem icon={Share2} title="Refer & Earn" onClick={() => setLocation('/referrals')} />
                        <ProfileListItem icon={Bell} title="Notifications" onClick={() => { }} />
                        <ProfileListItem icon={Star} title="Rate the app" onClick={() => setShowRateAppModal(true)} />
                        <ProfileListItem icon={HelpCircle} title="Help & Support" onClick={() => setLocation('/contact')} last />
                      </div>
                    </div>

                    {/* ── 8. Logout — Mobile Only ── */}
                    <div className="mt-5 md:hidden pb-8">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-3 p-4 bg-white rounded-2xl border border-[#E8D8D1] text-red-500 font-medium hover:bg-red-50 transition-colors shadow-sm"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Log out</span>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className={activeTab === 'stylist'
                      ? "w-full min-h-[100vh] md:min-h-0 bg-white overflow-hidden"
                      : activeTab === 'coupons'
                        ? "w-full min-h-[100vh] md:min-h-0 bg-[#F7F1EE] md:bg-transparent overflow-hidden"
                      : activeTab === 'addresses'
                        ? "fixed inset-0 z-[55] overflow-y-auto bg-[#f5f5f5] pb-20 md:relative md:inset-auto md:z-auto md:overflow-visible md:pb-0 md:w-full md:min-h-0 md:bg-transparent"
                      : activeTab === 'payment'
                        ? "w-full min-h-[100vh] md:min-h-0 bg-[#F7F1EE] md:bg-transparent"
                      : activeTab === 'orders' || activeTab === 'wishlist'
                        ? "min-h-[60vh] mb-8 w-full md:bg-white md:border md:border-[#E8D8D1] md:rounded-2xl md:p-8 md:shadow-sm"
                        : "bg-white border border-[#E8D8D1] rounded-2xl p-4 md:p-8 shadow-sm min-h-[60vh] mb-8"}
                  >


                    {/* WISHLIST TAB - Exact Shop Page UI */}
                    {activeTab === 'wishlist' && (
                      <div className="flex flex-col -mx-4 md:mx-0 min-h-screen md:min-h-0 bg-white md:bg-transparent">

                        {/* Mobile Shop-style Header */}
                        <div className="md:hidden sticky top-0 z-40">
                          <div className="bg-[#B47A67] text-white py-2 px-4 text-[10px] font-bold tracking-[0.2em] uppercase text-center">
                            FREE SHIPPING ON ALL ORDERS ABOVE ₹999
                          </div>
                          <div className="bg-white border-b border-[#E8D8D1]/50 shadow-sm">
                            <div className="flex items-center px-4 py-3 gap-3">
                              <button onClick={() => setActiveTab('overview')} className="text-[#8E5E4F] p-1"><ArrowLeft className="w-5 h-5" /></button>
                              <div className="flex-1 bg-[#F7F1EE] rounded-lg px-3 py-2 flex items-center gap-2 border border-[#E8D8D1]/50">
                                <SearchIcon className="w-4 h-4 text-[#8E5E4F]/50" />
                                <input placeholder="Search wishlist..." className="w-full bg-transparent outline-none text-sm text-[#8E5E4F]" />
                              </div>
                              <Link href="/cart" className="relative text-[#8E5E4F] p-1">
                                <ShoppingBag className="w-5 h-5" />
                              </Link>
                            </div>

                            {/* Filter Chips Placeholder (Matches Shop Page UI) */}
                            <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 pb-3 pt-1">
                              <button className="flex-none flex items-center gap-1 border border-[#E8D8D1] rounded-lg px-3 py-1.5 text-[11px] font-bold text-[#8E5E4F] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                Sort <ChevronDown className="w-3 h-3" />
                              </button>
                              <button className="flex-none flex items-center gap-1.5 border border-[#8E5E4F] rounded-lg px-3 py-1.5 text-[11px] font-bold text-white bg-[#8E5E4F] shadow-sm">
                                <Heart className="fill-white w-3 h-3" /> My List
                              </button>
                              <div className="flex-none flex items-center gap-1 border border-[#E8D8D1] rounded-lg px-3 py-1.5 text-[11px] font-bold text-[#8E5E4F] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                {wishlistProducts.length} Products
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Desktop Header Match */}
                        <div className="hidden md:block mb-8">
                          <div className="flex items-center justify-between">
                            <h2 className="font-serif text-3xl text-[#8E5E4F]">My Wishlist</h2>
                            <div className="text-sm text-[#8E5E4F]/50 font-medium">
                              {wishlistProducts.length} items saved
                            </div>
                          </div>
                        </div>

                        {/* Grid Content */}
                        <div className="px-3 md:px-0 py-4 md:py-0">
                          {wishlistIds.length === 0 ? (
                            <div className="text-center py-16 bg-[#F7F1EE]/50 md:rounded-xl border-y md:border border-dashed border-[#E8D8D1] -mx-4 md:mx-0">
                              <Heart className="w-12 h-12 text-[#8E5E4F]/20 mx-auto mb-4" />
                              <h3 className="text-[#8E5E4F] font-medium mb-1">Your wishlist is empty</h3>
                              <p className="text-[#8E5E4F]/50 text-sm mb-6">Save items you love to build your perfect wardrobe.</p>
                              <Link href="/shop" className="inline-block px-8 py-3 bg-[#B47A67] text-white rounded-xl text-sm font-medium hover:bg-[#8E5E4F] transition-colors">
                                Discover Styles
                              </Link>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-6">
                              {wishlistProducts
                                .map((product, i) => (
                                  <ProductCard key={product.id} product={product} index={i} />
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* STYLIST TAB - Perfect Full-Screen Overlay for Mobile */}
                    {activeTab === 'stylist' && (
                      <div className="fixed inset-0 z-[100] bg-white md:relative md:inset-auto md:z-10 flex flex-col h-full md:h-[750px] w-full md:bg-white md:border md:border-[#E8D8D1] md:rounded-2xl md:shadow-xl overflow-hidden">
                        {/* Perfect Mobile Header (Overlay style) */}
                        <div className="md:hidden sticky top-0 bg-white border-b border-[#E8D8D1]/50 z-30 px-4 py-4 flex items-center gap-3 shadow-sm">
                          <div className="w-10 h-10 bg-[#2C1E16] rounded-xl flex items-center justify-center shadow-lg">
                            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                          </div>
                          <div className="flex-1">
                            <h2 className="font-serif text-xl text-[#8E5E4F] leading-none">Thealankar Stylist</h2>
                            <span className="text-[10px] text-[#B47A67] font-bold uppercase tracking-widest">Active Stylist</span>
                          </div>
                          <button onClick={() => setActiveTab('overview')} className="w-10 h-10 rounded-full bg-[#F7F1EE] flex items-center justify-center text-[#8E5E4F] hover:bg-[#E8D8D1] transition-all">
                            <Plus className="w-6 h-6 rotate-45" />
                          </button>
                        </div>

                        {/* Desktop Header (Dashboard style) */}
                        <div className="hidden md:flex items-center justify-between px-8 py-6 border-b border-[#E8D8D1]/30 bg-white">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#2C1E16] rounded-xl flex items-center justify-center shadow-lg">
                              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                            </div>
                            <div>
                              <h2 className="font-serif text-xl text-[#8E5E4F] leading-none">Thealankar Stylist</h2>
                              <span className="text-[10px] text-[#B47A67] font-bold uppercase tracking-widest">Active Stylist</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="p-2 text-[#8E5E4F]/40 hover:text-[#B47A67] transition-colors"><Edit2 className="w-4 h-4" /></button>
                            <button className="p-2 text-[#8E5E4F]/40 hover:text-[#B47A67] transition-colors"><SettingsIcon className="w-4 h-4" /></button>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col min-h-0 relative">
                          {!isChatting ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 md:p-10 max-w-4xl mx-auto w-full">
                              <div className="w-20 h-20 bg-[#2C1E16] rounded-[24px] flex items-center justify-center shadow-2xl mb-8 rotate-3">
                                <Sparkles className="w-10 h-10 text-[#D4AF37]" />
                              </div>
                              <h3 className="font-serif text-4xl text-[#8E5E4F] mb-3 leading-tight">Your Virtual Jewellery Stylist</h3>
                              <p className="text-[#8E5E4F]/60 text-base max-w-lg mx-auto mb-10 leading-relaxed">
                                Find the perfect jewellery for any occasion. Ask about Peacock Jhumkas, Butterfly Necklaces, Hair Clips, or let me suggest based on your mood!
                              </p>
                              {/* Dynamic category tiles from Firebase */}
                              <div className="grid grid-cols-2 gap-3 w-full max-w-2xl mb-6 px-2">
                                {(() => {
                                  const categoryIconMap: Record<string, any> = {
                                    necklace: Crown, earring: Sparkles, ring: Star,
                                    clip: Package, hair: Package, default: ShoppingBag
                                  };
                                  const categoryDescMap: Record<string, string> = {
                                    necklace: 'Butterfly & more necklaces', earring: 'Jhumkas, Hoops & more',
                                    ring: 'Beautiful rings for you', clip: 'Hair clips & clutchers', default: 'Browse collection'
                                  };
                                  const tilesSource = categories.length > 0 ? categories.map(cat => {
                                    const key = Object.keys(categoryIconMap).find(k => cat.name.toLowerCase().includes(k)) || 'default';
                                    return { title: cat.name, desc: categoryDescMap[key] || `Browse ${cat.name}`, icon: categoryIconMap[key] || ShoppingBag };
                                  }) : [
                                    { title: 'Earrings', desc: 'Jhumkas, Hoops & more', icon: Sparkles },
                                    { title: 'Necklace', desc: 'Butterfly & more necklaces', icon: Crown },
                                    { title: 'Clips', desc: 'Hair clips & clutchers', icon: Package },
                                    { title: 'Rings', desc: 'Beautiful rings for you', icon: Star },
                                  ];
                                  return [
                                    ...tilesSource,
                                    { title: 'Find a gift 🎁', desc: 'Best picks for gifting', icon: ShoppingBag },
                                    { title: 'New arrivals ✨', desc: 'Latest additions', icon: Sparkles },
                                  ].map(item => (
                                    <button
                                      key={item.title}
                                      onClick={() => { setIsChatting(true); handleSendChatMessage(undefined, item.title); }}
                                      className="group flex flex-col items-start p-4 md:p-5 bg-white border border-[#E8D8D1] rounded-[20px] hover:border-[#B47A67] hover:bg-[#FBF6F3] transition-all shadow-sm text-left"
                                    >
                                      <div className="w-9 h-9 bg-[#F7F1EE] rounded-xl flex items-center justify-center mb-3 group-hover:bg-[#B47A67] transition-colors">
                                        <item.icon className="w-4 h-4 text-[#B47A67] group-hover:text-white transition-colors" />
                                      </div>
                                      <span className="text-sm font-bold text-[#8E5E4F] mb-1 capitalize">{item.title}</span>
                                      <span className="text-[11px] text-[#8E5E4F]/50">{item.desc}</span>
                                    </button>
                                  ));
                                })()}
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-10 no-scrollbar scroll-smooth">
                              <div className="max-w-4xl mx-auto w-full space-y-10">
                                {messages.map((msg, i) => (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={i}
                                    className={`flex gap-4 md:gap-6 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                  >
                                    {/* Assistant Avatar */}
                                    {msg.role === 'assistant' && (
                                      <div className="w-8 h-8 rounded-full bg-[#2C1E16] text-[#D4AF37] flex items-center justify-center shrink-0 mt-1 shadow-sm">
                                        <Sparkles className="w-4 h-4" />
                                      </div>
                                    )}

                                    {/* Message Content */}
                                    <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                      {msg.role === 'user' ? (
                                        <div className="px-5 py-3.5 bg-[#f4f4f4] text-[#2C1E16] rounded-3xl text-[15px] leading-relaxed shadow-sm">
                                          {msg.content}
                                        </div>
                                      ) : (
                                        <div className="text-[15px] leading-relaxed text-[#2C1E16] mt-1.5 space-y-4 w-full">
                                          <p>{msg.content}</p>
                                          
                                          {/* Product Recommendations */}
                                          {msg.products && msg.products.length > 0 && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 w-full max-w-lg">
                                              {msg.products.map((prod, idx) => (
                                                <div key={idx} className="bg-white border border-[#E8D8D1] rounded-2xl overflow-hidden hover:border-[#B47A67] hover:shadow-md transition-all group">
                                                  <div className="h-40 overflow-hidden relative">
                                                    <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-[#2C1E16]">
                                                      ₹{prod.price.toLocaleString('en-IN')}
                                                    </div>
                                                  </div>
                                                  <div className="p-4">
                                                    <h4 className="font-bold text-[#2C1E16] text-sm mb-3 line-clamp-1">{prod.name}</h4>
                                                    <Link href={prod.link} className="block w-full text-center py-2 bg-[#F7F1EE] text-[#B47A67] rounded-xl text-xs font-bold hover:bg-[#B47A67] hover:text-white transition-colors">
                                                      View Product
                                                    </Link>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                ))}
                                {isStylistTyping && (
                                  <div className="flex gap-4 md:gap-6 w-full justify-start">
                                    <div className="w-8 h-8 rounded-full bg-[#2C1E16] text-[#D4AF37] flex items-center justify-center shrink-0 shadow-sm mt-1">
                                      <Sparkles className="w-4 h-4" />
                                    </div>
                                    <div className="flex gap-1.5 mt-4">
                                      <span className="w-2 h-2 bg-[#B47A67] rounded-full animate-bounce" />
                                      <span className="w-2 h-2 bg-[#B47A67] rounded-full animate-bounce [animation-delay:0.2s]" />
                                      <span className="w-2 h-2 bg-[#B47A67] rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Floating Chat Input Area */}
                          <div className="p-4 md:p-8 bg-gradient-to-t from-white via-white/80 to-transparent">
                            <form
                              onSubmit={handleSendChatMessage}
                              className="max-w-3xl mx-auto relative group"
                            >
                              <div className="flex items-end gap-2 bg-[#f4f4f4] border border-transparent rounded-[26px] p-2 pl-4 pr-2 shadow-sm group-focus-within:border-[#E8D8D1] group-focus-within:bg-white group-focus-within:shadow-md transition-all">
                                <button type="button" className="p-2.5 text-[#2C1E16]/40 hover:text-[#B47A67] transition-colors rounded-full shrink-0 mb-0.5">
                                  <Paperclip className="w-5 h-5" />
                                </button>
                                <textarea
                                  value={chatInput}
                                  onChange={(e) => setChatInput(e.target.value)}
                                  onFocus={() => setIsChatting(true)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSendChatMessage(e as any);
                                    }
                                  }}
                                  placeholder="Message Thealankar Stylist..."
                                  className="flex-1 bg-transparent border-none outline-none py-3.5 text-[15px] text-[#2C1E16] placeholder-[#2C1E16]/40 resize-none min-h-[48px] max-h-[200px]"
                                  rows={1}
                                />
                                <button
                                  type="submit"
                                  disabled={!chatInput.trim() || isStylistTyping}
                                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mb-0.5 transition-all ${chatInput.trim() ? 'bg-[#2C1E16] text-white shadow-md' : 'bg-[#e5e5e5] text-[#2C1E16]/30 cursor-not-allowed'
                                    }`}
                                >
                                  <ArrowUp className="w-5 h-5" />
                                </button>
                              </div>
                              <div className="text-[11px] text-[#2C1E16]/40 text-center mt-3 font-medium">
                                Thealankar Stylist can make mistakes. Consider verifying important information.
                              </div>
                            </form>
                          </div>
                        </div>
                      </div>
                    )}


                    {/* PAYMENT METHODS TAB */}
                    {activeTab === 'payment' && (
                      <div className="flex flex-col h-full bg-[#F7F1EE] md:bg-transparent min-h-[100vh] md:min-h-0">
                        {/* Mobile Header */}
                        <div className="px-4 py-4 flex items-center bg-white border-b border-[#E8D8D1]/40 md:hidden sticky top-0 z-10 shadow-sm">
                          <button onClick={() => setActiveTab('overview')} className="p-2 -ml-2 text-[#2C1E16] hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6" strokeWidth={2} />
                          </button>
                          <h1 className="text-[17px] font-semibold text-[#2C1E16] ml-2">Payment methods</h1>
                        </div>

                        {/* Desktop Header */}
                        <div className="hidden md:block mb-8">
                          <h2 className="font-serif text-3xl text-[#8E5E4F]">Payment methods</h2>
                        </div>

                        {/* Content */}
                        <div className="p-4 md:p-0">
                          <p className="text-[13px] font-bold text-[#8E5E4F]/60 uppercase tracking-[0.15em] mb-4">SETTINGS</p>
                          
                          <div className="flex flex-col gap-4">
                            {/* Online Payment Card */}
                            <div className="bg-white rounded-[16px] md:rounded-[20px] p-4 md:p-5 shadow-sm flex flex-row items-center justify-between border border-[#E8D8D1]/40">
                              <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-[50px] h-[36px] md:w-[60px] md:h-[44px] border border-[#E8D8D1]/80 rounded-xl flex items-center justify-center shrink-0">
                                  <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-[#2C1E16]/80" />
                                </div>
                                <div>
                                  <p className="text-[#8E5E4F]/70 text-[12px] md:text-[15px] font-medium leading-tight mb-0.5 tracking-tight">Fast and secure</p>
                                  <h3 className="text-[#2C1E16] text-[16px] md:text-[18px] font-semibold tracking-tight">Online Payment</h3>
                                </div>
                              </div>
                              <button className="text-[#DE5B5B] font-bold tracking-[0.05em] uppercase text-[12px] md:text-[14px] px-1 md:px-2 hover:text-[#B47A67] transition-colors shrink-0">
                                ENABLE
                              </button>
                            </div>

                            {/* Cash On Delivery Card (Coming Soon) */}
                            <div className="bg-white rounded-[16px] md:rounded-[20px] p-4 md:p-5 shadow-sm flex flex-row items-center justify-between border border-[#E8D8D1]/40 opacity-70">
                              <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-[50px] h-[36px] md:w-[60px] md:h-[44px] border border-[#E8D8D1]/80 rounded-xl flex items-center justify-center shrink-0">
                                  <Banknote className="w-5 h-5 md:w-6 md:h-6 text-[#2C1E16]/80" />
                                </div>
                                <div>
                                  <p className="text-[#8E5E4F]/70 text-[12px] md:text-[15px] font-medium leading-tight mb-0.5 tracking-tight">If online payment fails</p>
                                  <h3 className="text-[#2C1E16] text-[16px] md:text-[18px] font-semibold tracking-tight">Pay on delivery</h3>
                                </div>
                              </div>
                              <span className="text-[#8E5E4F]/50 font-bold tracking-[0.05em] uppercase text-[12px] md:text-[14px] px-1 md:px-2 shrink-0">
                                COMING SOON
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ADDRESSES TAB */}
                    {activeTab === 'addresses' && (
                      <motion.div
                        key="addresses-inner"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full bg-[#f5f5f5] md:bg-transparent min-h-screen md:min-h-0 pb-24 md:pb-10"
                      >
                        {/* Back header - mobile only */}
                        <div className="md:hidden flex items-center gap-3 px-4 py-4 bg-white mb-2">
                          <button onClick={() => setActiveTab('overview')} className="p-1 -ml-1 text-[#2C1E16] hover:bg-[#F7F1EE] rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
                          </button>
                          <h2 className="font-bold text-[18px] text-[#2C1E16] tracking-tight">Select Your Location</h2>
                        </div>

                        {/* Desktop title */}
                        <div className="hidden md:flex items-center justify-between mb-5 mt-4 md:max-w-3xl md:mx-auto px-4">
                          <div className="flex items-center gap-3">
                            <button onClick={() => setActiveTab('overview')} className="p-1 -ml-1 text-[#2C1E16] hover:bg-[#F7F1EE] rounded-full transition-colors">
                              <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
                            </button>
                            <h2 className="font-serif text-2xl text-[#2C1E16]">Select Your Location</h2>
                          </div>
                        </div>

                        {/* ── Search Bar ── */}
                        <div className="px-4 pb-3 bg-transparent md:max-w-3xl md:mx-auto">
                          <div className="flex items-center gap-2 bg-white rounded-xl px-4 h-12 border border-[#E8D8D1] shadow-sm">
                            <input
                              type="text"
                              value={addressSearchQuery}
                              onChange={(e) => setAddressSearchQuery(e.target.value)}
                              placeholder="Search an area or address"
                              className="flex-1 bg-transparent outline-none text-[15px] text-[#2C1E16] placeholder:text-[#8E5E4F]/40 font-medium"
                            />
                            {addressSearchQuery ? (
                              <button onClick={() => setAddressSearchQuery('')} className="text-[#8E5E4F]/40 hover:text-[#B47A67]">
                                <X className="w-5 h-5" />
                              </button>
                            ) : (
                              <SearchIcon className="w-[20px] h-[20px] text-[#8E5E4F]/40 shrink-0" />
                            )}
                          </div>
                        </div>

                        {/* ── Quick Action Rows ── */}
                        <div className="grid grid-cols-3 gap-3 mb-6 px-4 md:max-w-3xl md:mx-auto">
                          {/* Use current location */}
                          <button
                            onClick={() => setShowAddressModal(true)}
                            className="flex flex-col items-start justify-between p-4 bg-white rounded-[16px] border border-[#E8D8D1] hover:border-[#B47A67] transition-all shadow-sm aspect-square md:aspect-auto md:h-28"
                          >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center">
                              <Navigation className="w-5 h-5 text-[#B47A67]" />
                            </div>
                            <span className="text-[13px] font-bold text-[#8E5E4F] text-left leading-tight mt-auto">Use Current<br/>Location</span>
                          </button>

                          {/* Add Address */}
                          <button
                            onClick={() => setShowAddressModal(true)}
                            className="flex flex-col items-start justify-between p-4 bg-white rounded-[16px] border border-[#E8D8D1] hover:border-[#B47A67] transition-all shadow-sm aspect-square md:aspect-auto md:h-28"
                          >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center">
                              <Plus className="w-5 h-5 text-[#B47A67]" />
                            </div>
                            <span className="text-[13px] font-bold text-[#8E5E4F] text-left leading-tight mt-auto">Add New<br/>Address</span>
                          </button>

                          {/* Request Address */}
                          <button
                            className="flex flex-col items-start justify-between p-4 bg-white rounded-[16px] border border-[#E8D8D1] hover:border-[#B47A67] transition-all shadow-sm aspect-square md:aspect-auto md:h-28"
                          >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center">
                              <SiWhatsapp className="w-5 h-5 text-[#25D366]" />
                            </div>
                            <span className="text-[13px] font-bold text-[#8E5E4F] text-left leading-tight mt-auto">Request<br/>Address</span>
                          </button>
                        </div>

                        {/* ── SAVED ADDRESSES ── */}
                        <div className="pb-8 px-4 md:max-w-3xl md:mx-auto">
                          <p className="text-[11px] font-bold text-[#8E5E4F]/50 uppercase tracking-[0.05em] mb-3">SAVED ADDRESSES</p>

                          {(userProfile?.savedAddresses || []).length > 0 ? (
                            <div className="bg-white rounded-[20px] shadow-sm border border-[#E8D8D1]">
                              {(userProfile?.savedAddresses || [])
                                .filter(addr =>
                                  !addressSearchQuery ||
                                  addr.fullAddress.toLowerCase().includes(addressSearchQuery.toLowerCase()) ||
                                  addr.label.toLowerCase().includes(addressSearchQuery.toLowerCase()) ||
                                  addr.city.toLowerCase().includes(addressSearchQuery.toLowerCase())
                                )
                                .map((addr, index, arr) => {
                                  const Icon = addr.label === 'Home' ? Home
                                    : addr.label === 'Work' ? Briefcase
                                    : addr.label === 'College' ? MapPin
                                    : MapPin;
                                  const displayAddress = [addr.street, addr.fullAddress].filter(Boolean).join(', ');
                                  const displayLocation = [addr.city, addr.state, 'India'].filter(Boolean).join(', ');
                                  const isSelected = index === 0; // Assuming first is selected for now
                                  
                                  return (
                                    <motion.div
                                      key={addr.id}
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className={`p-4 flex gap-4 ${index !== arr.length - 1 ? 'border-b border-[#E8D8D1]/50' : ''}`}
                                    >
                                      {/* Icon + distance */}
                                      <div className="flex flex-col items-center shrink-0 w-[50px]">
                                        <div className="w-10 h-10 bg-[#f5f5f5] rounded-[10px] flex items-center justify-center mb-1">
                                          <Icon className="w-5 h-5 text-[#2C1E16] stroke-[2]" />
                                        </div>
                                        {addr.distance && addr.distance !== '0 m' && (
                                          <span className="text-[11px] text-[#2C1E16] font-medium text-center">{addr.distance}</span>
                                        )}
                                      </div>

                                      {/* Content */}
                                      <div className="flex-1 min-w-0 pr-2 pt-0.5">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-bold text-[16px] text-[#2C1E16]">{addr.label}</span>
                                          {addr.isDefault && (
                                            <span className="px-2 py-0.5 bg-[#e2f5ec] text-[#1f8753] text-[10px] font-bold uppercase tracking-wider rounded">
                                              SELECTED
                                            </span>
                                          )}
                                        </div>
                                        
                                        {/* Address Text */}
                                        <div className="text-[13.5px] text-[#8E5E4F]/70 leading-[1.4] line-clamp-2">
                                          {displayAddress}, {displayLocation}
                                        </div>
                                      </div>

                                      {/* Action (3-dot) */}
                                      <div className="shrink-0 flex items-start pt-1 relative">
                                        <button 
                                          onClick={() => setOpenAddressMenuId(openAddressMenuId === addr.id ? null : addr.id)}
                                          className="p-1 hover:bg-[#F7F1EE] rounded-full transition-colors text-[#2C1E16]"
                                        >
                                          <MoreVertical className="w-[18px] h-[18px]" />
                                        </button>
                                        
                                        {/* Dropdown Menu */}
                                        <AnimatePresence>
                                          {openAddressMenuId === addr.id && (
                                            <motion.div 
                                              initial={{ opacity: 0, scale: 0.95, transformOrigin: 'top right' }}
                                              animate={{ opacity: 1, scale: 1 }}
                                              exit={{ opacity: 0, scale: 0.95 }}
                                              className="absolute right-0 top-8 bg-white border border-[#E8D8D1] shadow-[0_4px_20px_rgba(0,0,0,0.08)] rounded-xl py-1 w-40 z-20 overflow-hidden"
                                            >
                                              <button 
                                                onClick={() => {
                                                  handleSetDefaultAddress(addr.id);
                                                  setOpenAddressMenuId(null);
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-[#8E5E4F] hover:bg-[#FBF6F3] transition-colors flex items-center justify-between"
                                              >
                                                Set as Default
                                                {addr.isDefault && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                                              </button>
                                              <button 
                                                onClick={async () => {
                                                  if (!user) return;
                                                  await deleteUserAddress(user.uid, addr.id);
                                                  setUserProfile(prev => prev ? {
                                                    ...prev,
                                                    savedAddresses: prev.savedAddresses?.filter(a => a.id !== addr.id)
                                                  } : null);
                                                  setOpenAddressMenuId(null);
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors"
                                              >
                                                Delete
                                              </button>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    </motion.div>
                                  );
                                })}
                            </div>
                          ) : (
                            <div className="text-center py-14 bg-white rounded-2xl border border-[#E8D8D1]">
                              <div className="w-14 h-14 bg-[#F7F1EE] rounded-full flex items-center justify-center mx-auto mb-3">
                                <MapPin className="w-7 h-7 text-[#8E5E4F]/30" />
                              </div>
                              <p className="text-[#8E5E4F] text-sm font-medium mb-1">No saved addresses</p>
                              <p className="text-[#8E5E4F]/60 text-xs mb-4">Add your first delivery address</p>
                              <button
                                onClick={() => setShowAddressModal(true)}
                                className="px-5 py-2.5 bg-[#B47A67] text-white rounded-xl text-sm font-semibold hover:bg-[#8E5E4F] transition-colors"
                              >
                                Add Address
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* COUPONS TAB */}
                    {activeTab === 'coupons' && (
                      <motion.div
                        key="coupons-inner"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full bg-[#F7F1EE] md:bg-transparent min-h-screen pb-10 flex flex-col"
                      >
                        <div className="w-full max-w-4xl mx-auto">
                          {/* Header */}
                          <div className="md:hidden flex items-center gap-3 px-4 py-4 bg-[#F7F1EE] sticky top-0 z-10">
                            <button onClick={() => setActiveTab('overview')} className="p-1 -ml-1 text-[#1A1A1A] hover:bg-gray-100 rounded-full transition-colors">
                              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
                            </button>
                            <h2 className="font-medium text-[20px] text-[#1A1A1A]">Your coupons</h2>
                          </div>
                          <div className="hidden md:flex items-center gap-4 mb-8 pt-8 px-4 md:px-0">
                            <button onClick={() => setActiveTab('overview')} className="p-2 -ml-2 text-[#1A1A1A] hover:bg-gray-100 rounded-full transition-colors">
                              <ArrowLeft className="w-6 h-6" />
                            </button>
                            <h2 className="text-2xl font-medium text-[#1A1A1A]">Your coupons</h2>
                          </div>

                          {/* Title */}
                          <div className="text-center mt-2 mb-6">
                            <h3 className="text-[13px] font-semibold text-[#6B7280] uppercase tracking-[0.15em]">BRAND COUPONS</h3>
                          </div>

                          {/* Coupon Grid */}
                          <div className="px-4 md:px-0 grid grid-cols-2 md:grid-cols-3 gap-3.5 md:gap-5">
                            {userCoupons.map(uc => (
                              <CouponScratchCard
                                key={uc.id}
                                userCoupon={uc}
                                userId={user.uid}
                                onViewDetails={setSelectedCoupon}
                              />
                            ))}
                          </div>

                          {userCoupons.length === 0 && (
                            <div className="text-center py-16 px-4">
                              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Ticket className="w-8 h-8 text-gray-300" />
                              </div>
                              <p className="text-gray-500 font-medium mb-1">No coupons yet</p>
                              <p className="text-gray-400 text-sm">Keep shopping to earn exclusive rewards.</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>{/* End Main Content Area */}
          </div>{/* End Desktop Flex Layout */}
        </div>{/* End max-w-7xl container */}
      </main>

      <Footer />

      <AddressMapModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        initialName={userProfile?.displayName}
        initialPhone={userProfile?.phoneNumber}
        onSave={async (newAddress) => {
          if (user?.uid) {
            await saveUserAddress(user.uid, newAddress);
            // Optimistically update UI
            setUserProfile(prev => prev ? {
              ...prev,
              savedAddresses: [...(prev.savedAddresses || []), newAddress]
            } : null);
          }
          setShowAddressModal(false);
        }}
      />
      
      <CouponDetailsModal 
        isOpen={!!selectedCoupon}
        onClose={() => setSelectedCoupon(null)}
        userCoupon={selectedCoupon}
      />
      <RateAppModal isOpen={showRateAppModal} onClose={() => setShowRateAppModal(false)} />
    </div>
  );
}
