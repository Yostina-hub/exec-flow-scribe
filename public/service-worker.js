// Service Worker for offline support
const CACHE_NAME = 'exec-flow-scribe-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isDevAsset = url.pathname.includes('/@vite') || url.pathname.includes('/node_modules/.vite');
  const isStaticAsset = /\.(js|css|map|png|jpg|jpeg|svg|webp|ico|json)$/.test(url.pathname);
  const isHTMLNavigation = event.request.mode === 'navigate';

  // Never cache Vite/dev assets; always go network-first
  if (isDevAsset || isStaticAsset) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  if (isHTMLNavigation) {
    // Network-first for navigations
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/offline.html')))
    );
    return;
  }

  // Default: pass-through
  event.respondWith(fetch(event.request));
});

// Background sync for meeting data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-meeting-data') {
    event.waitUntil(syncMeetingData());
  }
});

async function syncMeetingData() {
  // Sync any pending meeting recordings or notes
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  
  for (const request of requests) {
    if (request.url.includes('/api/') || request.url.includes('/meetings/')) {
      try {
        await fetch(request);
      } catch (error) {
        console.log('Sync failed for:', request.url);
      }
    }
  }
}
