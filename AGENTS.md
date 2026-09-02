# First Pitch Codex Guide

## Repository map

- `platform/` is the active npm monorepo and the default working directory for application work.
- `platform/apps/web/` contains the Next.js application.
- `platform/packages/` contains the domain, safety, corpus, storage, auth, and evaluation packages.
- `corpus/` and the root research documents contain product evidence and planning material.
- Read `HANDOFF.md`, `DECISION-LOG.md`, and `BUILD-BACKLOG.md` before broad architectural or roadmap changes.

## Local workflow

Run Node commands from `platform/`. On Windows, invoke npm through `cmd /c` because PowerShell may block `npm.ps1`.

```powershell
cmd /c "npm ci"
cmd /c "npm run dev"
cmd /c "npm run test"
cmd /c "npm run eval"
cmd /c "npm run build:web"
cmd /c "npm run verify"
```

Use the integrated terminal for long-running development servers. The web app runs on `http://localhost:3000` by default.

## Environment

- Copy `platform/.env.example` to `platform/.env.local` only when local configuration is needed.
- Never commit `.env.local`, credentials, tokens, or production data.
- The app uses deterministic/in-memory fallbacks when optional services are unset; consult `.env.example` before adding a new dependency on an external service.

## Change discipline

- Preserve the safety and evidence classifications attached to baseball guidance. Do not present draft or unreviewed drills as vetted content.
- Keep changes focused and avoid rewriting unrelated user work.
- Add or update tests for behavior changes.
- Before handing off application changes, run the narrowest relevant checks, then `cmd /c "npm run verify"` when practical.
- Follow the repository's conventional commit style when the user asks for a commit (for example, `fix(scope): ...`, `feat(scope): ...`, or `test: ...`).
