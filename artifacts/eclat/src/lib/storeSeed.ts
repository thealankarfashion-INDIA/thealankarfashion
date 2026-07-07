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

const resolveSeedAssetPath = (value: unknown): unknown => {
  if (typeof value === "string") {
    if (!value.startsWith("/seed/")) {
      return value;
    }

    const basePath = import.meta.env.BASE_URL.endsWith("/")
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;

    return `${basePath}${value.slice(1)}`;
  }

  if (Array.isArray(value)) {
    return value.map(resolveSeedAssetPath);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, resolveSeedAssetPath(child)])
    );
  }

  return value;
};

export async function loadStoreSeed(): Promise<StoreSeed> {
  if (!storeSeedPromise) {
    const url = `${import.meta.env.BASE_URL}seed/store.json`;
    storeSeedPromise = fetch(url, { cache: "force-cache" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load store seed: ${response.status}`);
        }
        return response.json().then((seed) => resolveSeedAssetPath(seed) as StoreSeed);
      })
      .catch((error) => {
        console.warn("Store seed fallback unavailable", error);
        return EMPTY_SEED;
      });
  }

  return storeSeedPromise;
}
