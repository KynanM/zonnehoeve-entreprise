// Service Worker voor Zonnehoeve Digitale Gids PWA
// Versie: 3.0 - Verbeterde Cache Strategie (Altijd Nieuwste Versie)

const CACHE_NAME = "zonnehoeve-gids-v3";
const STATIC_CACHE = "zonnehoeve-static-v3";

// Statische assets die bij installatie gecached worden
const STATIC_ASSETS = [
  "/",
  "/gids",
  "/manifest.json",
  "/logo.png",
];

// Installatie: pre-cache statische assets
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activatie: verwijder álle oude caches
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

// Fetch: NETWORK-FIRST STRATEGIE voor alles om altijd de nieuwste versie te hebben
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // EXCLUDE: Documenten niet in de SW cache opslaan (te groot en moeten vers zijn)
  if (url.pathname.includes("/api/documents/")) {
    return; // Laat de browser dit direct afhandelen
  }

  // Network-first strategie voor zowel API als statische assets
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Als we netwerk hebben, update de cache en geef response terug
        if (response.ok && request.method === "GET") {
          const clonedResponse = response.clone();
          const targetCache = url.pathname.startsWith("/api/") ? CACHE_NAME : STATIC_CACHE;
          caches.open(targetCache).then((cache) => {
            cache.put(request, clonedResponse);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline fallback: haal uit cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          
          // Als het een API call is, geef een JSON error terug
          if (url.pathname.startsWith("/api/")) {
             return new Response(
                JSON.stringify({ error: "Je bent offline en deze informatie is niet gecached." }),
                { headers: { "Content-Type": "application/json" } }
              );
          }
          
          // Fallback voor navigatie/pagina's
          if (request.mode === 'navigate') {
            return caches.match('/gids') || caches.match('/');
          }
        });
      })
  );
});
