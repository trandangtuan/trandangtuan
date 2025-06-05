const CACHE_NAME = 'debt-manager-cache-v1';
const OFFLINE_URL = '/trandangtuan';
const OFFLINE_IMG = '/images/offline.png';
const OFFLINE_STYLES = '/css/offline.css';

const urlsToCache = [
  '/',
  '/trandangtuan',
  OFFLINE_URL,
  OFFLINE_IMG,
  OFFLINE_STYLES,
  '/css/styles.css',
  '/js/app.js'
];

// Kiểm tra URL có hợp lệ để cache không
function isValidUrl(url) {
  try {
    const urlObj = new URL(url);
    // Chỉ cho phép HTTP(S) URLs
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch (e) {
    return false;
  }
}

// Cài đặt Service Worker và Cache
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell and offline pages');
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => 
              console.error(`[Service Worker] Failed to cache: ${url}`, err)
            )
          )
        );
      })
  );
});

// Xóa cache cũ khi activate
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Xử lý requests và offline fallback
self.addEventListener('fetch', event => {
  // Bỏ qua các requests không hợp lệ
  if (!isValidUrl(event.request.url)) {
    console.log('[Service Worker] Skipping invalid URL:', event.request.url);
    return;
  }

  // Xử lý navigation requests (HTML pages)
  if (event.request.mode === 'navigate' || 
      (event.request.method === 'GET' && 
       event.request.headers.get('accept')?.includes('text/html'))) {
    
    event.respondWith(
      fetch(event.request)
        .catch(error => {
          console.log('[Service Worker] Fetch failed; returning offline page instead.', error);
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Xử lý requests cho images
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request)
            .catch(() => {
              return caches.match(OFFLINE_IMG);
            });
        })
    );
    return;
  }

  // Xử lý các requests khác
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        // Chỉ xử lý HTTP(S) requests
        if (!isValidUrl(event.request.url)) {
          return fetch(event.request);
        }

        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(response => {
            // Kiểm tra response hợp lệ
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cache chỉ cho HTTP(S) requests
            if (isValidUrl(event.request.url)) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                })
                .catch(error => {
                  console.error('[Service Worker] Cache put failed:', error);
                });
            }

            return response;
          })
          .catch(error => {
            console.log('[Service Worker] Fetch failed:', error);
            
            if (event.request.destination === 'style') {
              return caches.match(OFFLINE_STYLES);
            }
          });
      })
  );
});

// Kiểm tra trạng thái online/offline
self.addEventListener('online', () => {
  console.log('[Service Worker] Online status changed: ONLINE');
  // Thêm logic sync data khi online
});

self.addEventListener('offline', () => {
  console.log('[Service Worker] Online status changed: OFFLINE');
  // Thêm logic lưu trữ requests khi offline
});

// Background Sync cho offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-debts') {
    event.waitUntil(
      syncDebts().catch(error => {
        console.error('[Service Worker] Sync failed:', error);
      })
    );
  }
});
