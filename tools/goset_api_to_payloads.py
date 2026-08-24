#!/usr/bin/env python3
"""Convert raw go-set API v2 setlist rows into data/hound/*.json payloads.

Inputs (any that exist):
  --raw <dir>   directory containing setlists-all-by-artist_id.json,
                shows-all.json, and optionally bydate/setlists-*.json

The API is the band's own data, so these payloads carry
``"api_captured": true`` (provenance line: captured, not transcribed).
Honesty rules:
* rows are grouped by show_id, never by date or name (doubleheaders exist);
* tracktime is the band's own timing -> length_secs; absent stays null;
* an entry is a song because it has a song_id; nothing is filtered by name
  (there is a real song called "None");
* shows with zero setlist rows are skipped, not invented.

Overlap policy: if a payload for the same slug already exists in data/hound
(the 2026 hand transcriptions), the API version WINS but the differences are
printed for review -- when sources disagree, log the disagreement.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "hound"


def fix_mojibake(s):
    """Undo UTF-8-read-as-Latin-1 double encoding.

    PowerShell 5.1's Invoke-WebRequest decodes a response with no charset in
    its Content-Type as Latin-1, so ``Lucia\u2019s`` arrived on disk as
    ``Luciaâ\x80\x99s``. The damage is deterministic and reversible: encode
    back to Latin-1, decode as UTF-8. Safe because already-correct text either
    fails the Latin-1 encode (non-Latin-1 codepoints) or round-trips unchanged
    (pure ASCII), and the repair is idempotent -- both verified before use.
    """
    if not isinstance(s, str):
        return s
    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def norm_transition(t) -> str:
    t = (t or "").strip()
    if t in {",", ""}:
        return ""
    return t  # ">", "->"


def secs(tracktime) -> int | None:
    if not tracktime:
        return None
    m = re.fullmatch(r"(\d+):(\d{2})", tracktime.strip())
    if not m:
        return None
    return int(m.group(1)) * 60 + int(m.group(2))


def set_sort_key(setnumber: str):
    s = str(setnumber)
    if s.isdigit():
        return (0, int(s))
    if s == "e":
        return (1, 0)
    m = re.fullmatch(r"e(\d+)", s)
    if m:
        return (1, int(m.group(1)))
    return (2, 0)


def set_display(settype: str, setnumber: str) -> str:
    s = str(setnumber)
    if s == "e":
        return "Encore"
    m = re.fullmatch(r"e(\d+)", s)
    if m:
        return f"Encore {m.group(1)}"
    if settype == "Set":
        return f"Set {s}"
    return settype or f"Set {s}"   # "One Set", "Barn Set", ...


def load_rows(raw: Path) -> list[dict]:
    rows: list[dict] = []
    seen: set = set()

    def add(path: Path):
        d = json.loads(path.read_text(encoding="utf-8"))
        if d.get("error"):
            print(f"  ! {path.name}: error envelope, skipped")
            return
        for r in d.get("data") or []:
            key = r.get("uniqueid") or (r.get("show_id"), r.get("setnumber"), r.get("position"))
            if key in seen:
                continue
            seen.add(key)
            rows.append({k: fix_mojibake(v) for k, v in r.items()})

    bulk = raw / "setlists-all-by-artist_id.json"
    if bulk.exists():
        add(bulk)
    for f in sorted((raw / "bydate").glob("setlists-*.json")) if (raw / "bydate").exists() else []:
        add(f)
    return rows


def payload_from_rows(show_rows: list[dict], slug: str) -> dict:
    show_rows.sort(key=lambda r: (set_sort_key(r["setnumber"]), r["position"]))
    r0 = show_rows[0]
    sets: list[dict] = []
    cur_key = None
    for r in show_rows:
        key = str(r["setnumber"])
        if key != cur_key:
            cur_key = key
            sets.append({"label": key, "display": set_display(r.get("settype") or "", key), "songs": []})
        fn = r.get("footnote") or None
        raw_multi = r.get("footnotes")
        if raw_multi:
            try:
                parts = json.loads(raw_multi)
                if isinstance(parts, list) and len(parts) > 1:
                    fn = "; ".join(str(x) for x in parts)
            except (ValueError, TypeError):
                pass
        # song_slug is go-set's OWN stable song key: verified 1:1 with song_id
        # across 4000 rows, and it survives title typos ("Bend Strange" ->
        # "Bent Strange" share slug "bent-strange"). Never key on the title.
        # slug "_custom_" (song_id 1) is go-set's free-text entry: a real
        # performance, but not repertoire -- see docs/09.
        sets[-1]["songs"].append({
            # go-set has at least one row with a trailing space in songname
            # ("Time Stands Still "). Strip, or the same song renders twice.
            "title": (r["songname"] or "").strip(),
            "transition": norm_transition(r.get("transition")),
            "position": r["position"],
            "footnote": fn,
            "length_secs": secs(r.get("tracktime")),
            "song_id": r.get("song_id"),
            "song_slug": r.get("slug") or None,
            # Structured cover attribution: 1132 of 1138 covers name their
            # artist in this field, so the footnote regex is a fallback only.
            # 70 rows contradict themselves (isoriginal=1 WITH an artist) --
            # trust the artist, and the site logs nothing silently.
            "original_artist": (r.get("original_artist") or None),
            "is_cover": (not r.get("isoriginal")) or bool(r.get("original_artist")),
        })
    shownotes = re.sub(r"\s*\r?\n\s*", " ", (r0.get("shownotes") or "")).strip()
    return {
        "show_date": r0["showdate"],
        "slug": slug,
        "show_id": r0["show_id"],
        "venue": r0.get("venuename") or "",
        "city": r0.get("city") or "",
        "state": r0.get("state") or "",
        "complete": True,
        "api_captured": True,
        "source_url": "https://go-set.net/setlists/" + (r0.get("permalink") or ""),
        "shownotes": shownotes,
        "sets": sets,
    }


QUOTES = str.maketrans({"\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"'})


def classify(t, a) -> str:
    """"typography" when the only difference is quote style -- a transcription
    artifact, not a factual conflict. Anything else is "substantive" and wants
    human eyes: a differing transition or title is a claim about what happened.
    """
    if t is None or a is None:
        return "substantive"
    flat = lambda r: tuple(x.translate(QUOTES) if isinstance(x, str) else x for x in r)
    return "typography" if flat(t) == flat(a) else "substantive"


def summarize(p: dict) -> list[tuple]:
    out = []
    for st in p["sets"]:
        for s in st["songs"]:
            out.append((st["label"], s["position"], s["title"], s["transition"], s["footnote"]))
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True)
    ap.add_argument("--write", action="store_true", help="write payloads (default: dry report)")
    args = ap.parse_args()
    raw = Path(args.raw)

    rows = load_rows(raw)
    print(f"{len(rows)} unique song rows loaded")

    by_show: dict = defaultdict(list)
    for r in rows:
        by_show[r["show_id"]].append(r)

    # slug assignment: date, plus -2/-3 for later shows of the same date
    order: dict = defaultdict(list)
    for sid, srows in by_show.items():
        r0 = srows[0]
        order[r0["showdate"]].append((r0.get("showorder") or 1, sid))
    slugs: dict = {}
    for date, lst in order.items():
        for i, (_, sid) in enumerate(sorted(lst)):
            slugs[sid] = date if i == 0 else f"{date}-{i + 1}"

    written = replaced = disagreements = 0
    log: list = []
    for sid, srows in sorted(by_show.items(), key=lambda kv: kv[1][0]["showdate"]):
        p = payload_from_rows(srows, slugs[sid])
        dest = DATA / f"{p['slug']}.json"
        if dest.exists():
            old = json.loads(dest.read_text(encoding="utf-8"))
            a, b = summarize(old), summarize(p)
            if a != b:
                disagreements += 1
                print(f"DISAGREEMENT {p['slug']}: transcript vs API")
                sa, sb = set(a), set(b)
                for row in sorted(sa - sb)[:6]:
                    print(f"  transcript only: {row}")
                for row in sorted(sb - sa)[:6]:
                    print(f"  api only:        {row}")
                # pair them up by (set, position) so the log shows the conflict
                ai = {(r[0], r[1]): r for r in a}
                bi = {(r[0], r[1]): r for r in b}
                for pos in sorted(set(ai) | set(bi)):
                    if ai.get(pos) != bi.get(pos):
                        log.append({"slug": p["slug"], "set": pos[0], "position": pos[1],
                                    "kind": classify(ai.get(pos), bi.get(pos)),
                                    "transcription": ai.get(pos), "api": bi.get(pos)})
            replaced += 1
        if args.write:
            dest.write_text(json.dumps(p, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
            written += 1

    print(f"shows: {len(by_show)} | written: {written} | replacing existing: {replaced} "
          f"| content disagreements: {disagreements}")
    if log:
        dest = ROOT / "data" / "hound-disagreements.json"
        subs = [r for r in log if r["kind"] == "substantive"]
        print(f"  of those, SUBSTANTIVE (not just quote style): {len(subs)}")
        for r in subs:
            print(f"    {r['slug']} set{r['set']} pos{r['position']}: "
                  f"transcript={r['transcription']} api={r['api']}")
        dest.write_text(json.dumps({
            "_what": "transcription (2026-08-22 HTML walk) vs go-set API v2 "
                     "(2026-08-24 capture), per house rule: log, never silently pick",
            "_resolution": "the API is first-party and wins in the payloads; "
                           "these rows are kept so a wrong call stays reviewable",
            "rows": log,
        }, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"logged {len(log)} disagreeing rows -> {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
