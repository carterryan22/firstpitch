# QA Agent

Headless UI scenario runner that drives the running dev/preview app, walks
critical user journeys, and reports every bug it can detect before the build
ships to prod.

## What it catches

For every page it visits:

- Uncaught JS errors (`pageerror`)
- `console.error` (filtered to drop framework noise — Fast Refresh, etc.)
- Failed network requests (`requestfailed`, excluding aborted client navs)
- Any HTTP response ≥ 400 (5xx → blocker, 4xx → major)
- Broken images (`naturalWidth === 0` after load)
- Goto target mismatch (unexpected redirect / wrong status)
- Soft-assertion failures inside scenarios
- Scenario crashes (uncaught exceptions in the scenario body)
- A screenshot on any crash

Every bug is tagged with the scenario, step name, URL, severity, and timestamp.

## Scenarios shipped

| Scenario             | Persona        | Covers                                                                                          |
| -------------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| `anonymous-tour`     | anonymous      | All public/marketing/library routes, first-drill deep link                                      |
| `api-smoke`          | coach (API)    | auth, /api/teams, /api/teams/:id/players, /api/retrieve, /api/compile, /api/safety, /api/auth/logout |
| `coach-happy-path`   | coach          | login → create team → seed roster → open lineup/baselines/digest pages                          |
| `parent-dashboard`   | parent         | parent login + empty-state sanity (no `undefined` / `[object Object]` text)                     |
| `safety-gates`       | system         | confirms Pitch Smart / no-warmup compile raises warnings; `/safety` lists Tier-1 rules          |

Add new scenarios by exporting a `Scenario` from `src/scenarios/foo.ts` and
appending it to `src/scenarios/index.ts`.

## Setup (one-time)

```pwsh
cd platform/scripts/qa-agent
cmd /c "npm install"
cmd /c "npm run install:browser"   # downloads Chromium
```

## Run

Start the dev server in another terminal (using the recipe from
`/memories/repo/baseball-platform.md`):

```pwsh
cd platform
$env:PLATFORM_DATA_DIR="$env:TEMP\firstpitch-dev"
New-Item -ItemType Directory -Force -Path $env:PLATFORM_DATA_DIR | Out-Null
Remove-Item -Recurse -Force apps/web/.next -ErrorAction SilentlyContinue
cmd /c "npm run dev"
```

Then run the agent:

```pwsh
cd platform/scripts/qa-agent
cmd /c "npm run qa"                 # headless against http://localhost:3000
cmd /c "npm run qa:headed"          # watch it work
```

### Options (env vars)

| Var             | Default                  | Meaning                                                |
| --------------- | ------------------------ | ------------------------------------------------------ |
| `QA_BASE_URL`   | `http://localhost:3000`  | Target. Point at a Vercel preview URL for pre-prod QA. |
| `QA_HEADED`     | `0`                      | `1` opens a real Chromium window.                      |
| `QA_SLOWMO`     | `0`                      | ms delay between actions, for debugging.               |
| `QA_OUT`        | `./qa-report`            | Output dir (report.json + report.md + screens/).       |
| `QA_ONLY`       | _(unset)_                | Substring filter on scenario name.                     |

### Pre-prod CI usage

```pwsh
$env:QA_BASE_URL="https://platform-pr-123.vercel.app"
cmd /c "npm run qa"
```

The process exits with code `1` if any **blocker** bug was recorded — wire
this into your deploy gate. `2` is reserved for runner crashes (e.g. server
unreachable).

## Output

- `qa-report/report.json` — machine-readable, suitable for diffing run-over-run.
- `qa-report/report.md` — human-readable triage view, grouped by scenario with
  severity counts.
- `qa-report/screens/<scenario>/*.png` — screenshots taken on crash or via
  `ctx.snap()` calls in scenarios.

## Why not Playwright Test directly?

This agent intentionally treats scenarios as **bug-discovery sweeps** rather
than pass/fail specs:

- Soft assertions — one failure doesn't abort the rest of the journey, so a
  single run surfaces _everything_ broken.
- Cross-cutting recorders capture issues the scenario didn't think to assert
  (console errors on a page you weren't looking at).
- Report is a triage doc, not a test result.

For strict regression coverage, layer Playwright Test on top — this agent is
about catching the long tail before prod.
