#!/usr/bin/env python3
"""Setlist Lizard ... With — static show-page + dashboard generator.

Reads per-show JSON (the schema bot/site.py already writes) and emits:

    projects/setlistlizard_with/<showdate>/index.html   one page per show
    projects/setlistlizard_with/data/tour.json          aggregate the dashboard reads

The dashboard at projects/setlistlizard_with/stats/ is a hand-maintained static
page that fetches tour.json at runtime, so rebuilds only ever touch data + show
pages — never the app itself.

Input comes from --data-dir (local JSON) or, with --fetch, from the
phish-setlist-bot raw feed. No API key needed either way: the bot has already
done the Phish.net work and committed the result.

Usage:
    python build.py --data-dir data --out out
    python build.py --fetch --out .
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

RAW = "https://raw.githubusercontent.com/vlad-hub86/phish-setlist-bot/main/docs"
BASE_PATH = "/projects/setlistlizard_with"
SITE = "https://mikeside.com"

# Songs whose "length" is really a placeholder in the feed (segues, jams that
# phish.in hasn't split out yet) come through as null. We never invent a number.
MARKS = ["¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹", "¹⁰", "¹¹", "¹²"]


# --------------------------------------------------------------------------- io

def load_local(data_dir: Path) -> list[dict]:
    shows = []
    for p in sorted(data_dir.glob("*.json")):
        if p.name == "index.json":
            continue
        shows.append(json.loads(p.read_text(encoding="utf-8")))
    return shows


def load_remote() -> list[dict]:
    import urllib.request

    def get(url):
        with urllib.request.urlopen(url, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))

    idx = get(f"{RAW}/setlists/index.json")
    out = []
    for entry in idx.get("shows", []):
        d = entry.get("showdate")
        if not d:
            continue
        try:
            show = get(f"{RAW}/setlists/{d}.json")
        except Exception as exc:  # a missing per-show file shouldn't kill the build
            print(f"  ! skipping {d}: {exc}", file=sys.stderr)
            continue
        show.setdefault("tag", entry.get("tag"))
        out.append(show)
    return out


# ---------------------------------------------------------------- derived stats

def songs_of(show: dict) -> list[dict]:
    """Flatten a show into song rows carrying their set context."""
    rows = []
    for s in show.get("sets", []):
        label = str(s.get("label", "1"))
        for i, song in enumerate(s.get("songs", [])):
            rows.append({
                "title": (song.get("title") or "").strip(),
                "transition": song.get("transition") or "",
                "length_secs": song.get("length_secs"),
                "footnote": song.get("footnote"),
                "set_label": label,
                "set_display": s.get("display") or f"Set {label}",
                "set_bucket": bucket(label),
                "pos_in_set": i + 1,
                "set_size": len(s.get("songs", [])),
                "showdate": show.get("showdate"),
                "venue": show.get("venue"),
            })
    return rows


def bucket(label: str) -> str:
    l = label.lower()
    if l.startswith("e"):
        return "Encore"
    return f"Set {label}"


def fmt_len(secs) -> str:
    if not secs:
        return ""
    m, s = divmod(int(secs), 60)
    return f"{m}:{s:02d}"


def long_date(iso: str) -> str:
    try:
        return datetime.strptime(iso, "%Y-%m-%d").strftime("%A, %B %-d, %Y")
    except ValueError:
        return iso


def short_date(iso: str) -> str:
    try:
        return datetime.strptime(iso, "%Y-%m-%d").strftime("%b %-d")
    except ValueError:
        return iso


def show_stats(show: dict) -> dict:
    rows = songs_of(show)
    timed = [r for r in rows if r["length_secs"]]
    total = sum(r["length_secs"] for r in timed)
    longest = max(timed, key=lambda r: r["length_secs"]) if timed else None
    counts = Counter(r["title"] for r in rows)
    repeats = {t: c for t, c in counts.items() if c > 1}
    blocks = show.get("sets", [])
    # An encore is not a set. Phish.net labels encores "e"/"e2"/"e3"; everything
    # else ("1", "2", "3") is a real set. Counting the encore as a set turns every
    # ordinary two-set show into a "3 set" show, which is plainly wrong.
    real_sets = [b for b in blocks if not str(b.get("label", "1")).lower().startswith("e")]
    encores = [b for b in blocks if str(b.get("label", "1")).lower().startswith("e")]
    return {
        "songs": len(rows),
        "unique": len(counts),
        "sets": len(real_sets),
        "encores": len(encores),
        "blocks": len(blocks),
        "timed_count": len(timed),
        "timed_total": total,
        "longest": longest,
        "avg": (total / len(timed)) if timed else 0,
        "footnotes": sum(1 for r in rows if r["footnote"]),
        "repeats": repeats,
        "rows": rows,
    }


def jam_profile(rows: list[dict]) -> list[dict]:
    """The honest, no-audio version of a jam profile.

    Compares each timed song against the median timed song of the show. Songs
    running well past the median are where the show stretched out. This is
    arithmetic on durations, not musical analysis — labelled as such on the page.
    """
    timed = sorted((r for r in rows if r["length_secs"]), key=lambda r: r["length_secs"])
    if len(timed) < 3:
        return []
    mid = timed[len(timed) // 2]["length_secs"]
    out = []
    for r in timed:
        ratio = r["length_secs"] / mid if mid else 1
        if ratio >= 1.6:
            out.append({**r, "ratio": round(ratio, 2)})
    out.sort(key=lambda r: -r["length_secs"])
    return out[:6]


def slugify(title: str) -> str:
    out = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")
    return out or "untitled"


def build_song_index(shows: list[dict]) -> dict:
    """slug -> {title, versions[...]}. Slugs are de-duplicated deterministically."""
    by_slug, taken = {}, {}
    for sh in shows:
        for r in songs_of(sh):
            title = r["title"]
            if not title:
                continue
            if title in taken:
                slug = taken[title]
            else:
                base = slugify(title)
                slug, n = base, 2
                while slug in by_slug and by_slug[slug]["title"] != title:
                    slug, n = f"{base}-{n}", n + 1
                taken[title] = slug
            entry = by_slug.setdefault(slug, {"title": title, "slug": slug, "versions": []})
            entry["versions"].append(r)
    for e in by_slug.values():
        e["versions"].sort(key=lambda r: (r["showdate"], r["pos_in_set"]))
    return by_slug


# ------------------------------------------------------------------- templating

def e(s) -> str:
    return html.escape(str(s if s is not None else ""), quote=True)


def nav(active_projects=True) -> str:
    return f"""  <header>
    <div class="container nav">
      <a class="logo" href="/">mike<span>side</span></a>
      <button class="nav-toggle" aria-label="Menu">☰</button>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/photos/">Photos</a></li>
        <li><a href="/videos/">Videos</a></li>
        <li><a href="/blog/">Blog</a></li>
        <li><a href="/projects/"{' class="active"' if active_projects else ''}>Projects</a></li>
      </ul>
    </div>
  </header>"""


FOOTER = """  <footer>
    <div class="container footer-inner">
      <div>© <span id="year"></span> mikeside.com</div>
      <div><a href="/">Home</a></div>
    </div>
  </footer>
  <script src="/js/main.js"></script>"""


SHOW_CSS_HREF = "/css/setlistlizard.css?v=2"


def energy_curve(rows: list[dict], slugs: dict) -> str:
    """Song durations in performance order — the shape of the night.

    Only timed songs carry a point; untimed ones leave a gap rather than a
    fabricated zero, so a sparse night reads as sparse instead of as a crash.
    """
    timed = [(i, r) for i, r in enumerate(rows) if r["length_secs"]]
    if len(timed) < 3:
        return ""
    W, H, PAD = 640, 130, 14
    n = len(rows)
    mx = max(r["length_secs"] for _i, r in timed)
    def X(i): return PAD + (i / max(1, n - 1)) * (W - 2 * PAD)
    def Y(v): return H - PAD - (v / mx) * (H - 2 * PAD - 10)

    # set boundaries as faint dividers
    bounds, seen = [], None
    for i, r in enumerate(rows):
        if r["set_bucket"] != seen:
            if seen is not None:
                bounds.append((i, r["set_bucket"]))
            seen = r["set_bucket"]
    divs = "".join(
        f'<line class="ec-div" x1="{(X(i)+X(i-1))/2:.1f}" y1="{PAD-6}" '
        f'x2="{(X(i)+X(i-1))/2:.1f}" y2="{H-PAD}" />'
        f'<text class="ec-set" x="{(X(i)+X(i-1))/2 + 4:.1f}" y="{PAD-1}">{e(lab)}</text>'
        for i, lab in bounds
    )
    first = rows[0]["set_bucket"]
    divs = f'<text class="ec-set" x="{PAD}" y="{PAD-1}">{e(first)}</text>' + divs

    pts = " ".join(f"{X(i):.1f},{Y(r['length_secs']):.1f}" for i, r in timed)
    dots = "".join(
        f'<a href="{BASE_PATH}/song/?s={slugs.get(r["title"], slugify(r["title"]))}">'
        f'<circle class="ec-dot{" big" if r["length_secs"] >= 900 else ""}" '
        f'fill="var(--accent)" '
        f'cx="{X(i):.1f}" cy="{Y(r["length_secs"]):.1f}" r="4">'
        f'<title>{e(r["title"])} — {fmt_len(r["length_secs"])} · {e(r["set_display"])}</title>'
        f"</circle></a>"
        for i, r in timed
    )
    ticks = "".join(
        f'<text class="ec-y" x="{PAD-4}" y="{Y(v)+3:.1f}">{fmt_len(v)}</text>'
        for v in (mx, mx // 2)
    )
    return (
        f'<svg class="ec" viewBox="0 -4 {W} {H+8}" role="img" '
        f'aria-label="Song durations in performance order">'
        f"{divs}{ticks}"
        f'<polyline class="ec-line" points="{pts}" fill="none" '
        f'stroke="var(--accent)" stroke-width="1.6" />{dots}</svg>'
    )


def render_show(show: dict, prev: dict | None, nxt: dict | None, slugs: dict | None = None) -> str:
    st = show_stats(show)
    rows = st["rows"]
    date = show["showdate"]
    venue = show.get("venue", "")
    city = show.get("city", "")
    state = show.get("state", "")
    loc = ", ".join(p for p in (city, state) if p)
    maxlen = max((r["length_secs"] or 0) for r in rows) or 1

    title = f"Phish — {short_date(date)}, {date[:4]} · {venue}"
    desc = f"Phish setlist for {long_date(date)} at {venue}, {loc}. Song lengths, notes, and stats."

    # --- setlist body
    body, fnotes, mi = [], [], 0
    for s in show.get("sets", []):
        label = str(s.get("label", "1"))
        slist = s.get("songs", [])
        set_timed = [x.get("length_secs") for x in slist if x.get("length_secs")]
        set_total = sum(set_timed)
        head = e(s.get("display") or f"Set {label}")
        sub = f"{len(slist)} songs" + (f" · {fmt_len(set_total)} timed" if set_total else "")
        body.append(f'<div class="setblock"><div class="setname"><span>{head}</span><span class="sl">{e(sub)}</span></div><ol>')
        for song in slist:
            mark = ""
            if song.get("footnote"):
                mark = MARKS[mi] if mi < len(MARKS) else f"({mi+1})"
                mi += 1
                fnotes.append(f"{mark} {song['footnote']}")
            ln = song.get("length_secs")
            tr = song.get("transition") or ""
            trs = f' <span class="tr">{e(tr)}</span>' if tr and tr != "," else ""
            width = (ln / maxlen * 100) if ln else 0
            big = " big" if ln and ln >= 900 else ""
            bar = f'<div class="lenbar{big}" style="width:{width:.1f}%"></div>' if ln else ""
            t_raw = (song.get("title") or "").strip()
            slug = slugs.get(t_raw, slugify(t_raw)) if slugs else slugify(t_raw)
            t_html = (f'<a class="song-t" href="{BASE_PATH}/song/?s={slug}">{e(t_raw)}</a>'
                      if t_raw else '<span class="song-t"></span>')
            body.append(
                f'<li class="srow{big}"><div class="sline"><span>{t_html}'
                f'{f" <span class=fn>{mark}</span>" if mark else ""}{trs}</span>'
                f'<span class="len">{fmt_len(ln)}</span></div>{bar}</li>'
            )
        body.append("</ol></div>")

    if fnotes:
        body.append('<div class="fnlist">' + "".join(f"<p>{e(f)}</p>" for f in fnotes) + "</div>")
    if show.get("note"):
        body.append(f'<div class="shownote">{e(show["note"])}</div>')
    for n in show.get("shownotes", []) or []:
        body.append(f'<div class="shownote">{e(n)}</div>')

    # --- glance strip
    reps = st["repeats"]
    rep_txt = f"{sum(reps.values()) - len(reps)}" if reps else "0"
    glance = [
        ("songs", st["songs"], "Songs"),
        ("sets", st["sets"], "Sets"),
        ("timed", fmt_len(st["timed_total"]) or "—", "Timed"),
        ("longest", (st["longest"]["title"] if st["longest"] else "—"), "Longest"),
        ("reps", rep_txt, "Reprises"),
        ("notes", st["footnotes"], "Notes"),
    ]
    glance_html = "".join(
        f'<div class="stat"><div class="n">{e(v)}</div><div class="l">{e(l)}</div></div>'
        for _k, v, l in glance
    )

    # --- the lab section
    jams = jam_profile(rows)
    if jams:
        lab_rows = "".join(
            f'<li><span>{e(j["title"])} <span style="color:var(--muted);font-size:.85em">· {e(j["set_display"])}</span></span>'
            f'<span class="x">{fmt_len(j["length_secs"])} · {j["ratio"]}×</span></li>'
            for j in jams
        )
        lab = (
            '<span class="lab">Machine-generated</span>'
            f"<ul>{lab_rows}</ul>"
            '<p class="cav">Ratio compares each song against the median timed song of this show — '
            "a rough read on where the night stretched out. This is arithmetic on durations, not audio "
            "analysis; real audio work (tempo, energy, segment detection off the phish.in recording) "
            "lands here next.</p>"
        )
    else:
        lab = (
            '<span class="lab">Machine-generated</span>'
            '<p class="cav">Not enough timed songs in this show yet to profile. Durations firm up once '
            "phish.in posts the recording — check back.</p>"
        )

    # --- sources
    q = f"{date[:4]}-{date[5:7]}-{date[8:10]}"
    pn = show.get("phishnet_url") or f"https://phish.net/setlists/?d={q}"
    reddit = f"https://www.reddit.com/r/phish/search/?q={venue.replace(' ', '+')}+{short_date(date).replace(' ', '+')}&restrict_sr=1&sort=relevance"
    srcs = [
        (pn, "Phish.net", "Setlist, notes, ratings"),
        (f"https://phish.in/{date}", "phish.in", "Stream the recording"),
        (reddit, "r/phish", "Show thread"),
        ("https://phantasytour.com/bands/1/phish/shows", "Phantasy Tour", "Community board"),
    ]
    srcs_html = "".join(
        f'<a href="{e(u)}" rel="noopener">{e(n)}<span class="w">{e(w)}</span></a>' for u, n, w in srcs
    )

    pager = []
    if prev:
        pager.append(f'<a href="{BASE_PATH}/{prev["showdate"]}/">← {e(short_date(prev["showdate"]))} · {e(prev.get("venue",""))}</a>')
    else:
        pager.append("<span></span>")
    if nxt:
        pager.append(f'<a href="{BASE_PATH}/{nxt["showdate"]}/">{e(short_date(nxt["showdate"]))} · {e(nxt.get("venue",""))} →</a>')
    else:
        pager.append("<span></span>")

    curve = energy_curve(rows, slugs or {})
    curve_html = (
        '<div class="curvewrap"><div class="curvehead"><span>The shape of the night</span>'
        '<span class="ch-sub">song length in play order · click a point for that song</span></div>'
        + curve + "</div>"
    ) if curve else ""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{e(title)} — Setlist Lizard ... With</title>
  <meta name="description" content="{e(desc)}" />
  <link rel="canonical" href="{SITE}{BASE_PATH}/{date}/" />
  <meta property="og:title" content="{e(title)}" />
  <meta property="og:description" content="{e(desc)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="{SITE}{BASE_PATH}/{date}/" />
  <link rel="stylesheet" href="/css/style.css" />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="{SHOW_CSS_HREF}" />
</head>
<body>
{nav()}
  <main>
    <section class="block" style="border-top:none;">
      <div class="container">
        <div class="crumb"><a href="{BASE_PATH}/">Setlist Lizard ... With</a> · <a href="{BASE_PATH}/stats/">Stats</a></div>
        <div class="section-head">
          <span class="setno">{e(long_date(date))}</span>
          <h2>{e(venue)}</h2>
          <p>{e(loc)}</p>
        </div>
        <div class="glance">{glance_html}</div>
        <div class="board">{''.join(body)}</div>
        {curve_html}
        <div class="pager">{''.join(pager)}</div>
      </div>
    </section>

    <div class="groove" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>

    <section class="block" style="border-top:none;">
      <div class="container">
        <div class="section-head">
          <span class="setno">The Lab</span>
          <h2>It's so stupendous, living in this tube</h2>
        </div>
        <div class="tube">{lab}</div>
      </div>
    </section>

    <section class="block" style="border-top:none;">
      <div class="container">
        <div class="section-head"><span class="setno">Elsewhere</span><h2>Go deeper</h2></div>
        {f'<div class="srcs">{srcs_html}</div>'}
        <div class="srcline">
          Setlist data: Phish.net · durations: phish.in · lengths are live estimates until the recording posts<br />
          <a href="{BASE_PATH}/stats/">tour stats</a> · <a href="{BASE_PATH}/">all shows</a> · <a href="/projects/">← all projects</a>
        </div>
      </div>
    </section>
  </main>
{FOOTER}
</body>
</html>
"""



