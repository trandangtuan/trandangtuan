const CACHE_NAME = 'debt-manager-cache-v1';
const urlsToCache = [
  '/',
  '/index.html'
];

// Cài đặt cache ban đầu
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell:', urlsToCache);
        // Dùng Promise.allSettled để cache từng file, tránh lỗi toàn bộ
        return Promise.allSettled(
          urlsToCache.map(url => cache.add(url))
        );
      })
      .then(results => {
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            console.log(`[Service Worker] Cached: ${urlsToCache[index]}`);
          } else {
            console.error(`[Service Worker] Failed to cache: ${urlsToCache[index]}`, result.reason);
          }
        });
      })
  );
});

// Intercept request
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Nếu có cache thì trả về cache, nếu không thì fetch mới
        if (response) {
          console.log(`[Service Worker] Serving from cache: ${event.request.url}`);
          return response;
        }
        console.log(`[Service Worker] Fetching from network: ${event.request.url}`);
        return fetch(event.request);
      })
  );
});
