/* checkoff.js — tick or cross off activities on v1 (2026-08-04)
   Adds a three-state button to every .stop inside #route:
     empty  →  ✓ done  →  ✕ skipped  →  empty
   Persisted in localStorage under its own key. Deliberately NOT the v2
   trip-log key (supmaine-v2-log): that one is keyed by the stop's ordinal
   within its day, so inserting a stop shifts every later key. This keys by
   day id + the stop's name instead, which survives reordering — the right
   trade for a document still being edited mid-trip, at the cost of the two
   systems not sharing state.

   Same activity listed under several Thursday options (Sand Beach, Bass
   Harbor Head Light) shares one key on purpose: tick it once, it reads as
   done everywhere it appears.

   Styles are injected from here so supmaine.css needs no version bump.
   Nothing existing is modified: the button is appended as a new last child
   of .stop, which leaves .stop-name, its query= links and the .leg/.drive
   distance glyphs — parsed by directions.js, photos.js, the day-meta totals
   and the v2 connection checker — completely untouched. */

(function () {
  var KEY = 'supmaine-done-v1';
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }
  var save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  };

  var style = document.createElement('style');
  style.textContent =
    '.stop .tick{margin-left:auto;flex:0 0 auto;align-self:flex-start;width:27px;height:27px;' +
    'border-radius:50%;border:1.5px solid rgba(22,41,59,.26);background:transparent;' +
    'font-size:14px;font-weight:700;line-height:1;cursor:pointer;padding:0;margin-top:1px;' +
    'display:flex;align-items:center;justify-content:center;color:#F7F8F4;' +
    '-webkit-tap-highlight-color:transparent;transition:background .15s,border-color .15s}' +
    '.stop .tick:hover{border-color:var(--seaglass)}' +
    '.stop .tick:focus-visible{outline:2px solid var(--buoy);outline-offset:2px}' +
    '.stop.is-done .tick{background:var(--seaglass);border-color:var(--seaglass)}' +
    '.stop.is-skip .tick{background:var(--buoy);border-color:var(--buoy)}' +
    '.stop.is-done{opacity:.62}' +
    '.stop.is-skip{opacity:.44}' +
    '.stop.is-skip .stop-name{text-decoration:line-through}' +
    '@media (prefers-reduced-motion:reduce){.stop .tick{transition:none}}';
  document.head.appendChild(style);

  /* name minus its .tag chips — otherwise you get "Red's Eatscash only" */
  var slug = function (stop) {
    var n = stop.querySelector('.stop-name');
    if (!n) return '';
    var c = n.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.tag'), function (t) { t.remove(); });
    return (c.textContent || '').trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 52);
  };

  var LABEL = ['Not started', 'Done', 'Skipped'];
  var MARK = ['', '\u2713', '\u2715'];

  var paint = function (k) {
    var v = state[k] || 0;
    Array.prototype.forEach.call(
      document.querySelectorAll('#route .stop[data-tick="' + k + '"]'),
      function (stop) {
        stop.classList.toggle('is-done', v === 1);
        stop.classList.toggle('is-skip', v === 2);
        var b = stop.querySelector('.tick');
        if (!b) return;
        b.textContent = MARK[v];
        b.setAttribute('aria-pressed', v === 1 ? 'true' : 'false');
        b.setAttribute('aria-label', LABEL[v] + ' — tap to change');
        b.title = LABEL[v];
      });
  };

  var wire = function (stop) {
    if (stop.dataset.tick) return;
    var id = slug(stop);
    if (!id) return;
    var day = stop.closest ? stop.closest('section.day') : null;
    var k = (day && day.id ? day.id : 'x') + '|' + id;
    stop.dataset.tick = k;

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tick';
    b.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var v = ((state[k] || 0) + 1) % 3;
      if (v) state[k] = v; else delete state[k];
      save();
      paint(k);
    });
    stop.appendChild(b);
    paint(k);
  };

  var queued = false;
  var scan = function () {
    queued = false;
    Array.prototype.forEach.call(document.querySelectorAll('#route .stop'), wire);
  };
  var nudge = function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(scan);
  };

  var start = function () {
    var route = document.getElementById('route');
    if (route) new MutationObserver(nudge).observe(route, { childList: true, subtree: true });
    scan();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
