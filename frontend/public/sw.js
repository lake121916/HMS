/**
 * Service Worker for Alem Ketema Enat Hospital Management System
 * Offline App Shell Caching & Network Fallback
 */

const CACHE_NAME = 'alemketema-hms-shell-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API endpoints or WebSocket requests to protect patient privacy
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
    return;
  }

  // Network-first strategy for navigation and assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache valid static responses
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback to cache if network fails (offline power/telecoms drop)
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Network unavailable and resource not cached', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});
