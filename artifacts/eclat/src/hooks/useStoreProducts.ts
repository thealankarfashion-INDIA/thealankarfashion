// src/hooks/useStoreProducts.ts
import { useCallback, useEffect } from "react";
import { useStoreData } from "../context/StoreDataContext";

export default function useStoreProducts() {
  const { products, productsLoading, ensureProductsLoaded } = useStoreData();

  useEffect(() => {
    ensureProductsLoaded();
  }, [ensureProductsLoaded]);

  const retry = useCallback(() => {
    ensureProductsLoaded();
  }, [ensureProductsLoaded]);

  return { products, loading: productsLoading, error: null, retry };
}
