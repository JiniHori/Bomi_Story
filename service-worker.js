const CACHE_PREFIX = 'bomi-';
const CACHE_NAME = 'bomi-live-v12';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './bomi-live.js',
  './prep.html',
  './newborn-family-guide.html',
  './manifest.json',
  './reports/2026-06-08.html',
  './reports/2026-06-25.html',
  './reports/2026-07-22.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names
          .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then(response => {
        const url = new URL(request.url);
        const shouldCache =
          url.origin === self.location.origin &&
          response.ok &&
          request.destination !== 'video';

        if (shouldCache) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
          );
        }

        return response;
      })
      .catch(() =>
        caches.match(request).then(cached => {
          if (cached) return cached;
          if (request.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        })
      )
  );
});
