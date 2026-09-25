// Service Worker for Laundry Cleanique PWA
const CACHE_NAME = "cleanique-cache-v2";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/logo.png",
  "/favicon.ico",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
  "/apple-touch-icon.png",
  "/laundry-cleanique.png",
  "/laundry-cleanique-outline.png"
];

// Install event: cache basic app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Cache addAll warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: network-first for API, cache-first/network-fallback for static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Bypass non-GET and API / dynamic tracking requests from caching
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  // Handle navigation requests (SPA index.html fallback)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match("/");
      })
    );
    return;
  }

  // For static assets: try network first, then cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and store valid responses in cache
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
