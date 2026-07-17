import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useStoreData } from './StoreDataContext';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  color: string;
  size: string;
  quantity: number;
  rating?: number;
  reviews?: number;
  originalPrice?: number;
  sku?: string;
  maxQuantity?: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, color: string, size: string) => void;
  updateQuantity: (productId: string, color: string, size: string, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { products, productsSource, ensureProductsLoaded } = useStoreData();

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('thealankar_cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart) as Partial<CartItem>[];
        // images are stripped on save; they'll be re-fetched from the product catalog
        setItems(parsed.map((item) => ({ ...item, image: item.image || '' } as CartItem)));
      }
    } catch (e) {
      console.warn('Cart restore failed, resetting.', e);
      localStorage.removeItem('thealankar_cart');
    }
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      ensureProductsLoaded();
    }
  }, [items, ensureProductsLoaded]);

  useEffect(() => {
    if (products.length === 0 || items.length === 0) return;

    setItems((prev) => {
      let changed = false;
      const hydrated = prev.flatMap((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          if (productsSource === "database") changed = true;
          return productsSource === "database" ? [] : [item];
        }

        const image = product?.image || product?.images?.[0] || '';
        const maxQuantity = product?.stockQuantity;
        if (product.inStock === false || (maxQuantity !== undefined && maxQuantity <= 0)) {
          changed = true;
          return [];
        }

        const quantity = maxQuantity !== undefined
          ? Math.min(item.quantity, Math.max(0, maxQuantity))
          : item.quantity;
        if (
          item.image === image &&
          item.maxQuantity === maxQuantity &&
          item.quantity === quantity &&
          item.price === Number(product.price) &&
          item.name === product.name
        ) {
          return [item];
        }

        changed = true;
        return [{
          ...item,
          name: product.name || item.name,
          price: Number(product.price) || item.price,
          image,
          sku: product.sku || item.sku,
          maxQuantity,
          quantity,
        }];
      });

      return changed ? hydrated : prev;
    });
  }, [products, productsSource, items.length]);

  useEffect(() => {
    try {
      // Strip image field before saving — remote image URLs can be very long
      // and easily exceed the ~5 MB localStorage quota when many items are added.
      const slim = items.map(({ image: _img, ...rest }) => rest);
      localStorage.setItem('thealankar_cart', JSON.stringify(slim));
    } catch (e) {
      // Quota exceeded or storage unavailable — silently ignore.
      // The in-memory cart still works for the current session.
      console.warn('Cart could not be persisted to localStorage:', e);
    }
  }, [items]);

  const addToCart = (newItem: CartItem) => {
    setItems(prev => {
      const existingItem = prev.find(
        item => item.productId === newItem.productId && item.color === newItem.color && item.size === newItem.size
      );
      if (existingItem) {
        return prev.map(item => {
          if (item.productId === newItem.productId && item.color === newItem.color && item.size === newItem.size) {
            const newQuantity = item.quantity + newItem.quantity;
            return {
              ...item,
              quantity: item.maxQuantity !== undefined && newQuantity > item.maxQuantity ? item.maxQuantity : newQuantity
            };
          }
          return item;
        });
      }
      
      if (newItem.maxQuantity !== undefined && newItem.quantity > newItem.maxQuantity) {
        return [...prev, { ...newItem, quantity: newItem.maxQuantity }];
      }
      return [...prev, newItem];
    });
  };

  const removeFromCart = (productId: string, color: string, size: string) => {
    setItems(prev => prev.filter(
      item => !(item.productId === productId && item.color === color && item.size === size)
    ));
  };

  const updateQuantity = (productId: string, color: string, size: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, color, size);
      return;
    }
    setItems(prev => prev.map(item => {
      if (item.productId === productId && item.color === color && item.size === size) {
        const finalQuantity = item.maxQuantity !== undefined && quantity > item.maxQuantity ? item.maxQuantity : quantity;
        return { ...item, quantity: finalQuantity };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartTotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = items.reduce((count, item) => count + item.quantity, 0);

  const contextValue = React.useMemo(() => ({
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isCartOpen,
    setIsCartOpen,
    cartTotal,
    cartCount
  }), [items, isCartOpen, cartTotal, cartCount]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
