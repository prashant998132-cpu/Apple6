// JARVIS v8 — Service Worker
// Offline-first: cache shell, network-first for API
const CACHE = 'jarvis-v8-2';
const SHELL = ['/', '/tools', '/study', '/target', '/india', '/vault', '/settings', '/manifest.json'];

// Install — cache shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// Activate — delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API routes → network only (never cache AI responses)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline', result: '📵 Offline — baad mein try karo' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // External URLs (Puter, Groq, etc.) → network only
  if (url.origin !== self.location.origin) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // App shell → cache-first, background update
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached || new Response('', { status: 503 }));
      return cached || net;
    })
  );
});

// Background sync (future: sync queued messages)
self.addEventListener('sync', e => {
  if (e.tag === 'sync-messages') {
    e.waitUntil(Promise.resolve()); // Handled by app
  }
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'JARVIS', {
      body: data.body || 'Notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [50, 30, 50],
    })
  );
});
