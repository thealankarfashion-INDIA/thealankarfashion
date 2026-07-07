// src/hooks/useStoreProducts.ts
import { useCallback } from "react";
import { useStoreData } from "../context/StoreDataContext";

export default function useStoreProducts() {
  const { products, productsLoading } = useStoreData();

  const retry = useCallback(() => {
    // No-op for now, context handles reconnection if needed.
    console.log("Retry called on products (handled by global context)");
  }, []);

  return { products, loading: productsLoading, error: null, retry };
}
