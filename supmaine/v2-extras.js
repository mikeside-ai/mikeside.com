/* ============================================================
   SupMaine v2 Beta — EXTRAS PACK (2026-07-26)
   Five additional features, deliberately in their own file:
   removing the one <script> tag in v2.html reverts all of it,
   and v2.js / v2.css are not touched at all.

   11. Trip log      — tick stops done, jot notes, per-day progress, export
   12. Navigate from here — real GPS origin for directions, per stop + now-bar
   13. Pocket card   — compact one-day essentials sheet, print or copy
   14. Share the day — formatted plain-text day plan for Allison & Sean
   15. Tight-connection checker — flags where the drive doesn't fit the gap

   All styles are injected from here (last in the document, so they win
   against weather.js's runtime rules without touching v2.css).
   ============================================================ */
(function () {
  'use strict';

  var LS_LOG = 'supmaine-v2-log';   // { "d3-4": {done:1, note:"..."} }

  var DAY_LABEL = {
    d1: 'Tue Aug 4', d2: 'Wed Aug 5', d3: 'Thu Aug 6', d4: 'Fri Aug 7',
    d5: 'Sat Aug 8', d5b: 'Sun Aug 9', d6: 'Mon Aug 10', d7: 'Tue Aug 11'
  };
  var ORDER = ['d1', 'd2', 'd3', 'd4', 'd5', 'd5b', 'd6', 'd7'];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function store(k, v) {
    try {
      if (v === undefined) { var r = localStorage.getItem(k); return r ? JSON.parse(r) : null; }
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }
  function log() { return store(LS_LOG) || {}; }
  function logSet(key, patch) {
    var l = log();
    l[key] = Object.assign({}, l[key] || {}, patch);
    if (!l[key].done && !l[key].note) delete l[key];
    store(LS_LOG, l);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function toast(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* ---------- shared helpers over the existing markup ---------- */

  function parseTime(s) {
    var m = String(s).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])/i);
    if (!m) return null;
    var h = parseInt(m[1], 10), mm = m[2] ? parseInt(m[2], 10) : 0;
    var ap = m[3].toLowerCase();
    if (ap === 'p' && h !== 12) h += 12;
    if (ap === 'a' && h === 12) h = 0;
    return h * 60 + mm;
  }
  function fmtMin(v) {
    var h = Math.floor(v / 60), m = v % 60, ap = h >= 12 ? 'p' : 'a', hh = h % 12;
    if (hh === 0) hh = 12;
    return hh + ':' + (m < 10 ? '0' : '') + m + ap;
  }
  function queryOf(el) {
    var a = el.querySelector('a[href*="maps/search"]');
    if (!a) return null;
    var m = a.getAttribute('href').match(/[?&]query=([^&#]+)/);
    return m ? m[1] : null;
  }
  function addrOf(el) {
    var q = queryOf(el);
    return q ? decodeURIComponent(q.replace(/\+/g, ' ')) : '';
  }
  function nameOf(el) {
    var n = el.querySelector('.stop-name, .name');
    return n ? n.textContent.replace(/\s+/g, ' ').trim() : '';
  }
  function timeOf(el) {
    var t = el.querySelector('.stop-time, .label');
    return t ? t.textContent.replace(/\s+/g, ' ').trim() : '';
  }
  // stable key: day id + ordinal of the stop inside that day
  function keyFor(stop) {
    var sec = stop.closest('section.day');
    if (!sec) return null;
    var stops = $$('.stop', sec);
    var i = stops.indexOf(stop);
    return i < 0 ? null : sec.id + '-' + i;
  }
  function stopsOf(sec) { return $$('.stop', sec); }

  /* =========================================================
     STYLES (injected last — beats runtime rules from weather.js)
     ========================================================= */
  var css = document.createElement('style');
  css.id = 'x-extras-css';
  css.textContent = [
    /* trip log */
    '.stop.x-done{opacity:.5}',
    '.stop.x-done .stop-name{text-decoration:line-through;text-decoration-thickness:1px}',
    '.stop.x-done .stop-time{color:var(--tide)}',
    '.sact.x-on{color:var(--tide);border-color:var(--tide);background:color-mix(in srgb,var(--tide) 14%,transparent)}',
    '.x-note{display:none;width:100%;margin-top:10px;background:var(--deck-2);color:var(--bone);',
    '  border:1px solid var(--line-2);border-radius:var(--r);padding:9px 11px;font-family:var(--body);',
    '  font-size:13.5px;line-height:1.5;resize:vertical;min-height:56px;outline:none}',
    '.x-note.open{display:block}',
    '.x-note:focus{border-color:var(--beacon)}',
    '.x-note-read{margin-top:9px;padding:8px 11px;border-left:2px solid var(--tide);',
    '  background:var(--glass);border-radius:0 var(--r) var(--r) 0;font-size:13.5px;',
    '  color:var(--bone-soft);white-space:pre-wrap}',
    '.x-note-read b{font-family:var(--mono);font-size:9px;letter-spacing:.18em;text-transform:uppercase;',
    '  color:var(--tide);display:block;margin-bottom:4px}',
    /* progress in the day-meta ribbon */
    '.day-meta .dm.x-prog b{color:var(--tide)}',
    '.x-ring{width:13px;height:13px;border-radius:50%;display:inline-block;flex:0 0 auto;',
    '  background:conic-gradient(var(--tide) var(--p,0%),var(--line-2) 0)}',
    /* tight connection flag */
    '.x-tight{font-family:var(--mono);font-size:10.5px;letter-spacing:.04em;color:var(--beacon);',
    '  background:color-mix(in srgb,var(--beacon) 12%,transparent);border:1px solid var(--beacon-dim);',
    '  border-radius:var(--r);padding:7px 11px;margin:8px 0 0 22px}',
    '.x-tight b{color:var(--beacon)}',
    '.x-tight.x-ok{color:var(--tide);border-color:var(--tide-dim);',
    '  background:color-mix(in srgb,var(--tide) 10%,transparent)}',
    '.x-tight.x-ok b{color:var(--tide)}',
    /* generic modal */
    '.x-back{position:fixed;inset:0;z-index:190;background:rgba(4,9,15,.74);backdrop-filter:blur(6px);',
    '  display:none;padding:7vh 18px 18px;overflow-y:auto}',
    '.x-back.open{display:block}',
    '.x-modal{max-width:620px;margin:0 auto;background:var(--deck);border:1px solid var(--line-2);',
    '  border-radius:var(--r-lg);box-shadow:0 40px 90px -30px rgba(0,0,0,.9);overflow:hidden}',
    '.x-mhead{display:flex;align-items:center;gap:12px;padding:15px 18px;border-bottom:1px solid var(--line);',
    '  background:var(--deck-2)}',
    '.x-mhead h3{margin:0;font-family:var(--disp);font-size:19px;font-weight:600;letter-spacing:-.012em}',
    '.x-mhead .x-close{margin-left:auto;background:none;border:1px solid var(--line-2);color:var(--bone-dim);',
    '  border-radius:100px;width:28px;height:28px;cursor:pointer;font-size:14px;line-height:1}',
    '.x-mhead .x-close:hover{color:var(--beacon);border-color:var(--beacon)}',
    '.x-mbody{padding:18px}',
    '.x-mfoot{padding:12px 18px;border-top:1px solid var(--line);background:var(--deck-2);',
    '  display:flex;gap:8px;flex-wrap:wrap}',
    /* day switcher */
    '.x-days{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}',
    '.x-days button{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;padding:6px 11px;',
    '  border-radius:100px;border:1px solid var(--line);background:var(--glass);color:var(--bone-soft);cursor:pointer}',
    '.x-days button.on{background:var(--bone);color:var(--abyss);border-color:var(--bone);font-weight:700}',
    /* pocket card */
    '.x-pc-day{font-family:var(--mono);font-size:10px;letter-spacing:.2em;text-transform:uppercase;',
    '  color:var(--beacon);margin-bottom:12px}',
    '.x-pc-row{display:grid;grid-template-columns:62px 1fr;gap:12px;padding:10px 0;',
    '  border-bottom:1px solid var(--line)}',
    '.x-pc-row:last-child{border-bottom:0}',
    '.x-pc-t{font-family:var(--mono);font-size:11px;font-weight:600;color:var(--beacon)}',
    '.x-pc-n{font-size:14.5px;font-weight:600;margin-bottom:3px;line-height:1.3}',
    '.x-pc-a{font-family:var(--mono);font-size:11px;color:var(--bone-soft);line-height:1.5}',
    '.x-pc-p{font-family:var(--mono);font-size:11px;color:var(--tide)}',
    '.x-pc-note{font-size:12.5px;color:var(--bone-soft);font-style:italic;margin-top:3px}',
    '.x-pc-stay{margin-top:14px;padding:12px 13px;background:var(--deck-2);border:1px solid var(--line);',
    '  border-radius:var(--r);font-size:13px}',
    '.x-pc-stay b{display:block;font-family:var(--mono);font-size:9px;letter-spacing:.18em;',
    '  text-transform:uppercase;color:var(--tide);margin-bottom:5px}',
    /* log export box */
    '.x-out{width:100%;min-height:220px;background:var(--abyss);color:var(--bone-soft);',
    '  border:1px solid var(--line-2);border-radius:var(--r);padding:12px;font-family:var(--mono);',
    '  font-size:11.5px;line-height:1.6;resize:vertical;outline:none;white-space:pre}',
    '.x-empty{color:var(--bone-dim);font-family:var(--mono);font-size:12px;text-align:center;padding:26px}',
    /* print: pocket card only */
    '@media print{',
    '  body>*{display:none!important}',
    '  .x-back.open{display:block!important;position:static;padding:0;background:#fff;backdrop-filter:none}',
    '  .x-modal{max-width:none;border:0;box-shadow:none;background:#fff;color:#000}',
    '  .x-mhead{background:#fff;border-bottom:2px solid #000}',
    '  .x-mhead h3,.x-pc-n{color:#000}',
    '  .x-mhead .x-close,.x-mfoot,.x-days{display:none!important}',
    '  .x-pc-t,.x-pc-day{color:#000;font-weight:700}',
    '  .x-pc-a,.x-pc-note,.x-pc-p{color:#333}',
    '  .x-pc-stay{background:#f4f4f4;border:1px solid #999}',
    '  .x-pc-row{border-bottom:1px solid #ccc}',
    '}'
  ].join('\n');
  document.head.appendChild(css);

  /* =========================================================
     FEATURE 11 — TRIP LOG (done + notes + progress + export)
     ========================================================= */
  function wireLog(stop) {
    var key = keyFor(stop);
    if (!key) return;
    var row = stop.querySelector('.stop-acts');
    if (!row) {
      row = document.createElement('div');
      row.className = 'stop-acts';
      var host = stop.querySelector('.stop-note') || stop.querySelector('.addr');
      (host && host.parentNode ? host.parentNode : stop).appendChild(row);
    }
    var body = row.parentNode;
    var rec = log()[key] || {};

    // done toggle
    var done = document.createElement('button');
    done.className = 'sact' + (rec.done ? ' x-on' : '');
    done.type = 'button';
    done.textContent = rec.done ? '✓ Done' : '○ Mark done';
    done.addEventListener('click', function () {
      var now = !(log()[key] || {}).done;
      logSet(key, { done: now ? 1 : 0 });
      done.className = 'sact' + (now ? ' x-on' : '');
      done.textContent = now ? '✓ Done' : '○ Mark done';
      stop.classList.toggle('x-done', now);
      paintProgress();
      toast(now ? 'Marked done — ' + nameOf(stop).slice(0, 34) : 'Unmarked');
    });
    row.appendChild(done);
    if (rec.done) stop.classList.add('x-done');

    // note toggle + textarea + read-only render
    var ta = document.createElement('textarea');
    ta.className = 'x-note';
    ta.placeholder = 'Note for this stop — what to remember, what happened…';
    ta.value = rec.note || '';

    var read = document.createElement('div');
    read.className = 'x-note-read';
    read.style.display = rec.note ? 'block' : 'none';
    function paintRead() {
      var n = (log()[key] || {}).note;
      read.style.display = n ? 'block' : 'none';
      read.innerHTML = '<b>Note</b>' + esc(n || '');
    }
    paintRead();

    var noteBtn = document.createElement('button');
    noteBtn.className = 'sact' + (rec.note ? ' x-on' : '');
    noteBtn.type = 'button';
    noteBtn.textContent = rec.note ? '✎ Edit note' : '✎ Note';
    noteBtn.addEventListener('click', function () {
      var open = ta.classList.toggle('open');
      read.style.display = 'none';
      if (open) ta.focus(); else paintRead();
    });
    row.appendChild(noteBtn);

    var saveT;
    ta.addEventListener('input', function () {
      clearTimeout(saveT);
      saveT = setTimeout(function () {
        logSet(key, { note: ta.value.trim() });
        noteBtn.className = 'sact' + (ta.value.trim() ? ' x-on' : '');
        noteBtn.textContent = ta.value.trim() ? '✎ Edit note' : '✎ Note';
        paintProgress();
      }, 400);
    });
    ta.addEventListener('blur', function () {
      logSet(key, { note: ta.value.trim() });
      ta.classList.remove('open');
      paintRead();
    });

    body.appendChild(ta);
    body.appendChild(read);
  }

  function paintProgress() {
    var l = log();
    ORDER.forEach(function (id) {
      var sec = document.getElementById(id);
      if (!sec) return;
      var stops = stopsOf(sec);
      if (!stops.length) return;
      var done = stops.filter(function (s, i) { return (l[id + '-' + i] || {}).done; }).length;
      var pct = Math.round(done / stops.length * 100);
      var meta = $('.day-meta', sec);
      if (!meta) return;
      var cell = $('.dm.x-prog', meta);
      if (!cell) {
        cell = document.createElement('div');
        cell.className = 'dm x-prog';
        meta.appendChild(cell);
      }
      cell.innerHTML = '<span class="x-ring" style="--p:' + pct + '%"></span> <b>' +
        done + '/' + stops.length + '</b> done';
      cell.style.display = done ? '' : 'none';   // stays out of the way until used
    });
  }

  function buildLogText() {
    var l = log(), out = ['SupMaine trip log', ''];
    var any = false;
    ORDER.forEach(function (id) {
      var sec = document.getElementById(id);
      if (!sec) return;
      var stops = stopsOf(sec);
      var lines = [];
      stops.forEach(function (s, i) {
        var rec = l[id + '-' + i];
        if (!rec || (!rec.done && !rec.note)) return;
        lines.push('  ' + (rec.done ? '[x] ' : '[ ] ') + (timeOf(s) ? timeOf(s) + '  ' : '') + nameOf(s));
        if (rec.note) lines.push('      note: ' + rec.note.replace(/\n/g, '\n            '));
      });
      if (lines.length) {
        any = true;
        out.push(DAY_LABEL[id] || id);
        out.push.apply(out, lines);
        out.push('');
      }
    });
    if (!any) return null;
    return out.join('\n');
  }

  /* =========================================================
     FEATURE 12 — NAVIGATE FROM HERE (real GPS as the origin)
     ========================================================= */
  function gps() {
    return new Promise(function (res, rej) {
      if (!navigator.geolocation) return rej(new Error('no geolocation'));
      navigator.geolocation.getCurrentPosition(
        function (p) { res(p.coords.latitude.toFixed(6) + ',' + p.coords.longitude.toFixed(6)); },
        function (e) { rej(e); },
        { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
      );
    });
  }
  function navFromHere(destQuery, btn) {
    var label = btn ? btn.textContent : '';
    if (btn) { btn.textContent = '⌖ locating…'; btn.disabled = true; }
    gps().then(function (origin) {
      var url = 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(origin) +
        '&destination=' + destQuery + '&travelmode=driving';
      window.open(url, '_blank', 'noopener');
      if (btn) { btn.textContent = label; btn.disabled = false; }
    }).catch(function (e) {
      // Denied or unavailable — fall back to a destination-only link, which still works.
      var url = 'https://www.google.com/maps/dir/?api=1&destination=' + destQuery + '&travelmode=driving';
      window.open(url, '_blank', 'noopener');
      if (btn) { btn.textContent = label; btn.disabled = false; }
      toast(e && e.code === 1 ? 'Location denied — opened without a start point' : 'No location — opened without a start point');
    });
  }
  function wireNav(stop) {
    var q = queryOf(stop);
    if (!q) return;
    var row = stop.querySelector('.stop-acts');
    if (!row) return;
    var b = document.createElement('button');
    b.className = 'sact';
    b.type = 'button';
    b.textContent = '⌖ From here';
    b.title = 'Directions using your current location as the start';
    b.addEventListener('click', function () { navFromHere(q, b); });
    row.appendChild(b);
  }

  /* =========================================================
     FEATURE 13 — POCKET CARD (compact day sheet, print or copy)
     ========================================================= */
  var PHONES = [
    ['thurston', '207-244-8467'], ['alamo', '844-370-3979'],
    ['holiday inn', '207-775-2311'], ['hilton garden', '207-828-2669'],
    ['red\'s eats', '207-882-2372']
  ];
  function phoneFor(name) {
    var lower = name.toLowerCase(), out = '';
    PHONES.forEach(function (p) { if (lower.indexOf(p[0]) > -1) out = p[1]; });
    return out;
  }

  function pocketHTML(id) {
    var sec = document.getElementById(id);
    if (!sec) return '<div class="x-empty">Day not loaded</div>';
    var l = log();
    var title = $('.card-title', sec);
    var html = '<div class="x-pc-day">' + esc(DAY_LABEL[id] || id) + ' · ' +
      esc(title ? title.textContent.replace(/\s+/g, ' ').trim() : '') + '</div>';

    var stops = stopsOf(sec);
    if (!stops.length) return html + '<div class="x-empty">No stops on this day</div>';

    stops.forEach(function (s, i) {
      // a locked-out option's stops are dimmed by v2.js — leave them out of the pocket card
      if (s.classList.contains('dimmed')) return;
      var rec = l[id + '-' + i] || {};
      var nm = nameOf(s), ad = addrOf(s), ph = phoneFor(nm);
      html += '<div class="x-pc-row"><div class="x-pc-t">' + esc(timeOf(s) || '—') + '</div><div>' +
        '<div class="x-pc-n">' + (rec.done ? '✓ ' : '') + esc(nm) + '</div>' +
        (ad ? '<div class="x-pc-a">' + esc(ad) + '</div>' : '') +
        (ph ? '<div class="x-pc-p">☎ ' + esc(ph) + '</div>' : '') +
        (rec.note ? '<div class="x-pc-note">' + esc(rec.note) + '</div>' : '') +
        '</div></div>';
    });

    $$('.stay', sec).forEach(function (st) {
      if (st.classList.contains('dimmed')) return;
      var lab = st.querySelector('.label'), nm = st.querySelector('.name');
      var addrs = $$('.addr', st).map(function (a) { return a.textContent.replace(/\s+/g, ' ').trim(); });
      html += '<div class="x-pc-stay"><b>' + esc(lab ? lab.textContent.replace(/\s+/g, ' ').trim() : 'Lodging') + '</b>' +
        '<div style="font-weight:600;margin-bottom:4px">' + esc(nm ? nm.textContent.trim() : '') + '</div>' +
        '<div class="x-pc-a">' + esc(addrs[0] || '') + '</div></div>';
    });
    return html;
  }

  function pocketText(id) {
    var sec = document.getElementById(id);
    if (!sec) return '';
    var l = log();
    var title = $('.card-title', sec);
    var out = [(DAY_LABEL[id] || id) + ' — ' + (title ? title.textContent.replace(/\s+/g, ' ').trim() : ''), ''];
    stopsOf(sec).forEach(function (s, i) {
      if (s.classList.contains('dimmed')) return;
      var rec = l[id + '-' + i] || {};
      var nm = nameOf(s), ad = addrOf(s), ph = phoneFor(nm);
      out.push((timeOf(s) || '—') + '  ' + (rec.done ? '[done] ' : '') + nm);
      if (ad) out.push('      ' + ad);
      if (ph) out.push('      tel ' + ph);
      if (rec.note) out.push('      note: ' + rec.note);
    });
    $$('.stay', sec).forEach(function (st) {
      if (st.classList.contains('dimmed')) return;
      var nm = st.querySelector('.name'), ad = st.querySelector('.addr');
      out.push('');
      out.push('Stay: ' + (nm ? nm.textContent.trim() : '') + (ad ? ' — ' + ad.textContent.replace(/\s+/g, ' ').trim() : ''));
    });
    out.push('');
    out.push('supmaine.mikeside.com/v2.html');
    return out.join('\n');
  }

  /* =========================================================
     FEATURE 14 — SHARE THE DAY
     ========================================================= */
  function shareDay(id) {
    var txt = pocketText(id);
    var title = 'Maine — ' + (DAY_LABEL[id] || id);
    if (navigator.share) {
      navigator.share({ title: title, text: txt }).catch(function () { /* user cancelled */ });
      return;
    }
    copy(txt, 'Day copied — paste it to Allison & Sean');
  }
  function copy(txt, okMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { toast(okMsg); })
        .catch(function () { toast('Copy blocked — select the text and copy manually'); });
    } else {
      toast('Copy blocked — select the text and copy manually');
    }
  }

  /* =========================================================
     FEATURE 15 — TIGHT-CONNECTION CHECKER
     Walks each day in DOM order: stop → leg(s) → next stop.
     Compares the scheduled gap against the drive time already
     written on the leg. Flags only genuine shortfalls.
     ========================================================= */
  function checkDay(sec) {
    var kids = Array.prototype.slice.call(sec.querySelectorAll('.stop, .leg, .drive'));
    var prev = null, pendingMin = 0, pendingEl = null, flagged = 0;
    kids.forEach(function (el) {
      if (el.classList.contains('leg') || el.classList.contains('drive')) {
        var m = el.textContent.match(/~\s*([\d.]+)\s*min/);
        var h = el.textContent.match(/~\s*([\d.]+)\s*hr/);
        if (m) { pendingMin += parseFloat(m[1]); pendingEl = el; }
        else if (h) { pendingMin += parseFloat(h[1]) * 60; pendingEl = el; }
        return;
      }
      // it's a .stop
      if (el.classList.contains('dimmed')) { prev = null; pendingMin = 0; return; }
      var t = parseTime(timeOf(el));
      if (prev !== null && t !== null && pendingMin > 0 && pendingEl) {
        var gap = t - prev;
        if (gap > 0) {
          var slack = gap - pendingMin;
          if (slack < 0) {
            addFlag(pendingEl, '⚠ <b>' + Math.abs(Math.round(slack)) + ' min short</b> — ' +
              Math.round(pendingMin) + ' min drive but only ' + gap + ' min between ' +
              fmtMin(prev) + ' and ' + fmtMin(t) + '. Leave earlier or expect to arrive late.', false);
            flagged++;
          } else if (slack <= 10) {
            addFlag(pendingEl, '◔ <b>' + Math.round(slack) + ' min slack</b> — ' +
              Math.round(pendingMin) + ' min drive inside a ' + gap + ' min gap. No room for a detour.', true);
            flagged++;
          }
        }
      }
      if (t !== null) prev = t;
      pendingMin = 0; pendingEl = null;
    });
    return flagged;
  }
  function addFlag(afterEl, html, ok) {
    if (afterEl.nextElementSibling && afterEl.nextElementSibling.classList.contains('x-tight')) return;
    var d = document.createElement('div');
    d.className = 'x-tight' + (ok ? ' x-ok' : '');
    d.innerHTML = html;
    afterEl.parentNode.insertBefore(d, afterEl.nextSibling);
  }
  function runChecker() {
    $$('.x-tight').forEach(function (e) { e.remove(); });
    var total = 0;
    ORDER.forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) total += checkDay(sec);
    });
    return total;
  }

  /* =========================================================
     MODAL PLUMBING + util-row buttons
     ========================================================= */
  var back, modal, mTitle, mBody, mFoot;
  function buildModal() {
    back = document.createElement('div');
    back.className = 'x-back';
    back.innerHTML =
      '<div class="x-modal">' +
      '  <div class="x-mhead"><h3></h3><button class="x-close" aria-label="Close">✕</button></div>' +
      '  <div class="x-mbody"></div>' +
      '  <div class="x-mfoot"></div>' +
      '</div>';
    document.body.appendChild(back);
    modal = $('.x-modal', back);
    mTitle = $('.x-mhead h3', back);
    mBody = $('.x-mbody', back);
    mFoot = $('.x-mfoot', back);
    $('.x-close', back).addEventListener('click', closeModal);
    back.addEventListener('click', function (e) { if (e.target === back) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && back.classList.contains('open')) closeModal();
    });
  }
  function openModal(title, bodyHTML, footBtns) {
    mTitle.textContent = title;
    mBody.innerHTML = bodyHTML;
    mFoot.innerHTML = '';
    (footBtns || []).forEach(function (b) {
      var el = document.createElement('button');
      el.className = 'ubtn';
      el.type = 'button';
      el.textContent = b.label;
      el.addEventListener('click', b.fn);
      mFoot.appendChild(el);
    });
    back.classList.add('open');
  }
  function closeModal() { back.classList.remove('open'); }

  function todayId() {
    var now = new Date();
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    var ymd = now.getFullYear() + '-' + p(now.getMonth() + 1) + '-' + p(now.getDate());
    var hit = null;
    ORDER.forEach(function (id) {
      var s = document.getElementById(id);
      if (s && s.getAttribute('data-date') === ymd) hit = id;
    });
    return hit;
  }

  function daySwitcher(cur, onPick) {
    var html = '<div class="x-days">';
    ORDER.forEach(function (id) {
      if (!document.getElementById(id)) return;
      html += '<button data-d="' + id + '"' + (id === cur ? ' class="on"' : '') + '>' +
        esc((DAY_LABEL[id] || id).replace(/^\w+ /, '')) + '</button>';
    });
    return html + '</div>';
  }
  function wireSwitcher(root, cb) {
    $$('.x-days button', root).forEach(function (b) {
      b.addEventListener('click', function () { cb(b.dataset.d); });
    });
  }

  /* ---- Pocket card modal ---- */
  var pcDay = null;
  function showPocket(id) {
    pcDay = id || pcDay || todayId() || ORDER[0];
    openModal('Pocket card', daySwitcher(pcDay) + pocketHTML(pcDay), [
      { label: '⎙ Print', fn: function () { window.print(); } },
      { label: '⧉ Copy as text', fn: function () { copy(pocketText(pcDay), 'Pocket card copied'); } },
      { label: '↗ Share this day', fn: function () { shareDay(pcDay); } }
    ]);
    wireSwitcher(mBody, showPocket);
  }

  /* ---- Trip log modal ---- */
  function showLog() {
    var txt = buildLogText();
    var body = txt
      ? '<textarea class="x-out" readonly>' + esc(txt) + '</textarea>'
      : '<div class="x-empty">Nothing logged yet.<br><br>Open any day and use “Mark done” or “Note” on a stop — it shows up here.</div>';
    var btns = [];
    if (txt) {
      btns.push({ label: '⧉ Copy log', fn: function () { copy(txt, 'Trip log copied'); } });
      btns.push({
        label: '↓ Download .txt', fn: function () {
          var blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'maine-trip-log.txt';
          document.body.appendChild(a); a.click(); a.remove();
          toast('Log downloaded');
        }
      });
      btns.push({
        label: '⌫ Clear log', fn: function () {
          if (mFoot.dataset.armed === '1') {
            store(LS_LOG, {});
            $$('.stop.x-done').forEach(function (s) { s.classList.remove('x-done'); });
            $$('.sact.x-on').forEach(function (b) {
              b.classList.remove('x-on');
              if (b.textContent.indexOf('Done') > -1) b.textContent = '○ Mark done';
              if (b.textContent.indexOf('note') > -1) b.textContent = '✎ Note';
            });
            $$('.x-note').forEach(function (t) { t.value = ''; });
            $$('.x-note-read').forEach(function (r) { r.style.display = 'none'; });
            paintProgress();
            closeModal();
            toast('Trip log cleared');
          } else {
            mFoot.dataset.armed = '1';
            this.textContent = '⌫ Really clear?';
            var self = this;
            setTimeout(function () { mFoot.dataset.armed = '0'; self.textContent = '⌫ Clear log'; }, 4000);
          }
        }
      });
    }
    openModal('Trip log', body, btns);
  }

  function addUtilButtons() {
    var util = $('.util');
    if (!util) return;
    function mk(id, label, title, fn) {
      if (document.getElementById(id)) return;
      var b = document.createElement('button');
      b.className = 'ubtn';
      b.id = id;
      b.type = 'button';
      b.textContent = label;
      b.title = title;
      b.addEventListener('click', fn);
      util.appendChild(b);
    }
    mk('x-t-pocket', '▭ Pocket card', 'Compact one-day sheet — print it or copy it', function () { showPocket(); });
    mk('x-t-log', '✎ Trip log', 'Everything you ticked off or noted', showLog);
    mk('x-t-share', '↗ Share a day', 'Send a day plan to the crew', function () {
      var d = todayId() || ORDER[0];
      openModal('Share a day', daySwitcher(d) +
        '<div class="x-empty" style="text-align:left;padding:6px 0 0">Pick a day, then send it.</div>', []);
      wireSwitcher(mBody, function (id) { closeModal(); shareDay(id); });
    });
  }

  /* ---- now-bar gets a "take me there" affordance during the trip ---- */
  function wireNowBar() {
    var bar = $('#nowbar');
    if (!bar) return;
    var mo = new MutationObserver(function () {
      if (!bar.classList.contains('live')) return;
      if ($('.x-nownav', bar)) return;
      var id = todayId();
      if (!id) return;
      var sec = document.getElementById(id);
      if (!sec) return;
      // next stop = first stop later than now that still has a map query
      var mins = new Date().getHours() * 60 + new Date().getMinutes();
      var next = null;
      stopsOf(sec).forEach(function (s) {
        if (next) return;
        var t = parseTime(timeOf(s));
        if (t !== null && t > mins && queryOf(s)) next = s;
      });
      if (!next) return;
      var b = document.createElement('button');
      b.className = 'sact x-nownav';
      b.type = 'button';
      b.style.marginLeft = '12px';
      b.textContent = '⌖ Take me there';
      b.addEventListener('click', function () { navFromHere(queryOf(next), b); });
      bar.appendChild(b);
    });
    mo.observe(bar, { childList: true, attributes: true, attributeFilter: ['class'] });
  }

  /* =========================================================
     BOOT — wait for v2.js to finish injecting fragments
     ========================================================= */
  function boot() {
    if (document.getElementById('x-extras-booted')) return;
    var flag = document.createElement('meta');
    flag.id = 'x-extras-booted';
    document.head.appendChild(flag);

    buildModal();
    $$('section.day .stop').forEach(function (stop) {
      wireLog(stop);
      wireNav(stop);
    });
    paintProgress();
    var flags = runChecker();
    addUtilButtons();
    wireNowBar();

    // re-run the checker when an option is locked/unlocked (v2.js dims blocks)
    document.addEventListener('click', function (e) {
      if (e.target.closest('.lock-btn')) setTimeout(runChecker, 120);
    });

    if (window.console) console.info('[v2-extras] ready · ' + flags + ' timing flag(s)');
  }

  if ($('section.day .stop')) boot();
  else {
    document.addEventListener('supmaine:ready', boot);
    // belt and braces: if the event already fired or never fires, poll briefly
    var tries = 0;
    var iv = setInterval(function () {
      if ($('section.day .stop')) { clearInterval(iv); boot(); }
      else if (++tries > 40) clearInterval(iv);
    }, 250);
  }

})();
