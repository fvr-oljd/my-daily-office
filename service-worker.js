const CACHE_NAME = 'daily-office-v2';
const urlsToCache = [
  './',
  './index.html',
  './devotional.json',
  './office.json',
  './manifest.json',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Cardo:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600&display=swap'
];

// Install service worker and cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Stale-while-revalidate strategy for fetch
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Update cache with fresh content
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // If fetch fails and we have cache, return cache
            return cachedResponse;
          });

        // Return cached content immediately, but update in background
        return cachedResponse || fetchPromise;
      });
    })
  );
});

// Clean up old caches on activate
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control immediately
  );
});

// Listen for messages to manually update cache
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        return Promise.all(
          urlsToCache.map(url => 
            fetch(url).then(response => {
              if (response && response.status === 200) {
                return cache.put(url, response);
              }
            }).catch(err => console.log('Failed to update:', url))
          )
        );
      }).then(() => {
        // Notify clients that update is complete
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'UPDATE_COMPLETE' });
          });
        });
      })
    );
  }
});
