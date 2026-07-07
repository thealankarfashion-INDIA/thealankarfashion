// src/hooks/useStoreMainBanners.ts
import { useStoreData } from '../context/StoreDataContext';

const useStoreMainBanners = () => {
  const { mainBanners, mainBannersLoading } = useStoreData();

  return { mainBanners, loading: mainBannersLoading };
};

export default useStoreMainBanners;
