# @platform/launch-review

The **Launch Review Agent** — a single deterministic harness that runs the
project's launch gate and aggregates every signal into one launch-readiness
report instead of a one-time vibe check.

It is the orchestration layer described in `platform/REVIEW_AGENT.md`. It runs
four layers, normalizes every artifact into a uniform finding model (P0–P3),
buckets them, computes a 0–100 score, and emits a `block | risky | acceptable |
ready` decision.

## Layers

| Layer | What runs | Needs a live server? |
|---|---|---|
| **A — deterministic gates** | `vitest`, web `tsc`, optional `build` | no |
| **B — scripted E2E** | `scripts/qa-agent` (Playwright) | yes |
| **C — exploratory journeys** | `scripts/ux-agent` (persona heuristics) | yes |
| **D — static + a11y + aggregate** | `scripts/code-agent` (OWASP/static), `a11y-scan` (axe-core), then scoring | no (a11y needs server) |

A failed Layer-A gate forces decision `block` — the agent never reasons around a
red build/typecheck/test. B and C run **sequentially** (never concurrently — a
shared dev server saturates and produces false failures).

## Run

From `platform/`, with a dev server live on `:3000`:

```pwsh
cmd /c "npm run launch-review"
```

Output lands in `platform/reports/`:

- `launch-review.md` — human-readable report
- `launch-review.json` — structured report (feed this to the `REVIEW_AGENT.md` prompt for the qualitative pass)
- plus each sub-agent's report under `scripts/{qa,ux,code}-agent/*-report/`

If no live app is reachable, the QA + UX layers are skipped and the decision is
capped below `ready` (you can't certify launch without the E2E layers).

## Env

| Var | Default | Effect |
|---|---|---|
| `LR_BASE_URL` | `http://localhost:3000` | App URL for QA/UX/a11y |
| `LR_OUT` | `platform/reports` | Report output dir |
| `LR_GATES=0` | — | Skip Layer A (iterate on aggregation only) |
| `LR_BUILD=1` | — | Add the (slow) `build:web` gate |
| `LR_SKIP_QA=1` / `LR_SKIP_UX=1` / `LR_SKIP_CODE=1` | — | Skip a sub-agent |

Exit code is `1` when the decision is `block` — suitable as a CI gate.

## Notes

- Windows: PowerShell blocks `npm.ps1`, so the harness shells out via `cmd /c`.
- The code-agent runs with `CODE_CHECKS=0` so it doesn't re-run vitest/tsc (Layer A already did).
- The accessibility scan lives in the QA agent (`scripts/qa-agent/src/scenarios/a11y-scan.ts`) and uses the optional `@axe-core/playwright` dep — run `npm install` in `scripts/qa-agent` to activate it.
