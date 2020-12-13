const FILES_TO_CACHE =[
    "/",
    "/index.html",
    "/styles.css",
    "/index.js",
    "/manifest.webmanifest",
    "/db.js"
  ];
  const STATIC_CACHE = "static-cache-v1";
  const RUNTIME_CACHE = "runtime-cache";

  self.addEventListener("install", event => {
    event.waitUntil(
      caches
        .open(STATIC_CACHE)
        .then(cache => cache.addAll(FILES_TO_CACHE))
        .then(() => self.skipWaiting())
    );
    console.log("cached successfully!");
  });


  // The activate handler takes care of cleaning up old caches.
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

// non GET requests are not cached and requests to other origins are not cached
self.addEventListener("fetch", function(evt) {
    const {url} = evt.request;
     // handle runtime GET requests for data from /api routes
    if (evt.request.url.includes("/api/")){
      evt.respondWith(
        caches.open(DATA_CACHE_NAME).then(cache => {
          return fetch(evt.request)
            .then(response => {
               // make network request and fallback to cache if network request fails (offline)
              if (response.status === 200) {
                cache.put(evt.request, response.clone());
              }
  
              return response;
            })
            .catch(err => {
              // Network request failed, try to get it from the cache.
              return cache.match(evt.request);
            });
        }).catch(err => console.log(err))
      );
    };
     // use cache first for all other requests for performance
     evt.respondWith(
        fetch(evt.request).catch(() => {
           return caches.match(evt.request).then(response => {
             if(response){
               return response;
             }else if(evt.request.headers.get("accept").includes("text/html")){
               return caches.match("/");
             }
           });
         })
       );
   });
