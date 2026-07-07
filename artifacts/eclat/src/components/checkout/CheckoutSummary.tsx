import { useState } from 'react';
import { motion } from 'framer-motion';
import { CartItem } from '@/context/CartContext';
import { X, Tag } from 'lucide-react';

interface Props {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  promoInput: string;
  setPromoInput: (v: string) => void;
  promoCode: any;
  promoError: string;
  promoLoading: boolean;
  onApplyPromo: (code?: string) => void;
  onRemoveItem: (productId: string, color: string, size: string) => void;
  onUpdateQty: (productId: string, color: string, size: string, qty: number) => void;
  availableOffers: any[];
}

export default function CheckoutSummary({
  items, subtotal, discount, total,
  promoInput, setPromoInput, promoCode, promoError, promoLoading,
  onApplyPromo, onRemoveItem, onUpdateQty, availableOffers
}: Props) {
  const [showOffers, setShowOffers] = useState(false);

  return (
    <div className="bg-[#FBF6F3] border border-[#E8D8D1] rounded-sm p-6 md:p-8 lg:sticky lg:top-28">
      <h3 className="font-serif text-xl text-[#8E5E4F] mb-6 pb-4 border-b border-[#E8D8D1]">Order Summary</h3>

      {/* Items */}
      <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-1">
        {items.map(item => (
          <div key={`${item.productId}-${item.color}-${item.size}`} className="flex gap-3 group">
            <div className="relative w-14 h-18 flex-shrink-0 rounded-sm overflow-hidden bg-[#F7F1EE]">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#8E5E4F] text-white text-[10px] rounded-full flex items-center justify-center font-medium">{item.quantity}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#8E5E4F] truncate">{item.name}</p>
              <p className="text-xs text-[#8E5E4F]/50 mt-0.5">{item.color && `${item.color} · `}{item.size}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center border border-[#E8D8D1] rounded-sm overflow-hidden">
                  <button onClick={() => onUpdateQty(item.productId, item.color, item.size, item.quantity - 1)} className="px-2 py-1 text-xs text-[#8E5E4F] hover:bg-[#F7F1EE]">−</button>
                  <span className="px-2 py-1 text-xs text-[#8E5E4F]">{item.quantity}</span>
                  <button onClick={() => onUpdateQty(item.productId, item.color, item.size, item.quantity + 1)} className="px-2 py-1 text-xs text-[#8E5E4F] hover:bg-[#F7F1EE]">+</button>
                </div>
                <span className="text-sm text-[#8E5E4F] font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            </div>
            <button onClick={() => onRemoveItem(item.productId, item.color, item.size)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[#8E5E4F]/30 hover:text-red-500 self-start">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Promo */}
      <div className="mb-6 pb-6 border-b border-[#E8D8D1]">
        <div className="flex gap-2 mb-2">
          <input type="text" value={promoInput} onChange={e => setPromoInput(e.target.value)}
            onFocus={() => setShowOffers(true)}
            placeholder="Promo code"
            className="flex-1 bg-white/60 border border-[#E8D8D1] rounded-sm py-2 px-3 text-sm text-[#8E5E4F] focus:outline-none focus:border-[#B47A67] transition-colors" />
          <button type="button" onClick={() => onApplyPromo()} disabled={promoLoading}
            className="px-4 py-2 bg-[#B47A67] text-white rounded-sm text-xs uppercase tracking-widest hover:bg-[#A86F5C] transition-colors">
            {promoLoading ? '...' : 'Apply'}
          </button>
        </div>
        {promoError && <p className="text-xs text-red-500">{promoError}</p>}
        {promoCode && <p className="text-xs text-green-600">✓ Code "{promoCode.code}" applied — {promoCode.type === 'percentage' ? `${promoCode.discount}% off` : `₹${promoCode.discount} off`}</p>}

        {showOffers && availableOffers.length > 0 && !promoCode && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 bg-white border border-[#E8D8D1] rounded-sm shadow overflow-hidden">
            <div className="px-3 py-2 bg-[#FBF6F3] border-b border-[#E8D8D1] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8E5E4F]/60 flex items-center gap-1"><Tag size={11} className="text-[#B47A67]" /> Available Offers</span>
              <button onClick={() => setShowOffers(false)} className="text-[#8E5E4F]/40 hover:text-[#8E5E4F]"><X size={13} /></button>
            </div>
            {availableOffers.map(offer => (
              <button key={offer.id} onClick={() => { onApplyPromo(offer.code); setShowOffers(false); }}
                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-[#FBF6F3] transition-colors border-b border-[#E8D8D1]/50 last:border-0">
                <span className="text-xs font-bold text-[#B47A67] font-mono">{offer.code}</span>
                <span className="text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{offer.type === 'fixed' ? `₹${offer.discount} OFF` : `${offer.discount}% OFF`}</span>
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Totals */}
      <div className="space-y-3 text-sm border-t border-[#E8D8D1] pt-5">
        <div className="flex justify-between"><span className="text-[#8E5E4F]/60">Subtotal</span><span className="text-[#8E5E4F]">₹{subtotal.toFixed(2)}</span></div>
        {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{discount.toFixed(2)}</span></div>}
        <div className="flex justify-between"><span className="text-[#8E5E4F]/60">Shipping</span><span className="text-green-600">Free</span></div>
      </div>
      <div className="flex justify-between items-center border-t border-[#E8D8D1] mt-5 pt-5">
        <span className="font-serif text-lg text-[#8E5E4F]">Total</span>
        <span className="font-serif text-2xl text-[#8E5E4F]">₹{total.toFixed(2)}</span>
      </div>
    </div>
  );
}
