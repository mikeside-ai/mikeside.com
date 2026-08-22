(function(){
  "use strict";

  // NOAA CO-OPS predicted high/low tides for the trip window, baked in.
  // Source: api.tidesandcurrents.noaa.gov, product=predictions, interval=hilo,
  // datum=MLLW, units=english, time_zone=lst_ldt (local daylight time).
  // Stations: Boothbay Harbor 8416828 · Rockland 8415490 · Bar Harbor 8413320 · Portland 8418150.
  // Predictions are astronomical only — wind and barometric pressure can shift
  // real water a foot or so either way. Covers Aug 4-11, 2026 only.
  var TIDES = {
    d1: {st:"Boothbay Harbor", id:"8416828",
      hi:[["3:13a",9.1],["3:39p",9.5]],
      lo:[["9:21a",0.3],["9:53p",0.4]],
      note:"High water at 3:39p — the harbor is full and the boats are floating right when you get there."},
    d2: {st:"Rockland", id:"8415490",
      hi:[["3:55a",9.7],["4:21p",10.4]],
      lo:[["10:09a",0.7],["10:47p",0.5]],
      note:"Low water 10:09a bares the ledges around Marshall Point. The breakwater walk is fine at any tide, but the 4:21p high is the day's biggest water at 10.4 ft."},
    d3: {st:"Bar Harbor", id:"8413320",
      hi:[["4:42a",10.2],["5:05p",11.4]],
      lo:[["10:48a",0.9],["11:35p",0.5]],
      note:"Dead low is 10:48a. Thunder Hole only booms on a rising tide 1-2 hrs before high, so at 9:45a expect a scenic crack in the rocks, not a spectacle. Bar Island's sandbar is walkable roughly 8:50a-12:50p."},
    d4: {st:"Portland", id:"8418150",
      hi:[["6:04a",8.5],["6:25p",10.1]],
      lo:[["12:04p",0.9]],
      note:"Low water 12:04p — the best tidepooling of the trip is right below Portland Head Light while you're at Fort Williams."},
    d5: {st:"Portland", id:"8418150",
      hi:[["7:11a",8.4],["7:30p",10.2]],
      lo:[["12:58a",0.3],["1:06p",1.0]],
      note:"The tide rises all through the ceremony and peaks at 7:30p, right around dinner. Full water, smallest beach — worth knowing if there are photos on the sand."},
    d5b:{st:"Portland", id:"8418150",
      hi:[["8:20a",8.5],["8:37p",10.5]],
      lo:[["2:06a",0.1],["2:14p",0.9]],
      note:"Low water 2:14p. Easy afternoon for beach walking on Willard or Crescent."},
    d6: {st:"Portland", id:"8418150",
      hi:[["9:26a",8.8],["9:40p",10.8]],
      lo:[["3:12a",-0.2],["3:18p",0.6]],
      note:"Low tide 3:18p — this is the one that matters. The Timber Point bar is walkable roughly 1:20-5:20p, so the 2:30p arrival lands mid-window."},
    d7: {st:"Portland", id:"8418150",
      hi:[["10:25a",9.2],["10:39p",11.1]],
      lo:[["4:12a",-0.6],["4:19p",0.2]],
      note:"A -0.6 ft minus tide at 4:12a, which is exactly when you're driving to the airport. The bay will be as empty as it gets all week."}};

  function span(list, cls){
    return list.map(function(t){
      return '<span class="tide-t ' + cls + '">' + t[0] +
             '<i>' + t[1].toFixed(1) + "'" + '</i></span>';
    }).join("");
  }

  function build(sec, cfg){
    var body = sec.querySelector(".card-body");
    if (!body) return;
    var el = document.createElement("div");
    el.className = "tide-day";
    el.innerHTML =
      '<div class="tide-row"><span class="tide-tag hi">HIGH</span>' + span(cfg.hi, "hi") + '</div>' +
      '<div class="tide-row"><span class="tide-tag lo">LOW</span>' + span(cfg.lo, "lo") + '</div>' +
      '<div class="tide-note"><span class="tide-anchor">⚓</span><span>' + cfg.note +
      ' <a href="https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=' + cfg.id +
      '" target="_blank" rel="noopener">NOAA ' + cfg.st + ' ↗</a></span></div>';

    // Sit just under the weather box when it exists, otherwise just under the intro.
    var anchor = body.querySelector(".wx-day") || body.querySelector(".day-intro");
    if (anchor && anchor.nextSibling) body.insertBefore(el, anchor.nextSibling);
    else if (anchor) body.appendChild(el);
    else body.insertBefore(el, body.firstChild);
  }

  function render(){
    Object.keys(TIDES).forEach(function(id){
      var sec = document.getElementById(id);
      if (sec && sec.classList.contains("day") && !sec.querySelector(".tide-day")) build(sec, TIDES[id]);
    });
  }

  var css = document.createElement("style");
  css.textContent =
    ".tide-day{margin:-6px 0 14px;background:rgba(62,82,102,.06);border:1px solid rgba(62,82,102,.3);" +
    "border-radius:10px;padding:9px 13px 10px}" +
    ".tide-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:2px 0}" +
    ".tide-tag{font-family:\"IBM Plex Mono\",monospace;font-size:9.5px;font-weight:700;letter-spacing:.09em;" +
    "border-radius:999px;padding:2px 7px;line-height:1.5;flex-shrink:0}" +
    ".tide-tag.hi{background:#3E5266;color:#EFF2ED}" +
    ".tide-tag.lo{background:transparent;color:#3E5266;border:1px solid rgba(62,82,102,.5)}" +
    ".tide-t{font-family:\"IBM Plex Mono\",monospace;font-size:12px;font-weight:600;color:var(--ink)}" +
    ".tide-t i{font-style:normal;font-weight:400;font-size:10.5px;color:var(--ink-soft);margin-left:4px}" +
    ".tide-t.lo{font-weight:500;color:var(--ink-soft)}" +
    ".tide-note{display:flex;gap:9px;margin-top:8px;font-size:12.5px;color:var(--ink-soft);line-height:1.45}" +
    ".tide-anchor{flex-shrink:0}" +
    ".tide-note a{color:#3E5266;text-decoration:underline;text-underline-offset:2px;white-space:nowrap}";
  document.head.appendChild(css);

  function boot(){
    var route = document.getElementById("route");
    if (document.querySelector(".day")) { render(); return; }
    if (!route) { return; }
    var mo = new MutationObserver(function(){
      if (document.querySelector(".day")) { mo.disconnect(); render(); }
    });
    mo.observe(route, {childList: true});
  }

  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);

})();
