// Service Worker for Laundry Cleanique PWA
const CACHE_NAME = "cleanique-cache-v4";
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

  // 1. Only intercept same-origin HTTP/HTTPS requests
  // Bypasses browser extensions (chrome-extension://), third-party tracking (Cloudflare beacon), CDNs, etc.
  if (url.origin !== self.location.origin || !url.protocol.startsWith("http")) {
    return;
  }

  // 2. Bypass non-GET and API / dynamic tracking requests from caching
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  // 3. Handle navigation requests (SPA index.html fallback)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match("/");
        if (cached) {
          return cached;
        }
        return new Response("Aplikasi sedang offline", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      })
    );
    return;
  }

  // 4. For same-origin static assets: try network first, then cache, with safe fallback Response
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and store valid responses in cache
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {
              // Silently ignore cache put failures
            });
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }
        // Always return a valid Response instance so event.respondWith never receives undefined
        return new Response("Resource unavailable offline", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      })
  );
});
