// countdown to Aug 4, 2026 (first flight day)
  (function(){
    var target = new Date("2026-08-04T06:23:00-05:00");
    var now = new Date();
    var days = Math.ceil((target - now) / 86400000);
    var num = document.getElementById("cd-num");
    var label = document.getElementById("cd-label");
    if (days > 1) { num.textContent = days; label.textContent = "days to wheels-up"; }
    else if (days === 1) { num.textContent = "1"; label.textContent = "day — pack tonight"; }
    else if (days >= -7 && days <= 0) { num.textContent = "☀"; label.textContent = "trip in progress — go eat lobster"; }
    else { num.textContent = "✓"; label.textContent = "trip complete — until next time"; }
  })();

  // accordion
  document.querySelectorAll(".card-head").forEach(function(btn){
    btn.addEventListener("click", function(){
      var day = btn.closest(".day");
      var open = day.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
    });
  });

  // chip click -> open that day
  document.querySelectorAll(".chip").forEach(function(chip){
    chip.addEventListener("click", function(){
      var day = document.querySelector(chip.getAttribute("href"));
      if (day && !day.classList.contains("open")){
        day.classList.add("open");
        day.querySelector(".card-head").setAttribute("aria-expanded","true");
      }
    });
  });

  // scrollspy for chips
  (function(){
    var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));
    var days = Array.prototype.slice.call(document.querySelectorAll(".day"));
    function spy(){
      var pos = window.scrollY + 120, current = days[0];
      days.forEach(function(d){ if (d.offsetTop <= pos) current = d; });
      chips.forEach(function(c){ c.classList.toggle("active", c.getAttribute("href") === "#" + current.id); });
    }
    window.addEventListener("scroll", spy, {passive:true});
    spy();
  })();

  // highlight + auto-open today's card during the trip
  (function(){
    var today = new Date();
    var iso = today.getFullYear() + "-" + String(today.getMonth()+1).padStart(2,"0") + "-" + String(today.getDate()).padStart(2,"0");
    document.querySelectorAll(".day").forEach(function(d){
      if (d.dataset.date === iso || d.dataset.date2 === iso){
        d.querySelector(".card").classList.add("today");
        d.classList.add("open");
        d.querySelector(".card-head").setAttribute("aria-expanded","true");
      }
    });
  })();

  // ---- persistent checklist ----
  (function(){
    var KEY = "maine-trip-checklist-v1";
    var boxes = Array.prototype.slice.call(document.querySelectorAll(".todo input"));
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e){ saved = {}; }

    function idFor(cb, i){ return cb.closest(".todo").querySelector("b").textContent.trim() || ("item-" + i); }
    function updateProgress(){
      var done = boxes.filter(function(cb){ return cb.checked; }).length;
      var pct = Math.round((done / boxes.length) * 100);
      var fill = document.getElementById("progress-fill");
      var label = document.getElementById("progress-label");
      if (fill) fill.style.width = pct + "%";
      if (label) label.textContent = done + " of " + boxes.length + " done" + (done === boxes.length ? " — packed and ready! 🦞" : "");
    }
    boxes.forEach(function(cb, i){
      var key = idFor(cb, i);
      if (saved[key]) { cb.checked = true; cb.closest(".todo").classList.add("done"); }
      cb.addEventListener("change", function(){
        cb.closest(".todo").classList.toggle("done", cb.checked);
        saved[key] = cb.checked;
        try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch(e){}
        updateProgress();
      });
    });
    updateProgress();
  })();

  // ---- live weather chip (Open-Meteo, no key needed) ----
  (function(){
    var codeMap = {0:["☀️","Clear"],1:["🌤️","Mostly clear"],2:["⛅","Partly cloudy"],3:["☁️","Overcast"],
      45:["🌫️","Foggy"],48:["🌫️","Foggy"],51:["🌦️","Light drizzle"],61:["🌧️","Light rain"],63:["🌧️","Rain"],
      65:["🌧️","Heavy rain"],71:["🌨️","Snow"],80:["🌦️","Showers"],95:["⛈️","Thunderstorms"]};
    fetch("https://api.open-meteo.com/v1/forecast?latitude=43.66&longitude=-70.26&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York")
      .then(function(r){ return r.json(); })
      .then(function(d){
        var t = Math.round(d.current.temperature_2m);
        var code = d.current.weather_code;
        var info = codeMap[code] || ["🌊","In Maine"];
        document.getElementById("wx-temp").textContent = t + "°F";
        document.getElementById("wx-label").textContent = info[1] + " in Portland, ME right now";
        document.querySelector("#weather-chip .wemoji").textContent = info[0];
      })
      .catch(function(){
        document.getElementById("wx-label").textContent = "weather check unavailable";
      });
  })();

  // ---- photo lightbox ----
  (function(){
    var lb = document.createElement("div");
    lb.id = "lightbox";
    lb.innerHTML = '<button class="lb-close" aria-label="Close">✕</button><img alt=""><div class="lb-cap"></div>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector("img");
    var lbCap = lb.querySelector(".lb-cap");

    function openLb(src, cap){
      lbImg.src = src;
      lbCap.textContent = cap || "";
      lb.classList.add("open");
    }
    function closeLb(){ lb.classList.remove("open"); lbImg.src = ""; }

    document.addEventListener("click", function(e){
      var t = e.target.closest(".lightboxable");
      if (t && t.tagName === "IMG" && t.src){
        openLb(t.src, t.getAttribute("data-cap") || t.alt);
      }
    });
    lb.querySelector(".lb-close").addEventListener("click", closeLb);
    lb.addEventListener("click", function(e){ if (e.target === lb) closeLb(); });
    document.addEventListener("keydown", function(e){ if (e.key === "Escape") closeLb(); });
  })();

  // ---- interactive route map (Leaflet, loaded from CDN) ----
  (function(){
    var script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = initMap;
    document.head.appendChild(script);

    function initMap(){
      var map = L.map("route-map", {scrollWheelZoom:false}).setView([44.0, -69.3], 7);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 18
      }).addTo(map);

      var days = [
        {n:"Tue 4", color:"#C9452D", stops:[
          [43.6460,-70.3064,"Portland Jetport — land & pick up Jeep"],
          [43.9106,-69.8206,"Hosts' house, Bath"],
          [44.0025,-69.6642,"Red's Eats, Wiscasset"],
          [43.8523,-69.6281,"Boothbay Harbor"],
          [43.9645,-69.6303,"Edgecomb cottage — tonight"]]},
        {n:"Wed 5", color:"#5E8F7E", stops:[
          [44.2097,-69.0643,"Camden Harbor"],
          [44.2311,-69.0483,"Mount Battie"],
          [44.1041,-69.0775,"Rockland Breakwater"],
          [43.9098,-69.2594,"Marshall Point Lighthouse"],
          [44.2118,-69.2712,"Union alpaca farm — tonight"]]},
        {n:"Thu 6", color:"#16293B", stops:[
          [44.3292,-68.1820,"Sand Beach, Acadia"],
          [44.3206,-68.1886,"Thunder Hole"],
          [44.3205,-68.2536,"Jordan Pond"],
          [44.3528,-68.2247,"Cadillac Mountain"],
          [44.3776,-68.2503,"Eagle Lake carriage roads (Thu Option B ride)"],
          [44.4287,-69.0068,"Young's Lobster Pound, Belfast"],
          [43.8570,-70.1030,"Harraseeket Inn, Freeport — tonight"]]},
        {n:"Fri 7", color:"#C9452D", stops:[
          [43.5637,-70.2000,"Breakfast, Cape Elizabeth"],
          [43.6544,-70.2456,"Casco Bay ferry terminal"],
          [43.6555,-70.1990,"Peaks Island lobster bake"],
          [43.6605,-70.2568,"Embassy Suites Portland — tonight"]]},
        {n:"Sat–Sun", color:"#E4D7B8", stops:[
          [43.6231,-70.2079,"Portland Head Light"],
          [43.5633,-70.2297,"Crescent Beach"],
          [43.5597,-70.2045,"Two Lights State Park"],
          [43.6442,-70.2276,"Willard Beach"],
          [43.6512,-70.2340,"Bug Light Park (Sun Option B ride start)"]]},
        {n:"Mon 10", color:"#5E8F7E", stops:[
          [43.6603,-70.2504,"Old Port — Duckfat, Eventide, Gelato Fiasco (Option A)"],
          [43.5734,-70.3656,"Scarborough Marsh — Eastern Trail (Option B)"],
          [43.3618,-70.4766,"Kennebunkport — Dock Square (Option B)"],
          [43.4467,-70.3898,"Timber Point low-tide crossing (Option B)"],
          [43.6462,-70.3050,"Hilton Garden Inn Airport — tonight"]]},
        {n:"Tue 11", color:"#16293B", stops:[
          [43.6460,-70.3064,"Fly home from PWM"]]}
      ];

      var legend = document.getElementById("map-legend");
      var allLatLngs = [];
      days.forEach(function(day){
        var pts = day.stops.map(function(s){ return [s[0], s[1]]; });
        allLatLngs = allLatLngs.concat(pts);
        L.polyline(pts, {color: day.color, weight: 3, opacity: 0.6, dashArray: "6 6"}).addTo(map);
        day.stops.forEach(function(s){
          L.circleMarker([s[0], s[1]], {radius:7, color:"#16293B", weight:1.5, fillColor: day.color, fillOpacity:0.95})
            .addTo(map)
            .bindPopup("<b>" + day.n + "</b><br>" + s[2]);
        });
        var chip = document.createElement("span");
        chip.innerHTML = '<i style="background:' + day.color + '"></i>' + day.n;
        legend.appendChild(chip);
      });
      if (allLatLngs.length) map.fitBounds(allLatLngs, {padding:[24,24]});
    }
  })();

  // ---- packing list persistence ----
  (function(){
    var KEY = "maine-trip-packing-v1";
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e){ saved = {}; }
    document.querySelectorAll(".pack-card").forEach(function(card){
      var person = card.dataset.person;
      var boxes = Array.prototype.slice.call(card.querySelectorAll(".pk input"));
      var counter = card.querySelector(".pack-count");
      function update(){
        var done = boxes.filter(function(b){ return b.checked; }).length;
        counter.textContent = done + "/" + boxes.length + (done === boxes.length ? " \u2713 packed" : " packed");
      }
      boxes.forEach(function(cb, i){
        var key = person + "::" + i;
        if (saved[key]) { cb.checked = true; cb.closest(".pk").classList.add("done"); }
        cb.addEventListener("change", function(){
          cb.closest(".pk").classList.toggle("done", cb.checked);
          saved[key] = cb.checked;
          try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch(e){}
          update();
        });
      });
      update();
    });
  })();

