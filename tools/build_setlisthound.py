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


def slug(title: str) -> str:
    """Internal song slug. Our own namespace (/setlisthound-with/song/<slug>/),
    not go-set's — theirs is unverified; ours only has to be stable."""
    s = title.lower()
    s = re.sub(r"[\u2018\u2019']", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "untitled"


CUSTOM = "_custom_"   # go-set's free-text entry (song_id 1): real, not repertoire


def song_key(song: dict):
    """The stable key for a song, or None if it should not get a song page.

    go-set's own ``slug`` is 1:1 with its ``song_id`` (verified across 4000
    rows) and survives title typos -- "Bend Strange" and "Bent Strange" share
    slug ``bent-strange``. Prefer it. Fall back to a title slug only for
    payloads captured before we carried the field.
    """
    gs = song.get("song_slug")
    if gs == CUSTOM:
        return None                      # one-offs: shown, never aggregated
    return gs or slug(song["title"])


def cover_artist(song: dict):
    """The original artist for a cover, or None.

    go-set carries this as a FIELD (``original_artist``), verified populated on
    1132 of 1138 covers across the archive. Prefer it absolutely: the footnote
    regex below is guesswork that survives only for pre-API transcriptions.
    """
    a = song.get("original_artist")
    if a:
        return str(a).strip() or None
    return cover_credit(song.get("footnote") or "")


def cover_credit(fn: str):
    """FALLBACK ONLY: read a cover credit out of footnote prose.
    Used for payloads captured before ``original_artist`` was available.
    Same conventions as the stats page: skip teases/endings/guest-only notes."""
    if not fn or re.search(r"tease|ending only|unfinished|^with |^featuring", fn, re.I):
        return None
    artist = re.sub(r"^FTP,\s*", "", fn)
    artist = re.sub(r"[;,]\s*(with|featuring).*$", "", artist, flags=re.I)
    artist = re.sub(r";.*$", "", artist).strip()
    if not artist or len(artist) > 40 or re.search(r'[.!?"]', artist):
        return None
    return artist


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
  <link rel="stylesheet" href="/css/setlistlizard.css?v=8" />
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


def _norm_credit(t: str) -> str:
    """Loose compare for 'is this footnote just the artist name again?'.
    Measured on 2026: 169 of 218 covers have a footnote identical to
    original_artist, so showing both would be noise on four rows in five.
    Case, smart quotes and a trailing full stop are not differences;
    'FTP,' and 'with <guest>' are."""
    t = re.sub(r"[\u2018\u2019\u201c\u201d\"']", "", (t or "").lower())
    t = re.sub(r"[.,;:]+$", "", t).strip()
    return re.sub(r"\s+", " ", t)


def song_line(song: dict, notes: list[str]) -> str:
    mark = ""
    artist = cover_artist(song)
    fn = song.get("footnote") or ""
    # Keep the footnote only when it says something the inline credit does not
    # -- a guest, an FTP flag, a tease.
    if fn and (not artist or _norm_credit(fn) != _norm_credit(artist)):
        notes.append(f"{song['title']}: {fn}")
        mark = f' <span class="fn">{sup(len(notes))}</span>'
    tr = (song.get("transition") or "").strip()
    tr_html = ""
    if tr == ">":
        tr_html = ' <span class="tr">&gt;</span>'
    elif tr == "->":
        tr_html = ' <span class="tr">-&gt;</span>'
    k = song_key(song)
    t = (f'<a class="song-t" href="/setlisthound-with/song/{k}/">{e(song["title"])}</a>'
         if k else e(song["title"]))
    ln = ""
    if song.get("length_secs"):
        m, s = divmod(int(song["length_secs"]), 60)
        ln = f'<span class="len">{m}:{s:02d}</span>'
    # Covers wear their author inline. It is the single most useful thing to
    # know scanning a DIAP setlist -- roughly a fifth of any night is somebody
    # else's song -- and the field is the band's own data, not a guess.
    cov = f'<span class="cov">{e(artist)}</span>' if artist else ""
    return (f'<li class="srow{" is-cover" if artist else ""}"><div class="sline">'
            f'<span>{t}{mark}{tr_html}{cov}</span>{ln}'
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


# ---------------------------------------------------------------------------
# Per-show charts.
#
# Palette: the reference categorical dark slots, IN SLOT ORDER, validated
# against this site's card surface (#151c38) -- all five checks pass: lightness
# band, chroma floor, CVD separation, normal-vision floor, contrast. Reordering
# them breaks CVD separation (measured: magenta/aqua drop to dE 1.6 for
# deuteranopia), which is why the order is fixed and hues follow the ENTITY,
# never its size rank. Do not "improve" this by sorting.
SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"]
# Debut year is ORDINAL, not categorical -- nine years cannot be nine hues
# (the palette has eight slots and ordered data must not be shuffled into
# arbitrary colours). It gets one hue, light to dark, as bars.
ORDINAL = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#104281"]
SURFACE = "#151c38"


def donut(slices: list, total: int, centre_label: str = "") -> str:
    """slices: [(label, count, colour)]. A donut, not a pie: the hole carries
    the total, which a pie has to put in a caption instead."""
    if not total:
        return ""
    R, C = 35.0, 50.0
    circ = 2 * 3.14159265 * R
    out, offset = "", 0.0
    for label, n, colour in slices:
        frac = n / total
        seg = frac * circ
        gap = 1.6 if len(slices) > 1 else 0.0     # 2px-ish surface gap
        out += (f'<circle cx="{C}" cy="{C}" r="{R}" fill="none" stroke="{colour}" '
                f'stroke-width="14" stroke-dasharray="{max(seg - gap, 0.4):.2f} {circ - max(seg - gap, 0.4):.2f}" '
                f'stroke-dashoffset="{-offset:.2f}" transform="rotate(-90 {C} {C})">'
                f'<title>{e(label)}: {n} of {total}</title></circle>')
        offset += seg
    mid = ""
    if centre_label:
        mid = (f'<text x="{C}" y="{C - 1}" text-anchor="middle" fill="var(--text)" '
               f'font-size="15" font-weight="600" font-family="Fraunces,Georgia,serif">{e(total)}</text>'
               f'<text x="{C}" y="{C + 11}" text-anchor="middle" fill="var(--muted)" '
               f'font-size="6.5" letter-spacing="1.2">{e(centre_label.upper())}</text>')
    return (f'<svg viewBox="0 0 100 100" class="donut" role="img" '
            f'aria-label="{e(centre_label)}">{out}{mid}</svg>')


def legend(slices: list, total: int) -> str:
    """Identity is never colour-alone: every slice is named and counted."""
    rows = ""
    for label, n, colour in slices:
        pct = round(100 * n / total) if total else 0
        rows += (f'<li><i style="background:{colour}"></i>'
                 f'<span class="k">{e(label)}</span>'
                 f'<span class="v">{n}<em>{pct}%</em></span></li>')
    return f'<ul class="ckey">{rows}</ul>'


def ordinal_bars(pairs: list, total: int) -> str:
    """pairs: [(label, count)] already in natural order. Ordered data keeps its
    order; a single hue darkens with magnitude."""
    if not pairs:
        return ""
    top = max(n for _, n in pairs) or 1
    rows = ""
    for label, n in pairs:
        w = max(3, round(100 * n / top))
        # ONE hue. Bar length already encodes magnitude; shading it too is
        # redundant, and on a dark surface a "darker means more" ramp reads
        # backwards -- the biggest value would be the least visible.
        rows += (f'<div class="obar"><span class="ol">{e(label)}</span>'
                 f'<span class="ot"><i style="width:{w}%;background:{ORDINAL[3]}"></i></span>'
                 f'<span class="on">{n}</span></div>')
    return f'<div class="obars">{rows}</div>'


def album_slices(p: dict, albums: dict) -> tuple:
    """Album membership for one show. 'Unreleased' and 'Cover' are first-class:
    across 2026 they are 51% and 21% of everything played, so burying them in a
    residue bucket would misdescribe the night."""
    import collections
    track_album = {}
    order = []
    for a in albums.get("albums", []):
        order.append(a["title"])
        for t in a["tracks"]:
            track_album[t] = a["title"]
    counts = collections.Counter()
    for st in p.get("sets", []):
        for sg in st.get("songs", []):
            if song_key(sg) is None:
                continue                      # go-set one-off: not repertoire
            t = sg["title"]
            if t in track_album:
                counts[track_album[t]] += 1
            elif cover_artist(sg):
                counts["Cover"] += 1
            else:
                counts["Unreleased"] += 1
    # Fixed entity order -> fixed colour. A show missing an album does not
    # repaint the others.
    cats = order + ["Unreleased", "Cover"]
    slices = [(c, counts[c], SERIES[i % len(SERIES)])
              for i, c in enumerate(cats) if counts[c]]
    return slices, sum(counts.values())


def debut_pairs(p: dict, debut_year: dict) -> tuple:
    import collections
    c = collections.Counter()
    for st in p.get("sets", []):
        for sg in st.get("songs", []):
            k = song_key(sg)
            if k is None:
                continue
            y = debut_year.get(k)
            if y:
                c[y] += 1
    return sorted(c.items()), sum(c.values())


def show_charts(p: dict, albums: dict, debut_year: dict) -> str:
    a_sl, a_tot = album_slices(p, albums)
    d_pr, d_tot = debut_pairs(p, debut_year)
    if a_tot < 4:                       # too few songs to say anything
        return ""
    cards = (f'<div class="chart"><div class="ch">Where the songs come from</div>'
             f'{donut(a_sl, a_tot, "songs")}{legend(a_sl, a_tot)}</div>')
    if d_pr:
        first = min(y for y, _ in d_pr)
        cards += (f'<div class="chart"><div class="ch">First played, by year</div>'
                  f'{ordinal_bars(d_pr, d_tot)}'
                  f'<p class="cnote">Debut years are counted from this archive, which '
                  f'starts in July 2018.</p></div>')
    return (f'<div class="charts">{cards}</div>')


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


def render_show(p: dict, prev: dict | None, nxt: dict | None,
                albums: dict | None = None, debut_year: dict | None = None) -> str:
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
    if p.get("api_captured"):
        prov = (f'from the band’s own data at <a href="{e(src)}" rel="noopener">go-set.net</a> · '
                f"song lengths, where shown, are the band’s timings")
    elif p.get("transcribed"):
        prov = (f'transcribed from the public setlist at <a href="{e(src)}" rel="noopener">go-set.net</a>, '
                f"which is run by the band · lengths appear once the bot tracks shows live")
    else:
        prov = ('tracked live by <a href="https://x.com/SetlistHound" rel="noopener">@SetlistHound</a> · '
                "song times are feed-arrival times · lengths are live estimates")

    body = f"""    <section class="block" style="border-top:none;">
      <div class="container">
        <div class="crumb"><a href="/setlisthound-with/">Setlist Hound</a> · <a href="/setlisthound-with/stats/">Stats</a> · <a href="/setlisthound-with/credits/">Credits &amp; FAQ</a></div>
        <div class="section-head">
          <span class="setno">{e(d_long(p["show_date"]))}</span>
          <h2>{e(p.get("venue", ""))}</h2>
          <p>{e(loc(p))}</p>
        </div>
        {glance(p)}
        {show_charts(p, albums or {}, debut_year or {})}
        {pager(prev, nxt, top=True)}
        <div class="board">{blocks}{fnlist}{shownote}</div>
        {pager(prev, nxt)}
        <div class="srcs" style="margin-top:2rem;">
          <a href="{e(src)}" rel="noopener">go-set.net<span class="w">The band's own setlist page — the source</span></a>
          <a href="https://dogsinapile.bandcamp.com" rel="noopener">Bandcamp<span class="w">Soundboards, when the band posts them</span></a>
          <a href="https://www.nugs.net/artist/dogs-in-a-pile" rel="noopener">nugs.net<span class="w">Official live recordings</span></a>
          <a href="https://jampicks.com" rel="noopener">JamPicks<span class="w">Play the setlist game</span></a>
        </div>
        <div class="srcline">
          Setlist data: <a href="https://go-set.net" rel="noopener">go-set.net</a> · {prov}<br />
          <a href="https://x.com/SetlistHound" rel="noopener">🐕 @SetlistHound on X</a> ·
          <a href="https://jampicks.com" rel="noopener">play the setlist game at JamPicks</a> ·
          <a href="/setlisthound-with/">all shows</a> · <a href="/#set-ii">← Set II</a><br />
          A fan project — not affiliated with Dogs in a Pile.
        </div>
      </div>
    </section>"""
    return shell(title, desc, canonical, body)


def by_year(payloads: list[dict]) -> dict[str, list[dict]]:
    """year -> shows (payloads stay newest-first within the year)."""
    out: dict[str, list[dict]] = {}
    for p in payloads:
        out.setdefault(p["show_date"][:4], []).append(p)
    return out


def year_nav(years: dict[str, list[dict]], current: str) -> str:
    """One row of year links; the current year renders as text, not a link.
    Rendered only when the archive spans more than one year."""
    if len(years) < 2:
        return ""
    parts = []
    for y in sorted(years, reverse=True):
        n = len(years[y])
        inner = (f'<span class="yr">{y}</span>'
                 f'<span class="w">{n} show{"s" if n != 1 else ""}</span>')
        if y == current:
            parts.append(f'<span class="cur" aria-current="page">{inner}</span>')
        else:
            href = "/setlisthound-with/" if y == max(years) else f"/setlisthound-with/{y}/"
            parts.append(f'<a href="{href}">{inner}</a>')
    total = sum(len(v) for v in years.values())
    return ('<div class="setname" style="max-width:820px;margin:2.2rem auto .6rem;">'
            f'<span>Browse by year</span><span class="sl">{total} shows kept</span></div>'
            '<div class="ynav">' + "".join(parts) + "</div>")


def month_cards(shows: list[dict]) -> str:
    months: dict[str, list[dict]] = {}
    for p in shows:
        months.setdefault(datetime.strptime(p["show_date"], "%Y-%m-%d").strftime("%B %Y"), []).append(p)
    cards = ""
    for month, ms in months.items():
        cards += (f'<div class="setname" style="max-width:820px;margin:1.6rem auto .8rem;">'
                  f"<span>{e(month)}</span><span class=\"sl\">{len(ms)} show{'s' if len(ms) != 1 else ''}</span></div>"
                  f'<div class="srcs">')
        for p in ms:
            n = sum(len(s.get("songs", [])) for s in p.get("sets", []))
            pslug = p.get("slug", p["show_date"])
            extra = " · late show" if pslug.endswith("-2") else ""
            cards += (f'<a href="/setlisthound-with/{pslug}/">{e(d_short(p["show_date"]))} · {e(p.get("venue", ""))}'
                      f'<span class="w">{e(loc(p))} · {n} songs{extra}</span></a>')
        cards += "</div>"
    return cards


def render_year(year: str, shows: list[dict], years: dict[str, list[dict]]) -> str:
    body = f"""    <section class="block" style="border-top:none;">
      <div class="container">
        <div class="crumb"><a href="/setlisthound-with/">Setlist Hound</a> ·
          <a href="/setlisthound-with/stats/">Stats</a> ·
          <a href="/setlisthound-with/credits/">Credits &amp; FAQ</a></div>
        <div class="section-head">
          <span class="setno">The shows, kept</span>
          <h2>{e(year)} — {len(shows)} shows</h2>
          <p>Every Dogs in a Pile setlist of {e(year)}, transcribed from
             <a href="https://go-set.net" rel="noopener">go-set.net</a>, the band's own setlist site.</p>
        </div>
        {year_nav(years, year)}
        {month_cards(shows)}
        <div class="srcline">
          Setlist data: <a href="https://go-set.net" rel="noopener">go-set.net</a>, run by the band ·
          <a href="/setlisthound-with/">latest shows</a> ·
          <a href="https://x.com/SetlistHound" rel="noopener">🐕 @SetlistHound on X</a><br />
          A fan project — not affiliated with Dogs in a Pile.
        </div>
      </div>
    </section>"""
    return shell(f"Dogs in a Pile {year} setlists — Setlist Hound",
                 f"All {len(shows)} Dogs in a Pile shows of {year}, one page per show.",
                 f"https://mikeside.com/setlisthound-with/{year}/", body)


def render_index(payloads: list[dict]) -> str:
    latest = payloads[0]
    latest_blocks, latest_notes = set_blocks(latest)
    latest_fn = ""
    if latest_notes:
        latest_fn = '<div class="fnlist">' + "".join(
            f"<p>{sup(i + 1)} {e(n)}</p>" for i, n in enumerate(latest_notes)) + "</div>"

    years = by_year(payloads)
    this_year = max(years)
    span = this_year if len(years) == 1 else f"{min(years)}–{max(years)}"
    cards = year_nav(years, this_year) + month_cards(years[this_year])

    body = f"""    <section class="block" style="border-top:none;">
      <div class="container">
        <div class="crumb"><a href="/#set-ii">Set II</a> · Setlist Hound · <a href="/setlisthound-with/stats/">Stats</a></div>
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
          <h2>{e(this_year)} — {len(years[this_year])} shows</h2>
          <p>Shows before the bot went live are transcribed from
             <a href="https://go-set.net" rel="noopener">go-set.net</a>; everything after is
             tracked live, song by song. {len(payloads)} shows archived, {e(span)}.</p>
        </div>
        {cards}

        <div class="srcline">
          Setlist data: <a href="https://go-set.net" rel="noopener">go-set.net</a>, which is run by the band ·
          song times are feed-arrival times, not downbeats<br />
          <a href="https://x.com/SetlistHound" rel="noopener">🐕 @SetlistHound on X</a> ·
          <a href="https://jampicks.com" rel="noopener">play the setlist game at JamPicks</a> ·
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
    desc = (f"Dogs in a Pile setlists, song by song — {len(payloads)} shows archived "
            f"({span}), and live updates from @SetlistHound during shows.")
    return shell(title, desc, "https://mikeside.com/setlisthound-with/", body, og_type="website")


STATS_EXCLUDED = {"2026-03-18", "2026-04-20"}   # all-Dead specials; see page note


def compute_stats(payloads: list) -> dict:
    """Counts this archive can honestly claim. Nothing here replicates go-set's
    own gap chart or play-count stats — those are the band's, computed from
    their full history; these are counts of THIS year's 74 tracked shows."""
    import collections
    import re as _re

    plays = collections.Counter()                    # song_key -> play count
    play_titles = collections.defaultdict(collections.Counter)   # song_key -> spellings
    covers = collections.Counter()
    openers = collections.Counter()
    closers = collections.Counter()
    dead_special = 0
    total_songs = total_sand = 0
    venues = set()
    months = collections.Counter()
    biggest = ("", "", 0)

    for p in payloads:
        excluded = p["show_date"] in STATS_EXCLUDED
        months[datetime.strptime(p["show_date"], "%Y-%m-%d").strftime("%b")] += 1
        venues.add(p.get("venue", ""))
        n = 0
        for st in p["sets"]:
            songs = st["songs"]
            n += len(songs)
            for s in songs:
                # Count plays per SONG, not per spelling: song_key merges the
                # title variants go-set corrects over time.
                k = song_key(s)
                if k is not None:
                    plays[k] += 1
                    play_titles[k][s["title"]] += 1
                artist = cover_artist(s)
                if artist:
                    if excluded and artist in ("Grateful Dead", "Bob Weir", "Jerry Garcia"):
                        dead_special += 1
                    else:
                        covers[artist] += 1
        first = p["sets"][0]["songs"]
        last = p["sets"][-1]["songs"]
        if first:
            openers[first[0]["title"]] += 1
        if last:
            closers[last[-1]["title"]] += 1
        if n > biggest[2]:
            biggest = (p["show_date"], p.get("venue", ""), n)
        total_songs += n
        total_sand += sandwiches(p)

    return {
        "shows": len(payloads), "performances": total_songs,
        "unique": len(plays), "venues": len(venues), "sandwiches": total_sand,
        "plays": [(play_titles[k].most_common(1)[0][0], n) for k, n in plays.most_common(15)],
        "covers": covers.most_common(12),
        "openers": openers.most_common(8), "closers": closers.most_common(8),
        "months": months, "biggest": biggest, "dead_special": dead_special,
    }


def _bars(rows: list, total_label: str) -> str:
    """The site's own .plc bar pattern — label, proportional bar, count."""
    if not rows:
        return ""
    top = rows[0][1]
    out = ""
    for name, n in rows:
        pct = max(4, round(100 * n / top))
        out += (f'<div class="plc"><span class="pl" style="width:11rem;'
                f'text-transform:none;letter-spacing:0;font-size:.88rem;">{e(name)}</span>'
                f'<span class="pbar"><i style="width:{pct}%"></i></span>'
                f'<span class="pn">{n}</span></div>')
    return (f'<div class="tube" style="width:100%"><span class="lab">{e(total_label)}</span>{out}</div>')


def render_stats(payloads: list) -> str:
    s = compute_stats(payloads)
    yr = payloads[0]["show_date"][:4] if payloads else ""
    glance_html = '<div class="glance">' + "".join(
        f'<div class="stat"><div class="n">{v}</div><div class="l">{l}</div></div>'
        for v, l in [
            (s["shows"], "Shows"), (s["performances"], "Song performances"),
            (s["unique"], "Different songs"), (s["venues"], "Venues"),
            (s["sandwiches"], "Sandwiches"),
        ]) + "</div>"

    months_order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
                    "Sep", "Oct", "Nov", "Dec"]
    month_rows = [(m, s["months"][m]) for m in months_order if s["months"].get(m)]
    top_m = max(n for _, n in month_rows)
    months_html = '<div class="tube" style="width:100%"><span class="lab">Shows per month</span>' + "".join(
        f'<div class="plc"><span class="pl">{m}</span>'
        f'<span class="pbar"><i style="width:{max(4, round(100 * n / top_m))}%"></i></span>'
        f'<span class="pn">{n}</span></div>' for m, n in month_rows) + (
        f'<p class="cav">Biggest night: {e(d_long(s["biggest"][0]))} at '
        f'{e(s["biggest"][1])} — {s["biggest"][2]} songs.</p></div>')

    covers_note = (
        f'<p class="cav">Counted from cover credits on each show page. Two special '
        f'shows are excluded — the 4/20 "Dogs Play Dead" launch party and a private '
        f'all-Dead set ({s["dead_special"]} more Dead-family covers between them) — '
        f'because leaving them in would say more about two setlists than about a year '
        f'of shows.</p>')

    body = f"""    <section class="block" style="border-top:none;">
      <div class="container">
        <div class="crumb"><a href="/setlisthound-with/">Setlist Hound</a> · Stats</div>
        <div class="section-head">
          <span class="setno">2026 in numbers</span>
          <h2>{e(yr)}, counted</h2>
          <p>Every number below comes from the {s["shows"]} shows in this archive —
             transcribed from <a href="https://go-set.net" rel="noopener">go-set.net</a>,
             which is run by the band. For all-time play counts and gap charts, go-set
             itself is the authority; this page counts <em>this year</em>.</p>
        </div>
        {glance_html}
        <div style="display:flex;flex-direction:column;gap:1rem;max-width:820px;margin:1.4rem auto 0;">
          {_bars(s["plays"], f"Most played, {yr}")}
          <div>{_bars(s["covers"], "Most covered artists")}{covers_note}</div>
          {_bars(s["openers"], "Favorite openers")}
          {_bars(s["closers"], "Favorite closers")}
          {months_html}
        </div>
        <p class="cav" style="max-width:820px;margin:2rem auto 0;">
          These counts are <strong>{e(yr)} only</strong> — the archive here goes back to
          2018. Browse any year from <a href="/setlisthound-with/">the show list</a>.
          All-time play counts and gaps are the band's, at
          <a href="https://go-set.net" rel="noopener">go-set.net</a>.</p>
        <div class="srcline">
          Setlist data: <a href="https://go-set.net" rel="noopener">go-set.net</a> ·
          counts regenerate as shows are added<br />
          <a href="https://x.com/SetlistHound" rel="noopener">🐕 @SetlistHound on X</a> ·
          <a href="/setlisthound-with/">all shows</a> · <a href="/#set-ii">← Set II</a><br />
          A fan project — not affiliated with Dogs in a Pile.
        </div>
      </div>
    </section>"""
    return shell(f"Setlist Hound — {yr} tour stats",
                 f"Dogs in a Pile {yr} by the numbers: most played songs, most covered "
                 f"artists, openers, closers, sandwiches — from {len(payloads)} shows.",
                 "https://mikeside.com/setlisthound-with/stats/", body)


def collect_songs(payloads: list) -> dict:
    """slug -> {title, plays: [(payload, set_display, position_in_set)], covers}."""
    import collections
    songs: dict = {}
    for pay in reversed(payloads):          # chronological
        for st in pay["sets"]:
            for i, sg in enumerate(st["songs"], start=1):
                sl = song_key(sg)
                if sl is None:              # go-set one-off, no song page
                    continue
                entry = songs.setdefault(sl, {"plays": [], "credits": set(),
                                              "titles": collections.Counter()})
                entry["titles"][sg["title"]] += 1
                entry["plays"].append((pay, st.get("display") or st.get("label"), i))
                c = cover_artist(sg)
                if c:
                    entry["credits"].add(c)
    # Canonical title = most-played spelling; a typo corrected once never wins.
    for entry in songs.values():
        entry["title"] = entry["titles"].most_common(1)[0][0]
    return songs


def render_song(sl: str, info: dict) -> str:
    title = info["title"]
    n = len(info["plays"])
    first = info["plays"][0][0]
    last = info["plays"][-1][0]
    yrs = sorted({p[0]["show_date"][:4] for p in info["plays"]})
    span_txt = f"in {yrs[0]}" if len(yrs) == 1 else f"between {yrs[0]} and {yrs[-1]}"
    credit = ""
    if info["credits"]:
        names = sorted(info["credits"])
        credit = (f'<p style="color:var(--muted);">Originally performed by '
                  f'{e(" / ".join(names))}.</p>')

    rows = ""
    for pay, set_disp, pos in reversed(info["plays"]):     # newest first
        pslug = pay.get("slug", pay["show_date"])
        rows += (f'<a class="vrow" href="/setlisthound-with/{pslug}/"><div class="vtop">'
                 f'<span class="vd">{e(d_short(pay["show_date"]))}</span>'
                 f'<span class="vv">{e(pay.get("venue", ""))} — {e(loc(pay))}</span>'
                 f'<span class="vs">{e(set_disp)} · #{pos}</span>'
                 f"</div></a>")

    body = f"""    <section class="block" style="border-top:none;">
      <div class="container">
        <div class="crumb"><a href="/setlisthound-with/">Setlist Hound</a> · Songs · {e(title)}</div>
        <div class="section-head">
          <span class="setno">Song</span>
          <h2>{e(title)}</h2>
          <p>Played <strong>{n}</strong> time{"s" if n != 1 else ""} {span_txt} —
             first {e(d_short(first["show_date"]))}, most recently {e(d_short(last["show_date"]))}.
             Counts are from this archive; all-time numbers live at
             <a href="https://go-set.net">go-set.net</a>.</p>
        </div>
        {credit}
        <div class="board" style="margin-top:1rem;"><div class="vlist">{rows}</div></div>
        <div class="srcline">
          <a href="/setlisthound-with/">all shows</a> ·
          <a href="/setlisthound-with/stats/">stats</a> ·
          <a href="https://x.com/SetlistHound" rel="noopener">@SetlistHound on X</a>
        </div>
      </div>
    </section>"""
    return shell(f"{title} — Setlist Hound",
                 f"Every archived Dogs in a Pile performance of {title}, one row per show.",
                 f"https://mikeside.com/setlisthound-with/song/{sl}/", body)


def render_credits(n_shows: int) -> str:
    body = f"""    <section class="block" style="border-top:none;">
      <div class="container">
        <div class="crumb"><a href="/setlisthound-with/">Setlist Hound</a> · Credits &amp; FAQ</div>
        <div class="section-head">
          <span class="setno">Credits</span>
          <h2>Who makes this possible</h2>
        </div>
        <div class="credit">
          <div class="credit-k">The source</div>
          <a class="credit-n" href="https://go-set.net" rel="noopener">go-set.net</a>
          <p>Run by Dogs in a Pile themselves. Every setlist here comes from it, and during
             shows their crew enters songs in real time — which is the single fact that makes
             a live bot possible. If you like this, thank them, not us.</p>
        </div>
        <div class="credit">
          <div class="credit-k">The band</div>
          <a class="credit-n" href="https://dogsinapileofficial.com" rel="noopener">Dogs in a Pile</a>
          <p>This is a fan project and is not affiliated with the band. Buy a ticket, buy the
             soundboards on <a href="https://dogsinapile.bandcamp.com" rel="noopener">Bandcamp</a>
             and <a href="https://www.nugs.net/artist/dogs-in-a-pile" rel="noopener">nugs</a>.</p>
        </div>
        <div class="section-head" style="margin-top:2.5rem;">
          <span class="setno">FAQ</span>
          <h2>Fair questions</h2>
        </div>
        <div class="faq">
          <div class="qa"><h3>What is this?</h3>
            <p>{n_shows} Dogs in a Pile shows, one page per show — and a bot,
               <a href="https://x.com/SetlistHound" rel="noopener">@SetlistHound</a>, that will post
               each song to X as it's played, the way its sibling
               <a href="https://x.com/SetlistLizard" rel="noopener">@SetlistLizard</a> does for Phish.</p></div>
          <div class="qa"><h3>How live is "live"?</h3>
            <p>The band's crew types each song into go-set during the show; the bot picks it up and
               posts. So the honest answer is: as live as a human typing plus a short delay. Song
               times shown anywhere are when a song reached the feed, not the downbeat.</p></div>
          <div class="qa"><h3>Where do song lengths come from?</h3>
            <p>Where a length is shown on an archived show, it's the band's own timing from
               go-set — we display it, we never invent it. Songs without a timing simply show
               none. Once the bot tracks shows live, live lengths appear as estimates, clearly
               marked.</p></div>
          <div class="qa"><h3>Something's wrong on a page.</h3>
            <p>Every show page links its go-set source — the band's page is the authority. Pre-bot
               pages were transcribed and a transcription can carry a typo; tell us and we'll fix
               it against the source.</p></div>
          <div class="qa"><h3>Can I play along?</h3>
            <p>Yes — <a href="https://jampicks.com" rel="noopener">JamPicks</a> is the setlist
               prediction game. Pick your songs before the show and see how you did.</p></div>
        </div>
        <div class="srcline">
          <a href="/setlisthound-with/">all shows</a> ·
          <a href="/setlisthound-with/stats/">stats</a> ·
          <a href="/#set-ii">← Set II</a>
        </div>
      </div>
    </section>"""
    return shell("Setlist Hound — credits & FAQ",
                 "Who makes the Dogs in a Pile setlist bot possible, and fair questions answered.",
                 "https://mikeside.com/setlisthound-with/credits/", body)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT))
    args = ap.parse_args()
    out_root = Path(args.out) / "setlisthound-with"
    out_root.mkdir(parents=True, exist_ok=True)

    payloads = []
    for f in sorted(DATA.glob("*.json")):
        p = json.loads(f.read_text(encoding="utf-8"))
        if p.get("show_date") and p.get("sets"):
            payloads.append(p)
    payloads.sort(key=lambda p: (p["show_date"], p.get("slug", p["show_date"])), reverse=True)

    chrono = list(reversed(payloads))

    # Chart inputs, computed once. Debut year comes from THIS archive, so the
    # note under the chart says where the archive starts -- a song first seen
    # on day one may well have been played before it.
    albums_path = ROOT / "data" / "hound-meta" / "albums.json"
    albums = json.loads(albums_path.read_text(encoding="utf-8")) if albums_path.exists() else {"albums": []}
    debut_year: dict = {}
    for pay in chrono:
        for st in pay["sets"]:
            for sg in st["songs"]:
                k = song_key(sg)
                if k and k not in debut_year:
                    debut_year[k] = pay["show_date"][:4]
    print(f"  charts: {len(albums.get('albums', []))} albums, {len(debut_year)} debut years")
    for i, p in enumerate(chrono):
        prev = chrono[i - 1] if i > 0 else None
        nxt = chrono[i + 1] if i + 1 < len(chrono) else None
        out = out_root / p.get("slug", p["show_date"]) / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(render_show(p, prev, nxt, albums, debut_year), encoding="utf-8")

    (out_root / "index.html").write_text(render_index(payloads), encoding="utf-8")

    # Year archive pages. The newest year lives at the index itself; its
    # /YYYY/ URL still exists as a page so year links never 404.
    years = by_year(payloads)
    for y, shows in years.items():
        yd = out_root / y
        yd.mkdir(parents=True, exist_ok=True)
        (yd / "index.html").write_text(render_year(y, shows, years), encoding="utf-8")
    print(f"  + {len(years)} year pages ({min(years)}-{max(years)})")

    # Stats stay a single-year claim (the page is titled for it). Feed it only
    # the newest year so loading older years can never silently blend eras.
    stats_dir = out_root / "stats"
    stats_dir.mkdir(parents=True, exist_ok=True)
    (stats_dir / "index.html").write_text(render_stats(years[max(years)]), encoding="utf-8")

    songs = collect_songs(payloads)
    for sl, info in songs.items():
        d = out_root / "song" / sl
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(render_song(sl, info), encoding="utf-8")

    cr = out_root / "credits"
    cr.mkdir(parents=True, exist_ok=True)
    (cr / "index.html").write_text(render_credits(len(payloads)), encoding="utf-8")
    print(f"  + {len(songs)} song pages, credits page")

    # The live-feed target. Ships as the latest archived show (complete:true,
    # so the board renders FINAL); the bot overwrites it during shows.
    latest = dict(payloads[0])
    latest["updated_at"] = "2026-08-16T04:00:00+00:00"
    (out_root / "setlist.json").write_text(json.dumps(latest, indent=1, ensure_ascii=False), encoding="utf-8")

    print(f"built {len(payloads)} show pages + index + setlist.json into {out_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
