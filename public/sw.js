/* ── Thought of the Day — Service Worker ────────────────────────────────────
   Handles:
     • Push notifications → shows a system notification
     • notificationclick  → focuses or opens the app
     • install/activate   → caches the shell for offline support
   ─────────────────────────────────────────────────────────────────────────── */

const CACHE_NAME = 'totd-v4';

// ── Install: skip waiting so the new SW activates immediately ────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
});

// ── Activate: purge ALL old caches, claim clients right away ─────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('/api/')
  ) return;

  // Navigation requests (HTML pages): network-first.
  // This ensures a fresh index.html is always fetched after a new deployment,
  // preventing the white-screen bug where cached HTML references old asset hashes.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Hashed static assets (JS/CSS/images): cache-first for performance.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Only cache successful same-origin responses
        if (response.ok && response.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// ── Push: display notification ───────────────────────────────────────────────
self.addEventListener('push', event => {
  let payload = {
    title: 'Thought of the Day',
    body: "Time to write today's thought ✍️",
  };

  try {
    if (event.data) {
      const text = event.data.text();
      try {
        Object.assign(payload, JSON.parse(text));
      } catch {
        payload.body = text;
      }
    }
  } catch { /* no data */ }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'thought-of-the-day',   // replaces any existing notification
      renotify: false,
      requireInteraction: false,
      actions: [
        { action: 'open', title: 'Write now' },
        { action: 'dismiss', title: 'Later' },
      ],
    })
  );
});

// ── Notification click: focus or open the app ────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const appUrl = self.location.origin + '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // If app is already open, focus it
        const existing = windowClients.find(
          c => c.url.startsWith(self.location.origin) && 'focus' in c
        );
        if (existing) return existing.focus();
        // Otherwise open a new tab
        return clients.openWindow(appUrl);
      })
  );
});
