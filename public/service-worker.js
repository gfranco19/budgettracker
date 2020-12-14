const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/db.js",
  "/index.js",
  "/manifest.webmanifest",
  "/styles.css",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png"
];

const STATIC_CACHE = "static-cache-v1";
const RUNTIME_CACHE = "runtime-cache";

// Install
self.addEventListener("install", event => {
  event.waitUntil(
      caches
          .open(STATIC_CACHE)
          .then(cache => cache.addAll(FILES_TO_CACHE))
          .then(() => self.skipWaiting())
  );
});

// The activate handler takes care of cleaning up old caches
self.addEventListener("activate", event => {
  const currentCaches = [STATIC_CACHE, RUNTIME_CACHE];
  event.waitUntil(
      caches
          .keys()
          .then(cacheNames => {
              // return array of cache names that are old to delete
              return cacheNames.filter(
                  cacheName => !currentCaches.includes(cacheName)
              );
          })
          .then(cachesToDelete => {
              return Promise.all(
                  cachesToDelete.map(cacheToDelete => {
                      return caches.delete(cacheToDelete);
                  })
              );
          })
          .then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener("fetch", event => {
  // non GET requests are not cached and requests to other origins are not cached
  if (
      event.request.method !== "GET" ||
      !event.request.url.startsWith(self.location.origin)
  ) {
      event.respondWith(fetch(event.request));
      return;
  }

  // Runtime GET requests for data from /api routes
  if (event.request.url.includes("/api/")) {
      // Network request and fallback to cache if network request fails (offline)
      event.respondWith(
          caches.open(RUNTIME_CACHE).then(cache => {
              return fetch(event.request)
                  .then(response => {
                      cache.put(event.request, response.clone());
                      return response;
                  })
                  .catch(() => caches.match(event.request));
          })
      );
      return;
  }

  // Cache first for all other requests for performance
  event.respondWith(
      caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
              return cachedResponse;
          }

          // Request is not in cache.  Network request and response cached
          return caches.open(RUNTIME_CACHE).then(cache => {
              return fetch(event.request).then(response => {
                  return cache.put(event.request, response.clone()).then(() => {
                      return response;
                  });
              });
          });
      })
  );
});
