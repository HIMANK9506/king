// Service Worker for Smart CCTV Guardian PWA
const CACHE_NAME = 'cctv-guardian-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/shield.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy for live stream & API, Cache-fallback for shell assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass streaming and API calls from cache
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/video_feed') ||
    url.pathname.startsWith('/snapshots') ||
    url.pathname.startsWith('/recordings') ||
    url.pathname.startsWith('/faces')
  ) {
    return; // normal network fetch
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
