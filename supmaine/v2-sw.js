/* SupMaine v2 — offline mode WITHDRAWN (2026-07-26)
   -------------------------------------------------
   This file previously installed a caching service worker for v2. Because it
   is served from the site root its scope was "/", so it controlled v1's pages
   too, and it proxied Google Place photo requests through its own fetch().
   That altered the Referer on requests to lh3.googleusercontent.com, which the
   referrer-restricted Places key rejects — so photos broke on v1 and v2, and
   photos.js persisted each failure by evicting its localStorage cache.

   This version exists ONLY to undo that: it takes over from the old worker,
   deletes every cache it created, registers no fetch handler (so nothing is
   intercepted any more), and then unregisters itself.

   Do not add a fetch handler here. If offline mode comes back it needs its own
   scoped path plus a hard rule that cross-origin and image requests are never
   intercepted — and it needs verifying in a browser before it ships. */

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          if (k.indexOf('supmaine-v2-') === 0) return caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
      .then(function () {
        // Reload every page this worker still controls, so they come back
        // uncontrolled and fetch their photos directly again.
        return self.clients.matchAll({ type: 'window' }).then(function (cs) {
          cs.forEach(function (c) { if (c.navigate) c.navigate(c.url); });
        });
      })
      .then(function () { return self.registration.unregister(); })
      .catch(function () { return self.registration.unregister(); })
  );
});
