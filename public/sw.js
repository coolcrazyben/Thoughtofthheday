/* ── Thought of the Day — Service Worker ────────────────────────────────────
   Handles:
     • Push notifications → shows a system notification
     • notificationclick  → focuses or opens the app
     • install/activate   → caches the shell for offline support
   ─────────────────────────────────────────────────────────────────────────── */

const CACHE_NAME = 'totd-v1';
const SHELL_URLS = ['/', '/index.html'];

// ── Install: cache the app shell ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_URLS))
      .catch(() => { /* non-fatal — dev server may not have these yet */ })
  );
  self.skipWaiting();
});

// ── Activate: remove stale caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
  );
  self.clients.claim();
});

// ── Fetch: serve from cache with network fallback ────────────────────────────
self.addEventListener('fetch', event => {
  // Only intercept same-origin GET requests for navigation (not API calls)
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('/api/')
  ) return;

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
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
