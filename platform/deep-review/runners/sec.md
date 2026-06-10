# Deep Review Harness — SEC runner (Security · v3 · First Pitch)

> Self-contained. Paste this whole file into one fresh Claude-in-Chrome session. It runs the
> **Security** dimension only and emits a partial manifest keyed to the shared `run_id`. Hand
> the partial to `merge.md` once every dimension is done. Derived from `deep_review_harness_v3.md`.

---

# 1. RUN CONFIGURATION (pre-filled — confirm before running)

```yaml
run:
  run_id: "FP-QA-{YYYYMMDD}-{NN}"          # SAME id across all dimension sessions of this review
  previous_run_manifest: "[paste prior MERGED manifest JSON, or null for baseline]"
  mode: "dimension:sec"                     # this runner = SEC only. Set "smoke" to rerun prior fails + P0-capable only.
app:
  name: "First Pitch"
  url: "https://firstpitch.app"             # prod target. Transport/header/source-map checks REQUIRE the deployed build.
  build_or_commit: "unknown"                # repo is currently single-commit; absence is itself SUP-DIAG-001
  stack: "Next.js 15 App Router on Vercel; custom magic-link auth (packages/auth, SHA-256 token hash, 15-min TTL, platform_session cookie); storage = Vercel KV (KvJsonStore) | JsonFileStore | InMemoryStore; Resend email. NOT Supabase — authz enforced in API route handlers (getSession / userCanManageTeam / requireRole), not Postgres RLS."
  stage: "mvp"
users:
  roles: ["head_coach", "assistant_coach", "parent", "player", "admin"]
  tenants_required: 2                        # Team A (owner Coach A + fixtures) + Team B (owner Coach B = attacker/observer)
context:
  primary_device: "mobile"                   # 390x844; iOS ships as a Capacitor WKWebView over this same web app
  environment: "outdoor, bright sun, one-handed, poor connectivity, time pressure (field-side at 6 PM)"
  data_sensitivity: "minors_pii"             # youth players; COPPA in scope
  top_tasks:
    - { id: T1, task: "Coach: edit tonight's lineup after a no-show (auto-fill FieldBoard, honor Pitch Smart + fairness, save)", budget_seconds: 60, budget_taps: 12 }
    - { id: T2, task: "Coach: compile a 90-min practice plan (focus + age + field tier -> plan)", budget_seconds: 90, budget_taps: 16 }
    - { id: T3, task: "Coach: check who can pitch/catch tonight + log pitch counts (Pitch Smart alerts)", budget_seconds: 45, budget_taps: 10 }
    - { id: T4, task: "Coach: Fix-Last-Game — tap symptoms -> top-3 priorities -> recommended practice", budget_seconds: 60, budget_taps: 12 }
    - { id: T5, task: "Parent: open app -> tonight's lineup + child's assigned mission + any SHARED monthly report", budget_seconds: 30, budget_taps: 8 }
spec:
  reference: "In-repo: DECISION-LOG.md (AUTHORITATIVE — wins all conflicts), coach-platform-build-plan.md, coach-platform-practice-compiler.md, HANDOFF.md, BUILD-BACKLOG.md."
  domain_safety_rules:
    - "Pitch Smart daily pitch-count maxima + mandatory rest days by age (corpus/pitch-smart-tables.json) — never silently violable."
    - "Tier-1 safety rules (corpus/tier1-safety-rules.json, 15 rules) override voice/convenience."
    - "Incomplete/self-reported arm-load data can NEVER display 'green' (DECISION-LOG D7)."
    - "Nothing reaches a parent until a coach reviews -> edits -> approves -> explicitly shares (monthly report gate)."
    - "Forbidden: public leaderboards <12, national rankings, single composite 'player score', velo badges without arm-care context, parent-visible negative notes, recruiting language for young players."
support_model:
  channels_expected: ["in-app help (/policy, /policy/data-requests)", "email (hello@firstpitch.app; privacy@firstpitch.app for privacy/DSR)"]
  slo_assumption: "solo developer, no support staff"
```

