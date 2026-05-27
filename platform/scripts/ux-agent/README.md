# UX Agent

A persona-driven UX/UI agent that drives the running web app like a real coach, parent, or youth player. Instead of just looking for crashes, it scores each journey on **clicks, keystrokes, page-loads, and wall-clock time**, runs a battery of UX heuristics on every page, and emits a prioritized **workflow-improvements** report per persona.

## What it checks

Per page:
- Missing `<h1>`, no primary CTA, empty/dead-end pages
- Inputs without accessible labels
- Icon-only buttons without `aria-label`
- Tap targets <40×40 px (only on mobile journeys)
- CTAs falling below ~3:1 contrast
- For the youth persona: dense copy (Flesch-style: avg words/sentence, hard-word ratio)

Per journey:
- Click budget exceeded (workflow is too deep)
- Time budget exceeded (workflow is too slow)
- Any single step >40% of budget (chokepoint)
- Broken steps (selector never appeared) → critical

## Run

```powershell
cd platform
# start the app once
$env:PLATFORM_DATA_DIR="$env:TEMP\firstpitch-dev"
New-Item -ItemType Directory -Force -Path $env:PLATFORM_DATA_DIR | Out-Null
cmd /c "npm run dev"

# in another shell
cd platform/scripts/ux-agent
cmd /c "npm install"
cmd /c "npm run install:browser"
cmd /c "npm run ux"
```

Outputs land in `ux-report/`:
- `report.md` — per-persona top recommendations + per-journey scorecards
- `report.json` — raw findings for tooling

## Env

| Var | Default | Notes |
| --- | --- | --- |
| `UX_BASE_URL` | `http://localhost:3000` | target |
| `UX_HEADED` | unset | `1` = show the browser |
| `UX_SLOWMO` | `0` | ms slowdown for headed debugging |
| `UX_ONLY` | unset | substring filter on journey name or persona |
| `UX_OUT` | `./ux-report` | report dir |

## Adding a journey

Drop a new file under `src/journeys/` exporting a `Journey`. Use `ctx.startStep` / `ctx.endStep` around each goal, call `ctx.audit()` whenever you land on a new page, and use `ctx.click` / `ctx.type` / `ctx.goto` so the click/keystroke/nav counters stay accurate. Wire it into `journeys/index.ts`.
