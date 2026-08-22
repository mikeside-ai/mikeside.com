(function(){
  "use strict";

  // Per-day forecast config: representative coordinate + activity tags for clothing advice.
  // Keyed by the day section id. Runs after main.js injects the day fragments.
  var CFG = {
    d1: {lat:43.87, lon:-69.63, tags:["travel","walk"]},
    d2: {lat:44.21, lon:-69.10, tags:["hike","walk","evening"]},
    d3: {lat:44.34, lon:-68.22, tags:["hike","bike","summit"]},
    d4: {lat:43.65, lon:-70.19, tags:["ferry","beach","evening"]},
    d5: {lat:43.62, lon:-70.21, tags:["formal"]},
    d5b: {lat:43.66, lon:-70.25, tags:["walk","bike","beach"]},
    d6: {lat:43.55, lon:-70.33, tags:["walk","bike","beach"]},
    d7: {lat:43.65, lon:-70.30, tags:["travel"]}
  };

  // WMO weather codes -> [emoji, label]
  var WX = {0:["☀️","Clear"],1:["🌤️","Mostly clear"],2:["⛅","Partly cloudy"],
    3:["☁️","Overcast"],45:["🌫️","Fog"],48:["🌫️","Fog"],
    51:["🌦️","Light drizzle"],53:["🌦️","Drizzle"],55:["🌦️","Drizzle"],
    61:["🌧️","Light rain"],63:["🌧️","Rain"],65:["🌧️","Heavy rain"],
    71:["🌨️","Snow"],80:["🌦️","Showers"],81:["🌦️","Showers"],
    82:["⛈️","Heavy showers"],95:["⛈️","Thunderstorms"]};

  function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

  // Build a clothing suggestion from the forecast + that day's activities.
  function clothes(cfg, hi, lo, pp){
    var t = cfg.tags, parts = [];
    var wet = pp != null && pp >= 45;
    var showers = pp != null && pp >= 25 && pp < 45;
    var hot = hi >= 82, cool = hi < 70;

    if (t.indexOf("formal") >= 0){
      parts.push("wedding day — formal / black-tie optional");
      if (lo < 62) parts.push("bring a wrap or jacket for the ~" + lo + "° oceanside evening");
    }
    if (t.indexOf("hike") >= 0) parts.push("trail shoes + moisture-wicking layers");
    if (t.indexOf("summit") >= 0) parts.push("a wind layer for Cadillac (cooler + breezier up top)");
    if (t.indexOf("bike") >= 0) parts.push("closed-toe shoes if you ride");
    if (t.indexOf("ferry") >= 0) parts.push("a windbreaker for the Casco Bay crossing");
    if (t.indexOf("beach") >= 0) parts.push("swimsuit + sandals");
    if (t.indexOf("travel") >= 0) parts.push("comfortable travel clothes");

    if (hot) parts.push("it's hot (" + hi + "°) — sun hat, sunscreen, breathable fabrics");
    else if (cool) parts.push("cooler than usual (" + hi + "° high) — add a real layer");
    if (lo < 58 && t.indexOf("formal") < 0) parts.push("nights near " + lo + "°, pack a fleece or quarter-zip");

    if (wet) parts.push("rain likely (" + pp + "%) — pack the rain shell");
    else if (showers) parts.push("chance of showers (" + pp + "%) — a light rain layer helps");

    if (!parts.length) parts.push("easy layers for warm days and cool evenings");
    return cap(parts.join("; ")) + ".";
  }

  function box(sec){
    var body = sec.querySelector(".card-body");
    if (!body) return null;
    var el = document.createElement("div");
    el.className = "wx-day";
    el.innerHTML = '<div class="wx-line"><span class="wx-emoji">⏳</span><span class="wx-meta">loading forecast…</span></div>';
    var intro = body.querySelector(".day-intro");
    if (intro && intro.nextSibling) body.insertBefore(el, intro.nextSibling);
    else if (intro) body.appendChild(el);
    else body.insertBefore(el, body.firstChild);
    return el;
  }

  function fill(el, emoji, meta, tip){
    el.innerHTML =
      '<div class="wx-line"><span class="wx-emoji">' + emoji + '</span><span class="wx-meta">' + meta + '</span></div>' +
      '<div class="wx-tip"><span class="wx-shirt">👕</span><span>' + tip + '</span></div>';
  }

  function seasonal(el, cfg){
    // Beyond the ~16-day forecast window: fall back to coastal-Maine August normals.
    fill(el, "📅",
      "Live forecast opens ~2 weeks out · Aug avg ≈ 79° / 58°, cool nights, some fog",
      clothes(cfg, 79, 58, null));
  }

  function load(sec, cfg){
    var el = box(sec);
    if (!el) return;
    var date = sec.dataset.date;
    if (!date) { seasonal(el, cfg); return; }
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + cfg.lat + "&longitude=" + cfg.lon +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code" +
      "&temperature_unit=fahrenheit&timezone=America%2FNew_York&start_date=" + date + "&end_date=" + date;
    fetch(url).then(function(r){ return r.json(); }).then(function(d){
      if (!d || d.error || !d.daily || d.daily.temperature_2m_max == null || d.daily.temperature_2m_max[0] == null){
        seasonal(el, cfg); return;
      }
      var hi = Math.round(d.daily.temperature_2m_max[0]);
      var lo = Math.round(d.daily.temperature_2m_min[0]);
      var pp = d.daily.precipitation_probability_max ? d.daily.precipitation_probability_max[0] : null;
      var wx = WX[d.daily.weather_code[0]] || ["🌊", "—"];
      var meta = hi + "° / " + lo + "°" + (pp != null ? " · " + pp + "% rain" : "") + " · " + wx[1];
      fill(el, wx[0], meta, clothes(cfg, hi, lo, pp));
    }).catch(function(){ seasonal(el, cfg); });
  }

  function render(){
    Object.keys(CFG).forEach(function(id){
      var sec = document.getElementById(id);
      if (sec && sec.classList.contains("day") && !sec.querySelector(".wx-day")) load(sec, CFG[id]);
    });
  }

  // styles
  var css = document.createElement("style");
  css.textContent =
    ".wx-day{margin:2px 0 14px;background:rgba(94,143,126,.08);border:1px solid rgba(94,143,126,.35);" +
    "border-radius:10px;padding:10px 13px}" +
    ".wx-line{display:flex;align-items:center;gap:9px}" +
    ".wx-emoji{font-size:20px;line-height:1}" +
    ".wx-meta{font-family:\"IBM Plex Mono\",monospace;font-size:12px;font-weight:600;color:var(--ink)}" +
    ".wx-tip{display:flex;gap:9px;margin-top:7px;font-size:12.5px;color:var(--ink-soft);line-height:1.4}" +
    ".wx-shirt{flex-shrink:0}" +
    ".leg{position:relative;margin:0 0 13px;padding-left:2px;font-family:\"IBM Plex Mono\",monospace;" +
    "font-size:10.5px;font-weight:500;color:var(--ink-soft);letter-spacing:.05em;text-transform:uppercase;" +
    "display:flex;align-items:center;gap:7px}" +
    ".leg::before{content:\"↓\";color:var(--buoy);font-size:13px;font-weight:700}" +
    ".pack-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px}" +
    ".pack-tab{font-family:\"IBM Plex Mono\",monospace;font-size:12px;font-weight:600;text-decoration:none;color:var(--ink);border:1.5px solid var(--ink);border-radius:999px;padding:5px 13px;background:var(--paper);display:inline-block;line-height:1.4;cursor:pointer}" +
    ".pack-tab:hover,.pack-tab:focus,.pack-tab:active{background:var(--paper);color:var(--ink);border-color:var(--ink)}" +
    ".pack-tab:focus-visible{outline:2px solid var(--seaglass);outline-offset:2px}" +
    ".pack-card{scroll-margin-top:80px}";
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
