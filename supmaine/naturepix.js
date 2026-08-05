/* naturepix.js (2026-08-05) - lead photos for wildlife.html + plants.html.

   WHY NOT THE PLACES API: the Places browser key is HTTP-referrer-restricted
   to supmaine.mikeside.com/* and quota-capped. Incident 5 in the maintenance
   doc is the whole argument - a referrer mismatch kills every image silently
   while the rest of the page keeps working, which is the hardest failure to
   diagnose. Wikipedia's REST summary endpoint is keyless, CORS-open, has no
   referrer restriction, no quota and no billing.

   HOW IT WORKS: each species entry on those pages is a .sp whose first <b>
   holds the common name. We normalise that text, look it up in TITLES below,
   and fetch the article's lead image. No data- attributes in the HTML, so the
   two pages stay pure content and this file is the only thing to edit when a
   photo is wrong. Unmapped or image-less entries simply render text-only.

   FAILURES ARE NEVER PERSISTED (the photos.js lesson): only successes are
   cached, so a flaky moment on hotel wifi cannot poison the cache. */
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

  var CACHE_KEY = 'supmaine-naturepix-v1';
  var TTL = 30 * 24 * 60 * 60 * 1000;   /* 30 days - species photos do not move */
  var POOL = 5;                          /* be polite to Wikipedia */

  /* ---------- styles (injected, so the two pages need no CSS edits) ---------- */
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

  /* Wikipedia thumbnails arrive around 320px wide; ask for a sharper one for
     retina by rewriting the NNNpx- token. Purely cosmetic - if the URL shape
     is unexpected we leave it alone. */
  function sharpen(u) {
    return u.replace(/\/(\d{2,4})px-/, function (m, w) {
      return (+w < 400) ? '/400px-' : m;
    });
  }

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
    img.alt = alt || '';
    img.onerror = function () { if (a.parentNode) a.parentNode.removeChild(a); };
    img.src = src;
    a.appendChild(img);
    sp.insertBefore(a, sp.firstChild);
  }

  function boot() {
    var nodes = document.querySelectorAll('.sp');
    if (!nodes.length) return;
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
      var hit = cache[title];
      if (hit && hit.s && (now - hit.t) < TTL) {
        attach(sp, hit.s, hit.u, b.textContent);
      } else {
        queue.push({ sp: sp, title: title, alt: b.textContent });
      }
    });

    if (!queue.length || !window.fetch) return;

    var i = 0;
    function next() {
      if (i >= queue.length) {
        if (dirty) { writeCache(cache); dirty = false; }
        return;
      }
      var job = queue[i++];
      fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(job.title))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (!j || !j.thumbnail || !j.thumbnail.source) return;
          var src = sharpen(j.thumbnail.source);
          var page = (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || '';
          attach(job.sp, src, page, job.alt);
          cache[job.title] = { s: src, u: page, t: Date.now() };
          dirty = true;
        })
        .catch(function () { /* text-only entry; no cache write */ })
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
