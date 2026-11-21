/* gatlinburg/day.js — day-page only: forecast for this date, the right-now strip,
   Plan A/B toggle, Leaflet map with live road routing, drive-time badges,
   nap clock, journal, copy-as-text. Everything degrades quietly offline. */
(function(){
  var DATE = document.body.getAttribute('data-date') || '';
  var PAGE = document.body.getAttribute('data-page') || DATE;
  if (!PAGE) return;
  var TZ = 'America/New_York';
  function fmtET(d, opts){ try { return new Intl.DateTimeFormat('en-US', Object.assign({timeZone: TZ}, opts)).format(d); } catch(e){ return ''; } }
  function todayET(){ try { return new Intl.DateTimeFormat('en-CA', {timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date()); } catch(e){ return new Date().toISOString().slice(0,10); } }

  /* ---- forecast for this date ---- */
  (function(){
    var el = document.getElementById('day-wx'), ridgeEl = document.getElementById('day-wx-ridge');
    if (!el || !window.fetch) return;
    if (!DATE) { el.textContent = 'Pick a day to see its forecast'; var nt = document.getElementById('now-temp'); return; }
    var base = 'https://api.open-meteo.com/v1/forecast?temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America%2FNew_York&forecast_days=10';
    var town = base + '&latitude=35.714&longitude=-83.510&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum&current=temperature_2m,weather_code,wind_speed_10m';
    var ridge = base + '&latitude=35.5628&longitude=-83.4985&elevation=2025&daily=temperature_2m_max,temperature_2m_min,snowfall_sum';
    function j(u){ return fetch(u).then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); }); }
    var CODES = {0:'clear',1:'mostly clear',2:'partly cloudy',3:'overcast',45:'fog',48:'fog',51:'drizzle',53:'drizzle',55:'drizzle',61:'light rain',63:'rain',65:'heavy rain',66:'freezing rain',67:'freezing rain',71:'light snow',73:'snow',75:'heavy snow',77:'snow grains',80:'showers',81:'showers',82:'heavy showers',85:'snow showers',86:'snow showers',95:'thunderstorm',96:'thunderstorm',99:'thunderstorm'};
    Promise.all([j(town), j(ridge)]).then(function(res){
      var t = res[0].daily, r = res[1].daily, i = t.time.indexOf(DATE), ri = r.time.indexOf(DATE);
      if (i < 0) { el.textContent = 'Forecast reaches ten days out'; return; }
      var snow = (t.snowfall_sum[i] || 0) > 0 || (ri >= 0 && (r.snowfall_sum[ri] || 0) > 0);
      el.innerHTML = Math.round(t.temperature_2m_max[i]) + '&deg; / ' + Math.round(t.temperature_2m_min[i]) + '&deg; &middot; rain ' + (t.precipitation_probability_max[i] == null ? '?' : t.precipitation_probability_max[i] + '%') + (snow ? ' &middot; <span class="snow">snow</span>' : '');
      if (ri >= 0) { ridgeEl = document.createElement('small'); ridgeEl.innerHTML = 'Ridge ' + Math.round(r.temperature_2m_max[ri]) + '&deg; / ' + Math.round(r.temperature_2m_min[ri]) + '&deg; at Kuwohi'; el.appendChild(ridgeEl); }
      var cur = res[0].current, nowEl = document.getElementById('now-temp');
      if (cur && nowEl) { nowEl.innerHTML = Math.round(cur.temperature_2m) + '&deg; ' + (CODES[cur.weather_code] || '') + '<small id="now-clock"></small>'; }
      tick();
    }).catch(function(){ el.textContent = 'Forecast unavailable'; });
  })();

  /* ---- clock and dark-in ---- */
  var SUN = {'2026-11-22':[7*60+27,17*60+26],'2026-11-23':[7*60+28,17*60+25],'2026-11-24':[7*60+29,17*60+25],'2026-11-25':[7*60+30,17*60+25],'2026-11-26':[7*60+31,17*60+24],'2026-11-27':[7*60+32,17*60+24],'2026-11-28':[7*60+33,17*60+24]};
  function tick(){
    var clock = document.getElementById('now-clock'), dark = document.getElementById('dark-in'), dl = document.getElementById('daylight');
    var now = new Date();
    if (clock) clock.textContent = fmtET(now, {hour:'numeric', minute:'2-digit'}) + ' Eastern';
    var s = SUN[DATE];
    if (s && dl) {
      function hm(m){ var h = Math.floor(m/60), mm = m%60; return (h > 12 ? h-12 : h) + ':' + (mm < 10 ? '0' : '') + mm + (h >= 12 ? 'p' : 'a'); }
      dl.firstChild.textContent = hm(s[0]) + ' → ' + hm(s[1]);
      if (dark) {
        if (todayET() === DATE) {
          var parts = fmtET(now, {hour:'numeric', minute:'2-digit', hour12:false}).split(':'), mins = parseInt(parts[0],10)*60 + parseInt(parts[1],10);
          var left = s[1] - mins;
          dark.textContent = left > 0 ? 'Dark in ' + Math.floor(left/60) + 'h ' + (left%60) + 'm. Lights come on about 5:30.' : (mins < s[0] ? 'Sun is up in ' + (s[0]-mins) + ' min' : 'Dark. Lights are on.');
        } else dark.textContent = 'Dark by 6. Lights on about 5:30.';
      }
    }
  }
  tick(); setInterval(tick, 30000);

  /* ---- nap clock ---- */
  (function(){
    var btn = document.getElementById('nap-btn'), txt = document.getElementById('nap-text');
    if (!btn) return;
    var KEY = 'gatlinburg-2026-nap';
    function get(){ try { return parseInt(localStorage.getItem(KEY) || '0', 10); } catch(e){ return 0; } }
    function render(){
      var start = get();
      if (!start) { txt.textContent = 'Not started'; btn.textContent = 'Start nap'; return; }
      var m = Math.floor((Date.now() - start) / 60000);
      var wake = new Date(start + 2*60*60000);
      txt.textContent = (m < 60 ? m + ' min' : Math.floor(m/60) + 'h ' + (m%60) + 'm') + ' down · wake by ' + fmtET(wake, {hour:'numeric', minute:'2-digit'});
      btn.textContent = 'End nap';
    }
    btn.addEventListener('click', function(){
      if (get()) { try { localStorage.removeItem(KEY); } catch(e){} }
      else { try { localStorage.setItem(KEY, String(Date.now())); } catch(e){} }
      render();
    });
    render(); setInterval(render, 30000);
  })();

  /* ---- Plan A / B ---- */
  var plan = 'a';
  (function(){
    var KEY = 'gatlinburg-2026-plan-' + PAGE;
    var btns = [].slice.call(document.querySelectorAll('.plan-toggle .pt')), a = document.getElementById('plan-a'), b = document.getElementById('plan-b'), title = document.getElementById('plan-title');
    if (!btns.length) return;
    function show(p){
      plan = p; a.hidden = p !== 'a'; b.hidden = p !== 'b';
      btns.forEach(function(x){ x.classList.toggle('on', x.getAttribute('data-plan') === p); });
      title.textContent = p === 'a' ? 'Plan A' : 'Plan B';
      try { localStorage.setItem(KEY, p); } catch(e){}
      if (window.__drawRoute) window.__drawRoute(p);
    }
    btns.forEach(function(x){ x.addEventListener('click', function(){ show(x.getAttribute('data-plan')); }); });
    var saved = null; try { saved = localStorage.getItem(KEY); } catch(e){}
    if (saved === 'b') show('b');
  })();

  /* ---- copy as text ---- */
  (function(){
    var btn = document.getElementById('copy-plan'); if (!btn) return;
    btn.addEventListener('click', function(){
      var list = document.getElementById(plan === 'a' ? 'slots-a' : 'slots-b');
      var lines = [document.querySelector('.banner h1').textContent + ' — ' + document.querySelector('.banner-date').textContent.trim() + ' (' + (plan === 'a' ? 'Plan A' : 'Plan B') + ')', ''];
      [].slice.call(list.querySelectorAll('.slot')).forEach(function(s){
        var what = s.querySelector('.what').textContent.replace(/\s*Directions\s*$/, '').trim();
        var why = s.querySelector('.why'); var nav = s.querySelector('a.nav');
        lines.push(s.querySelector('time').textContent + '  ' + what + (why ? ' — ' + why.textContent.trim() : '') + (nav ? '\n      ' + nav.href : ''));
      });
      var text = lines.join('\n');
      function done(){ btn.textContent = 'Copied'; setTimeout(function(){ btn.textContent = 'Copy as text'; }, 1500); }
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done).catch(function(){ window.prompt('Copy this', text); });
      else window.prompt('Copy this', text);
    });
  })();

  /* ---- journal ---- */
  (function(){
    var ta = document.getElementById('journal-text'), saved = document.getElementById('journal-saved'), copy = document.getElementById('journal-copy');
    if (!ta) return;
    var KEY = 'gatlinburg-2026-journal-' + PAGE;
    try { ta.value = localStorage.getItem(KEY) || ''; } catch(e){}
    var t;
    ta.addEventListener('input', function(){ clearTimeout(t); t = setTimeout(function(){ try { localStorage.setItem(KEY, ta.value); saved.textContent = 'Saved on this phone'; } catch(e){ saved.textContent = 'Could not save'; } }, 400); });
    if (ta.value) saved.textContent = 'Saved on this phone';
    copy.addEventListener('click', function(){ if (navigator.clipboard) navigator.clipboard.writeText(ta.value); copy.textContent = 'Copied'; setTimeout(function(){ copy.textContent = 'Copy'; }, 1500); });
  })();

  /* ---- map ---- */
  (function(){
    var el = document.getElementById('leaflet'); if (!el || !window.L) return;
    var routeA = [], routeB = [];
    try { routeA = JSON.parse(el.getAttribute('data-route') || '[]'); routeB = JSON.parse(el.getAttribute('data-route-b') || '[]'); } catch(e){}
    var mobile = window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
    var map = L.map(el, {scrollWheelZoom:false, zoomControl:true, dragging: !mobile, tap: !mobile});
    if (mobile) {
      var hint = document.createElement('button'); hint.type = 'button'; hint.className = 'map-hint'; hint.textContent = 'Tap to move the map';
      el.appendChild(hint);
      hint.addEventListener('click', function(){ map.dragging.enable(); if (map.tap) map.tap.enable(); hint.remove(); });
    }
    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {attribution:'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM &middot; style &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)', maxZoom:17, subdomains:'abc'}).addTo(map);
    var icon = L.divIcon({className:'pin', html:'<span></span>', iconSize:[18,18], iconAnchor:[9,9], popupAnchor:[0,-10]});
    var cabin = L.divIcon({className:'pin cabin', html:'<span></span>', iconSize:[18,18], iconAnchor:[9,9]});
    var layers = {a: L.layerGroup().addTo(map), b: L.layerGroup()};
    var bounds = [];
    function addStops(listId, group){
      [].slice.call(document.querySelectorAll('#' + listId + ' .slot[data-lat]')).forEach(function(s){
        var lat = +s.getAttribute('data-lat'), lng = +s.getAttribute('data-lng'), name = s.getAttribute('data-stop');
        var nav = s.querySelector('a.nav');
        var m = L.marker([lat, lng], {icon: icon}).addTo(group);
        m.bindPopup('<b>' + s.querySelector('time').textContent + '</b> ' + name + (nav ? '<br><a href="' + nav.href + '" target="_blank" rel="noopener">Directions</a>' : ''));
        bounds.push([lat, lng]);
      });
    }
    addStops('slots-a', layers.a);
    var trailMarkers = {};
    [].slice.call(document.querySelectorAll('.trail[data-lat]')).forEach(function(t, i){
      var lat = +t.getAttribute('data-lat'), lng = +t.getAttribute('data-lng'), nav = t.querySelector('a.nav');
      if (!t.id) t.id = 'spot-' + (i + 1);
      var num = L.divIcon({className:'pin num', html:'<span>' + (i + 1) + '</span>', iconSize:[26,26], iconAnchor:[13,13], popupAnchor:[0,-14]});
      var m = L.marker([lat, lng], {icon: num}).addTo(layers.a);
      m.bindPopup('<b>' + (i + 1) + '. ' + t.getAttribute('data-name') + '</b><br><a href="#' + t.id + '" class="popup-jump">Read about this spot &darr;</a>' + (nav ? ' &middot; <a href="' + nav.href + '" target="_blank" rel="noopener">Directions</a>' : ''));
      trailMarkers[t.id] = m;
      bounds.push([lat, lng]);
      // number badge on the card, and a "show on map" link that opens this pin
      var h = t.querySelector('h3');
      if (h && !h.querySelector('.spot-num')) {
        var b = document.createElement('span'); b.className = 'spot-num'; b.textContent = i + 1; h.insertBefore(b, h.firstChild);
        var show = document.createElement('a'); show.className = 'nav show-map'; show.href = '#map'; show.textContent = 'On the map';
        show.addEventListener('click', function(e){ e.preventDefault(); document.getElementById('map').scrollIntoView({behavior:'smooth', block:'center'}); setTimeout(function(){ map.invalidateSize(); map.setView([lat, lng], Math.max(map.getZoom(), 13)); m.openPopup(); }, 450); });
        h.appendChild(show);
      }
    });
    map.on('popupopen', function(e){
      var a = e.popup.getElement() && e.popup.getElement().querySelector('.popup-jump');
      if (a) a.addEventListener('click', function(ev){ ev.preventDefault(); var el = document.querySelector(a.getAttribute('href')); if (el) { el.scrollIntoView({behavior:'smooth', block:'start'}); el.classList.add('flash'); setTimeout(function(){ el.classList.remove('flash'); }, 1600); } });
    });
    function fit(){ if (bounds.length) map.fitBounds(bounds, {padding:[30,30], maxZoom:13}); else map.setView([35.7, -83.52], 11); }
    fit();
    var cache = {};
    function osrm(pts, cb){
      if (pts.length < 2) return cb(null);
      var key = JSON.stringify(pts); if (cache[key]) return cb(cache[key]);
      var coords = pts.map(function(p){ return p[1] + ',' + p[0]; }).join(';');
      fetch('https://router.project-osrm.org/route/v1/driving/' + coords + '?overview=full&geometries=geojson&steps=false')
        .then(function(r){ return r.json(); })
        .then(function(d){ var r = d.routes && d.routes[0]; cache[key] = r || null; cb(r || null); })
        .catch(function(){ cb(null); });
    }
    var drawn = {};
    window.__drawRoute = function(p){
      var pts = p === 'a' ? routeA : routeB;
      if (p === 'b' && !map.hasLayer(layers.b)) {
        layers.b.addTo(map);
        routeB.forEach(function(q){ L.marker([q[0], q[1]], {icon: icon}).addTo(layers.b); });
      }
      if (p === 'a') { map.removeLayer(layers.b); layers.a.addTo(map); } else { map.removeLayer(layers.a); }
      if (drawn[p]) { drawn[p].addTo(map); if (drawn[p === 'a' ? 'b' : 'a']) map.removeLayer(drawn[p === 'a' ? 'b' : 'a']); return; }
      osrm(pts, function(r){
        if (drawn[p === 'a' ? 'b' : 'a']) map.removeLayer(drawn[p === 'a' ? 'b' : 'a']);
        if (!r) { if (pts.length > 1) drawn[p] = L.polyline(pts.map(function(q){ return [q[0], q[1]]; }), {color: p === 'a' ? '#1f6b45' : '#c4552f', weight: 3, dashArray: '6 8', opacity: .9}).addTo(map); return; }
        var line = r.geometry.coordinates.map(function(c){ return [c[1], c[0]]; });
        drawn[p] = L.polyline(line, {color: p === 'a' ? '#1f6b45' : '#c4552f', weight: 5, opacity: .9, dashArray: p === 'b' ? '8 8' : null}).addTo(map);
        map.fitBounds(drawn[p].getBounds(), {padding:[24,24]});
        // drive-time badges between the routed stops
        if (p === 'a' && r.legs) {
          r.legs.forEach(function(leg, i){
            var name = routeA[i+1] && routeA[i+1][2]; if (!name) return;
            var to = null; [].slice.call(document.querySelectorAll('#slots-a .slot[data-stop]')).forEach(function(x){ if (x.getAttribute('data-stop') === name) to = x; });
            if (!to || to.previousElementSibling && to.previousElementSibling.className === 'leg') return;
            var mins = Math.round(leg.duration / 60), mi = Math.round(leg.distance / 1609);
            var b = document.createElement('div'); b.className = 'leg'; b.textContent = mi + ' mi · about ' + (mins >= 60 ? Math.floor(mins/60) + 'h ' + (mins%60) + 'm' : mins + ' min') + ' driving, no stops';
            to.parentNode.insertBefore(b, to);
          });
        }
      });
    };
    window.__drawRoute(plan);
    function refresh(){ setTimeout(function(){ map.invalidateSize(); var d = drawn[plan]; if (d) map.fitBounds(d.getBounds(), {padding:[24,24]}); else fit(); }, 60); }
    document.addEventListener('gatlinburg:unlock', refresh);
    if (!document.body.classList.contains('locked')) refresh();
  })();
})();
