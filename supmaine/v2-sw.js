/* SupMaine v2 Beta — offline service worker
   Precaches the whole itinerary so the site works with no signal
   (the point: Acadia, Peaks Island, the Kennebunkport back roads).
   Only claims v2 assets + shared fragments. v1 is untouched. */

var CACHE = 'supmaine-v2-20260726a';

var PRECACHE = [
  'v2.html',
  'v2.css?v=20260726a',
  'v2.js?v=20260726a',
  'day-1-tue.html',
  'day-2-wed.html',
  'day-3-thu.html',
  'day-4-fri.html',
  'day-5-satsun.html',
  'day-6-mon.html',
  'day-7-tue.html',
  'checklist.html',
  'packing.html',
  'reservation.html',
  'weather.js?v=20260723a',
  'tides.js?v=20260724a',
  'photos.js?v=20260724d',
  'directions.js?v=20260724c',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // addAll fails the whole install if any single request fails;
      // add individually so one dead CDN can't break offline mode.
      return Promise.all(PRECACHE.map(function (u) {
        return c.add(new Request(u, { mode: u.indexOf('http') === 0 ? 'cors' : 'same-origin' })).catch(function () { });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE && k.indexOf('supmaine-v2-') === 0) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;

  // Never intercept v1's own shell — v1 must always be live-fetched.
  if (sameOrigin && /\/(index\.html|main\.js|supmaine\.css)$/.test(url.pathname)) return;

  // Google Places photos + tiles: network only, never cached (quota + freshness).
  if (/googleapis|gstatic\.com\/maps|tile\.openstreetmap/.test(url.hostname + url.pathname)) return;

  // Fragments + app shell: network first, fall back to cache when offline.
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && (sameOrigin || res.type === 'cors')) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () { });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('v2.html', { ignoreSearch: true });
        return new Response('', { status: 504, statusText: 'Offline, not cached' });
      });
    })
  );
});
