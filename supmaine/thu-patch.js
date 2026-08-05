/* thu-patch.js — Cadillac timed entry is booked (2026-08-04)
   day-3-thu.html is 34 KB and acadia.html is 52 KB. Both are past the size
   where whole-file API pushes have silently corrupted content on this repo,
   so rather than rewrite either one mid-trip, this patches the two stale
   "not booked yet" claims on the Thursday card at load time.

   Method: index-based splicing on plain-ASCII marker substrings, never a
   wholesale innerHTML rewrite of a .stop — so anything photos.js or
   directions.js has injected into that stop survives untouched.

   NOTE: acadia.html is a standalone page and does not load this script, so
   its Cadillac section is still stale. Fix that one by hand when convenient.

   TO REVERT: delete the thu-patch.js script tag from index.html. */

(function () {
  var BOOKED =
    '<b>\u2705 Booked \u2014 4:00 PM entry window</b>, with the <b>5:00 PM</b> window ' +
    'also held as backup. $6/vehicle, entry-window only, stay as long as you like. ' +
    'Plan the 4:00 and treat the 5:00 as slack for the Beehive running long \u2014 ' +
    'using it puts Freeport nearer 9:30p.';

  var splice = function (el, from, to, html) {
    var h = el.innerHTML;
    var a = h.indexOf(from);
    if (a < 0) return false;
    var b = h.indexOf(to, a);
    if (b < 0) return false;
    var open = h.lastIndexOf('<b>', a);
    if (open < 0 || open > a) open = a;
    el.innerHTML = h.slice(0, open) + html + h.slice(b + to.length);
    return true;
  };

  var done = false;

  var patch = function () {
    var d3 = document.getElementById('d3');
    if (!d3 || done) return;

    var notes = d3.querySelectorAll('.stop-note');
    var hit = 0;

    Array.prototype.forEach.call(notes, function (n) {
      var t = n.textContent || '';

      /* Option B — the "Not booked yet … buy it from the gate." run */
      if (t.indexOf('Not booked yet') > -1) {
        if (splice(n, 'Not booked yet', 'buy it from the gate.', BOOKED)) hit++;
      }

      /* Option E — "the Cadillac slot isn't booked yet, so the 9:00 window is free" */
      if (t.indexOf('Cadillac slot isn') > -1) {
        if (splice(n, 'Cadillac slot isn', 'is free to take.',
          '4:00 and 5:00 PM windows are now booked, so taking E would mean ' +
          'swapping one of them for a 9:00 slot.')) hit++;
      }
    });

    /* the chip on the Option B Cadillac stop */
    Array.prototype.forEach.call(d3.querySelectorAll('.tag'), function (tag) {
      var t = tag.textContent || '';
      if (t.indexOf('book a 2:00') > -1 || t.indexOf('2:00\u20134:00') > -1) {
        tag.textContent = '\u2705 4:00 PM booked';
        hit++;
      }
    });

    /* dated update line, matching the card's existing convention */
    var intro = d3.querySelector('.day-intro');
    if (intro && intro.innerHTML.indexOf('Update (Aug 4)') < 0) {
      intro.innerHTML += '<br><br><b>Update (Aug 4):</b> the Cadillac timed entry is ' +
        '<b>booked</b> \u2014 the <b>4:00 PM</b> window, with <b>5:00 PM</b> also held ' +
        'as a backup. That is the one window that also buys Thunder Hole on the way up: ' +
        'high tide is 5:05p, so it performs 3:15\u20134:15p and it sits directly on the ' +
        'one-way Park Loop between Sand Beach and the summit road.';
      hit++;
    }

    if (hit) done = true;
  };

  var queued = false;
  var nudge = function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; patch(); });
  };

  var start = function () {
    var route = document.getElementById('route');
    if (route) new MutationObserver(nudge).observe(route, { childList: true, subtree: true });
    patch();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
