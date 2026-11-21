/* gatlinburg/site.js — shared by the hub and the day pages. Every block checks for its own elements and bails if they're missing. */
var GATE_BLOB = {"it":250000,"salt":"pmTZbFhpZmKf+pYKEYmnkw==","iv":"yJlbLp04Xcm1dAMa","ct":"ueoaECMR0ScnDNoje9saZhKypdguFh46TuQK+MjwoGYZRDlUOoNXPP4EKeImmOiiSdswPPs6BpezWbUHr+Mbdtwaa8IdPmVa+3RitCIUWWcGmcv3rrMMnOOh5i3T2XX0ggURvCeQ8tXSr29KlGgYgHaGd+MNxkwfCNc0REI0SuNWaArWa+ItoQR59DrWW2FGKP8HL6qzidITsdNWv8g2m4uEeJnw0DW3pTr/LWPWEThPhIKJvw+s3s1JjyFOoGXx8vxiNkJtMoNpc27o2JQx+WaoSTRFpCdYH77RRlWohnjtSdJJiKY8ep54/3DckDtrPIyMUa+vyy1kzTZzBlxkKWp+o9/BOb7YP5P0hHii2dhRL7aHDn5D4/j91FbpQ6WFTOIvkkb0PlVoqJpemKvDEiT/YI4iHyEJ+Pu2MXNWd1l4qC7xpnzYhuJ6v4XBFmDp3jVQ1EuR4q91+dxEjoQTXT4KzUowXTJwcHlNLOZICO9EyWYj6RqfnCqQUvTiD6/Uywn5+CYgw9ZyXnFSrFZpBGvWEYlR1oqy0vFa9rkKayz+akwi3N9Nrw=="};

/* PIN gate. The private block is AES-GCM encrypted with a key derived from the PIN (PBKDF2).
   A correct PIN decrypts it and unlocks the page; the PIN is remembered on this phone. */
(function(){
  var KEY = 'gatlinburg-2026-pin';
  var gate = document.getElementById('gate'), form = document.getElementById('gate-form');
  var input = document.getElementById('pin'), err = document.getElementById('gate-err');
  var blobEl = document.getElementById('private-blob');
  var blob = blobEl ? JSON.parse(blobEl.textContent) : GATE_BLOB;
  var out = document.getElementById('private-body');
  function b64(s){ var bin = atob(s), a = new Uint8Array(bin.length); for (var i=0;i<bin.length;i++) a[i] = bin.charCodeAt(i); return a; }
  function unlock(html){
    if (out) out.innerHTML = html;
    document.body.classList.remove('locked');
    gate.hidden = true;
    try { document.dispatchEvent(new CustomEvent('gatlinburg:unlock')); } catch(e){}
  }
  function tryPin(pin){
    if (!window.crypto || !crypto.subtle) return Promise.reject(new Error('nocrypto'));
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']).then(function(km){
      return crypto.subtle.deriveKey({name:'PBKDF2', salt: b64(blob.salt), iterations: blob.it, hash:'SHA-256'}, km, {name:'AES-GCM', length:256}, false, ['decrypt']);
    }).then(function(key){
      return crypto.subtle.decrypt({name:'AES-GCM', iv: b64(blob.iv)}, key, b64(blob.ct));
    }).then(function(buf){ return new TextDecoder().decode(buf); });
  }
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var pin = input.value.trim(); if (!pin) return;
    err.textContent = '';
    tryPin(pin).then(function(html){
      try { localStorage.setItem(KEY, pin); } catch(x){}
      unlock(html);
    }).catch(function(e){
      err.textContent = e.message === 'nocrypto' ? 'This browser cannot open the page. Use Safari or Chrome.' : 'Wrong PIN.';
      input.value = ''; input.focus();
    });
  });
  var saved = null; try { saved = localStorage.getItem(KEY); } catch(x){}
  if (saved) { tryPin(saved).then(unlock).catch(function(){ try { localStorage.removeItem(KEY); } catch(x){} input.focus(); }); }
  else { input.focus(); }
})();

