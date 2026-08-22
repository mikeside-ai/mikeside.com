/* carriage-track.js — live position tracker for carriage.html
 * ----------------------------------------------------------
 * GPS works with NO cell signal. Map TILES do not. That asymmetry is the
 * whole design: the numeric readout (distance + bearing to each waypoint,
 * odometer, lat/long) keeps working on a dead network, and the map is a
 * bonus that only renders where tiles are cached or signal exists.
 *
 * NO ROUTE POLYLINE — same reason as carriage-maps.js. We have no GPX for
 * the carriage roads; a straight line between waypoints would cut across
 * Eagle Lake and read as authoritative while being wrong. CyclOSM tiles
 * draw the ACTUAL roads. Distances below are straight-line, and labelled
 * as such everywhere they appear.
 *
 * Every coordinate here was resolved through Google Places. Do not add a
 * point you have not looked up. Signpost numbers that have no verified
 * landmark (7, 8, 9, 10, 14, 16, 17) are deliberately absent.
 *
 * Tiles are keyless — no API key, no referrer restriction, no quota.
 */
(function () {
  'use strict';
  if (window.__crTrackBooted) return;
  window.__crTrackBooted = true;

  var LCSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  var LJS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
  var TILE = 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png';
  var TPL = 'https://a.tile-cyclosm.openstreetmap.fr/cyclosm/';

  /* Verified via Google Places. post = signpost number, '' if none. */
  var WP = [
    { k: 'shop',   n: 'Bar Harbor Bicycle Shop', p: '',   la: 44.3886334, lo: -68.2142486 },
    { k: 'duck',   n: 'Duck Brook Bridge',       p: '5',  la: 44.3915147, lo: -68.2358663 },
    { k: 'witch',  n: 'Witch Hole Pond',         p: '',   la: 44.3994434, lo: -68.2435992 },
    { k: 'hulls',  n: 'Hulls Cove Visitor Ctr',  p: '2',  la: 44.4089658, lo: -68.2472733 },
    { k: 'eagle',  n: 'Eagle Lake Bridge',       p: '6',  la: 44.3776642, lo: -68.2532596 },
    { k: 'bubtr',  n: 'Bubble Pond trailhead',   p: '',   la: 44.3498008, lo: -68.2412453 },
    { k: 'bubble', n: 'Bubble Pond shore',       p: '',   la: 44.3440298, lo: -68.2389347 },
    { k: 'deer',   n: 'Deer Brook Bridge',       p: '',   la: 44.3403889, lo: -68.2625212 },
    { k: 'jpn',    n: 'Jordan Pond north shore', p: '',   la: 44.3229493, lo: -68.2537108 },
    { k: 'jph',    n: 'Jordan Pond House',       p: '15', la: 44.3205459, lo: -68.2536127 }
  ];

  var map, meMk, meCirc, watchId = null, follow = true, lock = null;
  var last = null, odo = 0, t0 = null, best = 9999;
  var rows = {}, tiles = { done: 0, total: 0 };

  /* ---------- math ---------- */
  function rad(d) { return d * Math.PI / 180; }
  function dist(a, b, c, d) { /* metres, haversine */
    var R = 6371000, p = rad(c - a), q = rad(d - b);
    var x = Math.sin(p / 2) * Math.sin(p / 2) +
      Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(q / 2) * Math.sin(q / 2);
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  function bear(a, b, c, d) {
    var y = Math.sin(rad(d - b)) * Math.cos(rad(c));
    var x = Math.cos(rad(a)) * Math.sin(rad(c)) -
      Math.sin(rad(a)) * Math.cos(rad(c)) * Math.cos(rad(d - b));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }
  var CMP = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  function cmp(d) { return CMP[Math.round(d / 45) % 8]; }
  function mi(m) {
    var v = m / 1609.344;
    if (v < 0.19) return Math.round(m * 3.2808 / 10) * 10 + ' ft';
    return v.toFixed(v < 10 ? 2 : 1) + ' mi';
  }
  function two(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- dom ---------- */
  function $(id) { return document.getElementById(id); }
  function set(id, v) { var e = $(id); if (e) e.textContent = v; }

  function css(h) {
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = h; document.head.appendChild(l);
  }
  function js(s, ok, bad) {
    var e = document.createElement('script');
    e.src = s; e.async = true; e.onload = ok; e.onerror = bad;
    document.head.appendChild(e);
  }

  /* ---------- waypoint table ---------- */
  function buildRows() {
    var host = $('tk-list');
    if (!host) return;
    host.innerHTML = '';
    WP.forEach(function (w) {
      var r = document.createElement('div');
      r.className = 'tk-row';
      r.innerHTML =
        '<span class="tk-p">' + (w.p ? w.p : '&middot;') + '</span>' +
        '<span class="tk-n">' + w.n + '</span>' +
        '<span class="tk-d" id="d-' + w.k + '">&mdash;</span>' +
        '<span class="tk-b" id="b-' + w.k + '"></span>';
      host.appendChild(r);
      rows[w.k] = r;
    });
  }

  /* ---------- position ---------- */
  function onPos(pos) {
    var c = pos.coords, la = c.latitude, lo = c.longitude;
    var acc = c.accuracy || 999;

    if (!t0) t0 = Date.now();

    /* odometer: ignore jitter and low-confidence fixes */
    if (last && acc < 40) {
      var step = dist(last[0], last[1], la, lo);
      if (step > 6 && step < 250) odo += step;
    }
    if (acc < 40) last = [la, lo];

    set('tk-lat', la.toFixed(5));
    set('tk-lon', lo.toFixed(5));
    set('tk-acc', '\u00b1' + Math.round(acc) + ' m');
    set('tk-odo', (odo / 1609.344).toFixed(2) + ' mi');
    if (c.speed != null && c.speed >= 0) {
      set('tk-spd', (c.speed * 2.23694).toFixed(1) + ' mph');
    }
    var el = Math.round((Date.now() - t0) / 1000);
    set('tk-el', Math.floor(el / 60) + ':' + two(el % 60));

    /* distance + bearing to every waypoint, nearest highlighted */
    var near = null, nd = Infinity;
    WP.forEach(function (w) {
      var d = dist(la, lo, w.la, w.lo);
      set('d-' + w.k, mi(d));
      set('b-' + w.k, cmp(bear(la, lo, w.la, w.lo)));
      if (rows[w.k]) rows[w.k].classList.remove('near');
      if (d < nd) { nd = d; near = w; }
    });
    if (near) {
      rows[near.k].classList.add('near');
      set('tk-near', near.n + (near.p ? ' \u00b7 post ' + near.p : ''));
      set('tk-neard', mi(nd) + ' ' + cmp(bear(la, lo, near.la, near.lo)) +
        ' (straight line)');
    }

    var st = $('tk-state');
    if (st) {
      st.textContent = acc < 25 ? 'GPS LOCKED' : 'GPS \u2014 weak fix';
      st.className = 'tk-state ' + (acc < 25 ? 'ok' : 'weak');
    }
    if (acc < best) best = acc;

    if (map) {
      var ll = [la, lo];
      if (!meMk) {
        meMk = L.circleMarker(ll, {
          radius: 8, color: '#fff', weight: 3,
          fillColor: '#C9452D', fillOpacity: 1
        }).addTo(map);
        meCirc = L.circle(ll, {
          radius: acc, color: '#C9452D', weight: 1,
          fillColor: '#C9452D', fillOpacity: 0.10
        }).addTo(map);
        map.setView(ll, 15);
      } else {
        meMk.setLatLng(ll);
        meCirc.setLatLng(ll).setRadius(acc);
        if (follow) map.panTo(ll, { animate: true });
      }
    }
  }

  function onErr(e) {
    var st = $('tk-state');
    if (!st) return;
    st.className = 'tk-state err';
    st.textContent = e.code === 1
      ? 'LOCATION BLOCKED \u2014 allow it in browser settings'
      : (e.code === 3 ? 'NO FIX YET \u2014 step outside, wait 30 s'
        : 'GPS UNAVAILABLE');
  }

  function start() {
    if (!navigator.geolocation) { onErr({ code: 2 }); return; }
    var b = $('tk-go');
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      if (b) b.textContent = 'Start tracking';
      set('tk-state', 'STOPPED');
      if (lock) { try { lock.release(); } catch (x) { } lock = null; }
      return;
    }
    set('tk-state', 'ACQUIRING\u2026');
    watchId = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true, maximumAge: 2000, timeout: 30000
    });
    if (b) b.textContent = 'Stop tracking';
    if (navigator.wakeLock) {
      navigator.wakeLock.request('screen').then(function (l) { lock = l; })
        .catch(function () { });
    }
  }

  function reset() {
    odo = 0; t0 = null; last = null;
    set('tk-odo', '0.00 mi'); set('tk-el', '0:00');
  }

  /* ---------- tile pre-cache (run on hotel wifi) ---------- */
  function xy(la, lo, z) {
    var n = Math.pow(2, z);
    var x = Math.floor((lo + 180) / 360 * n);
    var r = rad(la);
    var y = Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n);
    return [x, y];
  }
  function preload() {
    var la = WP.map(function (w) { return w.la; });
    var lo = WP.map(function (w) { return w.lo; });
    var n = Math.max.apply(null, la) + 0.012, s = Math.min.apply(null, la) - 0.012;
    var e = Math.max.apply(null, lo) + 0.012, w = Math.min.apply(null, lo) - 0.012;
    var urls = [];
    [13, 14, 15].forEach(function (z) {
      var a = xy(n, w, z), b = xy(s, e, z);
      for (var x = a[0]; x <= b[0]; x++) {
        for (var y = a[1]; y <= b[1]; y++) urls.push(TPL + z + '/' + x + '/' + y + '.png');
      }
    });
    if (urls.length > 320) urls = urls.slice(0, 320);
    tiles = { done: 0, total: urls.length };
    var bar = $('tk-pre');
    if (bar) bar.disabled = true;
    var i = 0, live = 0;
    function tick() {
      set('tk-prest', tiles.done + ' / ' + tiles.total + ' map tiles cached');
      if (tiles.done >= tiles.total) {
        set('tk-prest', 'Cached ' + tiles.total +
          ' tiles. Keep this tab open \u2014 don\u2019t clear browsing data.');
        if (bar) { bar.disabled = false; bar.textContent = 'Cache again'; }
      }
    }
    function next() {
      while (live < 5 && i < urls.length) {
        var im = new Image();
        live++;
        im.onload = im.onerror = function () {
          live--; tiles.done++; tick(); next();
        };
        im.src = urls[i++];
      }
    }
    tick(); next();
  }

  /* ---------- map ---------- */
  function boot() {
    if (!window.L) { mapFail(); return; }
    var host = $('tk-map');
    if (!host) return;
    map = L.map(host, { scrollWheelZoom: false, zoomControl: true });
    var cy = L.tileLayer(TILE, {
      maxZoom: 17, subdomains: 'abc',
      attribution: 'CyclOSM | &copy; OpenStreetMap contributors'
    });
    var to = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 16, subdomains: 'abc',
      attribution: 'OpenTopoMap | &copy; OpenStreetMap contributors'
    });
    cy.addTo(map);
    L.control.layers({ 'Cycle map': cy, 'Topo + contours': to }, null,
      { collapsed: true, position: 'topright' }).addTo(map);

    var pts = [];
    WP.forEach(function (w) {
      pts.push([w.la, w.lo]);
      L.marker([w.la, w.lo]).addTo(map).bindPopup(
        '<div class="cm-pop"><b>' + w.n + '</b>' +
        (w.p ? 'Signpost ' + w.p : 'No signpost \u2014 landmark') + '</div>');
    });
    map.fitBounds(L.latLngBounds(pts).pad(0.12));
    setTimeout(function () { map.invalidateSize(); }, 200);

    var f = $('tk-follow');
    if (f) f.addEventListener('click', function () {
      follow = !follow;
      f.textContent = follow ? 'Follow: on' : 'Follow: off';
      f.className = 'tk-btn' + (follow ? ' on' : '');
    });
    map.on('dragstart', function () {
      follow = false;
      var b = $('tk-follow');
      if (b) { b.textContent = 'Follow: off'; b.className = 'tk-btn'; }
    });
  }

  function mapFail() {
    var h = $('tk-map');
    if (h) h.innerHTML = '<div class="tk-fail">No map tiles \u2014 you\u2019re offline.' +
      '<br>The numbers above still work. GPS does not need signal.</div>';
  }

  function init() {
    if (!$('tk-map')) return;
    buildRows();
    var g = $('tk-go'); if (g) g.addEventListener('click', start);
    var r = $('tk-reset'); if (r) r.addEventListener('click', reset);
    var p = $('tk-pre'); if (p) p.addEventListener('click', preload);
    css(LCSS);
    js(LJS, boot, mapFail);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