---

# 2. HARNESS PROTOCOL (read fully before executing any check)

### 2.1 Determinism rules
- **Namespaced fixtures:** every entity you create is prefixed `QA_{run_id}_` (e.g., player
  `QA_FP-QA-20260609-01_HostileName`). Reuse fixture *definitions* across runs so checks hit
  identical data.
- **Fixed hostile dataset (seed once in Tenant A):** name `O'Brien-Smith`, name `José Núñez 强`,
  200-char name (`A`×200), name `<b>bold</b>`, name `x" onmouseover="x`, name `=1+1` (and one
  `@SUM`-prefixed), note of 1,000 chars, numeric fields at {0, -1, 0.5, domain_max,
  domain_max+1} (e.g., jersey, pitch counts), dates {today, leap day 2028-02-29, Dec 31,
  future +1yr, DST spring-forward}.
- **Stable check IDs:** reference IDs exactly. New discoveries attach to the nearest ID with a
  `-X` suffix (e.g., `SEC-AUTHZ-X1`).
- **Atomicity:** each check is independently runnable; if a prerequisite failed, record
  `blocked` with the blocking check's ID rather than skipping.
- **Evidence at capture time:** every fail/warn records exact URL, role, viewport, observed
  value, expected value. Console/network evidence quoted verbatim, never paraphrased.

### 2.2 Result vocabulary
Each check resolves to exactly one of: `pass` | `fail` | `warn` | `blocked` |
`not_applicable` (with reason). No other states.

### 2.3 Severity is computed, not vibed
| Condition | Severity |
|---|---|
| Cross-tenant or cross-role data exposure (read or write) | P0 |
| Stored XSS executes; secrets in bundle; auth bypass | P0 |
| Safety/domain rule silently violable | P0 |
| Minors' PII exposed via unauthenticated link beyond intended scope | P0 |
| Sensitive fields present in API response but hidden by UI | P0 |
| Silent data loss; success shown but write not persisted | P0 |
| Session not invalidated on logout/role change; magic link reusable | P1 |
| Core task (T1–T5) impossible or >3× over budget | P1 |
| Error with no recovery path and no support path | P1 |
| Missing consent flow where data_sensitivity = minors_pii | P1 |
| Core task 1.5–3× over budget; destructive action without specific confirm | P2 |
| Missing empty/error state on a core view; systemic inconsistency | P2 |
| Everything else | P3 |

Stage modifier: at `mvp`, downgrade P2→P3 for **polish-class items only** — never for
security, privacy, safety, or data loss.

### 2.4 Per-dimension diff handling
This is a single-dimension session. Compute **only the SEC dimension score** and emit a
**partial manifest**. The run-over-run diff (NEW / REGRESSED / FIXED / PERSISTENT) and the
unified report are produced by `merge.md` after all partials exist. If `previous_run_manifest`
is pasted, you may set `diff_status` per finding by fingerprint
(`check_id + url_pattern + observed_class`); otherwise set `diff_status: "unknown"` and let
merge resolve it. A check that was FIXED in a prior run and fails again is `REGRESSED` →
merge auto-escalates one severity level.

### 2.5 Dimension scoring (0–100, computed)
`score = 100 × Σ(weightᵢ × resultᵢ) / Σ(weightᵢ)`; result pass=1, warn=0.5, fail=0; weight by
the worst severity a check can yield: P0-capable=5, P1=3, P2=2, P3=1. Report `dimension_scores.SEC`.
Scores are for trend only — never let a good score soften P0/P1 finding language.

### 2.6 Setup (every run)
1. Create/verify role accounts; two tenants (A = subject w/ fixtures, B = attacker/observer).
   Local dev login is gated by `PLATFORM_ALLOW_DEV_LOGIN=1` (see README boot recipe).