/* Packing list: counter, clear, print. Ticks are remembered per phone (localStorage). */
(function(){
  if (document.body.classList.contains('packing-page')) return;
  var KEY = 'gatlinburg-2026-packing';
  var boxes = [].slice.call(document.querySelectorAll('#grid input[type=checkbox]'));
  var count = document.getElementById('count');
  var total = document.getElementById('total');
  if (!count || !total) return;
  total.textContent = boxes.length;
  function label(b){ return b.parentNode.textContent.replace(/\s+/g,' ').trim(); }
  function load(){ try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e){ return {}; } }
  function save(){
    var o = {};
    boxes.forEach(function(b){ if (b.checked) o[label(b)] = 1; });
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch(e){}
  }
  function tally(){
    var n = 0;
    for (var i=0;i<boxes.length;i++){ if (boxes[i].checked) n++; }
    count.textContent = n;
  }
  var saved = load();
  boxes.forEach(function(b){ if (saved[label(b)]) b.checked = true; });
  boxes.forEach(function(b){ b.addEventListener('change', function(){ tally(); save(); }); });
  document.getElementById('clear').addEventListener('click', function(){
    boxes.forEach(function(b){ b.checked = false; });
    tally(); save();
  });
  document.getElementById('print').addEventListener('click', function(){ window.print(); });
  tally();
})();

