// src/hooks/useStoreOffers.ts
import { useStoreData } from '../context/StoreDataContext';

const useStoreOffers = () => {
  const { offers, offersLoading } = useStoreData();

  return { offers, loading: offersLoading };
};

export default useStoreOffers;
