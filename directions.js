(function(){
  "use strict";

  // Make each drive/leg connector clickable → opens Google Maps directions between
  // the stop before it and the stop after it. Pure URL links (maps/dir/) — no API cost.

  function queryOf(stop){
    var a = stop && stop.querySelector('a[href*="google.com/maps/search"]');
    if (!a) return null;
    var m = a.getAttribute("href").match(/[?&]query=([^&#]+)/);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null;
  }

  function travelMode(text){
    text = (text || "").toLowerCase();
    if (/\bferry\b/.test(text)) return "transit";
    if (/\b(walk|walking|on foot|stroll|promenade)\b/.test(text)) return "walking";
    if (/\b(bike|biking|bicycle|bicycling|e-?bike|cycle|ride)\b/.test(text)) return "bicycling";
    return "driving";
  }

  function dirUrl(origin, dest, mode){
    return "https://www.google.com/maps/dir/?api=1" +
           "&origin=" + encodeURIComponent(origin) +
           "&destination=" + encodeURIComponent(dest) +
           "&travelmode=" + mode;
  }

  // nearest stop before and after this connector in document order
  function neighbors(conn){
    var stops = document.querySelectorAll(".day .stop, .day .stay");
    var before = null, after = null;
    for (var i = 0; i < stops.length; i++){
      var rel = conn.compareDocumentPosition(stops[i]);
      if (rel & Node.DOCUMENT_POSITION_PRECEDING) before = stops[i];
      else if (rel & Node.DOCUMENT_POSITION_FOLLOWING){ after = stops[i]; break; }
    }
    return [before, after];
  }

  function enhance(conn){
    if (conn.dataset.dir) return;                 // already done / skipped
    if (conn.querySelector("a")) { conn.dataset.dir = "skip"; return; }
    var pair = neighbors(conn);
    var o = queryOf(pair[0]), d = queryOf(pair[1]);
    if (!o || !d) { conn.dataset.dir = "skip"; return; }

    var a = document.createElement("a");
    a.href = dirUrl(o, d, travelMode(conn.textContent));
    a.target = "_blank";
    a.rel = "noopener";
    a.className = "leg-dir";
    a.setAttribute("aria-label", "Directions from " + o + " to " + d);
    while (conn.firstChild) a.appendChild(conn.firstChild);   // wrap existing text
    var go = document.createElement("span");
    go.className = "leg-go";
    go.textContent = "directions ↗";
    a.appendChild(go);
    conn.appendChild(a);
    conn.dataset.dir = "1";
  }

  function run(){
    document.querySelectorAll(".leg, .drive").forEach(enhance);
  }

  var st = document.createElement("style");
  st.textContent =
    ".leg a.leg-dir,.drive a.leg-dir{color:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:8px;cursor:pointer}" +
    ".leg a.leg-dir:hover,.drive a.leg-dir:hover{color:var(--buoy)}" +
    ".leg-go{font-family:\"IBM Plex Mono\",monospace;font-size:9.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--seaglass);border:1px solid var(--seaglass);border-radius:999px;padding:2px 8px;white-space:nowrap;transition:all .15s}" +
    ".leg a.leg-dir:hover .leg-go,.drive a.leg-dir:hover .leg-go{background:var(--seaglass);color:var(--fog);border-color:var(--seaglass)}";
  document.head.appendChild(st);

  function boot(){
    run();
    var route = document.getElementById("route");
    if (!route) return;
    var mo = new MutationObserver(function(){ run(); });
    mo.observe(route, { childList: true, subtree: true });
    setTimeout(function(){ mo.disconnect(); run(); }, 8000);
  }

  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);

})();