/* Today view: during the trip, mark today's card, collapse the days already done. */
(function(){
  var cards = [].slice.call(document.querySelectorAll('.day[data-date]'));
  var bar = document.getElementById('today-bar');
  var btn = document.getElementById('toggle-past');
  var lbl = document.getElementById('today-label');
  if (!cards.length || !bar) return;
  cards = cards.filter(function(c){ return c.closest('#days') && /^\d{4}-/.test(c.getAttribute('data-date')); });
  // Today in Eastern time, as YYYY-MM-DD.
  var today;
  try { today = new Intl.DateTimeFormat('en-CA', {timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date()); }
  catch(e){ today = new Date().toISOString().slice(0,10); }
  var first = cards[0].getAttribute('data-date'), last = cards[cards.length-1].getAttribute('data-date');
  if (today < first || today > last) return;
  var past = 0, todayCard = null;
  cards.forEach(function(c){
    var d = c.getAttribute('data-date');
    if (d < today) { c.classList.add('is-past','collapsed'); past++; }
    if (d === today) { c.classList.add('is-today'); todayCard = c; }
  });
  var names = {'2026-11-22':'Sunday','2026-11-23':'Monday','2026-11-24':'Tuesday','2026-11-25':'Wednesday','2026-11-26':'Thanksgiving','2026-11-27':'Friday','2026-11-28':'Saturday'};
  lbl.textContent = 'Today: ' + (names[today] || today);
  lbl.hidden = false;
  if (past) btn.hidden = false;
  var shown = false;
  btn.addEventListener('click', function(){
    shown = !shown;
    cards.forEach(function(c){ if (c.classList.contains('is-past')) c.classList.toggle('collapsed', !shown); });
    btn.textContent = shown ? 'Hide earlier days' : 'Show earlier days';
  });
  if (todayCard && !location.hash) {
    setTimeout(function(){ todayCard.scrollIntoView({block:'start'}); window.scrollBy(0,-72); }, 50);
  }
})();

/* Swap days: move a day's plan to another date. Remembered per phone. */
(function(){
  var KEY = 'gatlinburg-2026-days';
  var cards = [].slice.call(document.querySelectorAll('#days .day[data-plan]'));
  var reset = document.getElementById('reset-days');
  var note = document.getElementById('swap-note');
  if (cards.length < 2) return;
  var short = {'2026-11-23':'Mon 23','2026-11-24':'Tue 24','2026-11-25':'Wed 25','2026-11-26':'Thu 26','2026-11-27':'Fri 27','bonus':'Bonus day'};
  function dateSpan(c){ return c.querySelector('.day-date'); }
  function swap(a, b){
    if (a === b) return;
    var da = dateSpan(a).textContent, db = dateSpan(b).textContent;
    var pa = a.getAttribute('data-plan'), pb = b.getAttribute('data-plan');
    var ha = a.innerHTML, hb = b.innerHTML;
    a.innerHTML = hb; b.innerHTML = ha;
    dateSpan(a).textContent = da; dateSpan(b).textContent = db;
    a.setAttribute('data-plan', pb); b.setAttribute('data-plan', pa);
    [a, b].forEach(function(c){ [].slice.call(c.querySelectorAll('select.swap')).forEach(function(x){ x.parentNode.removeChild(x); }); });
    wire(a); wire(b);
  }
  function byPlan(p){ for (var i=0;i<cards.length;i++){ if (cards[i].getAttribute('data-plan') === p) return cards[i]; } return null; }
  function current(){ var o = {}; cards.forEach(function(c){ o[c.getAttribute('data-date')] = c.getAttribute('data-plan'); }); return o; }
  var original = current();
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(current())); } catch(e){} refresh(); }
  function refresh(){
    var o = current(), changed = 0;
    for (var d in o) if (o[d] !== original[d]) changed++;
    reset.hidden = !changed;
    note.textContent = changed ? 'Plan rearranged on this phone. Dates and forecast stay put; the day plans moved.' : 'Each day card has a swap menu. Swaps are remembered on this phone.';
  }
  function wire(c){
    var head = c.querySelector('.day-head');
    var sel = document.createElement('select');
    sel.className = 'swap'; sel.setAttribute('aria-label', 'Swap this day with another');
    var o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'Swap with\u2026'; sel.appendChild(o0);
    cards.forEach(function(other){
      if (other === c) return;
      var o = document.createElement('option'); o.value = other.getAttribute('data-date'); o.textContent = short[o.value] || o.value; sel.appendChild(o);
    });
    sel.addEventListener('change', function(){
      var target = null; cards.forEach(function(x){ if (x.getAttribute('data-date') === sel.value) target = x; });
      sel.value = '';
      if (target) { swap(c, target); save(); }
    });
    head.appendChild(sel);
  }
  cards.forEach(wire);
  var saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch(e){}
  if (saved) {
    cards.forEach(function(c){
      var want = saved[c.getAttribute('data-date')];
      if (want && want !== c.getAttribute('data-plan')) { var holder = byPlan(want); if (holder) swap(c, holder); }
    });
  }
  reset.addEventListener('click', function(){
    cards.forEach(function(c){
      var want = original[c.getAttribute('data-date')];
      if (want !== c.getAttribute('data-plan')) { var holder = byPlan(want); if (holder) swap(c, holder); }
    });
    try { localStorage.removeItem(KEY); } catch(e){}
    refresh();
  });
  refresh();
})();

/* Bears. Seven hidden in the copy, a trail of paws down the margin on big screens,
   a walker if you type the word, a peeker if you poke the logo. */
