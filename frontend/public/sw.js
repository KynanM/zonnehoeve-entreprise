// Service Worker voor Zonnehoeve Digitale Gids PWA
// Versie: 2.0 - Fase 4: Offline Support

const CACHE_NAME = "zonnehoeve-gids-v2";
const STATIC_CACHE = "zonnehoeve-static-v2";

// Statische assets die altijd gecached worden
const STATIC_ASSETS = [
  "/",
  "/gids",
  "/manifest.json",
  "/logo.png",
  "/hero-bg.png",
];

// Installatie: pre-cache statische assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activatie: verwijder oude caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network-first voor API calls, Cache-first voor statische assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: Network-first, dan offline fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache succesvolle GET API responses voor offline gebruik
          if (request.method === "GET" && response.ok) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: probeer cached versie
          return caches.match(request).then(
            (cached) =>
              cached ||
              new Response(
                JSON.stringify({ error: "Offline — geen verbinding met de server" }),
                { headers: { "Content-Type": "application/json" } }
              )
          );
        })
    );
    return;
  }

  // Statische assets: Cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, cloned));
        }
        return response;
      });
    })
  );
});
