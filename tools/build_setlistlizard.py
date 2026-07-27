#!/usr/bin/env python3
"""Setlist Lizard ... With — static show-page + dashboard generator.

Reads per-show JSON (the schema bot/site.py already writes) and emits:

    setlistlizard-with/<showdate>/index.html   one page per show
    setlistlizard-with/data/tour.json          aggregate the dashboard reads

The dashboard at setlistlizard-with/stats/ is a hand-maintained static
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
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

RAW = "https://raw.githubusercontent.com/vlad-hub86/phish-setlist-bot/main/docs"
BASE_PATH = "/setlistlizard-with"
SITE = "https://mikeside.com"

# Songs whose "length" is really a placeholder in the feed (segues, jams that
# phish.in hasn't split out yet) come through as null. We never invent a number.
_SUP = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")
# 1..40 as superscripts — a busy MSG night can carry two dozen notes.
MARKS = [str(i).translate(_SUP) for i in range(1, 41)]


# --------------------------------------------------------------------------- io

def load_local(data_dir: Path) -> list[dict]:
    shows = []
    for p in sorted(data_dir.glob("*.json")):
        if p.name == "index.json":
            continue
        shows.append(apply_phishin(json.loads(p.read_text(encoding="utf-8"))))
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
        out.append(apply_phishin(show))
    return out


# ------------------------------------------------------------------- phish.in

# Tags phish.in hangs off individual tracks.  Anything not listed here still
# renders, it just gets the default chip styling.
TAG_STYLE = {
    "Bustout": "bust",
    "Tease": "tease",
    "Jam": "jam",
    "Alt Lyric": "alt",
    "Alt Rig": "alt",
    "Narration": "alt",
    "Unfinished": "unf",
    "Banter": "banter",
    "Lore": "lore",
}

# Inline so a stale cached stylesheet can never swallow them.
CHIP_BASE = ("display:inline-block;margin-left:.4rem;padding:.05rem .4rem;border-radius:999px;"
             "font-size:.68em;letter-spacing:.04em;text-transform:uppercase;vertical-align:.08em;"
             "border:1px solid;line-height:1.5;")
CHIP_COLOR = {
    "bust": "color:#f0b429;border-color:#f0b42955;background:#f0b4291a;",
    "tease": "color:#7bc6ff;border-color:#7bc6ff55;background:#7bc6ff1a;",
    "jam": "color:#9ae6b4;border-color:#9ae6b455;background:#9ae6b41a;",
    "alt": "color:#d6a2ff;border-color:#d6a2ff55;background:#d6a2ff1a;",
    "unf": "color:#ff9b9b;border-color:#ff9b9b55;background:#ff9b9b1a;",
    "banter": "color:#ffd6a5;border-color:#ffd6a555;background:#ffd6a51a;",
    "seg": "color:#9aa5b1;border-color:#9aa5b155;background:#9aa5b11a;",
}


_STOP = {"a", "an", "the", "was", "were", "in", "on", "of", "to", "and", "did",
         "not", "contain", "featured", "included", "from", "with", "for", "his",
         "her", "its", "at", "by", "is", "are", "no", "tease", "teases", "jam",
         "lyrics", "lyric", "changed", "ending", "played"}


def same_note(a: str, b: str) -> bool:
    """Is a curated footnote saying what phish.in already says?

    "No whistling." vs "Did not contain the whistling ending." — different
    wording, same fact. Compare content words: if either note's meaningful
    words are almost entirely inside the other's, treat it as a duplicate.
    """
    def words(s):
        return {w for w in re.split(r"[^a-z0-9]+", (s or "").lower()) if w and w not in _STOP}
    wa, wb = words(a), words(b)
    if not wa or not wb:
        return False
    small, big = (wa, wb) if len(wa) <= len(wb) else (wb, wa)
    return len(small & big) / len(small) >= 0.7


def chip(name: str, kind: str | None = None) -> str:
    kind = kind or TAG_STYLE.get(name, "seg")
    style = CHIP_BASE + CHIP_COLOR.get(kind, CHIP_COLOR["seg"])
    return f'<span class="chip {kind}" style="{style}">{name}</span>'


def apply_phishin(show: dict) -> dict:
    """Fold the curated phish.in track map into the setlist.

    The map lives at show["phishin"]["tracks"] keyed "<set label>:<1-based pos>"
    and is the ONLY source of listen links: if a track isn't in the map we emit
    no link at all rather than guessing a URL that 404s.  Track durations from
    phish.in are the real recorded lengths and win over anything in the feed.
    """
    pi = show.get("phishin") or {}
    tracks = pi.get("tracks") or {}
    if not tracks:
        return show
    for s in show.get("sets", []):
        label = str(s.get("label", "1"))
        for i, song in enumerate(s.get("songs", [])):
            t = tracks.get(f"{label}:{i + 1}")
            if not t:
                continue
            song["_pi"] = t
            if t.get("d"):
                song["length_secs"] = t["d"]
            elif t.get("m"):
                # this song shares one phish.in track with its neighbours; the
                # whole segment is timed on the first song of the group
                song["length_secs"] = None
    return show


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
                "pi": song.get("_pi"),
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
    shapes = repeat_shapes(show)
    bustouts = sum(
        1 for r in rows
        if any(t.get("name") == "Bustout" for t in ((r.get("pi") or {}).get("tags") or []))
    )
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
        "bustouts": bustouts,
        "sandwiches": shapes["sandwiches"],
        "fests": shapes["fests"],
        "unresolved": shapes["unresolved"],
        "rows": rows,
    }


# Songs whose reprise is a standing companion rather than a separate event.
REPRISE_PARTNERS = {"Tweezer": "Tweezer Reprise"}


def fest_name(title: str) -> str:
    """Tweezer -> Tweezerfest. Multi-word titles keep the space."""
    t = re.sub(r"^(The|A)\s+", "", (title or "").strip())
    return f"{t}fest" if " " not in t else f"{t} fest"


def repeat_shapes(show: dict) -> dict:
    """Find the sandwiches, the fests, and the Tweezers left unresolved.

    Phish vocabulary, which the earlier "reprises" counter got twice wrong:

    * A **sandwich** is Song > other song(s) > Song: the same song returns after
      an interruption, with the songs in between as the filling.
    * A **fest** is one song played and re-jammed all night — three or more
      helpings. Tweezerfest. A fest supersedes the sandwiches inside it,
      otherwise a six-Tweezer night would report fifteen overlapping sandwiches.
    """
    sandwiches, fests = [], []
    show_counts = Counter()
    for s in show.get("sets", []):
        for song in s.get("songs", []):
            t = (song.get("title") or "").strip()
            if t:
                show_counts[t] += 1

    festy = {t for t, c in show_counts.items() if c >= 3}

    for t in sorted(festy, key=lambda x: (-show_counts[x], x)):
        spots, filling, where = [], [], []
        for s in show.get("sets", []):
            titles = [(x.get("title") or "").strip() for x in s.get("songs", [])]
            if t not in titles:
                continue
            where.append(s.get("display") or f"Set {s.get('label')}")
            first, last = titles.index(t), len(titles) - 1 - titles[::-1].index(t)
            for other in titles[first:last + 1]:
                if other != t and other not in filling:
                    filling.append(other)
            spots.append((first, last))
        fests.append({
            "song": t,
            "name": fest_name(t),
            "count": show_counts[t],
            "sets": where,
            "filling": filling,
        })

    for s in show.get("sets", []):
        label = s.get("display") or f"Set {s.get('label')}"
        titles = [(x.get("title") or "").strip() for x in s.get("songs", [])]
        seen = set()
        for i, t in enumerate(titles):
            if not t or t in festy or t in seen:
                continue
            later = [j for j in range(i + 1, len(titles)) if titles[j] == t]
            if not later:
                continue
            seen.add(t)
            j = later[-1]
            filling = [x for x in titles[i + 1:j] if x != t]
            if not filling:
                continue  # back-to-back isn't a sandwich, it's one long song
            sandwiches.append({"song": t, "set": label, "filling": filling})

    # Reprises are NOT a finding. Tweezer Reprise accompanies Tweezer almost
    # every time — it's a staple, usually the encore or the set closer, and
    # saying "here is a reprise" tells a Phish fan nothing they don't know.
    # The noteworthy case is the inverse: a Tweezer left unresolved. That's
    # rare and usually deliberate — the band will hold the Reprise back to
    # close out a run when Tweezer landed earlier in the weekend.
    played = set(show_counts)
    unresolved = [
        song for song, rep in REPRISE_PARTNERS.items()
        if song in played and rep not in played
    ]
    return {"sandwiches": sandwiches, "fests": fests, "unresolved": sorted(unresolved)}


def jam_profile(rows: list[dict]) -> list[dict]:
    """The longest versions of the night, and nothing more than that.

    This used to print a ratio against the median timed song of the show, which
    was arithmetic pretending to be analysis: a night stacked with short songs
    inflates every ratio, so "2.99x" said nothing about whether that Bathtub Gin
    was actually a big one. Answering that needs the song's own history, which
    is a phish.in backfill we haven't done. Until then, list the durations
    plainly and let them speak.
    """
    timed = [r for r in rows if r["length_secs"]]
    if len(timed) < 3:
        return []
    timed.sort(key=lambda r: -r["length_secs"])
    return timed[:6]


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


SHOW_CSS_HREF = "/css/setlistlizard.css?v=5"

# Shared runtime: the inline player and the Lab pies. It enhances markup that
# already exists (♫ links, the labpies container), so pages stay plain HTML.
LIZARD_JS = '<script src="/setlistlizard-with/js/lizard.js?v=2" defer></script>'


def pager_html(prev: dict | None, nxt: dict | None, top: bool = False) -> str:
    """Show-to-show navigation, rendered twice per page.

    The bottom copy scrolls away on a three-set night, so the same pager also
    sits directly above the setlist. Both are the same markup; the top one is
    just smaller.
    """
    parts = []
    for show, label, cls in ((prev, "← Previous show", ""), (nxt, "Next show →", "")):
        if not show:
            parts.append("<span></span>")
            continue
        parts.append(
            f'<a href="{BASE_PATH}/{show["showdate"]}/"{cls}><span>'
            f'<span class="pg-l">{label}</span>'
            f'<span class="pg-v">{e(short_date(show["showdate"]))} · {e(show.get("venue", ""))}</span>'
            f"</span></a>"
        )
    return f'<div class="pager{" top" if top else ""}">{"".join(parts)}</div>'


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
    banter = []          # (song title, phish.in url, what it was, transcript)
    for s in show.get("sets", []):
        label = str(s.get("label", "1"))
        slist = s.get("songs", [])
        set_timed = [x.get("length_secs") for x in slist if x.get("length_secs")]
        set_total = sum(set_timed)
        head = e(s.get("display") or f"Set {label}")
        sub = f"{len(slist)} songs" + (f" · {fmt_len(set_total)} timed" if set_total else "")
        body.append(f'<div class="setblock"><div class="setname"><span>{head}</span><span class="sl">{e(sub)}</span></div><ol>')
        for song_i, song in enumerate(slist):
            pi = song.get("_pi") or {}
            pi_tags = pi.get("tags") or []
            t_raw0 = (song.get("title") or "").strip()

            # phish.in tag notes become footnotes alongside the curated ones, so
            # a song can carry several marks (Makisupa is Alt Lyric AND Bustout).
            # Two guards: songs sharing one merged phish.in track would otherwise
            # repeat that track's notes once per song, and a curated footnote
            # saying the same thing as phish.in's would print twice.
            pi_notes = []
            if not pi.get("m"):
                for tg in pi_tags:
                    n = (tg.get("notes") or "").strip()
                    # a Tease note is bare ("The Well") — say what it is
                    if n and tg.get("name") == "Tease":
                        n = f"Tease: {n}"
                    if n and n not in pi_notes:
                        pi_notes.append(n)
                    if (tg.get("name") in ("Banter", "Narration")) and tg.get("transcript"):
                        banter.append((t_raw0, pi.get("u"), n or tg.get("name"), tg["transcript"]))
            notes = []
            if song.get("footnote") and not any(same_note(song["footnote"], n) for n in pi_notes):
                notes.append(song["footnote"])
            notes.extend(pi_notes)
            marks = []
            for n in notes:
                mk = MARKS[mi] if mi < len(MARKS) else f"({mi+1})"
                mi += 1
                marks.append(mk)
                fnotes.append(f"{mk} {n}")
            mark = "".join(marks)

            chips = "".join(
                chip(e(tg.get("name") or ""))
                for tg in pi_tags if tg.get("name") not in ("Lore",)
            )
            if pi.get("n"):
                chips += chip("Segued", "seg")
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
            # Listen link. ONLY from the curated phish.in track map — a guessed
            # URL 404s (phish.in posts a recording a day or two after the show),
            # so no verified track means no link. Inline-styled on purpose:
            # a cached stylesheet must not be able to hide it.
            listen = ""
            url = pi.get("u")
            if url and t_raw:
                listen = (f' <a class="lsn" href="{e(url)}" rel="noopener" '
                          f'title="Listen on phish.in" aria-label="Listen to {e(t_raw)} on phish.in" '
                          f'style="color:var(--accent-soft);text-decoration:none;'
                          f'margin-left:.5rem;font-size:.85em;opacity:.75;">&#9835;</a>')
            body.append(
                f'<li class="srow{big}"><div class="sline"><span>{t_html}'
                f'{f" <span class=fn>{mark}</span>" if mark else ""}{trs}{chips}</span>'
                f'<span class="len">{fmt_len(ln)}{listen}</span></div>{bar}</li>'
            )
        body.append("</ol></div>")

    if fnotes:
        body.append('<div class="fnlist">' + "".join(f"<p>{e(f)}</p>" for f in fnotes) + "</div>")
    if show.get("note"):
        body.append(f'<div class="shownote">{e(show["note"])}</div>')
    for n in show.get("shownotes", []) or []:
        body.append(f'<div class="shownote">{e(n)}</div>')

    # --- sandwiches, fests and the genuine reprises
    shapes = []
    for f in st["fests"]:
        fill = ", ".join(f["filling"][:6]) + ("…" if len(f["filling"]) > 6 else "")
        shapes.append(
            f'<div class="shape" style="border:1px solid var(--border);border-left:3px solid #f0b429;'
            f'border-radius:10px;padding:.8rem 1rem;margin-top:.7rem;">'
            f'<div style="font-family:Fraunces,Georgia,serif;color:#f0b429;font-size:1.05rem;">'
            f'🥪 {e(f["name"])}</div>'
            f'<div style="color:var(--muted);font-size:.9rem;line-height:1.6;margin-top:.25rem;">'
            f'{e(f["song"])} played <b>{f["count"]}×</b> in {e(", ".join(f["sets"]))}, re-jammed around '
            f'{e(fill)}.</div></div>'
        )
    for s in st["sandwiches"]:
        fill = ", ".join(s["filling"][:6]) + ("…" if len(s["filling"]) > 6 else "")
        shapes.append(
            f'<div class="shape" style="border:1px solid var(--border);border-left:3px solid var(--accent);'
            f'border-radius:10px;padding:.8rem 1rem;margin-top:.7rem;">'
            f'<div style="font-family:Fraunces,Georgia,serif;color:var(--accent-soft);font-size:1.05rem;">'
            f'🥪 {e(s["song"])} sandwich</div>'
            f'<div style="color:var(--muted);font-size:.9rem;line-height:1.6;margin-top:.25rem;">'
            f'{e(s["song"])} &gt; {e(fill)} &gt; {e(s["song"])} · {e(s["set"])}</div></div>'
        )
    for song in st["unresolved"]:
        shapes.append(
            f'<div class="shape" style="border:1px solid var(--border);border-left:3px solid #ff9b9b;'
            f'border-radius:10px;padding:.8rem 1rem;margin-top:.7rem;">'
            f'<div style="font-family:Fraunces,Georgia,serif;color:#ff9b9b;font-size:1.05rem;">'
            f'⁉ {e(song)}, no Reprise</div>'
            f'<div style="color:var(--muted);font-size:.9rem;line-height:1.6;margin-top:.25rem;">'
            f'{e(song)} went unresolved tonight. Rare, and usually deliberate — the Reprise '
            f'often gets held back to cap a later night of the run.</div></div>'
        )
    if shapes:
        body.append(
            '<div class="shapes" style="margin-top:1.6rem;">'
            '<div class="setname"><span>Sandwiches &amp; fests</span>'
            f'<span class="sl">{len(shapes)} shape{"s" if len(shapes) != 1 else ""}</span></div>'
            + "".join(shapes) + "</div>"
        )

    # --- from the stage: banter/narration excerpts, transcribed by phish.in.
    # Excerpt + link, never the whole transcript — the full text is theirs.
    if banter:
        cards = []
        for song_t, url, what, text in banter:
            txt = " ".join(text.split())
            clipped = txt[:230].rstrip()
            if len(txt) > 230:
                clipped = clipped.rsplit(" ", 1)[0] + " …"
            more = (f' <a href="{e(url)}" rel="noopener" style="color:var(--accent-soft);">'
                    "full transcript on phish.in →</a>") if url else ""
            cards.append(
                f'<div class="btr" style="border-left:2px solid var(--accent);padding:.15rem 0 .15rem .9rem;margin:.9rem 0;">'
                f'<div style="font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);">'
                f'{e(song_t)} · {e(what)}</div>'
                f'<p style="margin:.35rem 0 0;font-style:italic;">“{e(clipped)}”</p>'
                f'<div style="font-size:.8rem;margin-top:.3rem;color:var(--muted);">transcript: phish.in{more}</div>'
                f"</div>"
            )
        body.append(
            '<div class="stage" style="margin-top:1.6rem;">'
            '<div class="setname"><span>From the stage</span>'
            f'<span class="sl">{len(banter)} moment{"s" if len(banter) != 1 else ""}</span></div>'
            + "".join(cards) + "</div>"
        )

    # --- glance strip
    # "Reprises" used to mean "songs played more than once", which is not what a
    # reprise is. A repeated song is a sandwich (or a fest); a reprise is a song
    # in its own right — Tweezer Reprise. The tile now leads with the fest when
    # there is one, since that's the headline of a night like 7/25.
    if st["fests"]:
        shape_v, shape_l = st["fests"][0]["name"], "Fest"
    else:
        shape_v, shape_l = len(st["sandwiches"]), "Sandwiches"
    glance = [
        ("songs", st["songs"], "Songs"),
        ("sets", st["sets"], "Sets"),
        ("timed", fmt_len(st["timed_total"]) or "—", "Timed"),
        ("longest", (st["longest"]["title"] if st["longest"] else "—"), "Longest"),
        ("shape", shape_v, shape_l),
        ("bust", st["bustouts"] or st["footnotes"], "Bustouts" if st["bustouts"] else "Notes"),
    ]
    def _tile(v, l):
        # A long unbroken word (a fest name, a one-word song title) overflows the
        # tile at full size — step it down rather than let it clip.
        t = str(v)
        sz = "font-size:1rem;" if len(t) > 13 else ("font-size:1.2rem;" if len(t) > 9 else "")
        return (f'<div class="stat"><div class="n" style="{sz}overflow-wrap:anywhere;line-height:1.25;">'
                f'{e(t)}</div><div class="l">{e(l)}</div></div>')

    glance_html = "".join(_tile(v, l) for _k, v, l in glance)

    # --- the lab section
    jams = jam_profile(rows)
    if jams:
        lab_rows = "".join(
            f'<li><span>{e(j["title"])} <span style="color:var(--muted);font-size:.85em">· {e(j["set_display"])}</span></span>'
            f'<span class="x">{fmt_len(j["length_secs"])}</span></li>'
            for j in jams
        )
        lab = (
            '<span class="lab">Machine-generated</span>'
            '<div class="setname" style="border:none;margin-bottom:.2rem;"><span>Longest of the night</span></div>'
            f"<ul>{lab_rows}</ul>"
            '<p class="cav">Straight off the phish.in timings, longest first. What this can’t tell '
            "you yet is whether any of these is a big version — that needs each song’s own history "
            "to compare against, which is the next thing to pull in. After that: phish.in publishes a "
            "jam-start marker per track, so the composed section and the improvisation can be separated "
            "and measured properly. That’s what belongs in this tube.</p>"
        )
    else:
        lab = (
            '<span class="lab">Machine-generated</span>'
            '<p class="cav">Nothing timed yet. Durations arrive when phish.in posts the recording, '
            "usually a day or two after the show.</p>"
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

    pager_top = pager_html(prev, nxt, top=True)
    pager_bottom = pager_html(prev, nxt)

    # Curated media: official posts from the night, embedded rather than
    # re-hosted — the platforms render their own photos and carry the credit.
    media_html = ""
    media = [m for m in (show.get("media") or []) if isinstance(m, dict) and m.get("url")]
    if media:
        embeds, want_x, want_ig = [], False, False
        for m in media:
            u = e(m["url"])
            if m.get("type") == "instagram" or "instagram.com" in m["url"]:
                want_ig = True
                embeds.append(
                    f'<blockquote class="instagram-media" data-instgrm-permalink="{u}" '
                    f'data-instgrm-version="14" style="margin:0 auto;max-width:540px;">'
                    f'<a href="{u}" rel="noopener">View on Instagram</a></blockquote>')
            else:
                want_x = True
                embeds.append(
                    f'<blockquote class="twitter-tweet" data-theme="dark" data-dnt="true">'
                    f'<a href="{u}" rel="noopener">View on X</a></blockquote>')
        scripts = ""
        if want_x:
            scripts += '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>'
        if want_ig:
            scripts += '<script async src="https://www.instagram.com/embed.js"></script>'
        media_html = f"""
    <section class="block" style="border-top:none;">
      <div class="container">
        <div class="section-head"><span class="setno">From the night</span><h2>Official shots</h2>
          <p>Posted by the band — embedded from the source.</p></div>
        <div style="display:flex;flex-wrap:wrap;gap:1rem;justify-content:center;">{''.join(embeds)}</div>
        {scripts}
      </div>
    </section>"""

    # The Lab pies render client-side (lizard.js) from this embedded list of
    # tonight's unique songs joined against data/song_meta.json — one shared
    # implementation instead of a Python copy and a JS copy drifting apart.
    uniq, seen_slugs = [], set()
    for r in rows:
        sl = slugs.get(r["title"], slugify(r["title"])) if slugs else slugify(r["title"])
        if r["title"] and sl not in seen_slugs:
            seen_slugs.add(sl)
            uniq.append({"t": r["title"], "s": sl})
    lab_json = json.dumps({"showdate": date, "songs": uniq}, ensure_ascii=False)

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
        {pager_top}
        <div class="board">{''.join(body)}</div>
        {curve_html}
        {pager_bottom}
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
        <div class="labpies" id="lizard-lab-pies"></div>
        <script type="application/json" id="lizard-lab-data">{lab_json}</script>
      </div>
    </section>
{media_html}
    <section class="block" style="border-top:none;">
      <div class="container">
        <div class="section-head"><span class="setno">Elsewhere</span><h2>Go deeper</h2></div>
        {f'<div class="srcs">{srcs_html}</div>'}
        <div class="srcline">
          Setlist data: <a href="https://phish.net/" rel="noopener">Phish.net</a> ·
          audio, durations, tags and banter: <a href="https://phish.in/" rel="noopener">phish.in</a> ·
          lengths are live estimates until the recording posts<br />
          <a href="{BASE_PATH}/credits/">credits &amp; FAQ</a> · <a href="{BASE_PATH}/stats/">tour stats</a> · <a href="{BASE_PATH}/">all shows</a> · <a href="/projects/">← all projects</a>
        </div>
      </div>
    </section>
  </main>
{FOOTER}
{LIZARD_JS}
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
  <link rel="stylesheet" href="{SHOW_CSS_HREF}" />
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
          Setlist data: <a href="https://phish.net/" rel="noopener">Phish.net</a> ·
          audio, durations, tags and banter: <a href="https://phish.in/" rel="noopener">phish.in</a> ·
          only shows the bot has tracked appear here<br />
          <a href="{BASE_PATH}/credits/">credits &amp; FAQ</a> · <a href="{BASE_PATH}/stats/">tour stats</a> · <a href="{BASE_PATH}/">all shows</a> · <a href="/projects/">← all projects</a>
        </div>
      </div>
    </section>
  </main>
{FOOTER}
{LIZARD_JS}
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

    root = args.out / "setlistlizard-with"
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
    # which reads ?s=<slug> and renders from the feed — see render_song() below
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