(function(){
  var FACTS = {
    1: 'Cades Cove has about two bears per square mile, the densest population in the park. Deer are the decoys.',
    2: 'Smokies black bears are not always black. Cinnamon and even blond ones turn up, but here almost all are black.',
    3: 'Around 1,900 black bears live in the park. Most of what you see in the Cove is the same few families.',
    4: 'A bear can smell a granola bar through a closed car. Nothing edible sleeps on the deck. Not even the lovey.',
    5: 'Bears can run 30 mph uphill. Nobody outruns one, so nobody tries. Fifty yards, back away, talk calmly.',
    6: 'Cubs born in January weigh about half a pound, less than Snejana\'s hat. By Thanksgiving they\'re 40 pounds and still with mom.',
    7: 'A fed bear is a dead bear. The park euthanizes bears that learn to get food from people. Pack it in, pack it out.'
  };
  var KEY = 'gatlinburg-2026-bears';
  var found = {}; try { found = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e){}
  var toast = document.getElementById('bear-toast'), count = document.getElementById('bear-count'), peek = document.getElementById('bear-peek');
  var eggs = [].slice.call(document.querySelectorAll('.egg'));
  var tmr;
  function say(html, ms){ toast.innerHTML = html; toast.classList.add('show'); clearTimeout(tmr); tmr = setTimeout(function(){ toast.classList.remove('show'); }, ms || 6000); }
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(found)); } catch(e){} }
  function tally(){
    var n = 0; for (var k in found) if (k !== 'done') n++;
    eggs.forEach(function(e){ if (found[e.getAttribute('data-egg')]) e.classList.add('found'); });
    if (n && count) { count.textContent = 'Bears found ' + n + ' of 7'; count.classList.add('show'); }
    if (n === 7 && !found.done) { found.done = 1; save(); setTimeout(function(){ say('<b>All seven.</b> You found every bear on this page. The real ones are in Cades Cove at 8am Wednesday. Tell Cash.', 9000); walk(); }, 1200); }
  }
  eggs.forEach(function(e){
    e.setAttribute('title', 'There is a bear here');
    e.addEventListener('click', function(ev){
      ev.preventDefault();
      var id = e.getAttribute('data-egg');
      var first = !found[id];
      found[id] = 1; save();
      say('<b>' + (first ? 'Bear spotted.' : 'Same bear.') + '</b> ' + FACTS[id]);
      tally();
    });
  });
  tally();

  function walk(){
    if (document.querySelector('.bear-walk')) return;
    var d = document.createElement('div'); d.className = 'bear-walk';
    d.innerHTML = '<svg><use href="#bear-side"></use></svg>';
    document.body.appendChild(d);
    setTimeout(function(){ if (d.parentNode) d.parentNode.removeChild(d); }, 9500);
  }
  var typed = '';
  document.addEventListener('keydown', function(e){
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
    typed = (typed + (e.key || '')).slice(-4).toLowerCase();
    if (typed === 'bear') { typed = ''; walk(); say('<b>Bear.</b> You typed it, you got it.'); }
  });

  var pokes = 0, pokeTmr;
  var logo = document.querySelector('header .logo');
  if (logo) logo.addEventListener('click', function(e){
    pokes++; clearTimeout(pokeTmr); pokeTmr = setTimeout(function(){ pokes = 0; }, 1500);
    e.preventDefault();
    if (pokes >= 3) { pokes = 0; peek.classList.add('up'); say('<b>Hey.</b> Three pokes and the bear looks over the deck rail. Hot tub cover on?'); setTimeout(function(){ peek.classList.remove('up'); }, 4000); }
    else if (pokes === 1) { setTimeout(function(){ if (pokes === 1) { pokes = 0; location.href = '/'; } }, 400); }
  });

  var trail = document.getElementById('paw-trail');
  if (trail && window.innerWidth >= 1240 && !document.body.classList.contains('day-page')) {
    var H = Math.max(document.body.scrollHeight, 2000), n = Math.floor(H / 160);
    for (var i = 0; i < n; i++) { var pw = document.createElement('i'); pw.style.top = (i * 160 + 120) + 'px'; trail.appendChild(pw); }
    var paws = [].slice.call(trail.children);
    trail.style.height = H + 'px';
    function reveal(){ var y = window.scrollY + window.innerHeight * 0.8; paws.forEach(function(pp){ if (parseInt(pp.style.top, 10) < y) pp.classList.add('on'); }); }
    window.addEventListener('scroll', reveal, {passive:true}); reveal();
  }

  var realTitle = document.title;
  document.addEventListener('visibilitychange', function(){ document.title = document.hidden ? '\uD83D\uDC3B ' + realTitle : realTitle; });
  if (window.console && console.log) console.log('%c\uD83D\uDC3B  You found the bear in the console. Type the word bear on the page for another one.', 'font-size:14px');
})();

