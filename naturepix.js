/* naturepix.js (2026-08-05 rev b) - lead photos for wildlife.html + plants.html.

   ---- REV B FIXES: "images flash then disappear" ----
   Symptom: a grey 104px box appears per entry and is then deleted. That is
   NOT a photo vanishing - it is .np-img's placeholder background rendering
   while the request is in flight, then onerror tearing the element out.
   So the real fault is always "the image request failed", and rev A had no
   way to tell you that. Three changes:

   1. SERVICE-WORKER SWEEP (the likely root cause). Incident 1: a root-scoped
      worker from the v2 offline experiment intercepts cross-origin image
      requests and breaks them. Every other page survives because photos.js
      sweeps workers on load - these two pages don't load photos.js, so they
      had NO sweep. Now they do. Load-bearing; never remove.
   2. NO URL REWRITING. Rev A rewrote the thumbnail width token to 400px for
      retina. Wikimedia refuses to upscale past a file's native width, so any
      small original 404'd. We now use the API's URL verbatim - one fewer
      variable, and the API URL is always known-good.
   3. RETRY, THEN QUIET. A failure retries once before the element is removed,
      and every failure is logged with a [naturepix] prefix so the console
      says which species and which URL rather than silently emptying.

   WHY NOT THE PLACES API: that browser key is referrer-restricted to
   supmaine.mikeside.com/* and quota-capped - incident 5 is the whole
   argument. Wikipedia's REST endpoint is keyless, CORS-open, unrestricted.

   HOW IT WORKS: each entry is a .sp whose first <b> holds the common name.
   Normalise it, look it up in TITLES, fetch the article's lead image. No
   data- attributes in the HTML, so this file is the only thing to edit when
   a photo is wrong. Unmapped entries render text-only.

   FAILURES ARE NEVER PERSISTED (the photos.js lesson): successes only. */
