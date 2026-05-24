# Platform — Player Development OS

Monorepo for the Coach + Player youth-development platform.

## Layout

```
platform/
  apps/web/                  Next.js 15 app (App Router)
  packages/
    corpus/                  Tier-1 safety + drills loader (cwd-walk resolver)
    safety/                  Pitch Smart, age matrix, dontDoToday, escalation, workload
    compiler/                Practice-plan compiler + extensions (homeMission, antiLine…)
    ai/                      Prompt builder, post-filter, refusals, BM25 retrieval
    diagnosis/               Verified-only driver-tree diagnosis engine
    ingest/                  GameChanger CSV + fuzzy name match
    missions/                Age-scaled player missions + streaks
    eval/                    Auto-generated assertion runner + CLI
    db/                      Prisma schema + seed
  scripts/
    bulletproof.ps1          N-pass full pipeline harness
```

## Common commands

```powershell
# All commands run npm via cmd /c on Windows (PowerShell blocks npm.ps1)
cmd /c "npm install"
cmd /c "npm run test"       # vitest — 68 tests
cmd /c "npm run eval"       # 106 corpus-derived assertions
cmd /c "npm run build:web"  # next prod build
cmd /c "npm run dev"        # next dev on :3000
cmd /c "npm run verify"     # test + eval + build

# Bulletproof: clean → vitest → eval → build → start → live-hit every endpoint
powershell -ExecutionPolicy Bypass -File scripts/bulletproof.ps1 -Runs 5 -Port 3030
```

## Endpoints

- Pages: `/`, `/coach`, `/parent`, `/drills`, `/missions`, `/safety`, `/practice/new`
- APIs: `/api/compile`, `/api/safety/check`, `/api/eval`, `/api/diagnose`, `/api/retrieve`,
  `/api/drills`, `/api/missions`, `/api/ingest`, `/api/dont-do-today`, `/api/escalate`

## Backlog mapping (selected)

| File / package | Epic / story |
|---|---|
| `packages/db/prisma/schema.prisma` | E1.3 |
| `packages/corpus/src/index.ts` | E5.1, E8.1 |
| `packages/safety/src/pitchSmart.ts` | E5.2, E5.4 |
| `packages/safety/src/ageMatrix.ts` | E5.3 |
| `packages/safety/src/dontDoToday.ts` | E5.5 |
| `packages/safety/src/escalation.ts` | E5.7 |
| `packages/safety/src/workload.ts` | E13.1, E13.4 |
| `packages/compiler/src/index.ts` | E6.3–E6.7 |
| `packages/compiler/src/extensions.ts` | E6.8, E12.1, E12.2, E13.1 |
| `packages/diagnosis/src/engine.ts` | E10.1, E10.2 |
| `packages/ingest/src/gameChanger.ts` | E4.3 |
| `packages/missions/src/index.ts` | E14.1 |
| `packages/ai/src/retrieval.ts` | E8.1 |
| `packages/ai/src/postFilter.ts` | E8.3 |
| `packages/eval/src/index.ts` | E23.1–E23.3 |