/* Weather: Open-Meteo, no key. Town = cabin, Ridge = Kuwohi. Fails quietly offline. */
(function(){
  var box = document.getElementById('wx'), grid = document.getElementById('wx-grid'), note = document.getElementById('wx-note');
  if (!box || !window.fetch) return;
  var base = 'https://api.open-meteo.com/v1/forecast?temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America%2FNew_York&forecast_days=10';
  var town = base + '&latitude=35.714&longitude=-83.510&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum';
  var ridge = base + '&latitude=35.5628&longitude=-83.4985&elevation=2025&daily=temperature_2m_max,temperature_2m_min,snowfall_sum';
  var START = '2026-11-22', END = '2026-11-28';
  var dn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var today;
  try { today = new Intl.DateTimeFormat('en-CA', {timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date()); } catch(e){ today = ''; }
  function j(u){ return fetch(u).then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); }); }
  Promise.all([j(town), j(ridge)]).then(function(res){
    var t = res[0].daily, r = res[1].daily, html = '', shown = 0;
    for (var i = 0; i < t.time.length; i++) {
      var d = t.time[i];
      if (d < START || d > END) continue;
      var ri = r.time.indexOf(d);
      var dow = dn[new Date(d + 'T12:00:00').getDay()];
      var snowT = t.snowfall_sum[i] || 0, snowR = ri >= 0 ? (r.snowfall_sum[ri] || 0) : 0;
      html += '<div class="wx-day' + (d === today ? ' today' : '') + '">'
        + '<b>' + dow + ' ' + parseInt(d.slice(8),10) + '</b>'
        + '<div class="t">' + Math.round(t.temperature_2m_max[i]) + '&deg; / ' + Math.round(t.temperature_2m_min[i]) + '&deg;</div>'
        + '<div class="r">rain ' + (t.precipitation_probability_max[i] == null ? '?' : t.precipitation_probability_max[i] + '%') + '</div>'
        + (ri >= 0 ? '<div class="r">ridge ' + Math.round(r.temperature_2m_max[ri]) + '&deg; / ' + Math.round(r.temperature_2m_min[ri]) + '&deg;</div>' : '')
        + ((snowT > 0 || snowR > 0) ? '<div class="r snow">snow' + (snowR > 0 ? ' on ridge' : '') + '</div>' : '')
        + '</div>';
      shown++;
    }
    if (!shown) { note.textContent = 'Forecast reaches ten days out. Trip days appear here from Nov 13.'; }
    grid.innerHTML = html;
    box.hidden = false;
  }).catch(function(){
    note.textContent = 'Forecast unavailable right now. Weather.gov for Gatlinburg is the backup.';
    grid.innerHTML = '';
    box.hidden = false;
  });
})();

