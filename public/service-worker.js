// Service Worker for offline support
const CACHE_NAME = 'exec-flow-scribe-v2';
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

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch new
        return response || fetch(event.request).then((fetchResponse) => {
          // Cache new responses
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
      .catch(() => {
        // Return offline page if available
        return caches.match('/offline.html');
      })
  );
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
