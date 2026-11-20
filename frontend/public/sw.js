/**
 * Service Worker for Alem Ketema Enat General Hospital Management System (AKEH-HMS)
 * Offline App Shell Caching & Network Fallback
 * 
 * STRICT HEALTHCARE COMPLIANCE RULE:
 * Never cache API endpoints, medical records, authentication tokens, or patient
 * data inside browser HTTP caches. Offline clinical data must only be buffered
 * inside authorized client-side encrypted/idempotent IndexedDB queues.
 */

const CACHE_NAME = 'akeh-hms-shell-v2';
const STATIC_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL_ASSETS);
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

  // 1. Never cache API endpoints or WebSocket requests to protect patient confidentiality
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
    return;
  }

  // 2. Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // 3. Network-first strategy for navigation and assets with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache valid static responses (CSS, JS, SVG, Web Fonts)
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.endsWith('.js') ||
           url.pathname.endsWith('.css') ||
           url.pathname.endsWith('.svg') ||
           url.pathname.endsWith('.woff2') ||
           url.pathname.endsWith('.png') ||
           url.pathname === '/' ||
           url.pathname === '/index.html')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback to cache if network fails (intermittent ward Wi-Fi or telecom outage)
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