/* Trip countdown on the hub. */
(function(){
  var el = document.getElementById('countdown'); if (!el) return;
  var today; try { today = new Intl.DateTimeFormat('en-CA', {timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date()); } catch(e){ return; }
  var start = new Date('2026-11-22T12:00:00'), end = new Date('2026-11-28T12:00:00'), now = new Date(today + 'T12:00:00');
  var days = Math.round((start - now) / 86400000);
  if (days > 0) el.textContent = days === 1 ? 'Tomorrow. Car loads tonight.' : days + ' days until the car loads.';
  else if (now <= end) el.textContent = 'Day ' + (Math.round((now - start) / 86400000) + 1) + ' of 7.';
  else return;
  el.hidden = false;
})();

/* Rating pills: tap for what reviewers keep saying. */
(function(){
  var toast = document.getElementById('bear-toast'); if (!toast) return;
  var tmr;
  document.addEventListener('click', function(e){
    var r = e.target.closest && e.target.closest('.rate'); if (!r) return;
    e.preventDefault();
    var sm = r.querySelector('small'); var n = sm ? sm.textContent : ''; var stars = r.childNodes[0] ? r.childNodes[0].textContent.trim() : r.textContent;
    toast.innerHTML = '<b>' + stars + ' on Google' + (n ? ', ' + n + ' reviews' : '') + '.</b> ' + (r.getAttribute('data-say') || '');
    toast.classList.add('show'); clearTimeout(tmr); tmr = setTimeout(function(){ toast.classList.remove('show'); }, 7000);
  });
})();

/* Themes: spruce (default), light, nps, gatlinburg. Remembered per phone. */
(function(){
  var KEY = 'gatlinburg-2026-theme';
  var THEMES = [['spruce','Smoky night','#0b1411'],['light','Daylight','#f4efe4'],['nps','National Park brochure','#3a5a40'],['gatlinburg','Gatlinburg after dark','#ff4d6d']];
  var cur = 'spruce'; try { cur = localStorage.getItem(KEY) || 'spruce'; } catch(e){}
  function apply(t){ cur = t; document.body.removeAttribute('data-theme'); if (t === 'spruce') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', t === 'light' ? '#f4efe4' : t === 'nps' ? '#1a1a1a' : t === 'gatlinburg' ? '#17100c' : '#0b1411');
    try { localStorage.setItem(KEY, t); } catch(e){}
    [].slice.call(document.querySelectorAll('.theme-menu button[data-t]')).forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-t') === t); });
  }
  apply(cur);
  var nav = document.querySelector('header .nav'); if (!nav) return;
  var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'theme-btn'; btn.title = 'Theme'; btn.setAttribute('aria-label', 'Change theme'); btn.innerHTML = '&#9680;';
  var inner = nav.querySelector('nav'); if (inner) nav.insertBefore(btn, inner); else nav.appendChild(btn);
  var menu = document.createElement('div'); menu.className = 'theme-menu'; menu.hidden = true;
  menu.innerHTML = THEMES.map(function(t){ return '<button type="button" data-t="' + t[0] + '"><span class="sw" style="background:' + t[2] + '"></span>' + t[1] + '</button>'; }).join('') + '<hr><button type="button" id="theme-install">Add to home screen&hellip;</button>';
  document.body.appendChild(menu);
  btn.addEventListener('click', function(e){ e.stopPropagation(); menu.hidden = !menu.hidden; apply(cur); });
  document.addEventListener('click', function(e){ if (!menu.contains(e.target)) menu.hidden = true; });
  menu.addEventListener('click', function(e){ var b = e.target.closest('button[data-t]'); if (b) { apply(b.getAttribute('data-t')); menu.hidden = true; } });
  document.getElementById('theme-install').addEventListener('click', function(){ menu.hidden = true; if (window.__showInstall) window.__showInstall(true); });
})();

/* Install as an app: Chrome/Android get the real prompt, iPhone gets the two-step instruction. */
(function(){
  var KEY = 'gatlinburg-2026-install-dismissed';
  var deferred = null;
  var standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  var bar = document.createElement('div'); bar.className = 'install-bar'; bar.hidden = true;
  bar.innerHTML = '<img src="icon-192.png" alt="" onerror="this.style.display=\'none\'"><div><b>Put this on your home screen</b><span id="install-how">Opens full screen like an app, works from the lock screen.</span></div><div class="act"><button type="button" id="install-later">Later</button><button type="button" class="go" id="install-go">Install</button></div>';
  document.body.appendChild(bar);
  var how = document.getElementById('install-how'), go = document.getElementById('install-go');
  function show(force){
    if (standalone) { if (force) { how.textContent = 'Already installed. You are running it as an app.'; go.hidden = true; bar.hidden = false; } return; }
    var dismissed = false; try { dismissed = !!localStorage.getItem(KEY); } catch(e){}
    if (dismissed && !force) return;
    if (deferred) { how.textContent = 'Opens full screen like an app, with its own icon.'; go.hidden = false; go.textContent = 'Install'; }
    else if (ios) { how.innerHTML = 'In Safari: tap <b>Share</b> (the box with the arrow), then <b>Add to Home Screen</b>.'; go.hidden = true; }
    else { how.innerHTML = 'In your browser menu choose <b>Add to Home screen</b> or <b>Install app</b>.'; go.hidden = true; }
    bar.hidden = false;
  }
  window.__showInstall = show;
  window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); deferred = e; if (!document.body.classList.contains('locked')) setTimeout(function(){ show(false); }, 4000); });
  document.addEventListener('gatlinburg:unlock', function(){ setTimeout(function(){ show(false); }, 6000); });
  go.addEventListener('click', function(){ if (!deferred) return; deferred.prompt(); deferred.userChoice.then(function(){ deferred = null; bar.hidden = true; }); });
  document.getElementById('install-later').addEventListener('click', function(){ bar.hidden = true; try { localStorage.setItem(KEY, '1'); } catch(e){} });
})();

