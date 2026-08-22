#!/usr/bin/env python3
"""Build the Setlist Hound pages: /setlisthound-with/ + one page per show.

The sibling of tools/build_setlistlizard.py, for Dogs in a Pile. Reads the
per-show JSON payloads in data/hound/ (written today by transcription of
go-set.net's public pages; written tonight-and-onward by the @SetlistHound
bot itself) and emits static pages in the site skin. Pages link the same
/css/setlistlizard.css the Lizard pages use — the classes are generic and one
stylesheet means one facelift covers both bots.

    python tools/build_setlisthound.py --out .

Honesty rules, enforced here:
* A payload marked "transcribed": true gets a provenance line linking its
  go-set source page. No lengths, gaps or debut stats are shown for these —
  the source page carries them; inventing them here would be worse than a link.
* The live board (index) only claims LIVE when setlist.json is fresher than
  40 minutes AND not complete — never because a show exists on the calendar.
"""
from __future__ import annotations

import argparse
import html
import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "hound"

FONTS = ('<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600'
         '&family=Inter:wght@400;500;600;800&display=swap" rel="stylesheet" />')

SUPS = "¹²³⁴⁵⁶⁷⁸⁹"


def sup(n: int) -> str:
    return SUPS[n - 1] if 1 <= n <= 9 else f"({n})"


def e(s) -> str:
    return html.escape(str(s if s is not None else ""), quote=True)


def d_long(iso: str) -> str:
    return datetime.strptime(iso, "%Y-%m-%d").strftime("%A, %B %d, %Y").replace(" 0", " ")


def d_short(iso: str) -> str:
    return datetime.strptime(iso, "%Y-%m-%d").strftime("%b %d").replace(" 0", " ")


def loc(p: dict) -> str:
    return ", ".join(x for x in (p.get("city"), p.get("state")) if x)


def sandwiches(p: dict) -> int:
    """A song that reappears later in the SAME set with something between."""
    n = 0
    for st in p.get("sets", []):
        titles = [s["title"] for s in st.get("songs", [])]
        seen: dict[str, int] = {}
        for i, t in enumerate(titles):
            if t in seen and i - seen[t] > 1:
                n += 1
            seen.setdefault(t, i)
    return n


def ftps(p: dict) -> int:
    n = 0
    for st in p.get("sets", []):
        for s in st.get("songs", []):
            fn = (s.get("footnote") or "").lower()
            if fn.startswith("ftp") or fn.startswith("debut") or ", ftp" in fn:
                n += 1
    return n


def shell(title: str, desc: str, canonical: str, body: str, og_type: str = "article") -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{e(title)}</title>
  <meta name="description" content="{e(desc)}" />
  <link rel="canonical" href="{e(canonical)}" />
  <meta property="og:title" content="{e(title)}" />
  <meta property="og:description" content="{e(desc)}" />
  <meta property="og:type" content="{og_type}" />
  <meta property="og:url" content="{e(canonical)}" />
  <link rel="stylesheet" href="/css/style.css" />
  {FONTS}
  <link rel="stylesheet" href="/css/setlistlizard.css?v=5" />
</head>
<body>
  <header>
    <div class="container nav">
      <a class="logo" href="/">mike<span>side</span></a>
      <button class="nav-toggle" aria-label="Menu">☰</button>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/photos/">Photos</a></li>
        <li><a href="/videos/">Videos</a></li>
        <li><a href="/blog/">Blog</a></li>
        <li><a href="/#set-i" class="active">Sets</a></li>
      </ul>
    </div>
  </header>
  <main>
{body}
  </main>
  <footer>
    <div class="container footer-inner">
      <div>© <span id="year"></span> mikeside.com</div>
      <div><a href="/">Home</a></div>
    </div>
  </footer>
  <script src="/js/main.js"></script>
