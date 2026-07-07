// src/hooks/useStoreBrands.ts
import { useEffect, useState, useCallback } from "react";
import { collection, query, getDocs } from "@/lib/supabaseStore";
import { getDB } from "../lib/supabase";
import type { Brand } from "../lib/types";

let cachedBrands: Brand[] | null = null;
let fetchPromise: Promise<Brand[]> | null = null;

export default function useStoreBrands() {
  const [brands, setBrands] = useState<Brand[]>(cachedBrands || []);
  const [loading, setLoading] = useState<boolean>(!cachedBrands);
  const [error, setError] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    cachedBrands = null;
    fetchPromise = null;
    setError(null);
    setLoading(true);
    setRetryCount(c => c + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (cachedBrands) {
      setBrands(cachedBrands);
      setLoading(false);
      return;
    }

    const fetchBrands = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!fetchPromise) {
          fetchPromise = (async () => {
            const col = collection(getDB(), "brands");
            const q = query(col);
            const snap = await getDocs(q);
            
            const arr = snap.docs.map((d) => {
              const data = d.data() as any;
              return {
                id: d.id,
                name: data.name ?? "",
                slug: data.slug ?? "",
                tagline: data.tagline ?? "",
                image: data.image ?? undefined,
                bg: data.bg ?? "#EEF2E8",
                displayOrder: data.displayOrder ?? 0,
                createdAt: data.createdAt ?? null,
                ...data,
              } as Brand;
            });
            arr.sort((a, b) => {
              const timeA = (a as any).createdAt?.toMillis?.() || ((a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0);
              const timeB = (b as any).createdAt?.toMillis?.() || ((b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0);
              return timeB - timeA;
            });
            return arr;
          })();
        }

        const data = await fetchPromise;
        cachedBrands = data;
        
        if (isMounted) {
          setBrands(data);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Supabase fetch error in brands, using empty array');
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      }
    };

    fetchBrands();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  return { brands, loading, error, retry };
}