/* Floating navigation: back to top, and on day pages previous/next day plus swipe between days. */
(function(){
  var nav = document.createElement('div'); nav.className = 'float-nav';
  var prev = document.querySelector('header nav a[href^="day-"][href$=".html"]:not(.chip)');
  var links = [].slice.call(document.querySelectorAll('header nav ul a'));
  var prevA = null, nextA = null;
  links.forEach(function(a){ var t = a.textContent; if (/^←|^←/.test(t.trim())) prevA = a; if (/→$|→$/.test(t.trim())) nextA = a; });
  var html = '';
  if (prevA) html += '<a href="' + prevA.getAttribute('href') + '" title="Previous day" aria-label="Previous day">&larr;</a>';
  if (nextA) html += '<a href="' + nextA.getAttribute('href') + '" title="Next day" aria-label="Next day">&rarr;</a>';
  html += '<button type="button" class="top" title="Back to top" aria-label="Back to top">&uarr;</button>';
  nav.innerHTML = html; document.body.appendChild(nav);
  nav.querySelector('.top').addEventListener('click', function(){ window.scrollTo({top:0, behavior:'smooth'}); });
  function onScroll(){ nav.classList.toggle('scrolled', window.scrollY > 600); }
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();
  // swipe between days
  if (prevA || nextA) {
    var x0 = null, y0 = null, t0 = 0;
    document.addEventListener('touchstart', function(e){ if (e.target.closest('.map, .wx-grid, .chips, .nav ul, select, textarea')) { x0 = null; return; } var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); }, {passive:true});
    document.addEventListener('touchend', function(e){ if (x0 === null) return; var t = e.changedTouches[0]; var dx = t.clientX - x0, dy = t.clientY - y0;
      if (Date.now() - t0 < 600 && Math.abs(dx) > 90 && Math.abs(dy) < 60) { if (dx < 0 && nextA) location.href = nextA.getAttribute('href'); if (dx > 0 && prevA) location.href = prevA.getAttribute('href'); } x0 = null; }, {passive:true});
    document.addEventListener('keydown', function(e){ if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return; if (e.key === 'ArrowRight' && nextA) location.href = nextA.getAttribute('href'); if (e.key === 'ArrowLeft' && prevA) location.href = prevA.getAttribute('href'); });
  }
})();

/* Hub: live count from the shared packing list. */
(function(){
  var done = document.getElementById('pack-done'), total = document.getElementById('pack-total');
  if (!done || !window.fetch) return;
  fetch('https://mikeside-publish-production.up.railway.app/state/packing', {cache:'no-store'}).then(function(r){ return r.json(); }).then(function(d){
    var n = 0, items = 0; Object.keys(d.data || {}).forEach(function(k){ var it = d.data[k]; if (!it || it.gone) return; if (k.indexOf('x-') === 0) items++; if (it.c) n++; });
    done.textContent = n; total.textContent = 66 + items;
  }).catch(function(){ done.textContent = '?'; });
})();
