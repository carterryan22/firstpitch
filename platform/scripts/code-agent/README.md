# Code Agent

A static-analysis agent that audits the **source tree** (the QA agent drives the
running UI; the UX agent scores persona workflows; this one reads the code).
It scans every package + app + script file for code-quality, security, and
repo-convention issues, then runs the project's typecheck + test gate and emits a
single prioritized code-health report — before the build ships to prod.

## What it catches

Static analyzers (per file, severity-tagged):

| Analyzer        | Looks for                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------ |
| `debugging`     | Leftover `console.log/debug/trace`, `debugger` statements in shipped code                  |
| `todos`         | `TODO` / `FIXME` / `HACK` / `XXX` markers                                                   |
| `type-safety`   | `@ts-ignore` / `@ts-nocheck`, explicit `any` / `as any`                                     |
| `security`      | Hardcoded secrets, `eval`/`new Function`, `dangerouslySetInnerHTML`, `Math.random()` for tokens, shell exec with string interpolation — tagged with OWASP Top-10 categories |
| `error-handling`| Empty `catch {}` blocks that swallow errors                                                 |
| `test-hygiene`  | `describe/it/test.only` (silently skips the suite), `.skip`                                 |
| `next-routes`   | Storage-touching API route handlers missing `export const dynamic`/`runtime` (repo rule)   |

Gates (the pass/fail bar):

- `vitest` — `npx vitest run` (the project's gate of record)
- `web typecheck` — `npx tsc --noEmit --project apps/web` (nukes `tsconfig.tsbuildinfo` first)

The report ends with a **verdict**: `⛔ NOT READY` (a gate failed or any critical
finding), `⚠️ REVIEW` (majors present), or `✅ CLEAN`. The process exits non-zero
on a blocker so it can gate CI.

## Run

No dev server needed — this agent reads source, it doesn't drive the app.

```pwsh
cd platform/scripts/code-agent
cmd /c "npm install"
cmd /c "npm run code"
```

Static scan only (skip the slow tsc + vitest gates):

```pwsh
$env:CODE_CHECKS="0"; cmd /c "npm run code"
```

Outputs land in `code-report/`:

- `report.md` — verdict, gate results, findings grouped by analyzer
- `report.json` — raw findings for tooling

## Env

| Var           | Default                | Notes                                                        |
| ------------- | ---------------------- | ------------------------------------------------------------ |
| `CODE_ROOT`   | `../..` (platform/)    | Tree to scan                                                 |
| `CODE_OUT`    | `./code-report`        | Report dir                                                   |
| `CODE_CHECKS` | `1`                    | `0` = skip the vitest + typecheck gates (static scan only)   |
| `CODE_ONLY`   | unset                  | Run a single analyzer (e.g. `security`); also skips gates    |

## Adding an analyzer

Export an `Analyzer` (`(file: SourceFile) => Finding[]`) from `src/analyzers.ts`
and append it to the `ANALYZERS` array. Each finding carries a `severity`,
`rule`, `file`/`line`, a `message`, and a concrete `suggestion`.
