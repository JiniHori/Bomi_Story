const CACHE_PREFIX = 'bomi-';
const CACHE_NAME = 'bomi-live-v19';
const SUPPLIES_SOURCE = 'https://raw.githubusercontent.com/JiniHori/Bomi_Story/main/supplies.html';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './blood-pressure.html',
  './bomi-live.js',
  './prep.html',
  './babyfair.html',
  './newborn-family-guide.html',
  './manifest.json',
  './reports/2026-06-08.html',
  './reports/2026-06-25.html',
  './reports/2026-07-22.html'
];

function isSuppliesRequest(request) {
  const url = new URL(request.url);
  return url.origin === self.location.origin &&
    request.method === 'GET' &&
    (url.pathname === '/supplies' || url.pathname === '/supplies/' || url.pathname.endsWith('/supplies.html'));
}

async function latestSuppliesResponse() {
  const githubResponse = await fetch(SUPPLIES_SOURCE + '?ts=' + Date.now(), { cache: 'no-store' });
  if (!githubResponse.ok) throw new Error('GitHub supplies fetch failed: ' + githubResponse.status);
  const html = await githubResponse.text();
  if (!html.includes('봄이 물품 구매 관리표') || !html.includes('sheetWrap')) {
    throw new Error('Unexpected supplies source');
  }
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      'x-bomi-supplies-source': 'github-main'
    }
  });
}

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

  if (isSuppliesRequest(request)) {
    event.respondWith(
      latestSuppliesResponse().catch(() =>
        caches.match('./supplies.html').then(cached => cached || fetch(request))
      )
    );
    return;
  }

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
