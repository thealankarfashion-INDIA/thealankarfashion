// src/hooks/useStoreCategories.ts
import { useEffect, useState, useCallback } from "react";
import { collection, query, getDocs, orderBy } from "@/lib/supabaseStore";
import { getDB } from "../lib/supabase";
import { loadStoreSeed } from "../lib/storeSeed";
import type { Category } from "../lib/types";

let cachedCategories: Category[] | null = null;
let fetchPromise: Promise<Category[]> | null = null;

function categoryOrderValue(category: Category) {
  const order = Number(category.displayOrder);
  return Number.isFinite(order) && order > 0 ? order : 99999;
}

function categoryCreatedAtValue(category: Category) {
  const createdAt = (category as any).createdAt;
  return createdAt?.toMillis?.() || (createdAt ? new Date(createdAt).getTime() : 0);
}

function sortCategories(categories: Category[]) {
  return [...categories].sort((a, b) => {
    const orderDiff = categoryOrderValue(a) - categoryOrderValue(b);
    if (orderDiff !== 0) return orderDiff;
    return categoryCreatedAtValue(b) - categoryCreatedAtValue(a);
  });
}

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
            const q = query(col, orderBy("displayOrder", "asc"));
            const snap = await getDocs(q);
            
            const arr = snap.docs.map((d) => {
              const data = d.data() as any;
              return {
                id: d.id,
                ...data,
                name: data.name ?? "",
                slug: data.slug ?? "",
                image: data.image ?? undefined,
                description: data.description ?? "",
                count: data.count ?? 0,
                displayOrder: Number(data.displayOrder ?? 0),
                createdAt: data.createdAt ?? null,
              } as Category;
            });
            return sortCategories(arr);
          })();
        }

        let data = await fetchPromise;
        if (data.length === 0) {
          data = sortCategories((await loadStoreSeed()).categories || []);
        }
        cachedCategories = data;
        
        if (isMounted) {
          setCategories(data);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Supabase fetch error in categories, using seed fallback');
        const seedCategories = sortCategories((await loadStoreSeed()).categories || []);
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
