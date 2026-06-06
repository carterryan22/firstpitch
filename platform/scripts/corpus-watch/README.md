# @platform/corpus-watch

Every-3-days, hands-off pipeline for the **creator / social sources** in
`corpus/sources.seed.json` (the youth-baseball influencers and channels). It
finds new content and, by default, **auto-promotes** it straight into the
corpus — each new clip inherits its parent creator's safety posture (always
forced to `safe_to_prescribe: false` + a guardrail deferring to Pitch Smart /
Tier-1). Set `CORPUS_PROMOTE_REQUIRE_APPROVAL=1` to require a manual approve
step instead.

Two stages:

1. **watch** — scans creator sources, queues anything new.
2. **promote** — turns queued candidates into `SourceRecord`s in
   `sources.seed.json` and clears them from the queue.

`npm run cycle` runs both back-to-back; the scheduled task uses it.

## What gets scanned

- **YouTube channels** (`/@handle`, `/user/x`, `/channel/UC…`, vanity paths) —
  scraped from the public `/videos` page (the legacy `/feeds/videos.xml` Atom
  feed is dead from most networks), no API key required.
- **Instagram / TikTok profiles** — can't be polled without authenticated APIs,
  so the tool drops a periodic "manual check" reminder into the digest instead.
- Anything tagged `social` or `video` in `sources.seed.json`.

## Outputs (written to the workspace `corpus/` folder)

| File | Purpose |
|---|---|
| `review-queue.json` | Machine-readable candidate list (status `pending_review`). |
| `review-queue.md` | Human digest: a table of new content + manual-check todos. |
| `.corpus-watch-state.json` | Per-source watermark (seen IDs, last-checked). Don't edit by hand. |

The **first run learns a baseline** (records what already exists) and does not
flood the queue with each creator's back catalogue. Subsequent runs only report
items newer than the baseline.

## Run it

```powershell
cd platform/scripts/corpus-watch
cmd /c "npm install"          # first time only (installs tsx)
cmd /c "npm run cycle"        # scan + auto-promote (the full pipeline)

cmd /c "npm run watch"        # scan + write queue only
cmd /c "npm run watch:dry"    # scan + print, write nothing
cmd /c "npm run promote"      # promote queued candidates into the corpus
cmd /c "npm run promote:dry"  # show what would be promoted, write nothing
```

Tuning via env vars: `CORPUS_WATCH_MAX` (max new items per source, default 8),
`CORPUS_WATCH_MANUAL_DAYS` (manual-nudge cadence, default 6),
`CORPUS_PROMOTE_REQUIRE_APPROVAL=1` (gate promotion on an explicit approve),
`CORPUS_DIR` (override corpus path).

## Schedule it every 3 days (Windows)

```powershell
# from this folder, in an elevated-or-normal PowerShell:
./register-task.ps1            # registers task "BaseballCorpusWatch"
./register-task.ps1 -Unregister   # remove it
```

The task runs `npm run cycle` every 3 days — scan **and** auto-promote — so the
corpus stays current with zero manual steps.

## How promotion works

`promote` matches each queued candidate to its **parent creator source** (by
URL), clones that record to inherit its tags + posture, then:

- **always** forces `safe_to_prescribe: false` and `requires_guardrail: true`
  (unvetted social clips never get a green light, regardless of the parent);
- fills a `guardrail_reason` / `do_not_use_for` from the parent, falling back to
  a conservative Pitch Smart / Tier-1 default if the parent left them blank;
- rewrites title/url/summary for the specific clip and tags it `auto-added`;
- dedupes against existing sources by content URL.

Instagram / TikTok can't be auto-polled, so those stay as manual-check nudges in
`review-queue.md` and are never auto-promoted.

### Require manual approval instead

Set `CORPUS_PROMOTE_REQUIRE_APPROVAL=1`. Then only candidates marked `approved`
get promoted:

```powershell
cmd /c "npm run approve -- --list"      # show pending candidates
cmd /c "npm run approve -- antonelli"   # approve by name/title/id match
cmd /c "npm run approve -- --all"       # approve everything pending
cmd /c "npm run promote"                 # promote the approved ones
```
