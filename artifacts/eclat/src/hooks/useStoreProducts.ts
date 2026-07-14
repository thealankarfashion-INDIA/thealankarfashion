// src/hooks/useStoreProducts.ts
import { useCallback, useEffect } from "react";
import { useStoreData } from "../context/StoreDataContext";

export default function useStoreProducts(enabled = true) {
  const {
    products,
    productsLoading,
    productsSource,
    productsError,
    ensureProductsLoaded,
  } = useStoreData();

  useEffect(() => {
    if (!enabled) return;
    ensureProductsLoaded();
  }, [enabled, ensureProductsLoaded]);

  const retry = useCallback(() => {
    ensureProductsLoaded();
  }, [ensureProductsLoaded]);

  return {
    products,
    loading: productsLoading,
    source: productsSource,
    error: productsError,
    retry,
  };
}
