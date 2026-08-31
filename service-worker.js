/**
 * Pocket Friend - Progressive Web App Service Worker
 * Version: 1.0.0
 * Provides offline caching and mobile standalone support
 */

const CACHE_NAME = 'pocketfriend-v1.0.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './dashboard.html',
  './transactions.html',
  './add-transaction.html',
  './add-expense.html',
  './add-money.html',
  './budget.html',
  './savings.html',
  './reports.html',
  './profile.html',
  './help.html',
  './login.html',
  './signup.html',
  './test_runner.html',
  './manifest.json',
  './css/style.css',
  './js/storage.js',
  './js/auth.js',
  './js/dashboard.js',
  './js/transactions.js',
  './js/money.js',
  './js/budget.js',
  './js/savings.js',
  './js/reports.js',
  './js/profile.js',
  './img/wallet.avif',
  './img/wallet.png',
  './img/favicon.ico',
  './img/favicon-16x16.png',
  './img/favicon-32x32.png',
  './img/favicon-48x48.png',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/apple-touch-icon.png'
];

// Install Event: Cache Core Static Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[Service Worker] Non-fatal asset caching skip:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing legacy cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network First with Cache Fallback for dynamic navigation, Cache First for static assets
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip chrome-extension and foreign origin requests
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update to keep cache fresh
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // If offline and requesting an HTML page, fallback to cached dashboard or index
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./dashboard.html') || caches.match('./index.html');
        }
      });
    })
  );
});
