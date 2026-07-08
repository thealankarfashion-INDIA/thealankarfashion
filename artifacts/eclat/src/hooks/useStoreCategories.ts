// src/hooks/useStoreCategories.ts
import { useEffect, useState, useCallback } from "react";
import { collection, query, getDocs } from "@/lib/supabaseStore";
import { getDB } from "../lib/supabase";
import { loadStoreSeed } from "../lib/storeSeed";
import type { Category } from "../lib/types";

let cachedCategories: Category[] | null = null;
let fetchPromise: Promise<Category[]> | null = null;

export default function useStoreCategories(enabled = true) {
  const [categories, setCategories] = useState<Category[]>(cachedCategories || []);
  const [loading, setLoading] = useState<boolean>(enabled && !cachedCategories);
  const [error, setError] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    cachedCategories = null;
    fetchPromise = null;
    setError(null);
    setLoading(true);
    setRetryCount(c => c + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!enabled) {
      setLoading(false);
      return;
    }

    if (cachedCategories) {
      setCategories(cachedCategories);
      setLoading(false);
      return;
    }

    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!fetchPromise) {
          fetchPromise = (async () => {
            const col = collection(getDB(), "categories");
            const q = query(col);
            const snap = await getDocs(q);
            
            const arr = snap.docs.map((d) => {
              const data = d.data() as any;
              return {
                id: d.id,
                name: data.name ?? "",
                slug: data.slug ?? "",
                image: data.image ?? undefined,
                description: data.description ?? "",
                count: data.count ?? 0,
                displayOrder: data.displayOrder ?? 0,
                createdAt: data.createdAt ?? null,
                ...data,
              } as Category;
            });
            arr.sort((a, b) => {
              const timeA = (a as any).createdAt?.toMillis?.() || ((a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0);
              const timeB = (b as any).createdAt?.toMillis?.() || ((b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0);
              return timeB - timeA;
            });
            return arr;
          })();
        }

        let data = await fetchPromise;
        if (data.length === 0) {
          data = (await loadStoreSeed()).categories || [];
        }
        cachedCategories = data;
        
        if (isMounted) {
          setCategories(data);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Supabase fetch error in categories, using seed fallback');
        const seedCategories = (await loadStoreSeed()).categories || [];
        cachedCategories = seedCategories;
        if (isMounted) {
          setError(err);
          setCategories(seedCategories);
          setLoading(false);
        }
      }
    };

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, [enabled, retryCount]);

  return { categories, loading, error, retry };
}
