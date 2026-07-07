import type {
  Announcement,
  Brand,
  Category,
  MainBanner,
  Offer,
  Product,
  TestingVideo,
} from "./types";

export type StoreSeed = {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  offers: Offer[];
  announcements: Announcement[];
  mainBanners: MainBanner[];
  testingVideos: TestingVideo[];
};

let storeSeedPromise: Promise<StoreSeed> | null = null;

const EMPTY_SEED: StoreSeed = {
  products: [],
  categories: [],
  brands: [],
  offers: [],
  announcements: [],
  mainBanners: [],
  testingVideos: [],
};

export async function loadStoreSeed(): Promise<StoreSeed> {
  if (!storeSeedPromise) {
    const url = `${import.meta.env.BASE_URL}seed/store.json`;
    storeSeedPromise = fetch(url, { cache: "force-cache" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load store seed: ${response.status}`);
        }
        return response.json() as Promise<StoreSeed>;
      })
      .catch((error) => {
        console.warn("Store seed fallback unavailable", error);
        return EMPTY_SEED;
      });
  }

  return storeSeedPromise;
}
