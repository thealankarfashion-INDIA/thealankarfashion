const IMAGE_CACHE = "thealankar-image-cache-v1";
const MAX_IMAGE_CACHE_ENTRIES = 400;
const SUPABASE_STORAGE_HOST = "nevrcoezrzolxspfosla.supabase.co";

function shouldCacheImage(request) {
  if (request.method !== "GET") return false;

  const url = new URL(request.url);
  const isImageRequest = request.destination === "image";
  const isSupabaseStorefrontImage =
    url.hostname === SUPABASE_STORAGE_HOST &&
    url.pathname.startsWith("/storage/v1/object/public/storefront-images/");

  return isImageRequest || isSupabaseStorefrontImage;
}

async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_IMAGE_CACHE_ENTRIES) return;

  await Promise.all(
    keys.slice(0, keys.length - MAX_IMAGE_CACHE_ENTRIES).map((key) => cache.delete(key))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!shouldCacheImage(request)) return;

  event.respondWith(
    caches.open(IMAGE_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok || response.type === "opaque") {
        event.waitUntil(
          cache.put(request, response.clone()).then(() => trimCache(cache))
        );
      }
      return response;
    })
  );
});
