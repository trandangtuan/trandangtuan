const CACHE_NAME = 'debt-manager-cache-v1';
const OFFLINE_URL = '/trandangtuan';  // Trang hiển thị khi offline
const OFFLINE_IMG = '/images/offline.png';  // Ảnh offline fallback
const OFFLINE_STYLES = '/css/offline.css';  // CSS cho trang offline

const urlsToCache = [
  '/',
  '/trandangtuan',
  OFFLINE_URL,
  OFFLINE_IMG,
  OFFLINE_STYLES,
  '/css/styles.css',
  '/js/app.js'
];

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
  // Xử lý navigation requests (HTML pages)
  if (event.request.mode === 'navigate' || 
      (event.request.method === 'GET' && 
       event.request.headers.get('accept').includes('text/html'))) {
    
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
              // Trả về ảnh offline fallback
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

        // Clone request vì nó chỉ có thể được sử dụng một lần
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(response => {
            // Kiểm tra response hợp lệ
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone response vì nó chỉ có thể được sử dụng một lần
            const responseToCache = response.clone();

            // Thêm request/response vào cache cho lần sau
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            console.log('[Service Worker] Fetch failed:', error);
            
            // Kiểm tra nếu là request CSS
            if (event.request.destination === 'style') {
              return caches.match(OFFLINE_STYLES);
            }
            
            // Có thể thêm xử lý cho các loại request khác ở đây
          });
      })
  );
});

// Kiểm tra trạng thái online/offline
self.addEventListener('online', () => {
  console.log('[Service Worker] Online status changed: ONLINE');
  // Có thể thêm logic để sync data khi online
});

self.addEventListener('offline', () => {
  console.log('[Service Worker] Online status changed: OFFLINE');
  // Có thể thêm logic để lưu trữ requests khi offline
});

// Background Sync cho offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-debts') {
    event.waitUntil(
      // Thực hiện sync data khi online
      syncDebts()
    );
  }
});
