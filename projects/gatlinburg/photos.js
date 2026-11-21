/* gatlinburg/photos.js — Google Place photos under each stop, the way SUP Maine's photos.js did it.
   Uses the Places API (New) through the Maps JavaScript API. The key ships in public source and
   is restricted to mikeside.com/* referrers in Google Cloud (project "supmaine"); if the referrer
   check fails nothing renders and one console warning explains why. Results are cached per browser
   session so a page reload doesn't re-bill. Photo author attributions are shown, as Google requires. */
(function(){
  "use strict";
  var KEY = "AIzaSyAUT6tkXPxU5SPvf61maQUgWyAYcVraTaM";
  var WANT = 3, MAXW = 640;
  var targets = [].slice.call(document.querySelectorAll("[data-q]"));
  if (!targets.length) return;
  if ("serviceWorker" in navigator) { try { navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ r.unregister(); }); }).catch(function(){}); } catch(e){} }

  var cache = {};
  try { cache = JSON.parse(sessionStorage.getItem("gatlinburg-photos") || "{}"); } catch(e){}
  function remember(){ try { sessionStorage.setItem("gatlinburg-photos", JSON.stringify(cache)); } catch(e){} }

  function search(q){
    if (cache[q]) return Promise.resolve(cache[q]);
    return google.maps.places.Place.searchByText({ textQuery: q, fields: ["photos"], maxResultCount: 1 }).then(function(res){
      var places = res && res.places; if (!places || !places.length) return null;
      var photos = (places[0].photos || []).slice(0, WANT);
      if (!photos.length) return null;
      var out = photos.map(function(p){
        var a = (p.authorAttributions && p.authorAttributions[0]) || {};
        return { u: p.getURI({ maxWidth: MAXW }), by: a.displayName || "", href: a.uri || "" };
      });
      cache[q] = out; remember();
      return out;
    }).catch(function(e){ if (window.console) console.warn("[photos]", q, e && e.message); return null; });
  }

  function inject(el, shots){
    if (!shots || !shots.length || el.querySelector(".shots")) return;
    var wrap = document.createElement("div"); wrap.className = "shots";
    shots.forEach(function(s){
      var f = document.createElement("figure");
      var img = document.createElement("img"); img.loading = "lazy"; img.alt = ""; img.src = s.u;
      img.onerror = function(){ f.remove(); if (!wrap.children.length) wrap.remove(); };
      f.appendChild(img);
      var c = document.createElement("figcaption"); c.textContent = s.by ? "Google · " + s.by : "Google";
      f.appendChild(c); wrap.appendChild(f);
    });
    var host = el.querySelector(".why") || el.querySelector(".what") || el;
    host.parentNode.insertBefore(wrap, host.nextSibling);
  }

  function run(){
    var queue = targets.slice(); var inflight = 0;
    function next(){
      while (inflight < 2 && queue.length) {
        var el = queue.shift(); var q = el.getAttribute("data-q"); if (!q) continue;
        inflight++;
        (function(el, q){ search(q).then(function(shots){ inject(el, shots); inflight--; next(); }); })(el, q);
      }
    }
    next();
  }

  window.__gatlinburgPhotosReady = function(){
    google.maps.importLibrary("places").then(run).catch(function(e){ if (window.console) console.warn("[photos] places library failed", e && e.message); });
  };
  function load(){
    if (document.getElementById("gmaps-js")) return;
    var s = document.createElement("script"); s.id = "gmaps-js"; s.async = true;
    s.src = "https://maps.googleapis.com/maps/api/js?key=" + KEY + "&libraries=places&loading=async&callback=__gatlinburgPhotosReady";
    s.onerror = function(){ if (window.console) console.warn("[photos] Google Maps JS failed to load"); };
    document.head.appendChild(s);
  }
  // Only once the page is unlocked, so a locked page costs nothing.
  if (document.body.classList.contains("locked")) document.addEventListener("gatlinburg:unlock", load);
  else load();
})();
