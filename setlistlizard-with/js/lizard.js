/* Setlist Lizard ... With — shared runtime: inline audio player + Lab pies.
 *
 * One file, loaded by the generated show pages, the landing board and the
 * song page, so the player and the charts exist exactly once. It works by
 * progressive enhancement: it scans the page for the ♫ links that already
 * exist (.lsn elements pointing at phish.in track pages) and injects a play
 * button beside each. No page markup had to change to gain the player.
 *
 * Audio comes straight from phish.in's public API — used with the
 * maintainer's blessing, attribution shown in the player bar. A note on the
 * long-running "stall" mystery: the media element only refuses to load in
 * HIDDEN tabs (an automation artifact — Chrome defers media in background
 * tabs; even a data-URI WAV won't load there). The bytes themselves stream
 * fine (verified: 16 MB/s, first 256 KB decodes as real stereo audio). So we
 * stream directly, and keep a fetch-to-blob fallback behind a watchdog in
 * case some other environment stalls the direct path.
 */
(function () {
  "use strict";
  var BASE = "/setlistlizard-with";
  var META_URL = BASE + "/data/song_meta.json";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(sec) {
    if (!isFinite(sec) || sec == null) return "0:00";
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  /* ================================ player ================================ */

  var audio = null, bar = null, el = {}, current = null, showCache = {};

  function trackRef(node) {
    var href = node.getAttribute("href") || node.getAttribute("data-href") || "";
    var m = href.match(/phish\.in\/(\d{4}-\d{2}-\d{2})\/([a-z0-9-]+)/);
    return m ? { date: m[1], slug: m[2], page: href } : null;
  }

  function showTracks(date) {
    if (!showCache[date]) {
      showCache[date] = fetch("https://phish.in/api/v2/shows/" + date + ".json")
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (d) {
          var map = {};
          (d.tracks || []).forEach(function (t) { map[t.slug] = t; });
          return map;
        })
        .catch(function () { delete showCache[date]; return null; });
    }
    return showCache[date];
  }

  function ensureBar() {
    if (bar) return;
    bar = document.createElement("div");
    bar.id = "lizard-player";
    bar.innerHTML =
      '<button class="lz-main" id="lzToggle" aria-label="Play / pause">▶</button>' +
      '<div class="lz-meta"><div class="lz-title" id="lzTitle"></div>' +
      '<div class="lz-sub">streaming from <a id="lzSrc" href="https://phish.in/" rel="noopener" target="_blank">phish.in</a> — free &amp; fan-run</div></div>' +
      '<input class="lz-seek" id="lzSeek" type="range" min="0" max="1000" value="0" aria-label="Seek" />' +
      '<span class="lz-time" id="lzTime">0:00 / 0:00</span>' +
      '<button class="lz-x" id="lzClose" aria-label="Close player">×</button>';
    document.body.appendChild(bar);
    document.body.classList.add("lz-open");
    el = {
      toggle: document.getElementById("lzToggle"),
      title: document.getElementById("lzTitle"),
      src: document.getElementById("lzSrc"),
      seek: document.getElementById("lzSeek"),
      time: document.getElementById("lzTime"),
      close: document.getElementById("lzClose")
    };
    el.toggle.addEventListener("click", function () {
      if (!audio) return;
      if (audio.paused) audio.play(); else audio.pause();
    });
    el.close.addEventListener("click", stopAll);
    el.seek.addEventListener("input", function () {
      if (audio && isFinite(audio.duration)) audio.currentTime = (el.seek.value / 1000) * audio.duration;
    });
  }

  function wireAudio() {
    audio.addEventListener("timeupdate", function () {
      if (!isFinite(audio.duration)) return;
      el.seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
      el.time.textContent = fmt(audio.currentTime) + " / " + fmt(audio.duration);
    });
    audio.addEventListener("playing", function () {
      el.toggle.textContent = "⏸";
      if (current) mark(current.btn, "playing");
    });
    audio.addEventListener("pause", function () {
      el.toggle.textContent = "▶";
      if (current) mark(current.btn, "paused");
    });
    audio.addEventListener("ended", advance);
  }

  function mark(btn, state) {
    document.querySelectorAll(".lz-play").forEach(function (b) {
      b.textContent = "▶"; b.classList.remove("on");
    });
    if (!btn) return;
    if (state === "playing") { btn.textContent = "⏸"; btn.classList.add("on"); }
    else if (state === "loading") { btn.textContent = "…"; btn.classList.add("on"); }
    else btn.textContent = "▶";
  }

  function stopAll() {
    if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); }
    if (bar) { bar.remove(); bar = null; document.body.classList.remove("lz-open"); }
    mark(null); current = null;
  }

  function advance() {
    if (!current) return;
    var all = Array.prototype.slice.call(document.querySelectorAll(".lz-play"));
    var i = all.indexOf(current.btn);
    if (i > -1 && i + 1 < all.length) all[i + 1].click();
    else { el.toggle.textContent = "▶"; mark(null); }
  }

  function handleClick(ref, btn) {
    if (current && current.btn === btn && audio) {          // same track: toggle
      if (audio.paused) audio.play(); else audio.pause();
      return;
    }
    ensureBar();
    mark(btn, "loading");
    el.title.textContent = "loading…";
    showTracks(ref.date).then(function (tracks) {
      var t = tracks && tracks[ref.slug];
      if (!t || !t.mp3_url) {                               // no audio: fall back to the site
        mark(null); window.open(ref.page, "_blank", "noopener"); return;
      }
      if (!audio) { audio = new Audio(); audio.preload = "auto"; wireAudio(); }
      current = { t: t, ref: ref, btn: btn, token: {} };
      var token = current.token;
      el.title.textContent = t.title || ref.slug;
      el.src.href = ref.page;
      el.time.textContent = "0:00 / " + fmt((t.duration || 0) / 1000);
      el.seek.value = 0;
      audio.src = t.mp3_url;                                // direct stream first
      audio.play().catch(function () {});
      var started = false;
      var onPlaying = function () { started = true; audio.removeEventListener("playing", onPlaying); };
      audio.addEventListener("playing", onPlaying);
      setTimeout(function () {                              // watchdog → blob fallback
        if (started || !current || current.token !== token) return;
        fetch(t.mp3_url).then(function (r) { return r.blob(); }).then(function (b) {
          if (!current || current.token !== token) return;
          var at = audio.currentTime;
          audio.src = URL.createObjectURL(b);
          if (at > 1) audio.currentTime = at;
          audio.play().catch(function () {});
        }).catch(function () { mark(null); });
      }, 5000);
      if (navigator.mediaSession) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: t.title || ref.slug, artist: "Phish", album: "via phish.in — " + ref.date
          });
        } catch (e) {}
      }
    });
  }

  function injectButtons() {
    document.querySelectorAll("a.lsn, .lsn[data-href]").forEach(function (node) {
      if (node.__lz) return;
      var ref = trackRef(node);
      if (!ref) return;
      node.__lz = 1;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lz-play";
      b.textContent = "▶";
      b.title = "Play here — audio streamed from phish.in";
      b.setAttribute("aria-label", "Play this track");
      b.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        handleClick(ref, b);
      });
      node.parentNode.insertBefore(b, node);
    });
  }

  /* ================================= pies ================================= */

  var meta = null, metaPromise = null;
  function getMeta() {
    if (!metaPromise) {
      metaPromise = fetch(META_URL + "?v=1")
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
        .then(function (m) { meta = m; return m; });
    }
    return metaPromise;
  }

  var PAL = ["#e0553a", "#f0765c", "#f0b429", "#7bc6ff", "#9ae6b4", "#d6a2ff", "#ffd6a5", "#ff9b9b", "#9aa5b1"];
  function color(i) { return PAL[i % PAL.length]; }

  function pieSVG(entries, total, centerLabel) {
    var cx = 50, cy = 50, r1 = 46, r0 = 27, a = -Math.PI / 2, out = [];
    entries.forEach(function (en, i) {
      var frac = en.v / total, a2 = a + frac * 2 * Math.PI, large = frac > 0.5 ? 1 : 0, d;
      if (frac >= 0.999) {
        // lone slice: two half-arcs, or the path collapses to a zero-width bbox
        d = "M " + cx + " " + (cy - r1) + " A " + r1 + " " + r1 + " 0 1 1 " + cx + " " + (cy + r1) +
            " A " + r1 + " " + r1 + " 0 1 1 " + cx + " " + (cy - r1) + " Z" +
            " M " + cx + " " + (cy - r0) + " A " + r0 + " " + r0 + " 0 1 1 " + cx + " " + (cy + r0) +
            " A " + r0 + " " + r0 + " 0 1 1 " + cx + " " + (cy - r0) + " Z";
      } else {
        d = "M " + (cx + r1 * Math.cos(a)).toFixed(2) + " " + (cy + r1 * Math.sin(a)).toFixed(2) +
            " A " + r1 + " " + r1 + " 0 " + large + " 1 " + (cx + r1 * Math.cos(a2)).toFixed(2) + " " + (cy + r1 * Math.sin(a2)).toFixed(2) +
            " L " + (cx + r0 * Math.cos(a2)).toFixed(2) + " " + (cy + r0 * Math.sin(a2)).toFixed(2) +
            " A " + r0 + " " + r0 + " 0 " + large + " 0 " + (cx + r0 * Math.cos(a)).toFixed(2) + " " + (cy + r0 * Math.sin(a)).toFixed(2) + " Z";
      }
      out.push('<path d="' + d + '" fill="' + en.c + '" fill-opacity=".88" fill-rule="evenodd"><title>' +
               esc(en.k) + " — " + en.v + "</title></path>");
      a = a2;
    });
    out.push('<text x="50" y="52" text-anchor="middle" fill="#f0765c" ' +
             'style="font-family:Fraunces,Georgia,serif;font-size:17px">' + total + "</text>");
    if (centerLabel) {
      out.push('<text x="50" y="63" text-anchor="middle" font-size="6.5" letter-spacing="1.2" fill="#8b93a7">' +
               esc(centerLabel).toUpperCase() + "</text>");
    }
    return '<svg viewBox="0 0 100 100" role="img" aria-label="' + esc(centerLabel || "breakdown") + '">' + out.join("") + "</svg>";
  }

  function panel(title, sub, entries, opts) {
    opts = opts || {};
    entries = entries.filter(function (e) { return e.v > 0; });
    if (opts.order) {
      entries.sort(function (x, y) { return opts.order.indexOf(x.k) - opts.order.indexOf(y.k); });
    } else {
      entries.sort(function (x, y) { return y.v - x.v || (x.k < y.k ? -1 : 1); });
    }
    entries.forEach(function (e, i) { if (!e.c) e.c = color(i); });
    var total = entries.reduce(function (s, e) { return s + e.v; }, 0);
    var body;
    if (!total) {
      body = '<p class="lpe">' + esc(opts.empty || "nothing to chart yet") + "</p>";
    } else {
      var shown = entries.slice(0, 6);
      var legend = shown.map(function (e) {
        return '<li title="' + esc(e.tip || e.k) + '"><i style="background:' + e.c + '"></i><b>' +
               esc(e.k) + "</b><span class=\"n\">" + e.v + "</span></li>";
      }).join("");
      if (entries.length > shown.length) {
        legend += '<li><i style="background:transparent"></i><b style="color:var(--muted)">+' +
                  (entries.length - shown.length) + " more</b></li>";
      }
      body = '<div class="lpc">' + pieSVG(entries, total, opts.center || "songs") + "<ul>" + legend + "</ul></div>";
    }
    return '<div class="lp"><h4>' + esc(title) + '</h4><p class="lps">' + esc(sub) + "</p>" + body + "</div>";
  }

  function tally(keys) {
    var m = {}, order = [];
    keys.forEach(function (k) {
      if (k == null) return;
      if (!(k in m)) { m[k] = 0; order.push(k); }
      m[k]++;
    });
    return order.map(function (k) { return { k: k, v: m[k] }; });
  }

  var ERAS = ["’83–’89", "’90–’94", "’95–’00", "2.0 (’02–’04)", "3.0 (’09–’19)", "4.0 (’20s)"];
  function eraOf(y) {
    if (y <= 1989) return ERAS[0];
    if (y <= 1994) return ERAS[1];
    if (y <= 2001) return ERAS[2];
    if (y <= 2008) return ERAS[3];
    if (y <= 2019) return ERAS[4];
    return ERAS[5];
  }
  var GAP_BANDS = ["1–2 · rotation", "3–5", "6–15", "16–50", "51+ · bustout"];
  function gapBand(g) {
    if (g <= 2) return GAP_BANDS[0];
    if (g <= 5) return GAP_BANDS[1];
    if (g <= 15) return GAP_BANDS[2];
    if (g <= 50) return GAP_BANDS[3];
    return GAP_BANDS[4];
  }
  function writerBucket(m) {
    if (m.artist) return "Cover";
    var w = m.writers || [];
    function has(n) { return w.indexOf(n) >= 0; }
    if (["Anastasio", "Fishman", "Gordon", "McConnell"].every(has)) return "Full band";
    if (w.length === 1) {
      if (w[0] === "Gordon") return "Gordon";
      if (w[0] === "Fishman") return "Fishman";
      if (w[0] === "Holdsworth") return "Holdsworth";
      if (w[0] === "Anastasio") return "Anastasio solo";
    }
    if (w.length === 2 && has("Anastasio") && has("Marshall")) return "Anastasio / Marshall";
    if (has("Fishman")) return "Anastasio / Fishman";
    return "Anastasio + friends";
  }

  function renderPies() {
    var host = document.getElementById("lizard-lab-pies");
    if (!host || !meta || !meta.songs) return;
    var data = window.__lizardLabData;
    if (!data) {
      var s = document.getElementById("lizard-lab-data");
      if (s) { try { data = JSON.parse(s.textContent); } catch (e) {} }
    }
    if (!data || !data.songs || !data.songs.length) { host.innerHTML = ""; return; }

    var rows = data.songs.map(function (r) {
      return { t: r.t, s: r.s, m: meta.songs[r.s] || null };
    });
    var known = rows.filter(function (r) { return r.m; });
    var unknown = rows.length - known.length;
    var gaps = (meta.gaps || {})[data.showdate] || null;

    var html = [];

    html.push(panel("When it debuted",
      "Tonight’s unique songs by the era Phish first played them (earliest phish.in recording).",
      tally(known.map(function (r) { return eraOf(+r.m.debut.slice(0, 4)); })),
      { order: ERAS }));

    html.push(panel("Album representation",
      "The studio home of each song — hand-curated, covers counted as one slice.",
      tally(known.map(function (r) {
        return r.m.artist ? "Covers" : (r.m.album || "No studio album");
      }))));

    var gapEntries = [];
    if (gaps) {
      gapEntries = tally(known.map(function (r) {
        var g = gaps[r.s];
        return g == null ? null : gapBand(g);
      }));
    }
    html.push(panel("Gap since last played",
      "Shows since each song’s previous appearance, per Phish.net. Big number = bustout.",
      gapEntries,
      { order: GAP_BANDS, center: "songs", empty: "gap data not captured for this show yet" }));

    html.push(panel("Originals vs covers",
      "Whose songbook tonight drew from. Hover a cover for the songwriter credit.",
      tally(known.map(function (r) { return r.m.artist ? r.m.artist : "Phish original"; }))
        .map(function (e) {
          if (e.k !== "Phish original") {
            var src = known.filter(function (r) { return r.m.artist === e.k; })[0];
            if (src && src.m.cw) e.tip = e.k + " — written by " + src.m.cw;
          }
          return e;
        })));

    html.push(panel("Who wrote it",
      "Originals by writing credit — the covers sit in their own slice.",
      tally(known.map(function (r) { return writerBucket(r.m); }))));

    var originals = known.filter(function (r) { return !r.m.artist; });
    html.push(panel("The Marshall factor",
      "Originals co-written with Tom Marshall vs the rest of the catalog. Covers excluded.",
      tally(originals.map(function (r) {
        return (r.m.writers || []).indexOf("Marshall") >= 0 ? "With Tom Marshall" : "Without Marshall";
      })).map(function (e) {
        e.c = e.k === "With Tom Marshall" ? "#f0765c" : "#7bc6ff";
        return e;
      }),
      { center: "originals" }));

    host.innerHTML = html.join("") +
      (unknown ? '<p class="lpe" style="grid-column:1/-1">' + unknown +
        " song" + (unknown === 1 ? "" : "s") + " not in the metadata file yet — they join on the next curation pass.</p>" : "");
  }

  /* ================================ wiring ================================ */

  function refresh() { injectButtons(); getMeta().then(renderPies); }
  document.addEventListener("lizard:refresh", refresh);
  document.addEventListener("lizard:lab", function () { getMeta().then(renderPies); });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }
})();
