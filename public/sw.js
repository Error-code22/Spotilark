// Spotilark Service Worker - Enables offline functionality
const CACHE_NAME = 'spotilark-v1';
const RUNTIME_CACHE = 'spotilark-runtime';

// Assets to cache on install
const PRECACHE_ASSETS = [
    '/',
    '/offline',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching precache assets');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip chrome-extension and other protocols
    if (!url.protocol.startsWith('http')) return;

    // Handle API requests (network-first)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Handle audio/video streaming (network-only, but cache for offline)
    if (request.destination === 'audio' || request.destination === 'video') {
        event.respondWith(cacheAudio(request));
        return;
    }

    // Handle static assets (cache-first)
    if (request.destination === 'image' ||
        request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'font') {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Default: network-first for pages
    event.respondWith(networkFirst(request));
});

// Cache-first strategy
async function cacheFirst(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);

    if (cached) {
        console.log('[SW] Serving from cache:', request.url);
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.status === 200) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.log('[SW] Network failed, no cache:', request.url);
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

// Network-first strategy
async function networkFirst(request) {
    try {
        const response = await fetch(request);

        // Cache successful responses
        if (response.status === 200) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        const cached = await caches.match(request);

        if (cached) {
            return cached;
        }

        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            const offlinePage = await caches.match('/offline');
            if (offlinePage) return offlinePage;
        }

        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

// Cache audio with size limits
async function cacheAudio(request) {
    try {
        const response = await fetch(request);

        // Only cache if response is successful and not too large (< 50MB)
        if (response.status === 200) {
            const contentLength = response.headers.get('content-length');
            if (contentLength && parseInt(contentLength) < 50 * 1024 * 1024) {
                const cache = await caches.open(RUNTIME_CACHE);
                cache.put(request, response.clone());
                console.log('[SW] Cached audio:', request.url);
            }
        }

        return response;
    } catch (error) {
        // Try to serve from cache if offline
        const cached = await caches.match(request);
        if (cached) {
            console.log('[SW] Serving cached audio:', request.url);
            return cached;
        }

        throw error;
    }
}

// Listen for messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('[SW] Service worker loaded successfully');