(function () {
  'use strict';

  var TITLES = {
    /* ---- wildlife.html ---- */
    'osprey': 'Osprey',
    'harbor seal': 'Harbor_seal',
    'american lobster': 'American_lobster',
    'double-crested cormorant': 'Double-crested_cormorant',
    'common eider': 'Common_eider',
    'bald eagle': 'Bald_eagle',
    'harbor porpoise': 'Harbour_porpoise',
    'peregrine falcon': 'Peregrine_falcon',
    'great black-backed gull': 'Great_black-backed_gull',
    'common loon': 'Common_loon',
    'turkey vulture': 'Turkey_vulture',
    'beaver': 'North_American_beaver',
    'black guillemot': 'Black_guillemot',
    'harbor & gray seal': 'Grey_seal',
    'red squirrel': 'American_red_squirrel',
    'snowshoe hare': 'Snowshoe_hare',
    'white-tailed deer': 'White-tailed_deer',
    'herring gull': 'American_herring_gull',
    'common tern': 'Common_tern',
    'monarch butterfly': 'Monarch_butterfly',
    'tree swallow & chimney swift': 'Tree_swallow',
    'little & big brown bat': 'Little_brown_bat',
    'firefly': 'Firefly',
    'migrating shorebirds': 'Semipalmated_sandpiper',
    'snowy egret': 'Snowy_egret',
    'harbor seal at spring point ledge': 'Spring_Point_Ledge_Light',
    'woodchuck': 'Groundhog',
    'saltmarsh sparrow': 'Saltmarsh_sparrow',
    'glossy ibis': 'Glossy_ibis',
    'willet': 'Willet',
    'piping plover': 'Piping_plover',
    'scarborough marsh itself': 'Scarborough_Marsh',
    'moose': 'Moose',
    'puffins': 'Atlantic_puffin',
    'whales': 'Humpback_whale',
    'black bear': 'American_black_bear',
    'warbler waves': 'New_World_warbler',

    /* ---- plants.html ---- */
    'eastern white pine': 'Pinus_strobus',
    'rockweed': 'Ascophyllum_nodosum',
    'beach rose': 'Rosa_rugosa',
    'staghorn sumac': 'Rhus_typhina',
    'coastal maine botanical gardens': 'Coastal_Maine_Botanical_Gardens',
    'lowbush wild blueberry': 'Vaccinium_angustifolium',
    'red spruce & balsam fir': 'Abies_balsamea',
    'reindeer lichen': 'Cladonia_rangiferina',
    'sheep laurel': 'Kalmia_angustifolia',
    'bracken fern & hay-scented fern': 'Pteridium_aquilinum',
    'the 1947 fire line': 'Acadia_National_Park',
    'pitch pine': 'Pinus_rigida',
    'summit heath': 'Vaccinium_vitis-idaea',
    'jack pine': 'Jack_pine',
    'wild gardens of acadia': 'Acadia_National_Park',
    'sphagnum bog': 'Sphagnum',
    'tide-pool algae at thunder hole': 'Chondrus_crispus',
    'salt marsh cordgrass & salt hay': 'Salt_marsh',
    'american beachgrass': 'Ammophila_breviligulata',
    'seaside goldenrod': 'Solidago_sempervirens',
    'beach pea & sea rocket': 'Lathyrus_japonicus',
    'hydrangea': 'Hydrangea_macrophylla',
    'poison ivy': 'Toxicodendron_radicans',
    'rugosa hedges': 'Rosa_rugosa',
    'sea lavender': 'Limonium',
    'glasswort': 'Salicornia',
    'purple loosestrife & common reed': 'Lythrum_salicaria',
    'maritime oak-pine forest': 'Quercus_rubra',
    'wild blueberry': 'Vaccinium_angustifolium',
    'spruce vs fir': 'Picea_rubens'
  };

  var CACHE_KEY = 'supmaine-naturepix-v2';
  var OLD_KEYS = ['supmaine-naturepix-v1'];
  var TTL = 30 * 24 * 60 * 60 * 1000;
  var POOL = 5;
  var TAG = '[naturepix]';
  var stats = { want: 0, ok: 0, fail: 0 };

  /* ---------- 1. SERVICE-WORKER SWEEP (incident 1) ----------
     A root-scoped worker left over from the v2 offline experiment controls
     every page on this origin and mangles cross-origin image requests.
     photos.js does this on the itinerary pages; these pages need their own. */
  function sweep() {
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          if (regs && regs.length) {
            console.warn(TAG, 'unregistering', regs.length,
              'service worker(s) - these break cross-origin images (incident 1).' +
              ' Reload once after this.');
            regs.forEach(function (r) { r.unregister(); });
          }
        }).catch(function () {});
      }
      if (window.caches && caches.keys) {
        caches.keys().then(function (keys) {
          keys.forEach(function (k) {
            if (k.indexOf('supmaine-v2-') === 0) caches.delete(k);
          });
        }).catch(function () {});
      }
    } catch (e) {}
  }

  /* ---------- styles (injected; the two pages need no CSS edits) ---------- */
  function style() {
    var c = document.createElement('style');
    c.textContent =
      '.np-fig{float:right;display:block;line-height:0;width:104px;margin:2px 0 9px 13px;' +
        'text-decoration:none;border-radius:13px;overflow:hidden}' +
      '.np-img{display:block;width:104px;height:104px;object-fit:cover;border-radius:13px;' +
        'border:1.5px solid rgba(22,41,59,.18);background:#E7EDEA}' +
      '.sp::after{content:"";display:block;clear:both}' +
      '@media (min-width:520px){.np-fig{width:132px}.np-img{width:132px;height:132px}}' +
      '@media (prefers-reduced-motion:no-preference){.np-img{transition:transform .18s ease}' +
        '.np-fig:hover .np-img{transform:scale(1.04)}}';
    document.head.appendChild(c);
  }

  /* ---------- cache ---------- */
  function readCache() {
    try {
      OLD_KEYS.forEach(function (k) { localStorage.removeItem(k); });
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return {};
      var o = JSON.parse(raw);
      return (o && typeof o === 'object') ? o : {};
    } catch (e) { return {}; }
  }
  function writeCache(o) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(o)); } catch (e) {}
  }

  /* ---------- name normalisation ----------
     "Harbor seal, from the ferry"           -> "harbor seal"
     "Puffins - unless you make a decision." -> "puffins"   (em dash)
     "3. Spruce vs fir"                      -> "spruce vs fir"
     "Harbor &amp; gray seal"                -> "harbor & gray seal"  */
  function norm(s) {
    return String(s)
      .replace(/\u2014[\s\S]*$/, '')
      .replace(/,[\s\S]*$/, '')
      .replace(/^\s*\d+\.\s*/, '')
      .replace(/[.\s]+$/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /* ---------- 3. attach with one retry, then a loud failure ---------- */
  function attach(sp, src, page, alt) {
    var a = document.createElement('a');
    a.className = 'np-fig';
    a.href = page || '#';
    a.target = '_blank';
    a.rel = 'noopener';

    var img = document.createElement('img');
    img.className = 'np-img';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.alt = alt || '';

    var tries = 0;
    img.onload = function () { stats.ok++; };
    img.onerror = function () {
      tries++;
      if (tries === 1) {
        /* one clean retry - transient wifi is the common case on a road trip */
        setTimeout(function () { img.src = src + (src.indexOf('?') < 0 ? '?r=1' : '&r=1'); }, 600);
        return;
      }
      stats.fail++;
      console.warn(TAG, 'image failed for', alt, '->', src);
      if (a.parentNode) a.parentNode.removeChild(a);
    };

    img.src = src;
    a.appendChild(img);
    sp.insertBefore(a, sp.firstChild);
  }

  function boot() {
    var nodes = document.querySelectorAll('.sp');
    if (!nodes.length) return;
    sweep();
    style();

    var cache = readCache();
    var now = Date.now();
    var queue = [];
    var dirty = false;

    Array.prototype.forEach.call(nodes, function (sp) {
      var b = sp.querySelector('b');
      if (!b) return;
      var title = TITLES[norm(b.textContent)];
      if (!title) return;
      stats.want++;
      var hit = cache[title];
      if (hit && hit.s && (now - hit.t) < TTL) {
        attach(sp, hit.s, hit.u, b.textContent);
      } else {
        queue.push({ sp: sp, title: title, alt: b.textContent });
      }
    });

    if (!queue.length || !window.fetch) {
      console.info(TAG, 'entries', stats.want, '| all from cache');
      return;
    }

    var i = 0;
    function next() {
      if (i >= queue.length) {
        if (dirty) { writeCache(cache); dirty = false; }
        console.info(TAG, 'entries', stats.want, '| api done');
        return;
      }
      var job = queue[i++];
      fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(job.title))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (!j || !j.thumbnail || !j.thumbnail.source) {
            console.warn(TAG, 'no lead image for', job.title);
            return;
          }
          /* 2. verbatim API URL - no width rewriting, nothing to 404 on */
          var src = j.thumbnail.source;
          var page = (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || '';
          attach(job.sp, src, page, job.alt);
          cache[job.title] = { s: src, u: page, t: Date.now() };
          dirty = true;
        })
        .catch(function (e) {
          console.warn(TAG, 'api fetch failed for', job.title, e && e.message);
        })
        .then(next, next);
    }
    for (var p = 0; p < POOL; p++) next();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