// ---- per-day forecast + packing suggestions ----
(function(){
  var WX = {
    0:["\u2600\ufe0f","Clear"],1:["\ud83c\udf24\ufe0f","Mostly clear"],2:["\u26c5","Partly cloudy"],3:["\u2601\ufe0f","Overcast"],
    45:["\ud83c\udf2b\ufe0f","Fog"],48:["\ud83c\udf2b\ufe0f","Freezing fog"],51:["\ud83c\udf26\ufe0f","Light drizzle"],
    53:["\ud83c\udf26\ufe0f","Drizzle"],55:["\ud83c\udf26\ufe0f","Heavy drizzle"],61:["\ud83c\udf27\ufe0f","Light rain"],
    63:["\ud83c\udf27\ufe0f","Rain"],65:["\ud83c\udf27\ufe0f","Heavy rain"],80:["\ud83c\udf26\ufe0f","Showers"],
    81:["\ud83c\udf26\ufe0f","Showers"],82:["\u26c8\ufe0f","Heavy showers"],95:["\u26c8\ufe0f","Thunderstorms"],
    96:["\u26c8\ufe0f","Thunderstorms"],99:["\u26c8\ufe0f","Severe storms"]
  };

  // one entry per day card: where you'll be, and what to wear/bring
  var DAYS = [
    {id:"d1", date:"2026-08-04", lat:43.96, lon:-69.63, hi:78, lo:58,
     pack:"Travel clothes plus one light layer \u2014 you land at noon and the cottage sits in the pines, which run cool after dark. Cash in a pocket for Red's Eats."},
    {id:"d2", date:"2026-08-05", lat:44.21, lon:-69.06, hi:77, lo:57,
     pack:"Trail shoes with real soles \u2014 Mt Battie in the morning, a mile of uneven granite at the Breakwater after lunch. Warm layer and bug spray for the dome tonight."},
    {id:"d3", date:"2026-08-06", lat:44.35, lon:-68.22, hi:75, lo:56,
     pack:"Daypack, water, layers. The Cadillac summit runs 10\u201315\u00b0 colder and windier than the coast road \u2014 bring the shell even if it's warm at Sand Beach. Park pass and QR saved offline."},
    {id:"d4", date:"2026-08-07", lat:43.66, lon:-70.20, hi:79, lo:59,
     pack:"Casual beach cocktail for the bake \u2014 linen or a sundress, sandals you can walk a dock in. Pack a real layer in a bag: the ferry back across open water after 8pm is genuinely cold."},
    {id:"d5", date:"2026-08-08", lat:43.57, lon:-70.20, hi:79, lo:59,
     pack:"Black tie optional, ceremony on grass \u2014 block heels or grippy soles, not stilettos. A wrap or jacket for the oceanside breeze that arrives right after sunset. Sunday: beach clothes, nothing more."},
    {id:"d6", date:"2026-08-10", lat:43.66, lon:-70.26, hi:79, lo:60,
     pack:"Comfortable shoes for the Old Port cobblestones, and something decent for the last dinner \u2014 book that ahead. Pack the suitcase tonight so tomorrow is just a shuttle ride."},
    {id:"d7", date:"2026-08-11", lat:43.65, lon:-70.31, hi:78, lo:59,
     pack:"Everything packed the night before. Layers for the plane \u2014 4:45am on a shuttle is the coldest you'll be all week."}
  ];

  function strip(d, fc){
    var el = document.createElement("div");
    el.className = "day-wx";
    var ico, desc, hi, lo, est = "", rain = "";
    if (fc){
      var info = WX[fc.code] || ["\ud83c\udf0a","\u2014"];
      ico = info[0]; desc = info[1];
      hi = Math.round(fc.hi); lo = Math.round(fc.lo);
      if (fc.pop >= 40) rain = '<span class="wx-rain">' + fc.pop + '% chance of rain \u2014 pack the shell.</span> ';
    } else {
      ico = "\ud83c\udf0a"; desc = "Typical early August";
      hi = d.hi; lo = d.lo;
      est = '<span class="wx-est">seasonal avg</span>';
    }
    el.innerHTML =
      '<span class="wx-ico">' + ico + '</span>' +
      '<span class="wx-temps">' + hi + '\u00b0 <small>/ ' + lo + '\u00b0</small></span>' +
      '<span class="wx-desc">' + desc + '</span>' + est +
      '<span class="wx-pack"><b>Wear \u00b7 bring</b>' + rain + d.pack + '</span>';
    return el;
  }

  function mount(d, fc){
    var sec = document.getElementById(d.id);
    if (!sec) return;
    var body = sec.querySelector(".card-body");
    if (!body) return;
    var intro = body.querySelector(".day-intro");
    var node = strip(d, fc);
    if (intro && intro.nextSibling) body.insertBefore(node, intro.nextSibling);
    else if (intro) body.appendChild(node);
    else body.insertBefore(node, body.firstChild);
  }

  // render seasonal averages immediately so something is always there
  DAYS.forEach(function(d){ mount(d, null); });

  var lats = DAYS.map(function(d){ return d.lat; }).join(",");
  var lons = DAYS.map(function(d){ return d.lon; }).join(",");
  var url = "https://api.open-meteo.com/v1/forecast?latitude=" + lats + "&longitude=" + lons +
            "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
            "&temperature_unit=fahrenheit&timezone=America%2FNew_York&start_date=2026-08-04&end_date=2026-08-11";

  fetch(url).then(function(r){ return r.json(); }).then(function(data){
    var arr = Array.isArray(data) ? data : [data];
    DAYS.forEach(function(d, i){
      var loc = arr[i];
      if (!loc || !loc.daily || !loc.daily.time) return;
      var idx = loc.daily.time.indexOf(d.date);
      if (idx === -1) return;                       // beyond forecast horizon
      var hi = loc.daily.temperature_2m_max[idx];
      if (hi === null || hi === undefined) return;
      var fc = {
        code: loc.daily.weather_code[idx],
        hi: hi,
        lo: loc.daily.temperature_2m_min[idx],
        pop: loc.daily.precipitation_probability_max[idx] || 0
      };
      var sec = document.getElementById(d.id);
      var old = sec && sec.querySelector(".day-wx");
      if (old) old.parentNode.replaceChild(strip(d, fc), old);
    });
  }).catch(function(){ /* seasonal averages already shown */ });
})();