# Dev Log — posting contract

The front page's **Dev Log** section (`/#devlog`) renders one tile per public
project and a merged wire of dev notes / patch notes underneath. Everything it
shows comes from JSON feeds; no HTML edits are ever needed to post.

## Where entries live

- **Projects hosted in this repo** (mikeside.com itself, SUP Maine,
  Setlist Lizard ... With, Phish Setlist Predictions): append an entry to
  `data/devlog.json` → `entries[]`. The next deploy publishes it.
- **Projects in their own repo** (Phish Setlist Bot): keep a `devlog.json`
  anywhere raw-fetchable (the bot uses
  `docs/devlog.json`, served via raw.githubusercontent.com) and register it
  once in `data/devlog.json` → `feeds[]`:

  ```json
  { "project": "setlist-bot", "url": "https://raw.githubusercontent.com/vlad-hub86/phish-setlist-bot/main/docs/devlog.json" }
  ```

  External feeds may be either a bare array of entries or
  `{ "entries": [...] }`. The `project` on the feed registration wins if an
  entry omits it.

## Entry schema

```json
{
  "date": "2026-07-27",
  "project": "setlist-lizard",
  "title": "One line, plain words",
  "notes": "Optional second sentence or two.",
  "type": "release | feature | fix | infra | content",
  "url": "/optional/link/"
}
```

`date`, `project` (must match a `projects[].id`) and `title` are required.
Keep entries newest-first for humans; the renderer re-sorts anyway. Unknown
project ids are dropped silently — add the project to `projects[]` first.

## Adding a project tile

Add one object to `projects[]`:

```json
{ "id": "my-project", "name": "My Project", "url": "/my-project/" }
```

Current ids: `mikeside`, `supmaine`, `setlist-lizard`, `setlist-predictions`,
`setlist-bot`.

**Excluded by policy:** private projects (Personal Dashboard, Dangle My
Stash) do not post here. This log is public; never include anything that
shouldn't be read on GitHub.

## Posting from a deployment pipeline

Append-and-commit as a step after a successful build/deploy. Example (any
repo with node):

```bash
node -e '
const fs = require("fs");
const f = "data/devlog.json";                 // bot repo: docs/devlog.json
const j = JSON.parse(fs.readFileSync(f, "utf8"));
j.entries.unshift({
  date: new Date().toISOString().slice(0, 10),
  project: "setlist-lizard",
  type: "release",
  title: process.env.DEVLOG_TITLE,
  notes: process.env.DEVLOG_NOTES || undefined
});
fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n");
'
git add data/devlog.json && git commit -m "devlog: ${DEVLOG_TITLE}" && git push
```

Or with jq:

```bash
jq --arg d "$(date +%F)" --arg t "$DEVLOG_TITLE" --arg n "$DEVLOG_NOTES" \
  '.entries |= [{date:$d, project:"setlist-bot", type:"release", title:$t} + (if $n != "" then {notes:$n} else {} end)] + .' \
  docs/devlog.json > tmp && mv tmp docs/devlog.json
```

Notes for this stack:

- In the mikeside.com repo, a devlog commit to `main` triggers the normal
  FTPS deploy — the entry is live in ~100 seconds. Use `[skip ci]`-style
  guards only if a pipeline both writes the devlog *and* is triggered by
  pushes, to avoid loops (the FTP deploy action doesn't push, so it's safe).
- The GitHub connector Claude uses can write these JSON files directly but
  cannot edit `.github/workflows/*`; paste any workflow-step additions via
  the GitHub web UI.