</body>
</html>
"""


def song_line(song: dict, notes: list[str]) -> str:
    mark = ""
    if song.get("footnote"):
        notes.append(f"{song['title']}: {song['footnote']}")
        mark = f' <span class="fn">{sup(len(notes))}</span>'
    tr = (song.get("transition") or "").strip()
    tr_html = ""
    if tr == ">":
        tr_html = ' <span class="tr">&gt;</span>'
    elif tr == "->":
        tr_html = ' <span class="tr">-&gt;</span>'
    return (f'<li class="srow"><div class="sline">'
            f'<span>{e(song["title"])}{mark}{tr_html}</span>'
            f"</div></li>")


def set_blocks(p: dict) -> tuple[str, list[str]]:
    notes: list[str] = []
    out = ""
    for st in p.get("sets", []):
        rows = "".join(song_line(s, notes) for s in st.get("songs", []))
        count = len(st.get("songs", []))
        out += (f'<div class="setblock"><div class="setname">'
                f'<span>{e(st.get("display") or st.get("label"))}</span>'
                f'<span class="sl">{count} song{"s" if count != 1 else ""}</span></div>'
                f"<ol>{rows}</ol></div>")
    return out, notes


def glance(p: dict) -> str:
    n_songs = sum(len(s.get("songs", [])) for s in p.get("sets", []))
    n_sets = len(p.get("sets", []))
    n_sand = sandwiches(p)
    n_ftp = ftps(p)
    n_notes = sum(1 for st in p.get("sets", []) for s in st.get("songs", []) if s.get("footnote"))
    tiles = [(n_songs, "Songs"), (n_sets, "Sets"), (n_sand, "Sandwiches"),
             (n_ftp, "First-times"), (n_notes, "Notes")]
    return '<div class="glance">' + "".join(
        f'<div class="stat"><div class="n">{v}</div><div class="l">{l}</div></div>'
        for v, l in tiles) + "</div>"


def pager(prev: dict | None, nxt: dict | None, top: bool = False) -> str:
    def link(p, is_prev: bool) -> str:
        if not p:
            return "<span></span>"
        lab = "← Previous show" if is_prev else "Next show →"
        val = f"{d_short(p['show_date'])} · {p.get('venue', '')}"
        return (f'<a href="/setlisthound-with/{p.get("slug", p["show_date"])}/">'
                f'<span><span class="pg-l">{lab}</span><span class="pg-v">{e(val)}</span></span></a>')
    return f'<div class="pager{" top" if top else ""}">{link(prev, True)}{link(nxt, False)}</div>'


def render_show(p: dict, prev: dict | None, nxt: dict | None) -> str:
    slug = p.get("slug", p["show_date"])
    title = f"Dogs in a Pile — {d_short(p['show_date'])}, 2026 · {p.get('venue', '')} — Setlist Hound"
    desc = (f"Dogs in a Pile setlist for {d_long(p['show_date'])} at "
            f"{p.get('venue', '')}, {loc(p)}.")
    canonical = f"https://mikeside.com/setlisthound-with/{slug}/"

    blocks, notes = set_blocks(p)
    fnlist = ""
    if notes:
        fnlist = '<div class="fnlist">' + "".join(
            f"<p>{sup(i + 1)} {e(n)}</p>" for i, n in enumerate(notes)) + "</div>"
    shownote = ""
    if p.get("shownotes"):
        shownote = f'<div class="shownote">{e(p["shownotes"])}</div>'

    prov = ""
    src = p.get("source_url", "https://go-set.net")
    if p.get("transcribed"):
        prov = (f'transcribed from the public setlist at <a href="{e(src)}" rel="noopener">go-set.net</a>, '
                f"which is run by the band · lengths appear once the bot tracks shows live")
    else:
        prov = ('tracked live by <a href="https://x.com/SetlistHound" rel="noopener">@SetlistHound</a> · '
                "song times are feed-arrival times · lengths are live estimates")

    body = f"""    <section class="block" style="border-top:none;">
      <div class="container">
        <div class="crumb"><a href="/setlisthound-with/">Setlist Hound</a> · Dogs in a Pile</div>
        <div class="section-head">
          <span class="setno">{e(d_long(p["show_date"]))}</span>
          <h2>{e(p.get("venue", ""))}</h2>
          <p>{e(loc(p))}</p>
        </div>
        {glance(p)}
        {pager(prev, nxt, top=True)}
        <div class="board">{blocks}{fnlist}{shownote}</div>
        {pager(prev, nxt)}
        <div class="srcline">
          Setlist data: <a href="https://go-set.net" rel="noopener">go-set.net</a> · {prov}<br />
          <a href="https://x.com/SetlistHound" rel="noopener">🐕 @SetlistHound on X</a> ·
          <a href="https://jampicks.net" rel="noopener">play the setlist game at JamPicks</a> ·
          <a href="/setlisthound-with/">all shows</a> · <a href="/#set-ii">← Set II</a><br />
          A fan project — not affiliated with Dogs in a Pile.
        </div>
      </div>
    </section>"""
    return shell(title, desc, canonical, body)


def render_index(payloads: list[dict]) -> str:
    latest = payloads[0]
    latest_blocks, latest_notes = set_blocks(latest)
    latest_fn = ""
    if latest_notes:
        latest_fn = '<div class="fnlist">' + "".join(
            f"<p>{sup(i + 1)} {e(n)}</p>" for i, n in enumerate(latest_notes)) + "</div>"

    months: dict[str, list[dict]] = {}
    for p in payloads:
        months.setdefault(datetime.strptime(p["show_date"], "%Y-%m-%d").strftime("%B %Y"), []).append(p)

    cards = ""
    for month, shows in months.items():
        cards += (f'<div class="setname" style="max-width:820px;margin:1.6rem auto .8rem;">'
                  f"<span>{e(month)}</span><span class=\"sl\">{len(shows)} show{'s' if len(shows) != 1 else ''}</span></div>"
                  f'<div class="srcs">')
        for p in shows:
            n = sum(len(s.get("songs", [])) for s in p.get("sets", []))
            slug = p.get("slug", p["show_date"])
            extra = " · late show" if slug.endswith("-2") else ""
            cards += (f'<a href="/setlisthound-with/{slug}/">{e(d_short(p["show_date"]))} · {e(p.get("venue", ""))}'
                      f'<span class="w">{e(loc(p))} · {n} songs{extra}</span></a>')
        cards += "</div>"

    body = f"""    <section class="block" style="border-top:none;">
      <div class="container">
        <div class="crumb"><a href="/#set-ii">Set II</a> · Setlist Hound</div>
        <div class="section-head">
          <span class="setno">Setlist Hound</span>
          <h2>Dogs in a Pile, song by song</h2>
          <p>Every setlist of 2026, one page per show — and once the bot goes live,
             every song posted to <a href="https://x.com/SetlistHound" rel="noopener">@SetlistHound</a>
             the moment it's played, streamed here in real time.</p>
        </div>

        <div class="board" id="liveboard">
          <div class="setname"><span id="lb-title">{e(latest.get("venue", ""))}</span>
            <span class="sl" id="lb-badge">{e(d_short(latest["show_date"]))} · FINAL</span></div>
          <p style="color:var(--muted);font-size:.9rem;margin:.2rem 0 .6rem;" id="lb-loc">
            {e(d_long(latest["show_date"]))} · {e(loc(latest))}</p>
          <div id="lb-sets">{latest_blocks}{latest_fn}</div>
          <p class="cav">The most recent show. During a show this board switches to LIVE and
             updates on its own, about once a minute.</p>
        </div>

        <div class="section-head" style="margin-top:3rem;">
          <span class="setno">The shows, kept</span>
          <h2>2026 — {len(payloads)} shows</h2>
          <p>Shows before the bot went live are transcribed from
             <a href="https://go-set.net" rel="noopener">go-set.net</a>; everything after is
             tracked live, song by song.</p>
        </div>
        {cards}

        <div class="srcline">
          Setlist data: <a href="https://go-set.net" rel="noopener">go-set.net</a>, which is run by the band ·
          song times are feed-arrival times, not downbeats<br />
          <a href="https://x.com/SetlistHound" rel="noopener">🐕 @SetlistHound on X</a> ·
          <a href="https://jampicks.net" rel="noopener">play the setlist game at JamPicks</a> ·
          <a href="/#set-ii">← Set II</a><br />
          A fan project — not affiliated with Dogs in a Pile.
        </div>
      </div>
    </section>
    <script>
    (function () {{
      "use strict";
      // Live board: swap in setlist.json when it is FRESH (< 40 min) and not
      // complete. Freshness is asserted from the DATA, never from the calendar
      // — existence is not liveness.
      var esc = function (s) {{ return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {{
        return {{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}}[c]; }}); }};
      function render(data) {{
        var live = !data.complete && data.updated_at &&
                   (Date.now() - Date.parse(data.updated_at)) < 40 * 60 * 1000;
        if (!live) return;                       // keep the static latest show
        document.getElementById("lb-title").textContent = data.venue || "Dogs in a Pile";
        document.getElementById("lb-badge").innerHTML =
          '<span style="color:#3fb950;">● LIVE</span>';
        document.getElementById("lb-loc").textContent =
          [data.city, data.state].filter(Boolean).join(", ");
        var h = "";
        (data.sets || []).forEach(function (st) {{
          h += '<div class="setblock"><div class="setname"><span>' + esc(st.display) +
               '</span><span class="sl">' + (st.songs || []).length + ' songs</span></div><ol>';
          (st.songs || []).forEach(function (s, i) {{
            var isNow = st === data.sets[data.sets.length - 1] && i === st.songs.length - 1;
            var tr = (s.transition === ">" || s.transition === "->")
                     ? ' <span class="tr">' + esc(s.transition) + "</span>" : "";
            h += '<li class="srow"><div class="sline"><span' +
                 (isNow ? ' style="color:#3fb950;"' : "") + ">" + esc(s.title) + tr +
                 "</span>" + (isNow ? '<span class="len" style="color:#3fb950;">playing…</span>' : "") +
                 "</div></li>";
          }});
          h += "</ol></div>";
        }});
        document.getElementById("lb-sets").innerHTML = h;
        setTimeout(load, 60000);
      }}
      // The bot's own service is the primary feed (CORS-enabled); the copy
      // committed next to this page is the fallback, so the board still
      // renders history if the bot's host is down or not yet deployed.
      var FEEDS = ["https://setlisthound.info/setlist.json",
                   "/setlisthound-with/setlist.json"];
      function load(i) {{
        i = i || 0;
        if (i >= FEEDS.length) return;
        fetch(FEEDS[i] + "?t=" + Date.now(), {{cache: "no-store"}})
          .then(function (r) {{ if (!r.ok) throw 0; return r.json(); }})
          .then(render).catch(function () {{ load(i + 1); }});
      }}
      load();
    }})();
    </script>"""
    title = "Setlist Hound — Dogs in a Pile setlists"
    desc = ("Dogs in a Pile setlists, song by song — every 2026 show archived, and live "
            "updates from @SetlistHound during shows.")
    return shell(title, desc, "https://mikeside.com/setlisthound-with/", body, og_type="website")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT))
    args = ap.parse_args()
    out_root = Path(args.out) / "setlisthound-with"
    out_root.mkdir(parents=True, exist_ok=True)

    payloads = []
    for f in sorted(DATA.glob("*.json")):
        p = json.loads(f.read_text())
        if p.get("show_date") and p.get("sets"):
            payloads.append(p)
    payloads.sort(key=lambda p: (p["show_date"], p.get("slug", p["show_date"])), reverse=True)

    chrono = list(reversed(payloads))
    for i, p in enumerate(chrono):
        prev = chrono[i - 1] if i > 0 else None
        nxt = chrono[i + 1] if i + 1 < len(chrono) else None
        out = out_root / p.get("slug", p["show_date"]) / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(render_show(p, prev, nxt))

    (out_root / "index.html").write_text(render_index(payloads))

    # The live-feed target. Ships as the latest archived show (complete:true,
    # so the board renders FINAL); the bot overwrites it during shows.
    latest = dict(payloads[0])
    latest["updated_at"] = "2026-08-16T04:00:00+00:00"
    (out_root / "setlist.json").write_text(json.dumps(latest, indent=1, ensure_ascii=False))

    print(f"built {len(payloads)} show pages + index + setlist.json into {out_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
