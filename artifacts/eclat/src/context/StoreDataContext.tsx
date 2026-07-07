import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { collection, query, orderBy, onSnapshot } from '@/lib/supabaseStore';
import { getDB } from '../lib/supabase';
import type { Product, Offer, MainBanner } from '../lib/types';

interface StoreDataContextType {
  products: Product[];
  productsLoading: boolean;
  offers: Offer[];
  offersLoading: boolean;
  mainBanners: MainBanner[];
  mainBannersLoading: boolean;
}

const StoreDataContext = createContext<StoreDataContextType | null>(null);

export const StoreDataProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);

  const [mainBanners, setMainBanners] = useState<MainBanner[]>([]);
  const [mainBannersLoading, setMainBannersLoading] = useState(true);

  useEffect(() => {
    let unsubProducts: () => void;
    let unsubOffers: () => void;
    let unsubBanners: () => void;

    try {
      const db = getDB();

      // Products Listener
      const qProducts = query(collection(db, 'products'));
      unsubProducts = onSnapshot(
        qProducts,
        (snap) => {
          const arr = snap.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              name: data.name ?? "",
              price: Number(data.price ?? 0),
              originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
              category: data.category ?? "uncategorized",
              brand: data.brand ?? "",
              description: data.description ?? "",
              sizes: Array.isArray(data.sizes)
                ? data.sizes
                : typeof data.sizes === "string"
                  ? data.sizes.split(",").map((s: string) => s.trim())
                  : [],
              variants: Array.isArray(data.variants)
                ? data.variants
                : Array.isArray(data.sizes)
                  ? data.sizes
                  : typeof data.sizes === "string"
                    ? data.sizes.split(",").map((s: string) => s.trim())
                    : ["Single"],
              images: Array.isArray(data.images) ? data.images : data.images ? [data.images] : [],
              image: Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : (data.image || ""),
              weight: data.weight ?? "",
              ingredients: data.ingredients ?? "",
              flavor: data.flavor ?? "",
              servingSuggestion: data.servingSuggestion ?? "",
              allergenInfo: data.allergenInfo ?? "",
              shelfLife: data.shelfLife ?? "",
              isNew: !!data.isNew,
              isBestseller: !!data.isBestseller || !!data.featured,
              isOnSale: !!data.isOnSale,
              inStock: data.stockQuantity !== undefined ? Number(data.stockQuantity) > 0 : (data.inStock === undefined ? true : !!data.inStock),
              stockQuantity: data.stockQuantity !== undefined ? Number(data.stockQuantity) : undefined,
              featured: !!data.featured,
              colors: Array.isArray(data.colors)
                ? data.colors
                : data.colors
                  ? data.colors.split(",").map((c: string) => c.trim())
                  : [],
              rating: Number(data.rating ?? 0),
              reviews: Number(data.reviews ?? 0),
              reviewCount: Number(data.reviewCount ?? data.reviews ?? 0),
              badge: data.badge ?? undefined,
              whatsInTheBox: Array.isArray(data.whatsInTheBox) ? data.whatsInTheBox : [],
              youtubeUrl: data.youtubeUrl ?? "",
              youtubeVideoId: data.youtubeVideoId ?? "",
              createdAt: data.createdAt ?? null,
              updatedAt: data.updatedAt ?? null,
              displayOrder: data.displayOrder ?? 0,
              collection: data.collection ?? "",
              fabric: data.fabric ?? "",
              fit: data.fit ?? "",
              occasion: data.occasion ?? "",
              sku: data.sku ?? "",
            } as Product;
          });
          arr.sort((a, b) => {
            const timeA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt as any).getTime() : 0);
            const timeB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt as any).getTime() : 0);
            return timeB - timeA;
          });
          setProducts(arr);
          setProductsLoading(false);
        },
        (err) => {
          console.error("StoreDataProvider query error (products):", err);
          setProductsLoading(false);
        }
      );

      // Offers Listener
      const qOffers = query(collection(db, 'offers'), orderBy('order', 'asc'));
      unsubOffers = onSnapshot(
        qOffers,
        (snapshot) => {
          const list: Offer[] = snapshot.docs.map((doc) => {
            return { id: doc.id, ...doc.data() } as Offer;
          });
          setOffers(list);
          setOffersLoading(false);
        },
        (error) => {
          console.error("StoreDataProvider query error (offers):", error);
          setOffersLoading(false);
        }
      );

      // Main Banners Listener
      const qBanners = query(collection(db, 'mainBanners'), orderBy('order', 'asc'));
      unsubBanners = onSnapshot(
        qBanners,
        (snapshot) => {
          const list: MainBanner[] = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as MainBanner))
            .filter((banner) => banner.active);
          setMainBanners(list);
          setMainBannersLoading(false);
        },
        (error) => {
          console.error("StoreDataProvider query error (banners):", error);
          setMainBannersLoading(false);
        }
      );

    } catch (err) {
      console.warn("Supabase not configured in StoreDataProvider", err);
      setProductsLoading(false);
      setOffersLoading(false);
      setMainBannersLoading(false);
    }

    return () => {
      if (unsubProducts) unsubProducts();
      if (unsubOffers) unsubOffers();
      if (unsubBanners) unsubBanners();
    };
  }, []);

  return (
    <StoreDataContext.Provider
      value={{
        products,
        productsLoading,
        offers,
        offersLoading,
        mainBanners,
        mainBannersLoading,
      }}
    >
      {children}
    </StoreDataContext.Provider>
  );
};

export const useStoreData = () => {
  const context = useContext(StoreDataContext);
  if (!context) {
    throw new Error('useStoreData must be used within a StoreDataProvider');
  }
  return context;
};
