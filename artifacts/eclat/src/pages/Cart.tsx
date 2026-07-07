import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, ChevronRight, ArrowLeft, MapPin, 
  Trash2, Heart, Zap, Star, Minus, Plus, 
  ShieldCheck, AlertCircle
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import AddressMapModal from '@/components/profile/AddressMapModal';
import { getUserProfile, UserProfile } from '@/lib/user';
import { getDB } from '@/lib/supabase';
import { doc, onSnapshot } from '@/lib/supabaseStore';
import SEO from '@/components/seo/SEO';
import { useDelivery } from '@/hooks/useDelivery';

export default function Cart() {
  const { items, updateQuantity, removeFromCart, cartTotal } = useCart();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { calculateDelivery, getFreeDeliveryProgress } = useDelivery();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [storeSettings, setStoreSettings] = useState({ minOrderAmount: 0 });

  useEffect(() => {
    const unsub = onSnapshot(doc(getDB(), 'settings', 'storeSettings'), snap => {
      if (snap.exists()) setStoreSettings({ minOrderAmount: snap.data().minOrderAmount || 0 });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user?.uid) {
      getUserProfile(user.uid, user.email || '', user.displayName || '')
        .then(setUserProfile)
        .catch(console.error);
    }
  }, [user]);

  // Handle Refresh simulation
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const deliveryDate = "May 9, Sat"; // Mock delivery date
  const checkoutTarget = user ? '/checkout' : '/profile?next=%2Fcheckout';

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F1EE] flex flex-col">
        <SEO title="Cart" noindex />
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
            <ShoppingBag className="w-10 h-10 text-[#8E5E4F]/20" />
          </div>
          <h2 className="text-xl font-bold text-[#8E5E4F] mb-2">Your cart is empty!</h2>
          <p className="text-[#8E5E4F]/60 text-sm mb-8 max-w-xs">Add items to it now to elevate your style.</p>
          <Link href="/shop">
            <button className="px-10 py-3 bg-[#B47A67] text-white rounded-xl font-bold tracking-wide shadow-lg shadow-[#B47A67]/20">
              Shop Now
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const savings = items.reduce((acc, item) => acc + (item.originalPrice ? (item.originalPrice - item.price) * item.quantity : 0), 0);
  const originalTotal = items.reduce((acc, item) => acc + (item.originalPrice || item.price) * item.quantity, 0);
  const isBelowMinOrder = storeSettings.minOrderAmount > 0 && cartTotal < storeSettings.minOrderAmount;
  
  const deliveryCharge = calculateDelivery(cartTotal);
  const freeDeliveryProgress = getFreeDeliveryProgress(cartTotal);

  return (
    <div className="min-h-screen bg-[#F7F1EE] pb-32">
      <SEO title="Cart" noindex />
      <div className="hidden md:block">
        <Navbar />
      </div>

      {/* ─── HEADER ─── */}
      <div className="bg-white sticky top-0 z-30 border-b border-[#E8D8D1]/50 md:hidden">
        <div className="px-4 h-14 flex items-center gap-4">
          <button onClick={() => window.history.back()} className="text-[#8E5E4F]">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-[#8E5E4F]">My Cart</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto md:pt-48">
        
        {/* ─── ADDRESS BAR ─── */}
        <div className="bg-white p-4 flex items-center justify-between shadow-sm border-b border-[#E8D8D1]/50 mb-2 md:rounded-xl md:mb-6 md:border">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-xs text-[#8E5E4F]">
              Deliver to: <span className="font-bold">{userProfile?.displayName || user?.displayName || 'Guest'}</span>, {userProfile?.address?.zipCode || '609403'}
              <span className="ml-2 px-1.5 py-0.5 bg-[#F7F1EE] rounded text-[10px] font-bold text-[#8E5E4F]/60 uppercase tracking-tight">Home</span>
            </p>
            <p className="text-xs text-[#8E5E4F]/60 truncate mt-0.5">
              {userProfile?.address?.street || 'Add your delivery address for accurate delivery time'}
            </p>
          </div>
          <button 
            onClick={() => setShowAddressModal(true)}
            className="px-4 py-1.5 border border-[#E8D8D1] rounded text-xs font-bold text-[#B47A67] hover:bg-gray-50 transition-colors shrink-0 shadow-sm"
          >
            Change
          </button>
        </div>

        {freeDeliveryProgress && !freeDeliveryProgress.eligible && (
          <div className="bg-white p-4 shadow-sm border-b border-[#E8D8D1]/50 mb-2 md:rounded-xl md:mb-6 md:border">
            <p className="text-sm font-bold text-[#8E5E4F] mb-2 text-center">
              Delivery Charge: <span className="text-[#B47A67]">₹{deliveryCharge}</span>
            </p>
            <p className="text-xs text-[#8E5E4F]/60 text-center mb-2">
              Need <span className="font-bold text-[#B47A67]">₹{freeDeliveryProgress.amountNeeded}</span> more for FREE delivery.
            </p>
            <div className="h-2 w-full bg-[#F7F1EE] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#B47A67] rounded-full transition-all duration-500"
                style={{ width: `${freeDeliveryProgress.progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-right mt-1 text-[#8E5E4F]/40">
              ₹{cartTotal} / ₹{cartTotal + freeDeliveryProgress.amountNeeded}
            </p>
          </div>
        )}
        
        {freeDeliveryProgress && freeDeliveryProgress.eligible && (
          <div className="bg-green-50 p-3 shadow-sm border-b border-green-100 mb-2 md:rounded-xl md:mb-6 md:border text-center">
            <p className="text-sm font-bold text-green-700 flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" /> Eligible for FREE delivery!
            </p>
          </div>
        )}

        {/* ─── ITEMS LIST ─── */}
        <div className="space-y-2 md:space-y-4">
          {items.map((item) => {
            const hasDiscount = item.originalPrice && item.originalPrice > item.price;
            const discountPercent = hasDiscount ? Math.round(((item.originalPrice! - item.price) / item.originalPrice!) * 100) : 0;

            return (
              <div key={`${item.productId}-${item.color}-${item.size}`} className="bg-white p-4 shadow-sm md:rounded-xl md:border">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-20 h-24 shrink-0 bg-[#FBF6F3] rounded-lg overflow-hidden border border-[#E8D8D1]/30">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-sm font-medium text-[#8E5E4F] line-clamp-2 leading-tight">
                        {item.name}
                      </h3>
                    </div>
                    <p className="text-xs text-[#8E5E4F]/50 mt-1">
                      {item.size} {item.color && `• ${item.color}`}
                    </p>
                    
                    {/* Rating display */}
                    {(item.rating !== undefined || item.reviews !== undefined) && (
                      <div className="flex items-center gap-1 mt-2">
                        <div className="flex items-center gap-0.5 bg-green-600 text-white px-1 py-0.5 rounded text-[10px] font-bold">
                          <span>{item.rating || 0}</span> <Star className="w-2.5 h-2.5 fill-current" />
                        </div>
                        <span className="text-[10px] text-[#8E5E4F]/40">({item.reviews || 0})</span>
                        <div className="flex items-center gap-0.5 ml-2">
                          <ShieldCheck className="w-3 h-3 text-blue-600" />
                          <span className="text-[10px] font-bold text-blue-600 italic tracking-tighter">Assured</span>
                        </div>
                      </div>
                    )}

                    {/* Price Block */}
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {hasDiscount && (
                        <>
                          <span className="text-green-600 text-xs font-bold flex items-center">
                            <Minus className="w-3 h-3 rotate-45 mr-0.5" /> {discountPercent}%
                          </span>
                          <span className="text-xs text-[#8E5E4F]/40 line-through">₹{item.originalPrice}</span>
                        </>
                      )}
                      <span className="text-lg font-bold text-[#8E5E4F]">₹{item.price}</span>
                    </div>

                    <p className="text-[11px] text-[#8E5E4F]/60 mt-3 font-medium">
                      Delivery by <span className="text-[#8E5E4F] font-bold">{deliveryDate}</span>
                    </p>
                  </div>

                  {/* Quantity Control (Right side desktop/integrated mobile) */}
                  <div className="hidden md:flex flex-col items-end gap-4">
                    <div className="flex items-center border border-[#E8D8D1] rounded-lg overflow-hidden shadow-sm">
                      <button 
                        onClick={() => updateQuantity(item.productId, item.color, item.size, item.quantity - 1)}
                        className="p-2 hover:bg-gray-50 text-[#8E5E4F]"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-4 text-sm font-bold text-[#8E5E4F] border-x border-[#E8D8D1]">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.productId, item.color, item.size, item.quantity + 1)}
                        disabled={item.maxQuantity !== undefined && item.quantity >= item.maxQuantity}
                        className="p-2 hover:bg-gray-50 text-[#8E5E4F] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-[#8E5E4F]">₹{item.price * item.quantity}</p>
                  </div>
                </div>

                {/* Mobile Quantity Control (Horizontal under info) */}
                <div className="flex md:hidden mt-4 pt-3 border-t border-[#E8D8D1]/30">
                  <div className="flex items-center bg-[#F7F1EE] rounded-lg overflow-hidden border border-[#E8D8D1]/50 h-9">
                    <button 
                      onClick={() => updateQuantity(item.productId, item.color, item.size, item.quantity - 1)}
                      className="px-3 h-full flex items-center justify-center text-[#8E5E4F]"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-3 text-sm font-black text-[#8E5E4F]">Qty: {item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.productId, item.color, item.size, item.quantity + 1)}
                      disabled={item.maxQuantity !== undefined && item.quantity >= item.maxQuantity}
                      className="px-3 h-full flex items-center justify-center text-[#8E5E4F] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex mt-4 pt-2 border-t border-[#E8D8D1]/30 -mx-4 md:mx-0 md:pt-4 md:mt-6">
                  <button 
                    onClick={() => removeFromCart(item.productId, item.color, item.size)}
                    className="flex-1 py-3 flex items-center justify-center gap-2 text-xs font-bold text-[#8E5E4F]/60 uppercase tracking-widest hover:text-red-500 transition-colors border-r border-[#E8D8D1]/30"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                  <button className="flex-1 py-3 flex items-center justify-center gap-2 text-xs font-bold text-[#8E5E4F]/60 uppercase tracking-widest hover:text-[#B47A67] transition-colors border-r border-[#E8D8D1]/30">
                    <Heart className="w-4 h-4" /> Save for later
                  </button>
                  <button 
                    onClick={() => setLocation(checkoutTarget)}
                    className="flex-1 py-3 flex items-center justify-center gap-2 text-xs font-bold text-[#8E5E4F]/60 uppercase tracking-widest hover:text-[#B47A67] transition-colors"
                  >
                    <Zap className="w-4 h-4" /> Buy this now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* ─── STICKY FOOTER ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E8D8D1] shadow-[0_-8px_30px_rgba(0,0,0,0.05)] md:pb-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 8px)' }}>
        
        {/* Savings & Min Order Tip */}
        {isBelowMinOrder ? (
          <div className="bg-amber-50 px-4 py-2 text-center text-[10px] md:text-xs font-bold text-amber-700 flex items-center justify-center gap-2 border-b border-amber-100">
            <AlertCircle className="w-3.5 h-3.5" /> 
            Add ₹{storeSettings.minOrderAmount - cartTotal} more to reach the minimum order of ₹{storeSettings.minOrderAmount}
          </div>
        ) : savings > 0 && (
          <div className="bg-green-50 px-4 py-2 text-center text-xs font-bold text-green-700 flex items-center justify-center gap-2">
            <Zap className="w-3 h-3" /> You'll save ₹{Math.round(savings)} on this order!
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            {savings > 0 && <span className="text-[10px] text-[#8E5E4F]/40 line-through leading-none mb-1">₹{Math.round(originalTotal)}</span>}
            <div className="flex items-center gap-1">
              <span className="text-lg font-black text-[#8E5E4F]">₹{cartTotal}</span>
              <button className="text-[#B47A67] rounded-full border border-[#B47A67]/30 w-4 h-4 flex items-center justify-center text-[10px] font-bold">i</button>
            </div>
          </div>
          
          <button 
            onClick={() => !isBelowMinOrder && setLocation(checkoutTarget)}
            disabled={isBelowMinOrder}
            className={`flex-1 max-w-[240px] h-12 rounded-lg font-black tracking-wide text-sm shadow-lg transition-all uppercase flex items-center justify-center gap-2 ${
              isBelowMinOrder 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                : 'bg-[#D4AF37] text-white shadow-[#D4AF37]/20 hover:bg-[#B48A2D]'
            }`}
          >
            {isBelowMinOrder ? 'Below Minimum' : 'Place Order'}
          </button>
        </div>
      </div>

      {/* ─── MODALS ─── */}
      <AddressMapModal 
        isOpen={showAddressModal} 
        onClose={() => setShowAddressModal(false)}
        onSave={(addr) => {
          // Address save logic if needed, or just refresh profile
          handleRefresh();
          setShowAddressModal(false);
        }}
      />
    </div>
  );
}
