/* carriage-maps.js — interactive carriage road maps for acadia.html
 * ---------------------------------------------------------------
 * Self-injecting: loads Leaflet from cdnjs itself, finds the three ride
 * cards in #routes by their heading text, and injects a map into each.
 * Only ONE script tag is needed in acadia.html.
 *
 * DESIGN NOTE — why there are no route polylines:
 * We do not have GPX for the carriage roads. A straight line between
 * waypoints would cut across Eagle Lake and over Pemetic, and would look
 * authoritative while being wrong. Instead we use CyclOSM / OpenTopoMap
 * tiles, which render the ACTUAL carriage road network as visible named
 * tracks — you read the real roads off the map. Markers are placed only at
 * coordinates verified via Google Places.
 *
 * Tiles are keyless: no API key, no referrer restriction, no quota, no
 * billing. Deliberately unlike the Places photo key (see INCIDENT 5).
 */
(function () {
  'use strict';
  if (window.__carriageMapsBooted) return;
  window.__carriageMapsBooted = true;

  var LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  var LEAFLET_JS  = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
  var MAP_H = 290;

  /* Verified coordinates only. Do not add a point you have not looked up. */
  var P = {
    shop:    [44.3886334, -68.2142486, 'Bar Harbor Bicycle Shop', '141 Cottage St · 9:00a pickup'],
    eagle:   [44.3776642, -68.2532596, 'Eagle Lake Bridge — post 6', 'Gravel starts here. 2.8 mi up ME-233 from town.'],
    bubble:  [44.3498008, -68.2412453, 'Bubble Pond', 'South of post 7. Carriage road runs along the waterline.'],
    jordan:  [44.3205459, -68.2536127, 'Jordan Pond House — post 15', 'Turnaround. Bike racks out front. North shore for the Bubbles.'],
    duck:    [44.3915147, -68.2358663, 'Duck Brook Bridge — near post 5', 'Three arches. Shoot it from the streambed, not the top.'],
    witch:   [44.3994434, -68.2435992, 'Witch Hole Pond', 'Nearly flat. Beaver lodges, blueberries in August.']
  };

  var MAPS = [
    { match: 'tri-lakes',  id: 'cm-tri',   pts: ['shop', 'eagle', 'bubble', 'jordan'] },
    { match: 'witch hole', id: 'cm-witch', pts: ['shop', 'duck', 'witch'] },
    { match: 'eagle lake', id: 'cm-eagle', pts: ['shop', 'eagle', 'bubble'] }
  ];

  function css(href) {
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    document.head.appendChild(l);
  }

  function js(src, cb) {
    var s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = cb;
    s.onerror = function () { fail(); };
    document.head.appendChild(s);
  }

  function fail() {
    Array.prototype.forEach.call(
      document.querySelectorAll('.cm-wrap'),
      function (w) {
        w.innerHTML = '<div class="cm-note">Map didn\u2019t load \u2014 no connection. ' +
          'The signpost sequence above is the real navigation anyway; ' +
          'screenshot it before you ride.</div>';
      }
    );
  }

  function style() {
    var s = document.createElement('style');
    s.textContent =
      '.cm-wrap{margin:14px 0 4px}' +
      '.cm-hold{position:relative;height:' + MAP_H + 'px}' +
      '.cm-map{height:' + MAP_H + 'px;border-radius:12px;border:1.5px solid var(--line);' +
        'background:var(--fog);z-index:0}' +
      '.cm-map .leaflet-container{font-family:"Instrument Sans",system-ui,sans-serif}' +
      '.cm-note{font-family:"IBM Plex Mono",monospace;font-size:10.5px;line-height:1.6;' +
        'color:var(--ink-soft);margin-top:7px;letter-spacing:.02em}' +
      '.cm-note b{color:var(--buoy)}' +
      '.cm-pop{font-size:13px;line-height:1.5}' +
      '.cm-pop b{display:block;font-family:"Bricolage Grotesque",serif;font-size:14.5px;' +
        'margin-bottom:3px;color:#16293B}' +
      '.cm-lock{position:absolute;top:0;left:0;right:0;height:' + MAP_H + 'px;' +
        'z-index:400;display:flex;align-items:center;justify-content:center;' +
        'background:rgba(22,41,59,.34);border-radius:12px;cursor:pointer;' +
        'font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.12em;' +
        'text-transform:uppercase;color:#fff;font-weight:600;text-align:center;padding:12px}';
    document.head.appendChild(s);
  }

  function build() {
    if (!window.L) { fail(); return; }

    MAPS.forEach(function (cfg) {
      var host = document.getElementById(cfg.id);
      if (!host) return;

      var map = L.map(host, {
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true
      });

      var cyclo = L.tileLayer(
        'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
        { maxZoom: 17, subdomains: 'abc',
          attribution: 'CyclOSM | &copy; OpenStreetMap contributors' }
      );
      var topo = L.tileLayer(
        'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        { maxZoom: 16, subdomains: 'abc',
          attribution: 'OpenTopoMap | &copy; OpenStreetMap contributors' }
      );

      cyclo.addTo(map);
      L.control.layers({ 'Cycle map': cyclo, 'Topo + contours': topo }, null,
        { collapsed: true, position: 'topright' }).addTo(map);

      var latlngs = [];
      cfg.pts.forEach(function (k) {
        var p = P[k];
        if (!p) return;
        latlngs.push([p[0], p[1]]);
        L.marker([p[0], p[1]])
          .addTo(map)
          .bindPopup('<div class="cm-pop"><b>' + p[2] + '</b>' + p[3] + '</div>');
      });

      if (latlngs.length > 1) {
        map.fitBounds(L.latLngBounds(latlngs).pad(0.22));
      } else if (latlngs.length === 1) {
        map.setView(latlngs[0], 13);
      } else {
        map.setView([44.36, -68.24], 12);
      }

      /* Tap-to-activate: stops the map swallowing page scroll on mobile.
         The overlay is sized to the MAP only, never the caption below it. */
      var holder = host.parentNode;
      var lock = document.createElement('div');
      lock.className = 'cm-lock';
      lock.textContent = 'Tap to explore the map';
      lock.addEventListener('click', function () {
        map.scrollWheelZoom.enable();
        lock.remove();
        setTimeout(function () { map.invalidateSize(); }, 60);
      });
      holder.appendChild(lock);

      setTimeout(function () { map.invalidateSize(); }, 200);
    });
  }

  function inject() {
    var cards = document.querySelectorAll('#routes .pl');
    var placed = 0;

    Array.prototype.forEach.call(cards, function (card) {
      var nm = card.querySelector('.pl-nm');
      if (!nm) return;
      var t = nm.textContent.toLowerCase();

      MAPS.forEach(function (cfg) {
        if (t.indexOf(cfg.match) === -1) return;
        if (document.getElementById(cfg.id)) return;

        var chain = card.querySelector('.ckey') || card.querySelector('.chain');
        var wrap = document.createElement('div');
        wrap.className = 'cm-wrap';
        wrap.innerHTML =
          '<div class="cm-hold"><div class="cm-map" id="' + cfg.id + '"></div></div>' +
          '<div class="cm-note">Carriage roads are the thin dashed tracks \u2014 ' +
          'switch layers (top right) for contours. <b>No route line is drawn on purpose:</b> ' +
          'these roads wind, and a straight line between pins would be a lie. ' +
          'Navigate by signpost number. <b>No signal out there</b> \u2014 this is a ' +
          'planning tool for tonight, not a map for Thursday.</div>';

        if (chain && chain.parentNode) {
          chain.parentNode.insertBefore(wrap, chain.nextSibling);
        } else {
          var inr = card.querySelector('.pl-in');
          (inr || card).appendChild(wrap);
        }
        placed++;
      });
    });

    if (!placed) return;
    style();
    css(LEAFLET_CSS);
    js(LEAFLET_JS, build);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
