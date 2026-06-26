const CACHE_NAME = 'bomi-baseline-260608-report';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './reports/2026-06-25.html',
  './reports/2026-06-08.html'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
