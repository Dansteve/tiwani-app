// Service worker. Strategy: NETWORK-FIRST for page navigations (so a fresh deploy is picked up on
// the next load, never a stale cached app shell) with a cached fallback for offline; CACHE-FIRST for
// other same-origin GETs (the hashed, immutable static assets). Bump CACHE_NAME on any change here so
// the activate step evicts the previous cache and the new worker takes over once it activates.
//
// UPDATE FLOW: notify, then apply on the user's click (Frontend.md, the PWA update notification rule).
// install does NOT call skipWaiting(), so a new worker WAITS instead of taking over silently; the
// client surfaces a calm "new version ready" notice (PwaUpdateNotice) and applies it on the user's
// click by posting { type: 'SKIP_WAITING' }, which the message listener below acts on. clients.claim()
// in activate then makes the freshly activated worker control the open pages so the one reload lands on
// the new app.
const CACHE_NAME = 'tiwani-v5';
const PRECACHE = [
    '/',
    '/icon-only.svg',
    '/apple.svg',
    '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
    // Deliberately NO skipWaiting() here: the new worker waits so the client can notify the user and
    // apply the update on their click (the SKIP_WAITING message below), never a silent swap.
});

// Apply the waiting update only when the client asks (the user clicked "Refresh"). Posting
// { type: 'SKIP_WAITING' } from the page activates this worker; clients.claim() in activate then takes
// control and the client reloads once on controllerchange.
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
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
