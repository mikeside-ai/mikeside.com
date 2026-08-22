(function(){
  "use strict";

  // ---- fragment loader: fetch day/checklist/packing partials, then wire behaviour ----
  var DAY_FRAGMENTS = [
    "day-1-tue.html", "day-2-wed.html", "day-3-thu.html", "day-4-fri.html",
    "day-5-satsun.html", "day-6-mon.html", "day-7-tue.html"
  ];

  function loadFragment(url){
    return fetch(url, {cache: "no-cache"}).then(function(r){
      if (!r.ok) throw new Error("Failed to load " + url + " (" + r.status + ")");
      return r.text();
    });
  }

  function injectAll(){
    var route = document.getElementById("route");
    var todo  = document.getElementById("todo-section");
    var pack  = document.getElementById("pack-section");
    var jobs = [];
    // days must land in order; Promise.all preserves array order regardless of resolve order
    jobs.push(
      Promise.all(DAY_FRAGMENTS.map(loadFragment)).then(function(parts){
        if (route) route.innerHTML = parts.join("\n");
      }).catch(function(e){ if (window.console) console.error(e); })
    );
    jobs.push(
      loadFragment("checklist.html").then(function(html){
        if (todo) todo.innerHTML = html;
      }).catch(function(e){ if (window.console) console.error(e); })
    );
    jobs.push(
      loadFragment("packing.html").then(function(html){
        if (pack) pack.innerHTML = html;
      }).catch(function(e){ if (window.console) console.error(e); })
    );
    return Promise.all(jobs);
  }

  // ---- existing behaviour, run AFTER fragments are injected ----
  function initBehaviors(){
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

  // ---- persistent checklist (real localStorage now that this is a live site) ----
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
          [44.3776,-68.2503,"Eagle Lake carriage roads (Thu Option B ride)"],
          [44.3205,-68.2536,"Jordan Pond"],
          [44.2221,-68.3374,"Bass Harbor Head Light (Thu Option C)"],
          [44.2410,-68.3554,"Thurston's Lobster Pound, Bernard — lunch"],
          [44.3528,-68.2247,"Cadillac Mountain"],
          [43.8570,-70.1030,"Harraseeket Inn, Freeport — tonight"]]},
        {n:"Fri 7", color:"#C9452D", stops:[
          [43.5637,-70.2000,"Breakfast, Cape Elizabeth"],
          [43.6544,-70.2456,"Casco Bay ferry terminal"],
          [43.6555,-70.1990,"Peaks Island lobster bake"],
          [43.6534,-70.2610,"Holiday Inn By the Bay — tonight"]]},
        {n:"Sat 8", color:"#E4D7B8", stops:[
          [43.6534,-70.2610,"Holiday Inn By the Bay — wedding-weekend base"],
          [43.6580,-70.2690,"Deering Oaks farmers' market (Sat morning)"]]},
        {n:"Sun 9", color:"#8E7CC3", stops:[
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
(function(){
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
        counter.textContent = done + "/" + boxes.length + (done === boxes.length ? " ✓ packed" : " packed");
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
})();
  }

  injectAll().then(initBehaviors);

})();
