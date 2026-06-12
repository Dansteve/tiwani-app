// Service worker. Strategy: NETWORK-FIRST for page navigations (so a fresh deploy is picked up on
// the next load, never a stale cached app shell) with a cached fallback for offline; CACHE-FIRST for
// other same-origin GETs (the hashed, immutable static assets). Bump CACHE_NAME on any change here so
// the activate step evicts the previous cache and the new worker takes over (skipWaiting + claim).
const CACHE_NAME = 'tiwani-v3';
const PRECACHE = [
    '/',
    '/icon-only.svg',
    '/apple.svg',
    '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((names) =>
                Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    // Page navigations: network-first, so a new deploy is served immediately. Fall back to the cached
    // shell only when the network is unavailable (offline), keeping the app installable.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
        );
        return;
    }

    // Everything else (same-origin hashed assets): cache-first, then network, caching successful
    // same-origin responses. Cross-origin requests (the api, Supabase, fonts) are passed straight to
    // the network and never cached.
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return response;
            });
        })
    );
});
