import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, Lock } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Link, useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import { getDB } from '@/lib/supabase';
import { doc, onSnapshot } from '@/lib/supabaseStore';
import { AlertCircle } from 'lucide-react';

export default function CartDrawer() {
  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeFromCart, cartTotal } = useCart();
  const [, setLocation] = useLocation();
  const [storeSettings, setStoreSettings] = useState({ minOrderAmount: 0 });

  useEffect(() => {
    const unsub = onSnapshot(doc(getDB(), 'settings', 'storeSettings'), snap => {
      if (snap.exists()) setStoreSettings({ minOrderAmount: snap.data().minOrderAmount || 0 });
    });
    return () => unsub();
  }, []);

  const isBelowMinOrder = storeSettings.minOrderAmount > 0 && cartTotal < storeSettings.minOrderAmount;

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[70]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-background shadow-2xl z-[80] flex flex-col"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="font-serif text-2xl">Your Cart ({items.length})</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground" />
                  <p className="text-muted-foreground text-lg">Your cart is empty.</p>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="mt-4 px-8 py-3 bg-foreground text-background text-sm tracking-widest uppercase hover:bg-foreground/90 transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.color}-${item.size}`} className="flex gap-4">
                      <div className="w-24 h-32 bg-muted flex-shrink-0">
                        <img src={item.image} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-sm">{item.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">Color: {item.color}</p>
                            <p className="text-sm text-muted-foreground">Size: {item.size}</p>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.productId, item.color, item.size)}
                            className="text-muted-foreground hover:text-foreground p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="mt-auto flex justify-between items-center">
                          <div className="flex items-center border border-border">
                            <button 
                              onClick={() => updateQuantity(item.productId, item.color, item.size, item.quantity - 1)}
                              className="p-2 hover:bg-muted transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.productId, item.color, item.size, item.quantity + 1)}
                              disabled={item.maxQuantity !== undefined && item.quantity >= item.maxQuantity}
                              className="p-2 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="font-serif">₹{item.price}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 border-t border-border bg-background">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg">Subtotal</span>
                  <span className="font-serif text-2xl">₹{cartTotal}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">Shipping and taxes calculated at checkout.</p>
                {isBelowMinOrder && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Add ₹{storeSettings.minOrderAmount - cartTotal} more for minimum order of ₹{storeSettings.minOrderAmount}</span>
                  </div>
                )}
                <button
                  data-testid="button-checkout"
                  onClick={() => {
                    if (!isBelowMinOrder) {
                      setIsCartOpen(false);
                      setLocation('/checkout');
                    }
                  }}
                  disabled={isBelowMinOrder}
                  className={`w-full py-4 rounded-xl text-sm tracking-widest uppercase transition-colors flex items-center justify-center gap-2 ${
                    isBelowMinOrder 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-[#B47A67] text-white hover:bg-[#A86F5C]'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  {isBelowMinOrder ? 'Below Minimum Amount' : 'Proceed to Checkout'}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
