// SnapDown Service Worker - PWA with offline support & share target
const CACHE_NAME = 'snapdown-v2-2025';
const STATIC_CACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE.map(url => new Request(url, {cache: 'reload'}))).catch(() => {
        // If some fail, still continue
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET
  if (req.method !== 'GET') return;

  // For API calls - network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Clone and cache successful GET API responses (history)
          if (res.ok && url.pathname === '/api/history') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return res;
        })
        .catch(() => {
          return caches.match(req).then(cached => cached || new Response(JSON.stringify({ success: false, error: 'Offline' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503
          }));
        })
    );
    return;
  }

  // For navigation requests - network first, fallback to cache, then offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cache successful navigations
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return res;
        })
        .catch(() => {
          return caches.match(req).then(cached => {
            return cached || caches.match('/').then(fallback => fallback || new Response('Offline - SnapDown', { status: 200, headers: { 'Content-Type': 'text/html' } }));
          });
        })
    );
    return;
  }

  // For static assets - cache first, network fallback
  if (url.origin === self.location.origin && (url.pathname.startsWith('/icons/') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg'))) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Default - network first
  event.respondWith(
    fetch(req)
      .then(res => {
        // Cache 200 responses for same-origin
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});

// Handle share target - needed for some browsers that POST
// We handle GET share via page itself, but support POST here for file shares (future)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // If this is the share target action with URL param, let page handle it
  if (url.pathname === '/' && (url.searchParams.has('url') || url.searchParams.has('text'))) {
    // Ensure fresh
    event.respondWith(fetch(event.request).catch(() => caches.match('/')));
  }
});

// Background sync for pending downloads (future)
self.addEventListener('sync', (event) => {
  if (event.tag === 'pending-downloads') {
    event.waitUntil(
      // Could process pending queue from IndexedDB
      Promise.resolve()
    );
  }
});

// Push notifications (optional future)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'SnapDown', body: 'Ready to download videos without watermark!' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'SnapDown', {
      body: data.body || 'Download TikTok, IG & YouTube without watermark',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow(event.notification.data.url || '/');
    })
  );
});

console.log('[SW] SnapDown Service Worker loaded - PWA installable, Share Target enabled');
