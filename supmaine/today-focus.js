/* today-focus.js — 2026-08-07
   "Today first" view for the v1 itinerary.

   Day cards whose date has already passed are hidden behind a single toggle
   chip at the top of #route; today's card is opened and scrolled into view on
   load. Nothing is deleted or reordered — hidden days keep their DOM position,
   so trip-log ordinals, the scrollspy, weather/tides/photos enrichment and the
   day-nav chips all keep working.

   Standalone + self-injecting by design: revert = delete the one <script> tag
   in index.html. Styles are injected here so supmaine.css needs no version bump.

   Edge cases handled: before the trip (nothing is past → no change); after the
   trip (everything is past → no change, whole trip stays browsable); a day with
   two dates (data-date + data-date2) counts as past only once BOTH have gone by.
   "Today" is computed in America/New_York, not device-local, so a phone still on
   Central time doesn't roll the day over at 11pm. */
(function () {
  "use strict";

  var built = false, scrolled = false, pastCount = 0;

  function todayISO() {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit"
      }).format(new Date());
    } catch (e) {
      var d = new Date();
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
             "-" + String(d.getDate()).padStart(2, "0");
    }
  }

  function lastDate(sec) {
    var out = [];
    if (sec.dataset.date)  out.push(sec.dataset.date);
    if (sec.dataset.date2) out.push(sec.dataset.date2);
    return out.length ? out.sort().pop() : null;   // undated sections are never hidden
  }

  function injectStyle() {
    if (document.getElementById("pf-style")) return;
    var s = document.createElement("style");
    s.id = "pf-style";
    s.textContent = [
      "body.pf-hide .day.pf-past{display:none!important}",
      ".pf-bar{display:flex;justify-content:center;margin:2px 0 20px}",
      ".pf-btn{display:inline-flex;align-items:center;gap:9px;cursor:pointer;",
      "padding:12px 20px;border-radius:100px;background:var(--paper,#F7F8F4);",
      "border:1.5px dashed rgba(22,41,59,.38);color:var(--ink,#16293B);",
      "font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;",
      "letter-spacing:.12em;text-transform:uppercase;line-height:1;",
      "transition:border-color .15s ease,transform .15s ease}",
      ".pf-btn:hover{border-style:solid;transform:translateY(-1px)}",
      ".pf-btn .pf-ic{font-size:13px;line-height:1}",
      "nav .chip.pf-done{opacity:.42}",
      "nav .chip.pf-done::after{content:'\\2713';margin-left:5px;font-size:9px}"
    ].join("");
    document.head.appendChild(s);
  }

  function setLabel() {
    var b = document.getElementById("pf-btn");
    if (!b) return;
    var hidden = document.body.classList.contains("pf-hide");
    b.innerHTML = hidden
      ? '<span class="pf-ic">&#10003;</span>' + pastCount + " day" + (pastCount > 1 ? "s" : "") + " done &mdash; show"
      : '<span class="pf-ic">&#9652;</span>hide earlier days';
    b.setAttribute("aria-expanded", hidden ? "false" : "true");
  }

  function toggle() {
    document.body.classList.toggle("pf-hide");
    setLabel();
  }

  function build() {
    if (built) return;
    var route = document.getElementById("route");
    if (!route) return;
    var days = Array.prototype.slice.call(route.querySelectorAll("section.day"));
    if (days.length < 7) return;                 // fragments still landing
    built = true;
    injectStyle();

    var today = todayISO();
    var past = days.filter(function (d) { var l = lastDate(d); return l && l < today; });

    // Hide only if we're actually mid-trip. Trip over (everything past) or not
    // started (nothing past) → leave the page exactly as it was.
    if (past.length && past.length < days.length) {
      pastCount = past.length;
      past.forEach(function (d) {
        d.classList.add("pf-past");
        var chip = document.querySelector('nav .chip[href="#' + d.id + '"]');
        if (chip) chip.classList.add("pf-done");
      });
      document.body.classList.add("pf-hide");

      var bar = document.createElement("div");
      bar.className = "pf-bar";
      bar.innerHTML = '<button type="button" class="pf-btn" id="pf-btn" aria-expanded="false"></button>';
      route.insertBefore(bar, route.firstChild);
      document.getElementById("pf-btn").addEventListener("click", toggle);
      setLabel();

      // tapping a past day's nav chip un-hides it before the hash jump
      Array.prototype.forEach.call(document.querySelectorAll("nav .chip.pf-done"), function (c) {
        c.addEventListener("click", function () {
          if (document.body.classList.contains("pf-hide")) toggle();
        });
      });
    }

    // open today's card and land on it
    var t = days.filter(function (d) {
      return d.dataset.date === today || d.dataset.date2 === today;
    })[0];
    if (!t) return;
    t.classList.add("open");
    var head = t.querySelector(".card-head");
    if (head) head.setAttribute("aria-expanded", "true");
    var card = t.querySelector(".card");
    if (card) card.classList.add("today");

    // don't fight a deep link, and don't yank the page if he's already scrolling
    if (location.hash || scrolled || window.pageYOffset > 160) return;
    scrolled = true;
    setTimeout(function () {
      var y = Math.max(t.getBoundingClientRect().top + window.pageYOffset - 84, 0);
      try { window.scrollTo({ top: y, behavior: "smooth" }); }
      catch (e) { window.scrollTo(0, y); }
    }, 320);
  }

  function start() {
    var route = document.getElementById("route");
    if (!route) return;
    var mo = new MutationObserver(function () { build(); if (built) mo.disconnect(); });
    mo.observe(route, { childList: true });
    build();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
