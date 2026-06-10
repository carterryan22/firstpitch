# Competitor Research Corpus

A structured, taggable corpus of **competitor and adjacent-platform signal**, built around **workflows** (lineup → game stats → player development → training plan → parent/player profile) to locate broken handoffs. Distinct from the workspace's training-authority corpus (`../sources.seed.json`, `../drills/`, `../tier1-safety-rules.json`).

Full operating manual: [`../../competitor-research-corpus-plan.md`](../../competitor-research-corpus-plan.md).

## Files

| File | Role | Edit by |
|---|---|---|
| `corpus.schema.json` | JSON Schema (2020-12) for one corpus item | hand |
| `taxonomy.json` | Controlled vocabulary (roles / JTBD / pains / features / enums) | hand |
| `scoring.json` | 8-dimension opportunity-score config | hand |
| `platforms.json` | Three-wave research backlog (~40 platforms) | hand |
| `feature-matrix.json` | Platform × feature source of truth | hand |
| `corpus.json` | Tagged + scored signal items | hand / ingest |
| `research-report.md` | Top pains / requests / opportunities | **generated** |

`../../competitor-feature-matrix.md` is also **generated** from `feature-matrix.json`.

## Tooling (`@platform/research`, from `platform/`)

```powershell
cmd /c "npm run research"             # summary to stdout
cmd /c "npm run research -- validate" # validate corpus.json vs schema + taxonomy
cmd /c "npm run research -- matrix"   # regenerate competitor-feature-matrix.md
cmd /c "npm run research -- report"   # regenerate research-report.md
```

## Rules

- **Compliance first.** Public pages, first-party review APIs, official data APIs, manual notes — no TOS-violating scraping; never warehouse paid drill/training content.
- **Respect copyright.** Paraphrase into `clean_text`; keep `raw_text` minimal/empty. Strip tracking params from URLs.
- **Use taxonomy slugs** in `job_to_be_done` / `pain_points` / `feature_requests` so aggregation stays consistent. `url` may be `internal://<doc>` for manual notes derived from our own research docs.
- `platforms.json` `url: null` means "no verified URL — fill manually before crawling, don't guess."