def render_song(entry: dict, all_slugs: dict) -> str:
    """One page per song: every version this tour, plus placement and spread."""
    title, slug = entry["title"], entry["slug"]
    vs = entry["versions"]
    timed = [v for v in vs if v["length_secs"]]
    lens = sorted(v["length_secs"] for v in timed)
    longest = max(timed, key=lambda v: v["length_secs"]) if timed else None
    shortest = min(timed, key=lambda v: v["length_secs"]) if timed else None
    median = lens[len(lens) // 2] if lens else 0

    placement = Counter(v["set_bucket"] for v in vs)
    shows = sorted({v["showdate"] for v in vs})

    desc = (f"Every {title} Phish played this tour — "
            f"{len(vs)} version{'s' if len(vs) != 1 else ''} across {len(shows)} "
            f"show{'s' if len(shows) != 1 else ''}, with lengths, set placement and notes.")

    tiles = [
        (len(vs), "Plays"),
        (len(shows), "Shows"),
        (fmt_len(longest["length_secs"]) if longest else "—", "Longest"),
        (fmt_len(shortest["length_secs"]) if shortest else "—", "Shortest"),
        (fmt_len(median) if median else "—", "Median"),
    ]
    tiles_html = "".join(
        f'<div class="stat"><div class="n">{e(v)}</div><div class="l">{e(l)}</div></div>'
        for v, l in tiles
    )

    # placement bars — where in a show this song tends to land
    total = sum(placement.values()) or 1
    order = sorted(placement, key=lambda k: (k == "Encore", k))
    plc = "".join(
        f'<div class="plc"><span class="pl">{e(k)}</span>'
        f'<span class="pbar"><i style="width:{placement[k]/total*100:.1f}%"></i></span>'
        f'<span class="pn">{placement[k]}</span></div>'
        for k in order
    )

    mx = lens[-1] if lens else 1
    rows_html = ""
    for v in vs:
        ln = v["length_secs"]
        w = (ln / mx * 100) if ln else 0
        big = " big" if ln and ln >= 900 else ""
        note = f'<div class="vfn">{e(v["footnote"])}</div>' if v.get("footnote") else ""
        rows_html += (
            f'<a class="vrow{big}" href="{BASE_PATH}/{v["showdate"]}/">'
            f'<div class="vtop"><span class="vd">{e(short_date(v["showdate"]))}</span>'
            f'<span class="vv">{e(v["venue"])}</span>'
            f'<span class="vs">{e(v["set_display"])} · #{v["pos_in_set"]}</span>'
            f'<span class="vl">{fmt_len(ln) or "—"}</span></div>'
            + (f'<div class="vbar" style="width:{w:.1f}%"></div>' if ln else "")
            + note + "</a>"
        )

    spread = ""
    if len(lens) >= 2:
        spread = (f'<p class="cav">Spread this tour: {fmt_len(lens[0])} to {fmt_len(lens[-1])} '
                  f'across {len(lens)} timed version{"s" if len(lens) != 1 else ""} '
                  f'(median {fmt_len(median)}).</p>')

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{e(title)} — every version this tour — Setlist Lizard ... With</title>
  <meta name="description" content="{e(desc)}" />
  <link rel="canonical" href="{SITE}{BASE_PATH}/song/{slug}/" />
  <meta property="og:title" content="{e(title)} — every version this tour" />
  <meta property="og:description" content="{e(desc)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="{SITE}{BASE_PATH}/song/{slug}/" />
  <link rel="stylesheet" href="/css/style.css" />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/setlistlizard.css?v=2" />
</head>
<body>
{nav()}
  <main>
    <section class="block" style="border-top:none;">
      <div class="container">
        <div class="crumb"><a href="{BASE_PATH}/">Setlist Lizard ... With</a> · <a href="{BASE_PATH}/stats/">Stats</a></div>
        <div class="section-head">
          <span class="setno">Song</span>
          <h2>{e(title)}</h2>
          <p>{len(vs)} version{'s' if len(vs) != 1 else ''} across {len(shows)} tracked show{'s' if len(shows) != 1 else ''}.</p>
        </div>
        <div class="glance">{tiles_html}</div>
        <div class="board">
          <div class="setname"><span>Where it lands</span></div>
          {plc}
          <div class="setname" style="margin-top:1.6rem;"><span>Every version</span><span class="sl">newest last</span></div>
          <div class="vlist">{rows_html}</div>
          {spread}
        </div>
        <div class="srcline">
          Setlist data: Phish.net · durations: phish.in · only shows the bot has tracked appear here<br />
          <a href="{BASE_PATH}/stats/">tour stats</a> · <a href="{BASE_PATH}/">all shows</a> · <a href="/projects/">← all projects</a>
        </div>
      </div>
    </section>
  </main>
{FOOTER}
</body>
</html>
"""


# ------------------------------------------------------------------ tour + stats

def build_tour(shows: list[dict]) -> dict:
    rows = []
    for sh in shows:
        rows.extend(songs_of(sh))
    return {
        "generated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "shows": [
            {
                "showdate": sh["showdate"],
                "venue": sh.get("venue", ""),
                "city": sh.get("city", ""),
                "state": sh.get("state", ""),
                "tag": sh.get("tag"),
                "note": sh.get("note"),
                "songs": show_stats(sh)["songs"],
                "timed_total": show_stats(sh)["timed_total"],
                "url": f"{BASE_PATH}/{sh['showdate']}/",
            }
            for sh in shows
        ],
        "songs": rows,
    }




# ------------------------------------------------------------------------- main

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", type=Path)
    ap.add_argument("--fetch", action="store_true")
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    if args.fetch:
        shows = load_remote()
    elif args.data_dir:
        shows = load_local(args.data_dir)
    else:
        ap.error("pass --data-dir or --fetch")

    shows = [s for s in shows if s.get("showdate")]
    shows.sort(key=lambda s: s["showdate"])
    if not shows:
        print("no shows found", file=sys.stderr)
        return 1

    root = args.out / "projects" / "setlistlizard_with"
    root.mkdir(parents=True, exist_ok=True)

    songs = build_song_index(shows)
    slugs = {e_["title"]: e_["slug"] for e_ in songs.values()}

    for i, sh in enumerate(shows):
        prev = shows[i - 1] if i else None
        nxt = shows[i + 1] if i + 1 < len(shows) else None
        d = root / sh["showdate"]
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(render_show(sh, prev, nxt, slugs), encoding="utf-8")
        print(f"  show page: {sh['showdate']}  {sh.get('venue','')}")

    # Song detail is served by the hand-maintained shell at song/index.html,
    # which reads ?s=<slug> and renders from the feed — see render_song() above
    # for the pre-rendered variant, kept for when a build workflow exists.
    print(f"  songs linked: {len(songs)} (rendered live by song/?s=<slug>)")

    tour = build_tour(shows)
    (root / "data").mkdir(parents=True, exist_ok=True)
    (root / "data" / "tour.json").write_text(
        json.dumps(tour, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  dashboard: {len(tour['songs'])} song rows across {len(shows)} shows")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
