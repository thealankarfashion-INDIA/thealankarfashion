const IMAGE_CACHE = "thealankar-image-cache-v2";
const DATA_CACHE = "thealankar-public-data-cache-v2";
const MAX_IMAGE_CACHE_ENTRIES = 900;
const SUPABASE_STORAGE_HOST = "opaszigtibugtrxfsufn.supabase.co";
const PUBLIC_DATA_TABLES = new Set([
  "products",
  "categories",
  "brands",
  "offers",
  "main_banners",
  "announcements",
  "testing_videos",
  "site_settings",
  "delivery_settings",
]);

function shouldCacheImage(request) {
  if (request.method !== "GET") return false;

  const url = new URL(request.url);
  const isImageRequest = request.destination === "image";
  const isSupabaseStorefrontImage =
    url.hostname === SUPABASE_STORAGE_HOST &&
    url.pathname.startsWith("/storage/v1/object/public/storefront-images/");

  return isImageRequest || isSupabaseStorefrontImage;
}

function getPublicDataTable(url) {
  if (url.hostname !== SUPABASE_STORAGE_HOST) return null;
  if (!url.pathname.startsWith("/rest/v1/")) return null;
  const table = url.pathname.slice("/rest/v1/".length).split("/")[0];
  return PUBLIC_DATA_TABLES.has(table) ? table : null;
}

function isFreshnessCriticalReferrer(referrer) {
  return (
    referrer.includes("/antomanage") ||
    referrer.includes("/admin/") ||
    referrer.includes("/checkout") ||
    referrer.includes("/order") ||
    referrer.includes("/track") ||
    referrer.includes("/profile") ||
    referrer.includes("/wallet")
  );
}

function shouldCachePublicData(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  return !!getPublicDataTable(url) && !isFreshnessCriticalReferrer(request.referrer || "");
}

async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_IMAGE_CACHE_ENTRIES) return;

  await Promise.all(
    keys.slice(0, keys.length - MAX_IMAGE_CACHE_ENTRIES).map((key) => cache.delete(key))
  );
}

async function trimDataCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= 120) return;
  await Promise.all(keys.slice(0, keys.length - 120).map((key) => cache.delete(key)));
}

async function clearPublicDataCacheForRequest(request) {
  const url = new URL(request.url);
  const table = getPublicDataTable(url);
  if (!table) return;
  const cache = await caches.open(DATA_CACHE);
  const keys = await cache.keys();
  await Promise.all(
    keys
      .filter((key) => {
        const keyUrl = new URL(key.url);
        return keyUrl.hostname === SUPABASE_STORAGE_HOST && keyUrl.pathname.startsWith(`/rest/v1/${table}`);
      })
      .map((key) => cache.delete(key))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("thealankar-") && ![IMAGE_CACHE, DATA_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const shouldCacheImageRequest = shouldCacheImage(request);
  const shouldCacheDataRequest = shouldCachePublicData(request);

  if (request.method !== "GET") {
    event.waitUntil(clearPublicDataCacheForRequest(request));
    return;
  }

  if (!shouldCacheImageRequest && !shouldCacheDataRequest) return;

  event.respondWith(
    caches.open(shouldCacheImageRequest ? IMAGE_CACHE : DATA_CACHE).then(async (cache) => {
      if (shouldCacheDataRequest) {
        try {
          const response = await fetch(request, { cache: "no-store" });
          if (response.ok) {
            const responseToCache = new Response(response.clone().body, {
              status: response.status,
              statusText: response.statusText,
              headers: new Headers(response.headers),
            });
            event.waitUntil(
              cache
                .put(request, responseToCache)
                .then(() => trimDataCache(cache))
            );
          }
          return response;
        } catch (error) {
          const cachedResponse = await cache.match(request);
          if (cachedResponse) return cachedResponse;
          throw error;
        }
      }

      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok || response.type === "opaque") {
        const responseToCache = response.clone();
        event.waitUntil(
          cache
            .put(request, responseToCache)
            .then(() => trimCache(cache))
        );
      }
      return response;
    })
  );
});