2. Seed the fixed hostile dataset in Tenant A.
3. Open dev tools; keep console + network recording for the whole run; preserve log on nav.
4. Capture environment fingerprint: browser+version, viewport(s), timezone, target URL, and
   any visible app version/commit (its absence is `SUP-DIAG-001`, owned by the SUP runner).
5. Build/refresh the **Surface Inventory**: every route pattern + API endpoint observed
   (method, path, auth y/n). Carry forward from `previous_run_manifest`; mark additions/removals
   — surface drift is reported.

---

# 3. CHECK CATALOG — SEC (Security)

> **First Pitch anchors for this dimension (highest-value, because authz is in code, not RLS):**
> - **SEC-AUTHZ-002/003 + SEC-API-001 are the load-bearing checks.** There is no RLS backstop;
>   every isolation guarantee is a route-handler check. A miss is a real cross-tenant leak.
>   A live regression scenario already exists (`scripts/qa-agent/.../authz-isolation.ts`:
>   Coach B → 403×5, Anon → 401×5, Parent → 403×5) — reproduce manually and extend.
> - **Magic link:** 15-min TTL, atomic single-use `consume()` (rejects already-consumed/expired),
>   request-link rate limit **6/email/hour** via an **in-process Map** (per-serverless-instance,
>   not global — a known/accepted MVP limit; confirm it's still only a `warn`, not newly worse).
>   Issuing L2 does **not** invalidate a still-unconsumed L1 — verify and judge (`SEC-AUTH-003`).
> - **Shareable artifacts:** Press Box `/p/g/<gameId>/<sig>` (HMAC-SHA256 over `PLATFORM_AUTH_SECRET`,
>   `noindex`) and the public team page `/teams/<slug>` (intended indexable). Press Box must
>   expose only first name + jersey + lineup-by-inning + pitch counts; the team page must show
>   **no** roster names/contacts. Anything more on minors = P0 (`SEC-AUTHZ-005`).
> - **Parent over-fetch (`SEC-API-001`):** only monthly reports with `status:"shared"` may reach
>   `/parent`; coach-editable `content` vs immutable `generated`; game notes gated by
>   `shareWithParents`/`shareWithPlayer`. Rule: **no parent-visible negative notes** — a
>   coach-only field present in any parent response = P0.
> - **Consent (`SEC-PRIV-003`):** a COPPA flow exists (`requiresParentalConsent` <13,
>   `/api/consent/verify`) — verify it actually gates under-13 activation end to end.
> - **DSR:** `/api/account/export` and `/api/account/delete` (confirm `"DELETE"`, 30-day
>   non-destructive) exist — test propagation (`SEC-PRIV-004/005`).
> - **Known/accepted MVP risks — confirm still acceptable, don't relitigate as NEW P0:** rate
>   limiter per-instance Map; KvJsonStore single-blob last-write-wins; no Stripe webhook
>   (billing off by default). Security headers + CSP already ship in `next.config.mjs`
>   (prod strips `unsafe-eval`).

### SEC-AUTH — Authentication lifecycle
- **SEC-AUTH-001** Magic link single-use: request link, consume it, attempt reuse. Pass: second use rejected.
- **SEC-AUTH-002** Magic link expiry: request link, note stated TTL (expect 15 min); attempt use after TTL (or document absence). Pass: enforced, stated expiry.
- **SEC-AUTH-003** Superseded link: request L1, then L2; attempt L1. Pass: L1 invalidated **or** the multiple-live-links policy is documented.
- **SEC-AUTH-004** Cross-browser consumption: request in browser 1, open in browser 2. Fail only if it creates a session in an unintended context without verification.
- **SEC-AUTH-005** Logout completeness: log out in tab 1; in tab 2 attempt one read and one write via UI. Pass: both rejected.
- **SEC-AUTH-006** Server-side session revocation: after logout, replay an authenticated API request from the network log (re-trigger via UI in stale tab). Pass: 401/403.
- **SEC-AUTH-007** Protected deep links logged out: directly open 10 protected URLs (`/coach`, `/parent`, `/coach/teams/{id}/...`, `/admin/...`). Pass: all redirect to auth; post-login lands on intended destination (warn if destination lost).
- **SEC-AUTH-008** Privilege change propagation: demote/remove an assistant_coach mid-session; demoted session attempts a privileged write. Pass: rejected without re-login.
- **SEC-AUTH-009** Rate-limit signal: 10 rapid magic-link requests for one email. Pass: throttle/cooldown observed (expect 6/email/hour). Warn: unlimited. Note the per-instance Map caveat.
- **SEC-AUTH-010** Account enumeration: request login for a nonexistent email. Pass: response indistinguishable from an existing-account response.

### SEC-AUTHZ — Authorization & tenancy
- **SEC-AUTHZ-001** Full role-action matrix: every role attempts every sensitive action category (view roster, view coach notes/memory, edit lineup, edit player, delete entity, invite/remove member, export, change settings, generate/approve/share parent report) via UI. Record Allowed/Denied per cell. Pass: matrix matches role intent exactly.
- **SEC-AUTHZ-002** IDOR — routes: as Tenant B coach, request 10 Tenant A object URLs (players, games, reports, baselines, parent-reports). Pass: all denied. Any read = P0.
- **SEC-AUTHZ-003** IDOR — APIs: replay 10 Tenant A API requests (from network log) under Tenant B session, including ≥3 mutation endpoints with IDs swapped (PATCH player, POST snack, PATCH settings, share report). Pass: all denied. Verification only; fixtures only.
- **SEC-AUTHZ-004** ID predictability: are object IDs sequential/guessable? Warn if sequential AND any AUTHZ check is weak; informational if authorization is solid.
- **SEC-AUTHZ-005** Shared/print links: generate every shareable artifact (Press Box `/p/g/...`, public `/teams/<slug>`, plan print/PDF, any digest). Open each in a clean incognito session. Record exactly what loads without auth and every data field exposed. Minors' identifiable data beyond intent = P0.
- **SEC-AUTHZ-006** Shared link revocation: toggle `shareEnabled` off / regenerate; attempt the old Press Box link. Pass: dead. If no revocation path exists, warn: irrevocable links to minors' data.
- **SEC-AUTHZ-007** File/media URLs: open any uploaded image/attachment URL (metric-entry attachments) from Tenant A unauthenticated. Pass: denied or short-lived signed URL. Permanent public URLs to minors' media = P0.

### SEC-API — API behavior observed from the client
- **SEC-API-001** Over-fetching: for the 5 highest-traffic GET responses (parent dashboard, team roster, game page, player detail, parent-reports), diff response fields vs what the UI renders for the current role. Hidden sensitive fields (coach-only notes/memory, other players' data, emails, internal flags, unshared report `content`) = P0.
- **SEC-API-002** Mass-assignment probe: where the UI edits an entity, inspect the PATCH/PUT body; resend via dev-tools with an extra field (`"role":"admin"`, `"team_id":"<TenantB>"`, `"status":"shared"`). Pass: server ignores/rejects unknown or unauthorized fields. If the interface won't permit request editing, mark `blocked`.
- **SEC-API-003** Verbose errors: trigger 5 server errors (malformed input, missing resource). Pass: no stack traces, SQL, file paths, or internal hostnames in responses.
- **SEC-API-004** Write rate-limiting: 20 rapid identical writes via UI double-fire (POST player, share report). Pass: throttled or idempotent; unbounded duplicates = fail (also feeds data-integrity).

### SEC-INP — Input handling
- **SEC-INP-001** Stored XSS: confirm `<b>bold</b>` renders as literal text in EVERY surface that shows names (roster lists, FieldBoard cells, player detail, Coach Memory, parent dashboard, Press Box, emails/notifications, autocomplete, search, page `<title>`). Any rendered markup = P0. Enumerate surfaces checked.
- **SEC-INP-002** Attribute-context XSS: confirm `x" onmouseover="x` is inert everywhere, including FieldBoard tooltips and `title` attributes.
- **SEC-INP-003** Injection round-trip: a SQL-ish/`'` string stores and returns byte-identical; no 500s on save or search.
- **SEC-INP-004** Export injection: if any CSV/spreadsheet export reaches a user (note: lineup CSV export is a known gap; GameChanger CSV is import-only), open one containing the `=1+1`/`@SUM` fixture name. Pass: formula-escaped (leading `'`/quoted). CSV formula injection in a parent-downloaded file = P1. `not_applicable` if no user-facing CSV export exists.
- **SEC-INP-005** Upload handling: metric-entry attachments are URL-paste (no binary upload) — verify pasted `javascript:`/`data:` URLs are neutralized and rendered links are inert. If true binary upload exists, attempt oversized + wrong-extension (`.html` as `.jpg`) and confirm served content can't execute as HTML.

### SEC-TRAN — Transport & headers (run against the DEPLOYED build)
- **SEC-TRAN-001** HTTPS everywhere; HTTP→HTTPS redirect; no mixed-content warnings across the run.
- **SEC-TRAN-002** Cookie flags: `platform_session` has `Secure`, `HttpOnly`, `SameSite`. Auth token readable by JS = warn at minimum; combined with any XSS finding = escalate to a P0 pair.
- **SEC-TRAN-003** Security headers on the main document: record CSP, HSTS, X-Frame-Options/`frame-ancestors`, X-Content-Type-Options, Referrer-Policy (these ship in `next.config.mjs` — verify they actually arrive on prod, and that prod CSP omits `unsafe-eval`). Absence at MVP = warn; at production = P2.
- **SEC-TRAN-004** Sensitive data in URLs: scan the network log for tokens, emails, or PII in query strings (magic-link `?token=` is expected on the verify hop — confirm it isn't echoed into referrers or retained in history beyond that). Pass: none leak.

### SEC-CLNT — Client bundle hygiene
- **SEC-CLNT-001** Secrets scan: search page source + loaded JS for `key`, `secret`, `token`, `service_role`, internal hostnames. `NEXT_PUBLIC_*` values are expected-public (pass-with-note) **only if** SEC-AUTHZ proves isolation holds. Any of `PLATFORM_AUTH_SECRET`, `RESEND_API_KEY`, `KV_REST_API_*`, `CRON_SECRET`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, `SENTRY_DSN`/`ERROR_WEBHOOK_URL`, `PRIVACY_INBOX` in the bundle = P0. A leaked secret **or** a public value + any AUTHZ failure = P0 combined finding.
- **SEC-CLNT-002** Source maps in production: are `.map` files served? Warn at production stage.
- **SEC-CLNT-003** Data at rest in the browser: inspect localStorage/sessionStorage/IndexedDB after a full session. Pass: no PII, no minors' data, no tokens beyond session necessity; record everything found.
- **SEC-CLNT-004** Debug surface: search for exposed debug routes, feature-flag panels, PII printed to console. (Known benign console output lives only in CLI/dev tooling — `db/seed.ts`, `eval/cli.ts`, dev-mode `email.ts`; PII in any **app route** console = fail.)

### SEC-PRIV — Privacy & minors' data (data_sensitivity = minors_pii)
- **SEC-PRIV-001** Visibility leakage matrix: create one item per tier (coach-only note/Coach Memory entry, parent-visible report, player-visible mission); attempt access from every other role via UI, direct URL, API response, search, notifications, and exports. Any coach-only → parent leak via ANY channel = P0.
- **SEC-PRIV-002** Cross-family exposure: as Parent A, enumerate every data field visible about Player B (same team) across all surfaces. Report the list verbatim with a defensibility judgment per field.
- **SEC-PRIV-003** Consent gate: create/activate an under-13 player end to end. Pass: verifiable parental-consent step fires (`requiresParentalConsent`/`/api/consent/verify`). Absence = P1 + COPPA legal-review flag.
- **SEC-PRIV-004** Deletion propagation: run `/api/account/delete` (or delete a player); verify removal/anonymization in historical lineups, aggregates, Coach Memory, parent reports, Press Box, cached pages, and search. Resurrected data after deletion = P1.
- **SEC-PRIV-005** Data export (user right): confirm `/api/account/export` returns the account holder's / child's data. Absence = warn + SUP cross-ref.
- **SEC-PRIV-006** Third-party calls: list every third-party domain in the network log (Resend, optional Plausible analytics, Sentry/Stripe if enabled). Flag any receiving identifiable data; flag analytics on pages containing minors' data without disclosure.

---

# 4. OUTPUT CONTRACT (required)

Produce, in this order:

**(a) P0/P1 first.** Any P0 in security/privacy/minors-data surfaces at the very top, then continue.

**(b) Findings JSON** — one object per `fail`/`warn`:
```json
{
  "run_id": "FP-QA-20260609-01",
  "check_id": "SEC-API-001",
  "status": "fail",
  "severity": "P0",
  "likelihood": "L1",
  "diff_status": "unknown",
  "age_runs": 1,
  "title": "Parent dashboard API includes unshared report content",
  "url_pattern": "/api/.../parent-reports",
  "role": "parent",
  "viewport": "390x844",
  "observed": "GET response includes content for a report with status:'draft'",
  "expected": "Only status:'shared' reports reach a parent; coach-editable content absent otherwise",
  "repro_steps": ["1. Log in as QA_..._ParentA", "2. Open /parent", "3. Inspect the parent-reports network response"],
  "evidence": "verbatim response excerpt, sensitive values redacted to field names",
  "suggested_fix": "Filter server-side to status==='shared' and strip coach-only fields before serialization",
  "regression_test": "Assert parent-role parent-reports response excludes draft/approved content + coach_* fields",
  "cross_refs": ["SEC-PRIV-001"]
}
```

**(c) The SEC matrices** (render readably): role-action matrix (`SEC-AUTHZ-001`) and visibility
leakage matrix (`SEC-PRIV-001`).

**(d) Partial manifest JSON** (save as `<run_id>.sec.partial.json`):
```json
{
  "run_id": "FP-QA-20260609-01",
  "dimension": "SEC",
  "date": "ISO-8601",
  "app_version": "unknown",
  "environment_fingerprint": { "browser": "...", "viewports": ["390x844","1440x900"], "timezone": "...", "target_url": "https://firstpitch.app" },
  "surface_inventory": [ { "type": "api", "pattern": "/api/.../parent-reports", "auth": true, "status": "tested", "first_seen_run": "FP-QA-20260609-01" } ],
  "check_results": [ { "check_id": "SEC-AUTH-001", "status": "pass", "finding_ids": [] } ],
  "dimension_scores": { "SEC": 0 },
  "findings": [ { "...": "every finding object from (b)" } ],
  "coverage_gaps": [ { "check_id": "SEC-INP-005", "reason": "no binary upload surface" } ]
}
```

**(e) Coverage appendix:** every `blocked`/`not_applicable` with a reason. An unstated gap is a
defect in the audit itself.

---

# 5. RULES OF ENGAGEMENT
- Verification, never exploitation; your `QA_{run_id}_` fixtures only; stop at proof of access,
  never read beyond proof, never modify tenant data you don't own.
- Reproduce twice or label intermittent. Verbatim evidence at capture time. Redact sensitive
  values to field names.
- P0 in security/privacy/minors-data/safety: surface immediately at top, then continue.
- Deduplicate to root cause; list instances under one finding.
- Never let scores or pass-counts soften individual finding language. The score is for trend;
  the finding is for action.
- `smoke` mode: execute only checks that failed in `previous_run_manifest` plus all P0-capable
  SEC checks; mark everything else `not_applicable: smoke`.
- When a spec doc disagrees with `DECISION-LOG.md`, the log wins.
