# Baseball youth-coaching platform — agent instructions

A youth-baseball coaching platform: an npm-workspaces monorepo at `platform/` (Next.js 15 web app at `platform/apps/web`, engine packages under `platform/packages/`), plus a strategy/corpus layer at the workspace root (`corpus/*.json`, `*.md`).

## Core principles
- **Safety always wins.** Tier-1 safety + Pitch Smart override voice, fun, and convenience. Never weaken them.
- **Brand voice**: Coach RAC / Coach Ballgame energy + Alex Hale (CHIPS) standards — fun-first, high-energy, concrete cues, plain English. Never shame/compare kids, never frame conditioning as punishment, never guarantee outcomes. Guide: `corpus/brand-voice.md` (wired into `corpus/ai-system-prompts.md` §1).
- **Polish over rewrite.** Optimize and tighten existing code; don't add features unless asked.

## Toolchain (Windows / PowerShell)
- PowerShell blocks `npm.ps1` → always invoke via `cmd /c "npm ..."` / `cmd /c "npx ..."`.
- `noUncheckedIndexedAccess` is on — guard index access (`counts[k] = (counts[k] ?? 0) + 1`).
- Do NOT point `PLATFORM_DATA_DIR` under OneDrive (JsonFileStore atomic-rename `EPERM`). Use `$env:TEMP\firstpitch-dev`.
- NEVER round-trip `corpus/*.json` through PowerShell `ConvertTo-Json` (rewrites the whole file). NEVER `git checkout` an uncommitted corpus file (silently destroys records).
- `packages/safety/src/ageMatrix.ts` substring-matches literal `required`/`conditions`/`forbidden` prose — never strip numeric prose from the age matrix or Pitch Smart tables.

## Verify recipe (from `platform/`)
- Tests (the gate): `cmd /c "npx vitest run"`
- Web typecheck: `Remove-Item apps/web/tsconfig.tsbuildinfo -ErrorAction SilentlyContinue; cmd /c "npx tsc --noEmit --project apps/web"`
- Package typecheck: `cd packages/<name>; cmd /c "npx tsc --noEmit"`
- **After any major edit to the site, run the full launch gate**: boot a fresh dev server (PLATFORM_DATA_DIR off OneDrive, `PLATFORM_ALLOW_DEV_LOGIN=1`, nuke `.next`), then `cmd /c "npm run launch-review"` → `reports/launch-review.{md,json}` (gates + QA + UX + code + a11y, scored go/no-go; exits 1 on `block`). See the **Launch Review Agent**.

## Custom agents — when to delegate
Specialized agents live in `.github/agents/`. Delegate to them when a request matches:

| Request | Agent | Mode |
|---|---|---|
| End-to-end optimization/compaction sweep, fold in QA/UX feedback, verify-gated cleanup | **Code Optimizer** | edits + runs |
| Read-only audit → prioritized findings (no edits) | **Code Reviewer** | read-only |
| Review/change drills, missions, cues, or kid/parent copy for safety + voice | **Safety & Voice Guardian** | read-only |
| Run the Playwright QA or UX agents and triage their reports | **UI/UX Review Agent** | runs |
| Full pre-launch review after a major edit — runs gates + QA + UX + code + a11y, emits a scored go/no-go report (`npm run launch-review`) | **Launch Review Agent** | runs gate |
| "What's needed before launch?" / production-readiness checklist | **Release Readiness Auditor** | read-only |
| Pre-launch SECURITY audit (authz, data isolation, secrets, billing, privacy); "can the wrong person access/alter/leak data?" — authority to block launch | **Security Review Agent** | read-only + runs gate |
| Edit corpus JSON (drills, sources, matrices) or run corpus-watch promote | **Corpus Curator** | edits corpus |
| Compare against Dugout Edge / Who's on Second, update the parity matrix | **Competitor Parity Tracker** | read-only |

Prefer the read-only auditors (Reviewer, Guardian, Auditor, Parity Tracker, Security Review Agent) for "review/audit/what's wrong" asks, then hand fixes to Code Optimizer or Corpus Curator. The **Security Review Agent** is the stricter, launch-blocking gate for anything touching auth, data isolation, secrets, billing, or child/player privacy.
