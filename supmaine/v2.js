/* ============================================================
   SupMaine v2 Beta — engine
   Loads the SAME day fragments v1 uses (single source of truth
   for the itinerary), then layers on the v2 feature set.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- config ---------- */

  var FRAGMENTS = [
    'day-1-tue.html', 'day-2-wed.html', 'day-3-thu.html', 'day-4-fri.html',
    'day-5-satsun.html', 'day-6-mon.html', 'day-7-tue.html'
  ];

  // id -> {date, label, lat, lon, place}
  var DAYS = {
    d1:  { date: '2026-08-04', label: 'Tue 4',  lat: 43.95, lon: -69.63, place: 'Boothbay Harbor' },
    d2:  { date: '2026-08-05', label: 'Wed 5',  lat: 44.21, lon: -69.06, place: 'Camden' },
    d3:  { date: '2026-08-06', label: 'Thu 6',  lat: 44.35, lon: -68.22, place: 'Acadia' },
    d4:  { date: '2026-08-07', label: 'Fri 7',  lat: 43.66, lon: -70.25, place: 'Portland' },
    d5:  { date: '2026-08-08', label: 'Sat 8',  lat: 43.56, lon: -70.20, place: 'Cape Elizabeth' },
    d5b: { date: '2026-08-09', label: 'Sun 9',  lat: 43.66, lon: -70.25, place: 'Portland' },
    d6:  { date: '2026-08-10', label: 'Mon 10', lat: 43.55, lon: -70.45, place: 'Kennebunkport' },
    d7:  { date: '2026-08-11', label: 'Tue 11', lat: 43.65, lon: -70.31, place: 'PWM' }
  };
  var ORDER = ['d1', 'd2', 'd3', 'd4', 'd5', 'd5b', 'd6', 'd7'];

  /* Wedding venue — SINGLE SOURCE. When the address is revealed,
     change these three values and nothing else on the site. */
  var VENUE = {
    known: false,
    name: 'Cape Elizabeth, ME',
    query: 'Cape+Elizabeth+ME'
  };

  var TRIP_START = new Date('2026-08-04T06:23:00-04:00'); // wheels-up, BHM
  var LS = {
    theme: 'supmaine-v2-theme',
    view: 'supmaine-v2-view',
    locks: 'supmaine-v2-locks',
    check: 'maine-trip-checklist-v1', // shared with v1 — do not rename
    pack: 'maine-trip-packing-v1'     // shared with v1 — do not rename
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function store(k, v) {
    try { if (v === undefined) { var r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; }
  }

  /* =========================================================
     1. THEME  (dark-first, remembers choice, honours OS pref)
     ========================================================= */
  function initTheme() {
    var saved = store(LS.theme);
    var pref = (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    setTheme(saved || pref, true);
    var btn = $('#t-theme');
    if (btn) btn.addEventListener('click', function () {
      setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }
  function setTheme(t, quiet) {
    document.documentElement.setAttribute('data-theme', t);
    store(LS.theme, t);
    var b = $('#t-theme');
    if (b) b.innerHTML = (t === 'dark' ? '◐ Light' : '◑ Dark');
    var m = $('#meta-theme');
    if (m) m.setAttribute('content', t === 'dark' ? '#080F18' : '#F1EEE7');
    if (!quiet) toast(t === 'dark' ? 'Dark mode' : 'Light mode');
  }

  /* =========================================================
     2. SUN  (sunrise / sunset / golden hour — pure math, no API)
     ========================================================= */
  function sun(dateStr, lat, lon) {
    var d = new Date(dateStr + 'T12:00:00Z');
    var n = Math.floor((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000) + 1;
    var rad = Math.PI / 180;
    function calc(isRise, zenith) {
      var lngHour = lon / 15;
      var t = n + ((isRise ? 6 : 18) - lngHour) / 24;
      var M = (0.9856 * t) - 3.289;
      var L = M + (1.916 * Math.sin(M * rad)) + (0.020 * Math.sin(2 * M * rad)) + 282.634;
      L = (L + 360) % 360;
      var RA = Math.atan(0.91764 * Math.tan(L * rad)) / rad;
      RA = (RA + 360) % 360;
      RA += (Math.floor(L / 90) * 90) - (Math.floor(RA / 90) * 90);
      RA /= 15;
      var sinDec = 0.39782 * Math.sin(L * rad);
      var cosDec = Math.cos(Math.asin(sinDec));
      var cosH = (Math.cos(zenith * rad) - (sinDec * Math.sin(lat * rad))) / (cosDec * Math.cos(lat * rad));
      if (cosH > 1 || cosH < -1) return null;
      var H = isRise ? 360 - (Math.acos(cosH) / rad) : (Math.acos(cosH) / rad);
      H /= 15;
      var T = H + RA - (0.06571 * t) - 6.622;
      var UT = ((T - lngHour) + 24) % 24;
      return UT;
    }
    // Aug 2026 in Maine = EDT (UTC-4)
    function fmt(ut) {
      if (ut === null) return '—';
      var local = (ut - 4 + 24) % 24;
      var h = Math.floor(local), m = Math.round((local - h) * 60);
      if (m === 60) { m = 0; h += 1; }
      var ap = h >= 12 ? 'p' : 'a', hh = h % 12; if (hh === 0) hh = 12;
      return hh + ':' + (m < 10 ? '0' : '') + m + ap;
    }
    return {
      rise: fmt(calc(true, 90.833)),
      set: fmt(calc(false, 90.833)),
      goldenEnd: fmt(calc(false, 84)) // sun ~6° up: golden hour begins
    };
  }

  /* =========================================================
     3. DRIVE TOTALS + DAY LOAD METER
     ========================================================= */
  function dayStats(sec) {
    var mi = 0, min = 0;
    $$('.leg, .drive', sec).forEach(function (el) {
      var t = el.textContent;
      var m1 = t.match(/≈\s*([\d.]+)\s*mi/); if (m1) mi += parseFloat(m1[1]);
      var m2 = t.match(/~\s*([\d.]+)\s*min/); if (m2) min += parseFloat(m2[1]);
      var m3 = t.match(/~\s*([\d.]+)\s*hr/); if (m3) min += parseFloat(m3[1]) * 60;
    });
    var stops = $$('.stop', sec).length;
    var times = $$('.stop-time', sec).map(function (e) { return parseTime(e.textContent); }).filter(function (v) { return v !== null; });
    var first = times.length ? Math.min.apply(null, times) : null;
    // load = driving minutes + stop count, bucketed 1..5
    var score = Math.min(5, Math.max(1, Math.round((min / 45) + (stops / 4))));
    return { mi: Math.round(mi), min: Math.round(min), stops: stops, first: first, load: score };
  }

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
    var h = Math.floor(v / 60), m = v % 60, ap = h >= 12 ? 'p' : 'a', hh = h % 12; if (hh === 0) hh = 12;
    return hh + ':' + (m < 10 ? '0' : '') + m + ap;
  }
  function hrs(min) {
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60), m = min % 60;
    return h + 'h' + (m ? ' ' + m + 'm' : '');
  }

  function injectDayMeta(sec) {
    var id = sec.id, cfg = DAYS[id]; if (!cfg) return;
    var st = dayStats(sec), s = sun(cfg.date, cfg.lat, cfg.lon);
    var bars = '';
    for (var i = 1; i <= 5; i++) bars += '<i class="' + (i <= st.load ? 'on' : '') + '"></i>';
    var wrap = document.createElement('div');
    wrap.className = 'day-meta';
    var html = '';
    if (st.mi) html += '<div class="dm">🚙 <b>' + st.mi + ' mi</b> · ' + hrs(st.min) + '</div>';
    if (st.first !== null) html += '<div class="dm' + (st.first <= 420 ? ' warn' : '') + '">⏰ first stop <b>' + fmtMin(st.first) + '</b></div>';
    html += '<div class="dm">☀ <b>' + s.rise + '</b> → ' + s.set + '</div>';
    html += '<div class="dm">📷 golden <b>' + s.goldenEnd + '</b></div>';
    html += '<div class="dm">load <span class="load">' + bars + '</span></div>';
    wrap.innerHTML = html;
    var head = $('.card-head', sec);
    if (head && head.parentNode) head.parentNode.insertBefore(wrap, head.nextSibling);
  }

  /* =========================================================
     4. STOP ACTIONS  (copy address · directions · call)
     ========================================================= */
  var PHONES = {
    'thurston': '+12072448467', 'alamo': '+18443703979',
    'holiday inn': '+12077752311', 'hilton garden': '+12078282669',
    'red\'s eats': '+12078822372'
  };
  function injectStopActions(sec) {
    $$('.stop, .stay', sec).forEach(function (stop) {
      var link = stop.querySelector('a[href*="maps/search"]');
      var nameEl = stop.querySelector('.stop-name, .name');
      if (!nameEl) return;
      var name = nameEl.textContent.replace(/\s+/g, ' ').trim();
      var row = document.createElement('div');
      row.className = 'stop-acts';
      var html = '';
      if (link) {
        var q = (link.getAttribute('href').match(/[?&]query=([^&#]+)/) || [])[1];
        if (q) {
          var pretty = decodeURIComponent(q.replace(/\+/g, ' '));
          html += '<button class="sact" data-copy="' + pretty.replace(/"/g, '&quot;') + '">⧉ Copy address</button>';
          html += '<a class="sact" href="https://www.google.com/maps/dir/?api=1&destination=' + q + '&travelmode=driving" target="_blank" rel="noopener">➜ Directions</a>';
        }
      }
      var lower = name.toLowerCase();
      Object.keys(PHONES).forEach(function (k) {
        if (lower.indexOf(k) > -1) html += '<a class="sact" href="tel:' + PHONES[k] + '">✆ Call</a>';
      });
      if (!html) return;
      row.innerHTML = html;
      var host = stop.querySelector('.stop-note') || stop.querySelector('.addr');
      if (host && host.parentNode) host.parentNode.appendChild(row);
      else stop.appendChild(row);
    });
  }

  /* =========================================================
     5. OPTION LOCK-IN  (decision tracker for A/B/C/D/E days)
     ========================================================= */
  function initLocks() {
    var locks = store(LS.locks) || {};
    $$('.alt-head').forEach(function (head) {
      var id = head.id; if (!id) return;
      var titleEl = head.querySelector('b');
      var title = titleEl ? titleEl.textContent : id;
      var sec = head.closest('section.day'); if (!sec) return;
      var b = document.createElement('button');
      b.className = 'lock-btn';
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.textContent = 'Lock in';
      b.addEventListener('click', function () {
        var cur = store(LS.locks) || {};
        if (cur[sec.id] === id) { delete cur[sec.id]; toast('Unlocked — ' + sec.id.toUpperCase() + ' is open again'); }
        else { cur[sec.id] = id; toast('Locked in: ' + title); }
        store(LS.locks, cur);
        applyLocks();
      });
      head.appendChild(b);
    });
    applyLocks();
  }
  function applyLocks() {
    var locks = store(LS.locks) || {};
    $$('.alt-head').forEach(function (head) {
      var sec = head.closest('section.day'); if (!sec) return;
      var chosen = locks[sec.id];
      var isMe = chosen === head.id;
      var btn = head.querySelector('.lock-btn');
      if (btn) { btn.setAttribute('aria-pressed', isMe ? 'true' : 'false'); btn.textContent = isMe ? '✓ Locked' : 'Lock in'; }
      head.classList.toggle('chosen', isMe);
      // dim the non-chosen option blocks
      var dim = !!chosen && !isMe;
      head.classList.toggle('dimmed', dim);
      var n = head.nextElementSibling;
      while (n && !n.classList.contains('alt-head')) {
        n.classList.toggle('dimmed', dim);
        n.classList.add('opt-block');
        n = n.nextElementSibling;
      }
    });
    // chip marker
    ORDER.forEach(function (id) {
      var chip = $('.chip[href="#' + id + '"]');
      var sec = document.getElementById(id);
      if (!chip) return;
      var has = !!(store(LS.locks) || {})[id];
      chip.classList.toggle('haslock', has);
      var mark = chip.querySelector('.locked');
      if (has && !mark) { var s = document.createElement('span'); s.className = 'locked'; s.textContent = '✓'; chip.appendChild(s); }
      if (!has && mark) mark.remove();
      if (sec) sec.classList.toggle('is-locked', has);
    });
  }

  /* =========================================================
     6. COMMAND PALETTE  (⌘K / ctrl-K · search every stop)
     ========================================================= */
  var PAL = { items: [], sel: 0, open: false };
  function buildPalette() {
    PAL.items = [];
    ORDER.forEach(function (id) {
      var sec = document.getElementById(id); if (!sec) return;
      var cfg = DAYS[id];
      var title = $('.card-title', sec);
      PAL.items.push({ t: title ? title.textContent : id, s: cfg.label + ' · whole day', id: id, day: id });
      $$('.stop, .stay', sec).forEach(function (stop, i) {
        var n = stop.querySelector('.stop-name, .name');
        var time = stop.querySelector('.stop-time, .label');
        if (!n) return;
        if (!stop.id) stop.id = id + '-s' + i;
        PAL.items.push({
          t: n.textContent.replace(/\s+/g, ' ').trim(),
          s: cfg.label + (time ? ' · ' + time.textContent.replace(/\s+/g, ' ').trim().slice(0, 34) : ''),
          id: stop.id, day: id,
          extra: (stop.querySelector('.stop-note, .addr') || {}).textContent || ''
        });
      });
      $$('.alt-head', sec).forEach(function (h) {
        var b = h.querySelector('b');
        PAL.items.push({ t: (b ? b.textContent : h.textContent), s: cfg.label + ' · option', id: h.id, day: id });
      });
    });
  }
  function palRender(q) {
    var list = $('#pal-list'); if (!list) return;
    var ql = q.trim().toLowerCase();
    var hits = !ql ? PAL.items.slice(0, 40) : PAL.items.filter(function (it) {
      return (it.t + ' ' + it.s + ' ' + (it.extra || '')).toLowerCase().indexOf(ql) > -1;
    }).slice(0, 40);
    PAL.hits = hits; PAL.sel = 0;
    if (!hits.length) { list.innerHTML = '<div class="pal-empty">Nothing matches “' + esc(q) + '”</div>'; return; }
    list.innerHTML = hits.map(function (it, i) {
      return '<button class="pal-item' + (i === 0 ? ' sel' : '') + '" data-i="' + i + '">' +
        '<div class="pi-t">' + hl(it.t, ql) + '</div><div class="pi-s">' + esc(it.s) + '</div></button>';
    }).join('');
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function hl(s, q) {
    if (!q) return esc(s);
    var i = s.toLowerCase().indexOf(q); if (i < 0) return esc(s);
    return esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length));
  }
  function palOpen() {
    buildPalette();
    var back = $('#pal-back'), inp = $('#pal-input');
    back.classList.add('open'); PAL.open = true;
    inp.value = ''; palRender(''); inp.focus();
  }
  function palClose() { $('#pal-back').classList.remove('open'); PAL.open = false; }
  function palGo(i) {
    var it = (PAL.hits || [])[i]; if (!it) return;
    palClose();
    var sec = document.getElementById(it.day);
    if (sec) openCard(sec, true);
    setTimeout(function () {
      var el = document.getElementById(it.id) || sec;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (el && el !== sec) {
        el.style.transition = 'background .2s ease';
        var prev = el.style.background;
        el.style.background = 'color-mix(in srgb, var(--beacon) 14%, transparent)';
        setTimeout(function () { el.style.background = prev; }, 1300);
      }
    }, 130);
  }
  function initPalette() {
    var back = $('#pal-back'), inp = $('#pal-input');
    $('#t-search').addEventListener('click', palOpen);
    inp.addEventListener('input', function () { palRender(this.value); });
    back.addEventListener('click', function (e) { if (e.target === back) palClose(); });
    $('#pal-list').addEventListener('click', function (e) {
      var b = e.target.closest('.pal-item'); if (b) palGo(parseInt(b.dataset.i, 10));
    });
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); PAL.open ? palClose() : palOpen(); return; }
      if (e.key === '/' && !PAL.open && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); palOpen(); return; }
      if (!PAL.open) return;
      if (e.key === 'Escape') { palClose(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var items = $$('.pal-item');
        if (!items.length) return;
        items[PAL.sel] && items[PAL.sel].classList.remove('sel');
        PAL.sel = (PAL.sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[PAL.sel].classList.add('sel');
        items[PAL.sel].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') { e.preventDefault(); palGo(PAL.sel); }
    });
  }

  /* =========================================================
     7. NOW / NEXT LIVE BAR
     ========================================================= */
  function tickNow() {
    var bar = $('#nowbar'); if (!bar) return;
    var now = new Date();
    var ymd = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    var todayId = null;
    ORDER.forEach(function (id) { if (DAYS[id].date === ymd) todayId = id; });

    // countdown instrument
    var days = Math.ceil((TRIP_START - now) / 86400000);
    var cdN = $('#cd-num'), cdL = $('#cd-label');
    if (cdN) {
      if (days > 0) { cdN.textContent = days; cdL.textContent = days === 1 ? 'day to wheels-up' : 'days to wheels-up'; }
      else if (todayId) { cdN.textContent = 'NOW'; cdL.textContent = 'day ' + (ORDER.indexOf(todayId) + 1) + ' of 8'; }
      else { cdN.textContent = '✓'; cdL.textContent = 'expedition complete'; }
    }

    if (!todayId) { bar.classList.remove('live'); return; }
    var sec = document.getElementById(todayId); if (!sec) { bar.classList.remove('live'); return; }
    var mins = now.getHours() * 60 + now.getMinutes();
    var stops = $$('.stop', sec).map(function (s) {
      var t = s.querySelector('.stop-time'), n = s.querySelector('.stop-name');
      return { m: t ? parseTime(t.textContent) : null, name: n ? n.textContent.replace(/\s+/g, ' ').trim() : '', el: s };
    }).filter(function (s) { return s.m !== null; }).sort(function (a, b) { return a.m - b.m; });
    if (!stops.length) { bar.classList.remove('live'); return; }

    var cur = null, next = null;
    for (var i = 0; i < stops.length; i++) {
      if (stops[i].m <= mins) cur = stops[i];
      else { next = stops[i]; break; }
    }
    var html = '<span class="pulse"></span><div><div class="nb-k">Right now · ' + DAYS[todayId].label + '</div>' +
      '<div class="nb-now">' + esc(cur ? cur.name : 'Day hasn\'t started') + '</div></div>';
    if (next) {
      var d = next.m - mins;
      html += '<div class="nb-next" style="margin-left:auto;text-align:right">next in ' + hrs(d) +
        '<br>' + fmtMin(next.m) + ' · ' + esc(next.name.slice(0, 30)) + '</div>';
    } else {
      html += '<div class="nb-next" style="margin-left:auto">last stop of the day</div>';
    }
    bar.innerHTML = html;
    bar.classList.add('live');
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* =========================================================
     8. ICS CALENDAR EXPORT
     ========================================================= */
  function buildICS() {
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//supmaine//v2//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Maine Aug 2026'];
    var locks = store(LS.locks) || {};
    var n = 0;
    ORDER.forEach(function (id) {
      var sec = document.getElementById(id); if (!sec) return;
      var cfg = DAYS[id];
      $$('.stop', sec).forEach(function (stop, i) {
        // skip stops inside a dimmed (not-chosen) option block
        if (locks[id] && stop.classList.contains('dimmed')) return;
        var t = stop.querySelector('.stop-time'), nm = stop.querySelector('.stop-name');
        var m = t ? parseTime(t.textContent) : null;
        if (m === null || !nm) return;
        var note = (stop.querySelector('.stop-note') || {}).textContent || '';
        var link = stop.querySelector('a[href*="maps/search"]');
        var loc = link ? decodeURIComponent((link.getAttribute('href').match(/[?&]query=([^&#]+)/) || ['', ''])[1].replace(/\+/g, ' ')) : cfg.place;
        var dt = cfg.date.replace(/-/g, '');
        var st = dt + 'T' + pad(Math.floor(m / 60)) + pad(m % 60) + '00';
        var em = m + 60;
        var en = dt + 'T' + pad(Math.floor(em / 60) % 24) + pad(em % 60) + '00';
        n++;
        lines.push('BEGIN:VEVENT');
        lines.push('UID:supmaine-' + id + '-' + i + '@mikeside.com');
        lines.push('DTSTAMP:20260726T120000Z');
        lines.push('DTSTART;TZID=America/New_York:' + st);
        lines.push('DTEND;TZID=America/New_York:' + en);
        lines.push('SUMMARY:' + ics(nm.textContent.replace(/\s+/g, ' ').trim()));
        lines.push('LOCATION:' + ics(loc));
        lines.push('DESCRIPTION:' + ics(note.replace(/\s+/g, ' ').trim().slice(0, 300)));
        lines.push('END:VEVENT');
      });
    });
    // the wedding itself
    lines.push('BEGIN:VEVENT', 'UID:supmaine-wedding@mikeside.com', 'DTSTAMP:20260726T120000Z',
      'DTSTART;TZID=America/New_York:20260808T153000', 'DTEND;TZID=America/New_York:20260808T220000',
      'SUMMARY:Jeannette & Austin — Wedding', 'LOCATION:' + ics(VENUE.name),
      'DESCRIPTION:' + ics('3:30 welcome drinks / 4:00 ceremony / 5:00-10:00 reception. Attire: formal, black-tie optional.' + (VENUE.known ? '' : ' VENUE ADDRESS TBC.')),
      'END:VEVENT');
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
  function ics(s) { return String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); }
  function initICS() {
    $('#t-ics').addEventListener('click', function () {
      var blob = new Blob([buildICS()], { type: 'text/calendar;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'maine-aug-2026.ics';
      document.body.appendChild(a); a.click(); a.remove();
      toast('Calendar file downloaded');
    });
  }

  /* =========================================================
     9. VIEW TOGGLE  (cards ⇄ timeline)
     ========================================================= */
  function initView() {
    var saved = store(LS.view) || 'cards';
    setView(saved, true);
    $('#t-view').addEventListener('click', function () {
      setView(document.body.classList.contains('view-timeline') ? 'cards' : 'timeline');
    });
  }
  function setView(v, quiet) {
    document.body.classList.toggle('view-timeline', v === 'timeline');
    store(LS.view, v);
    var b = $('#t-view');
    if (b) b.innerHTML = (v === 'timeline' ? '▤ Cards' : '☰ Timeline');
    if (v === 'timeline') {
      ORDER.forEach(function (id) {
        var sec = document.getElementById(id); if (!sec || $('.tl-head', sec)) return;
        var cfg = DAYS[id], title = $('.card-title', sec);
        var h = document.createElement('div');
        h.className = 'tl-head';
        h.innerHTML = '<span class="d">' + cfg.label + '</span><span class="t">' + esc(title ? title.textContent : '') + '</span>';
        sec.insertBefore(h, sec.firstChild);
      });
    }
    if (!quiet) toast(v === 'timeline' ? 'Timeline view' : 'Card view');
  }

  /* =========================================================
     10. OFFLINE — WITHDRAWN (2026-07-26)
     The v2 service worker broke Place photos site-wide (root
     scope + referrer-restricted key), and its first cleanup
     version force-navigated its clients on activation, which
     combined with the register() call that used to live here
     to produce an infinite reload loop. Offline mode returns
     only after in-browser verification, on a scoped path.
     This stub only clears any leftover registration — it must
     NEVER call register().
     ========================================================= */
  function initOffline() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (rs) {
        rs.forEach(function (r) { r.unregister(); });
      }).catch(function () { });
    }
  }

  /* =========================================================
     shell: fragment load, accordion, nav, map, lists, lightbox
     ========================================================= */
  function loadFragments() {
    var route = $('#route');
    return Promise.all(FRAGMENTS.map(function (f) {
      return fetch(f, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; });
    })).then(function (parts) {
      route.innerHTML = parts.join('\n');
    });
  }

  function openCard(sec, force) {
    var head = $('.card-head', sec), body = $('.card-body', sec);
    if (!head || !body) return;
    var isOpen = head.getAttribute('aria-expanded') === 'true';
    if (force && isOpen) return;
    head.setAttribute('aria-expanded', force ? 'true' : (isOpen ? 'false' : 'true'));
    body.classList.toggle('open', force ? true : !isOpen);
  }

  function initCards() {
    var todayId = null;
    var now = new Date(), ymd = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    $$('section.day').forEach(function (sec) {
      var head = $('.card-head', sec);
      if (head) head.addEventListener('click', function () { openCard(sec); });
      var d = sec.getAttribute('data-date');
      if (d === ymd) { sec.classList.add('is-today'); todayId = sec.id; }
      else if (d && d < ymd) sec.classList.add('is-past');
      var cd = $('.card-date', sec);
      if (cd && d) {
        var dt = new Date(d + 'T12:00:00');
        var dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getDay()];
        if (cd.textContent.indexOf('·') < 0) cd.innerHTML = '<span class="dow">' + dow + '</span> ' + esc(cd.textContent);
      }
      injectDayMeta(sec);
      injectStopActions(sec);
    });
    // open today, else day 1
    var open = todayId ? document.getElementById(todayId) : $('section.day');
    if (open) openCard(open, true);
    if (todayId) {
      var c = $('.chip[href="#' + todayId + '"]');
      if (c) c.classList.add('today');
    }
  }

  function initNav() {
    $$('.chip').forEach(function (chip) {
      chip.addEventListener('click', function (e) {
        var id = chip.getAttribute('href').slice(1);
        var sec = document.getElementById(id);
        if (sec) { openCard(sec, true); }
      });
    });
    var secs = ORDER.map(function (i) { return document.getElementById(i); }).filter(Boolean);
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        $$('.chip').forEach(function (c) { c.classList.remove('on'); });
        var c = $('.chip[href="#' + en.target.id + '"]');
        if (c) c.classList.add('on');
      });
    }, { rootMargin: '-90px 0px -70% 0px' });
    secs.forEach(function (s) { obs.observe(s); });
  }

  function initVenueNotice() {
    if (VENUE.known) return;
    var sec = document.getElementById('d5'); if (!sec) return;
    var body = $('.card-body', sec); if (!body) return;
    var d = document.createElement('div');
    d.className = 'venue-tbd';
    d.innerHTML = '<b>Venue address pending</b>The public wedding site lists only ' +
      '<b style="display:inline;font-family:inherit;font-size:inherit;letter-spacing:0;text-transform:none">Cape Elizabeth, ME</b>. ' +
      'Directions below point at Cape Elizabeth generally. Expected at the Friday rehearsal — once known it is a one-value change in <code>v2.js</code>.';
    var intro = $('.day-intro', sec);
    if (intro) intro.parentNode.insertBefore(d, intro.nextSibling); else body.insertBefore(d, body.firstChild);
  }

  function initLightbox() {
    var lb = $('#lb');
    document.addEventListener('click', function (e) {
      var img = e.target.closest('img.lightboxable');
      if (img) {
        $('#lb-img').src = img.src;
        $('#lb-cap').textContent = img.dataset.cap || img.alt || '';
        lb.classList.add('open');
      } else if (e.target.closest('#lb')) lb.classList.remove('open');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lb.classList.remove('open'); });
  }

  function initMap() {
    if (typeof L === 'undefined') return;
    var el = $('#route-map'); if (!el) return;
    var pts = ORDER.map(function (id) { return DAYS[id]; });
    var map = L.map(el, { scrollWheelZoom: false }).setView([44.0, -69.5], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 17
    }).addTo(map);
    var latlngs = [];
    pts.forEach(function (p, i) {
      latlngs.push([p.lat, p.lon]);
      L.circleMarker([p.lat, p.lon], {
        radius: 8, color: '#FF7A2F', weight: 2, fillColor: '#0F1C2A', fillOpacity: .95
      }).addTo(map).bindPopup('<b>' + p.label + '</b><br>' + p.place);
    });
    L.polyline(latlngs, { color: '#43D3C0', weight: 2, dashArray: '5 7', opacity: .85 }).addTo(map);
    map.fitBounds(latlngs, { padding: [34, 34] });
    var lg = $('#map-legend');
    if (lg) lg.innerHTML = pts.map(function (p) { return '<span>' + p.label + ' · ' + p.place + '</span>'; }).join('');
  }

  function initLists() {
    // checklist
    fetch('checklist.html', { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (h) {
      var host = $('#todo-section'); if (!host) return;
      host.innerHTML = '<h2 class="sec">Before wheels-up</h2><div class="todo">' + h + '</div>';
      wireChecks($('#todo-section'), LS.check, function (l) { return (l.querySelector('b') || l).textContent.trim(); });
    }).catch(function () { });
    // packing
    fetch('packing.html', { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (h) {
      var host = $('#pack-section'); if (!host) return;
      host.innerHTML = '<h2 class="sec">Packing</h2>' + h;
      wirePacking(host);
    }).catch(function () { });
  }

  function wireChecks(root, key, keyOf) {
    var saved = store(key) || {};
    var labels = $$('label', root);
    labels.forEach(function (l) {
      var cb = l.querySelector('input[type=checkbox]'); if (!cb) return;
      var k = keyOf(l);
      if (saved[k]) { cb.checked = true; l.classList.add('done'); }
      cb.addEventListener('change', function () {
        var s = store(key) || {};
        if (cb.checked) s[k] = 1; else delete s[k];
        store(key, s);
        l.classList.toggle('done', cb.checked);
        paintProg(root);
      });
    });
    var p = document.createElement('div'); p.className = 'prog'; p.innerHTML = '<i></i>';
    root.querySelector('.todo, .packcard') && root.querySelector('.todo, .packcard').appendChild(p);
    paintProg(root);
  }
  function paintProg(root) {
    var boxes = $$('input[type=checkbox]', root);
    var done = boxes.filter(function (b) { return b.checked; }).length;
    var bar = $('.prog i', root);
    if (bar && boxes.length) bar.style.width = Math.round(done / boxes.length * 100) + '%';
  }
  function wirePacking(root) {
    var people = $$('.packcard', root);
    var tabs = document.createElement('div'); tabs.className = 'pack-tabs';
    people.forEach(function (p, i) {
      var name = (p.querySelector('h3, .pack-name') || {}).textContent || ('Person ' + (i + 1));
      var b = document.createElement('button');
      b.className = 'pack-tab' + (i === 0 ? ' on' : '');
      b.textContent = name.trim();
      b.addEventListener('click', function () {
        $$('.pack-tab', root).forEach(function (t) { t.classList.remove('on'); });
        b.classList.add('on');
        people.forEach(function (q, j) { q.style.display = j === i ? '' : 'none'; });
      });
      tabs.appendChild(b);
      p.style.display = i === 0 ? '' : 'none';
    });
    if (people.length > 1) root.insertBefore(tabs, people[0]);
    var saved = store(LS.pack) || {};
    people.forEach(function (p, pi) {
      $$('label', p).forEach(function (l, li) {
        var cb = l.querySelector('input[type=checkbox]'); if (!cb) return;
        var k = pi + '::' + li;
        if (saved[k]) { cb.checked = true; l.classList.add('done'); }
        cb.addEventListener('change', function () {
          var s = store(LS.pack) || {};
          if (cb.checked) s[k] = 1; else delete s[k];
          store(LS.pack, s);
          l.classList.toggle('done', cb.checked);
        });
      });
    });
  }

  /* ---------- toast ---------- */
  var toastT;
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('show'); }, 2100);
  }

  /* ---------- copy delegation ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]'); if (!b) return;
    var txt = b.dataset.copy;
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
      b.classList.add('ok'); b.textContent = '✓ Copied';
      toast('Copied: ' + txt.slice(0, 42));
      setTimeout(function () { b.classList.remove('ok'); b.textContent = '⧉ Copy address'; }, 1800);
    }).catch(function () { toast('Copy blocked — long-press to select'); });
  });

  /* ---------- boot ---------- */
  initTheme();
  loadFragments().then(function () {
    initCards();
    initNav();
    initLocks();
    initVenueNotice();
    initPalette();
    initICS();
    initView();
    initLightbox();
    initLists();
    initMap();
    initOffline();
    tickNow();
    setInterval(tickNow, 60000);
    document.dispatchEvent(new CustomEvent('supmaine:ready'));
  });

})();
