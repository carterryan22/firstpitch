# `@platform/security-review` — Security Review Agent

A **separate, stricter gate** than the QA / UX / launch reviewers. They ask
"does the product work well?" — this one asks **"can the wrong person access,
alter, leak, or destroy data?"** Any **P0** finding **blocks launch** (the
runner exits non-zero).

Grounded in OWASP **ASVS 5.0**, **WSTG**, **Top 10 (2025 — Broken Access
Control is still #1)**, and the **API Security Top 10 (2023 — BOLA/BFLA)**.

## Run

```powershell
cd platform/scripts/security-review
cmd /c "npm install"          # first time only
cmd /c "npm run security"     # static audit + dependency audit
```

Or from the platform root:

```powershell
cd platform
cmd /c "npm run security-review"
```

Outputs to `platform/reports/`:

- `security-review.md` — human-readable, P0 blockers first
- `security-review.json` — the structured contract (decision, score, bucketed findings)

## What it checks (static)

| Analyzer | Looks for | OWASP |
|---|---|---|
| `secrets` | hardcoded credentials, server-only secrets read in `"use client"` bundles, secret-named `NEXT_PUBLIC_*` | A02 / A05 |
| `authz` | mutating storage routes with **no server-side auth/ownership gate**, unprotected admin/cron routes, `[id]` reads with no ownership check (IDOR/BOLA) | A01 / API1 / API5 |
| `injection` | `eval`/`new Function`, `dangerouslySetInnerHTML`, raw-SQL interpolation, command injection | A03 |
| `privacy` | secrets/tokens/req-body/child-PII in logs, raw error/stack returned to client | A09 |
| `crypto` | `Math.random()` for security material, MD5/SHA-1 on credentials | A02 |
| `headers` | missing CSP / HSTS / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / Permissions-Policy in `next.config` | A05 |
| `cookies` | session/auth cookies set without `httpOnly` / `sameSite` / `secure` | A05 |
| `billing` | webhook receivers that don't verify the provider signature | A08 |

The dependency **gate** runs `npm audit` — a **critical** advisory is a P0, a
**high** is a P1.

## Severity → decision

```
any P0                 → blocked   (exit 1; do not launch)
P1 outstanding         → risky
only P2                → acceptable
none                   → ready
```

## Env knobs

- `SR_ROOT` — repo root to scan (default: `platform/`)
- `SR_OUT` — output dir (default: `platform/reports`)
- `SR_ONLY=<analyzer|category>` — run a single analyzer (skips gates)
- `SR_GATES=0` — skip the dependency audit gate
- `SR_TEST=1` — also run `npx vitest run` as a gate

## Scope & limits

This is the **static** layer. It cannot replace the dynamic checks in
`SECURITY_REVIEW_AGENT.md` (DAST/ZAP against staging, live authz/role tests,
CodeQL/Semgrep, OpenSSF Scorecard). Treat a clean run as **necessary, not
sufficient** — the manual AI review and live authz tests still gate launch.
