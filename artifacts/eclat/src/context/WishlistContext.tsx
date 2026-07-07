import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { syncWishlistToFirestore, toggleWishlistItemInFirestore } from '@/lib/user';

interface WishlistContextType {
  items: string[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<string[]>([]);
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from local storage first
  useEffect(() => {
    const savedWishlist = localStorage.getItem('thealankar_wishlist');
    if (savedWishlist) {
      try {
        setItems(JSON.parse(savedWishlist));
      } catch (e) {
        console.error('Failed to parse wishlist', e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Sync with Firestore when user auth state changes
  useEffect(() => {
    if (user && isInitialized) {
      const sync = async () => {
        try {
          const cloudWishlist = await syncWishlistToFirestore(user.uid, items);
          setItems(cloudWishlist);
          localStorage.setItem('thealankar_wishlist', JSON.stringify(cloudWishlist));
        } catch (error) {
          console.error('Failed to sync wishlist to Firestore', error);
        }
      };
      sync();
    }
  }, [user, isInitialized]);

  // Update local storage when items change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('thealankar_wishlist', JSON.stringify(items));
    }
  }, [items, isInitialized]);

  const toggleWishlist = async (productId: string) => {
    const isAdding = !items.includes(productId);
    
    // Optimistic UI update
    setItems(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      }
      return [...prev, productId];
    });

    // Update Firestore if user is logged in
    if (user) {
      try {
        await toggleWishlistItemInFirestore(user.uid, productId, isAdding);
      } catch (error) {
        console.error('Failed to update wishlist in Firestore', error);
        // Revert UI on failure
        setItems(prev => {
          if (!isAdding) return [...prev, productId];
          return prev.filter(id => id !== productId);
        });
      }
    }
  };

  const isInWishlist = (productId: string) => {
    return items.includes(productId);
  };

  const contextValue = React.useMemo(() => ({ items, toggleWishlist, isInWishlist }), [items]);

  return (
    <WishlistContext.Provider value={contextValue}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
