/* portland-bikemap.js — interactive bike map for the #ebike card on portland.html
 * ------------------------------------------------------------------------------
 * Self-injecting: loads Leaflet from cdnjs itself and inserts one map into the
 * "By e-bike" card, directly after its intro paragraph. Only ONE script tag is
 * needed in portland.html.
 *
 * DESIGN NOTE — why polylines ARE drawn here (unlike carriage-maps.js):
 * The carriage roads had no GPX and wound unpredictably, so a straight line
 * between pins would have been an authoritative-looking lie. These five routes
 * follow named, mapped infrastructure — Bayside Trail, Back Cove Trail, Eastern
 * Promenade Trail, the Casco Bay Bridge path, the South Portland Greenbelt,
 * Shore Rd, Island Ave/Seashore Ave — which CyclOSM renders underneath. The
 * lines below are hand-traced along that visible infrastructure at roughly
 * block-level resolution. They are for ORIENTATION: they answer "where does
 * this go and how do the five relate to each other." They are NOT navigation.
 * The "Route" chips on each card open Google's turn-by-turn — that is the
 * authoritative directions source and the caption says so.
 *
 * All named MARKERS sit on coordinates verified through Google Places.
 * Do not add a pin you have not looked up.
 *
 * Tiles are keyless: no API key, no referrer restriction, no quota, no billing.
 * Deliberately unlike the Places photo key (see INCIDENT 5).
 */
(function () {
  'use strict';
  if (window.__pdBikeMapBooted) return;
  window.__pdBikeMapBooted = true;

  var LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  var LEAFLET_JS  = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
  var MAP_H = 380;

  /* ---- Verified pins (Google Places) ---------------------------------- */
  var HOTEL = [43.6534888, -70.2608888];
  var PIN = [
    [43.6534888, -70.2608888, 'Holiday Inn By the Bay', '88 Spring St \u00b7 free e-bikes at the front desk'],
    [43.6712420, -70.2587468, 'Back Cove Trail', '3.6 mi flat gravel loop \u00b7 route 1'],
    [43.6654153, -70.2405870, 'Fort Allen Park', 'Top of the Eastern Prom \u00b7 host pick \u00b7 route 2'],
    [43.6684609, -70.2403472, 'East End Beach', 'North end of the Eastern Prom Trail \u00b7 route 2'],
    [43.6536010, -70.2349939, 'Bug Light Park', 'Best skyline view of Portland \u00b7 route 3'],
    [43.6520671, -70.2238526, 'Spring Point Ledge Light', 'Walk the granite breakwater \u00b7 route 3'],
    [43.6448048, -70.2275477, 'Willard Beach', 'Turnaround for route 3'],
    [43.6230726, -70.2078824, 'Portland Head Light', 'Fort Williams \u00b7 end of route 4'],
    [43.6568407, -70.2482624, 'Casco Bay Lines', 'Maine State Pier \u00b7 ferry for route 5'],
    [43.6578119, -70.1983060, 'Brad\u2019s Bike Rental', '115 Island Ave, Peaks \u00b7 rents e-bikes on-island']
  ];

  /* ---- Hand-traced route lines (orientation, not navigation) ---------- */
  var R = [
    {
      id: 'r1', name: '1 \u00b7 Back Cove loop', color: '#5E8F7E',
      stat: '\u22486 mi \u00b7 flat \u00b7 easiest',
      line: [
        [43.6535,-70.2609],[43.6570,-70.2588],[43.6608,-70.2612],[43.6636,-70.2578],
        [43.6672,-70.2560],[43.6712,-70.2545],[43.6748,-70.2542],[43.6782,-70.2596],
        [43.6798,-70.2662],[43.6788,-70.2726],[43.6748,-70.2762],[43.6714,-70.2718],
        [43.6706,-70.2640],[43.6712,-70.2545]
      ]
    },
    {
      id: 'r2', name: '2 \u00b7 Eastern Prom', color: '#C9452D',
      stat: '\u22486 mi \u00b7 the classic \u00b7 golden hour',
      line: [
        [43.6535,-70.2609],[43.6545,-70.2545],[43.6560,-70.2500],[43.6568,-70.2483],
        [43.6598,-70.2455],[43.6632,-70.2418],[43.6660,-70.2398],[43.6685,-70.2403],
        [43.6716,-70.2438],[43.6742,-70.2500],[43.6752,-70.2540],[43.6712,-70.2545],
        [43.6690,-70.2452],[43.6654,-70.2406],[43.6624,-70.2478],[43.6588,-70.2545],
        [43.6535,-70.2609]
      ]
    },
    {
      id: 'r3', name: '3 \u00b7 South Portland Greenbelt', color: '#FF7A2F',
      stat: '\u224811 mi \u00b7 two lighthouses \u00b7 the standout',
      line: [
        [43.6535,-70.2609],[43.6498,-70.2592],[43.6476,-70.2586],[43.6463,-70.2590],
        [43.6432,-70.2545],[43.6412,-70.2492],[43.6432,-70.2436],[43.6468,-70.2400],
        [43.6508,-70.2372],[43.6536,-70.2350],[43.6548,-70.2300],[43.6536,-70.2256],
        [43.6521,-70.2239],[43.6492,-70.2248],[43.6466,-70.2262],[43.6448,-70.2275]
      ]
    },
    {
      id: 'r4', name: '4 \u00b7 Cape Elizabeth', color: '#16293B',
      stat: '\u224816 mi \u00b7 the ambitious one',
      line: [
        [43.6535,-70.2609],[43.6498,-70.2592],[43.6463,-70.2590],[43.6432,-70.2545],
        [43.6412,-70.2492],[43.6396,-70.2436],[43.6368,-70.2372],[43.6336,-70.2318],
        [43.6302,-70.2262],[43.6272,-70.2208],[43.6252,-70.2156],[43.6240,-70.2110],
        [43.6231,-70.2079]
      ]
    },
    {
      id: 'r5', name: '5 \u00b7 Peaks Island', color: '#7B4FA8',
      stat: '\u22484 mi loop + ferry \u00b7 confirm first',
      line: [
        [43.6535,-70.2609],[43.6548,-70.2540],[43.6568,-70.2483]
      ],
      /* ferry leg drawn separately, dashed — it is a boat, not a ride */
      ferry: [[43.6568,-70.2483],[43.6566,-70.2259],[43.6556,-70.1993]],
      loop: [
        [43.6556,-70.1993],[43.6578,-70.1983],[43.6620,-70.1962],[43.6664,-70.1918],
        [43.6688,-70.1868],[43.6654,-70.1827],[43.6598,-70.1812],[43.6538,-70.1846],
        [43.6504,-70.1902],[43.6520,-70.1958],[43.6556,-70.1993]
      ]
    }
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
    s.onerror = fail;
    document.head.appendChild(s);
  }

  function fail() {
    var w = document.getElementById('pb-wrap');
    if (!w) return;
    w.innerHTML = '<div class="pb-note">Map didn\u2019t load \u2014 no connection. ' +
      'The route descriptions below stand on their own, and each one\u2019s ' +
      '<b>Route</b> chip opens Google Maps directly.</div>';
  }

  function style() {
    var s = document.createElement('style');
    s.textContent =
      '#pb-wrap{margin:16px 0 6px}' +
      '.pb-hold{position:relative;height:' + MAP_H + 'px}' +
      '#pb-map{height:' + MAP_H + 'px;border-radius:12px;border:1.5px solid var(--line);' +
        'background:var(--fog);z-index:0}' +
      '#pb-map .leaflet-container{font-family:"Instrument Sans",system-ui,sans-serif}' +
      '.pb-keys{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}' +
      '.pb-key{font-family:"IBM Plex Mono",monospace;font-size:10.5px;font-weight:600;' +
        'letter-spacing:.03em;border:1.5px solid var(--line);border-radius:999px;' +
        'padding:5px 11px;background:var(--paper);color:var(--ink);cursor:pointer;' +
        'display:inline-flex;align-items:center;gap:7px;line-height:1.2}' +
      '.pb-key .sw{width:14px;height:3px;border-radius:2px;flex:0 0 auto}' +
      '.pb-key.off{opacity:.4}' +
      '.pb-all{font-family:"IBM Plex Mono",monospace;font-size:10.5px;font-weight:600;' +
        'border:1.5px solid var(--ink);border-radius:999px;padding:5px 11px;' +
        'background:var(--ink);color:#F7F8F4;cursor:pointer;line-height:1.2}' +
      '.pb-note{font-family:"IBM Plex Mono",monospace;font-size:10.5px;line-height:1.6;' +
        'color:var(--ink-soft);margin-top:9px;letter-spacing:.02em}' +
      '.pb-note b{color:var(--buoy)}' +
      '.pb-pop{font-size:13px;line-height:1.5}' +
      '.pb-pop b{display:block;font-family:"Bricolage Grotesque",serif;font-size:14.5px;' +
        'margin-bottom:3px;color:#16293B}' +
      '.pb-lock{position:absolute;top:0;left:0;right:0;height:' + MAP_H + 'px;' +
        'z-index:400;display:flex;align-items:center;justify-content:center;' +
        'background:rgba(22,41,59,.34);border-radius:12px;cursor:pointer;' +
        'font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.12em;' +
        'text-transform:uppercase;color:#fff;font-weight:600;text-align:center;padding:12px}';
    document.head.appendChild(s);
  }

  function build() {
    var host = document.getElementById('pb-map');
    if (!host || !window.L) { fail(); return; }

    var map = L.map(host, { scrollWheelZoom: false, zoomControl: true });

    var cyclo = L.tileLayer(
      'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
      { maxZoom: 18, subdomains: 'abc',
        attribution: 'CyclOSM | &copy; OpenStreetMap contributors' }
    );
    var plain = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { maxZoom: 19, subdomains: 'abc',
        attribution: '&copy; OpenStreetMap contributors' }
    );
    cyclo.addTo(map);
    L.control.layers({ 'Cycle map': cyclo, 'Plain street map': plain }, null,
      { collapsed: true, position: 'topright' }).addTo(map);

    var all = [];
    var groups = {};

    R.forEach(function (r) {
      var g = L.layerGroup();
      L.polyline(r.line, { color: r.color, weight: 5, opacity: .85 }).addTo(g);
      all = all.concat(r.line);
      if (r.ferry) {
        L.polyline(r.ferry, { color: r.color, weight: 3, opacity: .6,
          dashArray: '5,8' }).addTo(g);
        all = all.concat(r.ferry);
      }
      if (r.loop) {
        L.polyline(r.loop, { color: r.color, weight: 5, opacity: .85 }).addTo(g);
        all = all.concat(r.loop);
      }
      g.addTo(map);
      groups[r.id] = g;
    });

    /* Hotel gets a filled dot; everything else a standard pin. */
    L.circleMarker(HOTEL, { radius: 8, color: '#16293B', weight: 3,
      fillColor: '#FF7A2F', fillOpacity: 1 }).addTo(map);

    PIN.forEach(function (p) {
      L.marker([p[0], p[1]]).addTo(map)
        .bindPopup('<div class="pb-pop"><b>' + p[2] + '</b>' + p[3] + '</div>');
    });

    map.fitBounds(L.latLngBounds(all).pad(0.06));

    /* Legend doubles as per-route toggles. */
    var keys = document.getElementById('pb-keys');
    if (keys) {
      R.forEach(function (r) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pb-key';
        b.innerHTML = '<span class="sw" style="background:' + r.color + '"></span>' +
          r.name;
        b.title = r.stat;
        b.addEventListener('click', function () {
          if (map.hasLayer(groups[r.id])) {
            map.removeLayer(groups[r.id]); b.classList.add('off');
          } else {
            map.addLayer(groups[r.id]); b.classList.remove('off');
          }
        });
        keys.appendChild(b);
      });
      var reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'pb-all';
      reset.textContent = 'Show all \u00b7 refit';
      reset.addEventListener('click', function () {
        R.forEach(function (r) { map.addLayer(groups[r.id]); });
        Array.prototype.forEach.call(keys.querySelectorAll('.pb-key'),
          function (k) { k.classList.remove('off'); });
        map.fitBounds(L.latLngBounds(all).pad(0.06));
      });
      keys.appendChild(reset);
    }

    var lock = document.createElement('div');
    lock.className = 'pb-lock';
    lock.textContent = 'Tap to explore the map';
    lock.addEventListener('click', function () {
      map.scrollWheelZoom.enable();
      lock.remove();
      setTimeout(function () { map.invalidateSize(); }, 60);
    });
    var holder = host.parentNode;
    if (holder) holder.appendChild(lock);

    setTimeout(function () { map.invalidateSize(); }, 200);
  }

  function inject() {
    var card = document.getElementById('ebike');
    if (!card || document.getElementById('pb-wrap')) return;

    var after = card.querySelector('p.pd-sub');
    var wrap = document.createElement('div');
    wrap.id = 'pb-wrap';
    wrap.innerHTML =
      '<div class="pb-hold"><div id="pb-map"></div></div>' +
      '<div class="pb-keys" id="pb-keys"></div>' +
      '<div class="pb-note">Tap a colour to hide or show that route; tap a pin for ' +
      'detail. Switch to the plain street map (top right) if the cycle layer is busy. ' +
      '<b>These lines are traced by hand for orientation, not navigation</b> \u2014 they ' +
      'show where each route goes and how the five relate, at roughly block-level ' +
      'accuracy. For actual turn-by-turn, use the <b>Route</b> chip on each route below. ' +
      'The dashed purple leg is the Peaks ferry, which is a boat, not a ride.</div>';

    if (after && after.parentNode) {
      after.parentNode.insertBefore(wrap, after.nextSibling);
    } else {
      card.appendChild(wrap);
    }

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
