# Deep Review Harness — UI / UX / Security / Usability / Supportability (v3, Automatable)

> **Design intent:** This is not a one-time audit prompt. It is a repeatable review harness. Every check has a stable ID, a deterministic procedure, explicit pass/fail criteria, and required evidence. Output is machine-readable JSON plus a human summary, so each run can be diffed against the previous run to classify findings as NEW / REGRESSED / PERSISTENT / FIXED. Pair with the v2 functional/data-integrity audit for full coverage; this harness goes deep on the five named dimensions.

---

# 1. RUN CONFIGURATION (machine-readable — fill before every run)

```yaml
run:
  run_id: "QA-{YYYYMMDD}-{NN}"            # increment NN for same-day reruns
  previous_run_manifest: "[paste prior run's manifest JSON, or null for baseline run]"
  mode: "full"                             # full | dimension:{ui|ux|sec|usability|supportability} | smoke
app:
  name: "[APP NAME]"
  url: "[DEPLOYED URL]"
  build_or_commit: "[version/commit if visible, else 'unknown']"
  stack: "[e.g., Next.js + Supabase + Vercel, magic-link auth]"
  stage: "mvp"                             # mvp | beta | production  (affects severity rules)
users:
  roles: ["head_coach", "assistant_coach", "parent", "player"]   # edit to match app
  tenants_required: 2                      # for isolation testing
context:
  primary_device: "mobile"
  environment: "outdoor, bright sun, one-handed, poor connectivity, time pressure"
  data_sensitivity: "minors_pii"           # none | pii | minors_pii | health_adjacent
  top_tasks:                               # the 5 tasks that define product success — drives UX budgets
    - { id: T1, task: "[e.g., edit tonight's lineup after a no-show]", budget_seconds: 60, budget_taps: 12 }
    - { id: T2, task: "[...]", budget_seconds: 0, budget_taps: 0 }
    - { id: T3, task: "[...]", budget_seconds: 0, budget_taps: 0 }
    - { id: T4, task: "[...]", budget_seconds: 0, budget_taps: 0 }
    - { id: T5, task: "[...]", budget_seconds: 0, budget_taps: 0 }
spec:
  reference: "[paste/link spec or null]"
  domain_safety_rules: ["[e.g., pitch count limits by age]", "[mandatory rest days]"]
support_model:
  channels_expected: ["in-app help", "email"]   # what support surface SHOULD exist
  slo_assumption: "solo developer, no support staff"  # raises the bar on self-service
```

---

# 2. HARNESS PROTOCOL (read fully before executing any check)

### 2.1 Determinism rules
- **Namespaced fixtures:** every entity you create is prefixed `QA_{run_id}_` (e.g., player `QA_QA-20260609-01_HostileName`). This makes runs identifiable, comparable, and cleanable. Reuse fixture *definitions* across runs so checks hit identical data.
- **Fixed hostile dataset:** always seed the same hostile values: name `O'Brien-Smith`, name `José Núñez 强`, 200-char name (the letter A × 200), name `<b>bold</b>`, name `x" onmouseover="x`, note of 1,000 chars, numeric fields at {0, -1, 0.5, domain_max, domain_max+1}, dates {today, leap day Feb 29 2028, Dec 31, future +1yr, DST spring-forward date}.
- **Stable check IDs:** every check below has an ID. Results must reference IDs exactly. Never invent ad-hoc findings without attaching them to the nearest check ID (use suffix `-X` for discoveries outside the catalog, e.g., `SEC-AUTHZ-X1`).
- **Atomicity:** each check is independently runnable; record result even if a related check failed. Never skip a check because an earlier one failed — record `blocked` with the blocking check's ID.
- **Evidence at capture time:** every fail/warn records the exact URL, role, viewport, the observed value, and the expected value. Console/network evidence is quoted verbatim, not paraphrased.

### 2.2 Result vocabulary
Each check resolves to exactly one of: `pass` | `fail` | `warn` (works but degraded) | `blocked` | `not_applicable` (with reason). No other states.

### 2.3 Severity is computed, not vibed
Apply this rules table to every `fail`:
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
Stage modifier: at `mvp`, downgrade P2→P3 for polish-class items only — never for security, privacy, safety, or data loss.

### 2.4 Run-over-run diff protocol
If `previous_run_manifest` is provided: after completing all checks, compare per check ID and per finding fingerprint (`check_id + url_pattern + observed_class`):
- In previous, in current → `PERSISTENT` (increment `age_runs`)
- In previous as fail, current pass → `FIXED` (verify with the exact prior repro before declaring)
- Not in previous → `NEW`
- Fixed in a prior run, failing again → `REGRESSED` (auto-escalate one severity level)
Report the diff summary first: counts of NEW / REGRESSED / FIXED / PERSISTENT, and trend per dimension score.

### 2.5 Dimension scoring (0–100, computed)
`score = 100 × Σ(weight_i × result_i) / Σ(weight_i)` where result: pass=1, warn=0.5, fail=0, and weight: any check that can yield P0=5, P1=3, P2=2, P3=1. Compute per dimension (UI, UX, USA, SEC, SUP). Scores exist for trend tracking across runs — never let a good score soften the language on individual P0/P1 findings.

### 2.6 Setup (every run)
1. Create/verify role accounts per config; two tenants (A = test subject with fixtures, B = attacker/observer perspective).
2. Seed the fixed hostile dataset in Tenant A.
3. Open dev tools; keep console + network recording for the entire run; preserve log on navigation.
4. Capture environment fingerprint: browser + version, viewport(s), timezone, app version/commit if displayed anywhere (its absence is itself check SUP-DIAG-001).
5. Build/refresh the Surface Inventory: every route pattern and API endpoint observed (method, path, auth-required y/n). Carry forward from previous manifest and mark additions/removals — surface drift is reported.

---

# 3. CHECK CATALOG

## DIMENSION: SEC — Security

### SEC-AUTH — Authentication lifecycle
- **SEC-AUTH-001** Magic link single-use: request link, consume it, attempt reuse. Pass: second use rejected.
- **SEC-AUTH-002** Magic link expiry: request link, note any stated TTL; attempt use after TTL (or document TTL absence). Pass: enforced expiry exists and is stated.
- **SEC-AUTH-003** Superseded link: request link L1, then L2; attempt L1. Pass: L1 invalidated or policy documented.
- **SEC-AUTH-004** Cross-browser consumption: request link in browser 1, open in browser 2. Record behavior; fail only if it creates a session in an unintended context without verification.
- **SEC-AUTH-005** Logout completeness: log out in tab 1; in tab 2 attempt one read and one write via UI. Pass: both rejected.
- **SEC-AUTH-006** Server-side session revocation: after logout, replay an authenticated API request from the network log (re-trigger via UI in stale tab). Pass: 401/403.
- **SEC-AUTH-007** Protected deep links logged out: directly open 10 protected URLs from Surface Inventory. Pass: all redirect to auth; post-login lands on intended destination (warn if destination lost).
- **SEC-AUTH-008** Privilege change propagation: demote/remove assistant_coach mid-session; demoted session attempts a privileged write. Pass: rejected without re-login.
- **SEC-AUTH-009** Rate limiting signal: send 10 rapid magic-link requests for one email. Pass: throttle or cooldown observed. Warn: unlimited (enumeration/spam vector).
- **SEC-AUTH-010** Account enumeration: request login for a nonexistent email. Pass: response indistinguishable from existing-account response.

### SEC-AUTHZ — Authorization & tenancy
- **SEC-AUTHZ-001** Full role-action matrix: every role attempts every sensitive action category (view roster, view coach notes, edit lineup, edit player, delete entity, invite/remove member, export, change settings) via UI. Record Allowed/Denied per cell. Pass: matrix matches spec/role intent exactly.
- **SEC-AUTHZ-002** IDOR — routes: as Tenant B coach, request 10 Tenant A object URLs (players, games, reports). Pass: all denied. Any read = P0.
- **SEC-AUTHZ-003** IDOR — APIs: replay 10 Tenant A API requests (from network log) under Tenant B session, including at least 3 mutation endpoints with IDs swapped. Pass: all denied. (Verification only; use fixtures, never real users.)
- **SEC-AUTHZ-004** ID predictability: are object IDs sequential/guessable? Warn if sequential AND any AUTHZ check is weak; informational if authorization is solid.
- **SEC-AUTHZ-005** Shared/QR/print links: generate every shareable artifact type; open each in a clean incognito session. Record exactly what loads without auth and every data field exposed. Pass: exposure matches intended scope; minors' identifiable data beyond intent = P0.
- **SEC-AUTHZ-006** Shared link revocation: revoke/regenerate a shared link if supported; attempt old link. Pass: dead. N/A if no revocation exists — then warn: irrevocable links to minors' data.
- **SEC-AUTHZ-007** File/media URLs: open an uploaded image/file URL from Tenant A in unauthenticated session. Pass: denied or short-lived signed URL. Permanent public URLs to minors' photos = P0.

### SEC-API — API behavior observed from the client
- **SEC-API-001** Over-fetching: for the 5 highest-traffic GET responses, diff response fields vs fields the UI renders for the current role. Pass: no hidden sensitive fields (coach-only notes, other players' data, emails, internal flags). Any sensitive over-fetch = P0.
- **SEC-API-002** Mass-assignment probe: where the UI edits an entity, inspect the PATCH/PUT body; resend via UI with dev-tools-edited extra field (e.g., `"role":"admin"` or `"team_id":"<TenantB>"`) if the interface permits request editing; otherwise mark blocked. Pass: server ignores/rejects unknown or unauthorized fields.
- **SEC-API-003** Verbose errors: trigger 5 server errors (malformed input, missing resource). Pass: responses contain no stack traces, SQL, file paths, or internal hostnames.
- **SEC-API-004** Write rate limiting: 20 rapid identical writes via UI double-fire where achievable. Pass: throttled or idempotent; unbounded duplicates = fail (also feeds data-integrity).

### SEC-INP — Input handling
- **SEC-INP-001** Stored XSS: confirm `<b>bold</b>` fixture renders as literal text in EVERY surface that displays names (lists, detail, exports, PDFs, emails, notifications, autocomplete, search results, page <title>). Any rendered markup = P0. Enumerate surfaces checked.
- **SEC-INP-002** Attribute-context XSS: confirm `x" onmouseover="x` fixture is inert everywhere, including tooltips and title attributes.
- **SEC-INP-003** Injection round-trip: SQL-ish string stores and returns byte-identical; no 500s on save or search. Search for the literal string `'` across search fields.
- **SEC-INP-004** Export injection: open the CSV export containing fixture `=1+1` or `@SUM` prefixed name in a spreadsheet context (or inspect raw CSV). Pass: formula-escaped (leading `'` or quoted). CSV formula injection in a parent-downloaded file = P1.
- **SEC-INP-005** Upload handling (if uploads exist): attempt oversized file, wrong-extension file (`.html` renamed `.jpg`), and verify served uploads use a content-disposition/type that prevents HTML execution.

### SEC-TRAN — Transport & headers
- **SEC-TRAN-001** HTTPS everywhere; HTTP→HTTPS redirect; no mixed content warnings in console across full run.
- **SEC-TRAN-002** Cookie flags: session cookies have `Secure`, `HttpOnly`, `SameSite` set (inspect via dev tools). Auth token readable by JS (localStorage/non-HttpOnly) = warn at minimum; combined with any XSS finding = escalate to P0 pair.
- **SEC-TRAN-003** Security headers on the main document: record presence/absence of CSP, HSTS, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy. Absence at MVP = warn; at production = P2. Frameable app with sensitive actions = clickjacking note.
- **SEC-TRAN-004** Sensitive data in URLs: scan network log for tokens, emails, or PII in query strings (these leak via referrer and logs). Pass: none.

### SEC-CLNT — Client bundle hygiene
- **SEC-CLNT-001** Secrets scan: search page source and loaded JS for `key`, `secret`, `token`, `service_role`, internal hostnames. Expected-public keys (e.g., Supabase anon key) are pass-with-note ONLY if SEC-AUTHZ checks prove row-level security holds; a present anon key + any AUTHZ failure = P0 combined finding.
- **SEC-CLNT-002** Source maps in production: are `.map` files served? Warn at production stage.
- **SEC-CLNT-003** Sensitive data at rest in browser: inspect localStorage/sessionStorage/IndexedDB after a full session. Pass: no PII, no minors' data, no tokens beyond session necessity; record everything found.
- **SEC-CLNT-004** Debug surface: search for exposed debug routes, feature-flag panels, verbose console logging of user data (PII printed to console = fail; console is captured in support screenshots).

### SEC-PRIV — Privacy & minors' data (run when data_sensitivity ≥ pii)
- **SEC-PRIV-001** Visibility leakage matrix: create one item per visibility tier (coach-only, parent-visible, player-visible); attempt access from every other role via UI, direct URL, API response inspection, search, notifications, and exports. Matrix in report. Any coach-only → parent leak via ANY channel = P0.
- **SEC-PRIV-002** Cross-family exposure: as Parent A, enumerate every data field visible about Player B (same team) across all surfaces. Report the list verbatim with a defensibility judgment per field.
- **SEC-PRIV-003** Consent gate: attempt to create/activate an under-13 player profile end to end. Pass: verifiable parental consent step exists. Absence with minors_pii = P1 + legal-review flag (COPPA).
- **SEC-PRIV-004** Deletion propagation: delete a player; verify removal/anonymization in historical lineups, aggregates, exports, cached pages, and search. Resurrected data after deletion = P1.
- **SEC-PRIV-005** Data export (user right): can an account holder export their/their child's data? Absence = warn + supportability cross-ref.
- **SEC-PRIV-006** Third-party calls: list every third-party domain in the network log; flag any receiving identifiable data; flag analytics on pages containing minors' data without disclosure.

## DIMENSION: UI — Visual quality

### UI-VIS — Layout integrity
- **UI-VIS-001** Breakpoint sweep: every major view at 360 / 390 / 768 / 1024 / 1440 px. Log each overflow/overlap/truncation with view + width. Pass: zero breakage in core-task views.
- **UI-VIS-002** Content stress: 200-char name and 1,000-char note rendered in every displaying view. Pass: graceful wrap or ellipsis everywhere; layout break = fail per view.
- **UI-VIS-003** Zoom: 200% browser zoom on the 5 core views. Pass: reflow without horizontal scroll or hidden controls.
- **UI-VIS-004** Orientation change mid-task on mobile width. Pass: no state loss, no layout break.
- **UI-VIS-005** Five-state coverage: per major view, confirm intentional empty / loading / one-item / full / error states. Output the state inventory table. Each missing state on a core view = fail instance.

### UI-CON — Consistency system
- **UI-CON-001** Token audit: sample 15 screens; inventory distinct button styles, font sizes, spacing units, and colors used for the same semantic role. Pass: ≤2 variants per role; report the inventory counts (these numbers trend across runs).
- **UI-CON-002** Icon semantics: same icon never means two things; same action never has two icons. List violations.
- **UI-CON-003** Date/number formats identical across all views and exports (cross-ref data-integrity).
- **UI-CON-004** Interaction states: hover/active/disabled/focus styles exist and are distinguishable on primary controls.

### UI-AST — Assets & polish
- **UI-AST-001** Broken images, missing favicon/app icons, placeholder text (`lorem`, `TODO`, `test`, `asdf`) anywhere in production surface — grep the rendered text of every inventoried route.
- **UI-AST-002** Browser pass: full core-task run in Chrome AND Safari/WebKit. Log divergences (date inputs and flex gaps are the usual suspects).
- **UI-AST-003** Theming: if dark mode exists, run UI-VIS-001 core views in it; if not, record N/A.

## DIMENSION: USA — Usability (measured) & UX-A11Y

### USA-TASK — Task performance against budgets
- **USA-TASK-001..005** Execute T1–T5 from config as a first-time user on the primary device width. Record taps, seconds, wrong turns, hesitation points. Pass: within budget. 1.5–3× budget = warn→P2; >3× = fail→P1. Quote the exact step where time was lost.
- **USA-TASK-006** Interruption recovery: mid-T1, take a simulated interruption (switch tabs 2 min, return). Pass: state preserved, resumable.
- **USA-TASK-007** First-run cold start: brand-new account to first unit of real value (e.g., first lineup generated). Record minutes and steps; report the single biggest drop-off risk.

### USA-FORM — Form mechanics
- **USA-FORM-001** Input preservation on validation error: every core form submitted invalid; pass: all valid fields retained. Wiped input = P1.
- **USA-FORM-002** Correct mobile keyboard per field type (numeric, email, tel) across core forms.
- **USA-FORM-003** Keyboard-open usability: with on-screen keyboard up, active field and submit remain reachable.
- **USA-FORM-004** Inline validation timing: errors appear on blur/submit, not on first keystroke; error clears when corrected.
- **USA-FORM-005** Tap targets ≥ 44px in core flows; list violations with element + view.

### USA-ERR — Error experience (rubric-scored)
- **USA-ERR-001** Error message corpus: collect verbatim every distinct error message triggered across the entire run (you trigger them constantly in SEC/UI phases — log them all). Score each 0–3: (1pt) says what happened in user language, (1pt) says what to do next, (1pt) preserves user's work/context. Report corpus with scores; mean <2.0 = dimension fail.
- **USA-ERR-002** Dead-end census: count states with no forward action (error with no retry, empty state with no CTA, 404 with no nav). Each dead end on a core path = fail instance.
- **USA-ERR-003** Async feedback: every async action has pending + definitive success/fail signal. List silent actions.

### USA-DEST — Destructive action protection
- **USA-DEST-001** Inventory every destructive action; per action record: confirmation? specific (names the object and blast radius)? undo? Pass requires specific-confirm OR undo on every irreversible action.

### USA-A11Y — Accessibility (WCAG 2.1 AA targeted, automatable subset)
- **USA-A11Y-001** Keyboard-only completion of T1–T3; log traps, invisible focus, unreachable controls.
- **USA-A11Y-002** Focus order matches visual order on core forms; focus visible on every interactive element.
- **USA-A11Y-003** Programmatic labels: clicking each label focuses its field; icon-only buttons expose accessible names (inspect accessibility tree).
- **USA-A11Y-004** Contrast: flag all visibly borderline text; mandatory check on disabled-vs-active distinction and on any outdoor-context primary text.
- **USA-A11Y-005** Live regions: toasts/validation announce via aria-live (inspect DOM); silent dynamic errors = fail.
- **USA-A11Y-006** Heading hierarchy and landmark structure sane on the 5 core views.

### USA-COPY — Language
- **USA-COPY-001** Terminology map: one concept ↔ one name across the product; list every violation pair.
- **USA-COPY-002** Jargon test against the least-expert configured persona; list labels that assume training.

## DIMENSION: SUP — Supportability (shift-left lens)

The standing question for every check: **when this app misbehaves at 6 PM on a field with one bar of signal, can the user self-recover — and if not, can whoever supports this product diagnose it from what the user can tell them?**

### SUP-DIAG — Diagnosability
- **SUP-DIAG-001** Version visibility: app version/build visible somewhere a user could read it to support (settings/footer). Absence = fail (no run-to-run "what version are you on?").
- **SUP-DIAG-002** Error reference IDs: do user-facing errors carry a correlation/reference ID a user could quote? Pass: present on server-originated errors. Absence = warn at MVP, fail at production.
- **SUP-DIAG-003** Reproducibility from user report: pick 3 failures found this run; write the support ticket a real user would send ("it didn't save"). Assess: could support reproduce from that alone + whatever the app exposes? Score each easy/possible/impossible; any "impossible" on a core flow = fail.
- **SUP-DIAG-004** Console hygiene: count console errors/warnings emitted during a clean happy-path run of T1–T5. Pass: zero errors. Noise destroys signal for real debugging; PII in console cross-refs SEC-CLNT-004.
- **SUP-DIAG-005** State inspectability: when data looks wrong, can the user see enough to articulate it (timestamps on records, last-saved indicators, sync status)? List core entities lacking a last-updated signal.
- **SUP-DIAG-006** Network failure visibility: with connectivity dropped, does the app distinguish "offline" from generic error? Pass: explicit offline state.

### SUP-SELF — Self-service & demand reduction
- **SUP-SELF-001** Account self-service inventory: change email, change display name, delete account, re-auth when link expires, recover from lost email access. Per item: self-serve / support-required / impossible. Every support-required item is a predicted ticket driver; every impossible item = fail.
- **SUP-SELF-002** Undo/repair coverage: for the 5 most likely user mistakes (wrong entry, accidental delete, duplicate record, wrong player tagged, wrong date), verify a user-reachable correction path. List mistakes with no path.
- **SUP-SELF-003** Admin-tier tooling: can the tenant admin (head coach) fix common team-level issues without the vendor — remove a member, reset a member's access, fix a wrong record, re-send an invite? Inventory and score.
- **SUP-SELF-004** Data portability: user-reachable export of their data (cross-ref SEC-PRIV-005). Absence = warn + ticket-driver flag.
- **SUP-SELF-005** Stuck-state escape hatches: for every blocking state found in the run (pending invite, unverified email, mid-wizard abandon), verify the user can escape/restart without support.

### SUP-HELP — Help content & in-context guidance
- **SUP-HELP-001** Coverage map: does help content (docs, tooltips, onboarding) exist for each of T1–T5? Per task: covered / partial / absent.
- **SUP-HELP-002** In-context help: at the 5 most confusing moments observed in USA-TASK runs, is guidance available where the confusion occurs (not in a separate doc)?
- **SUP-HELP-003** Help accuracy: spot-check 3 help items against current UI; stale screenshots/instructions = fail per item.
- **SUP-HELP-004** Contact path: a reachable feedback/support channel exists; submitting it captures context automatically (page, version) or at least tells the user what to include. No contact path with slo_assumption "solo developer" = warn; at production = fail.

### SUP-REL — Operational resilience surface
- **SUP-REL-001** Graceful backend failure: simulate API failure (offline toggle / block request) on a core view. Pass: human-readable degradation, not blank screen or spinner-forever. Spinner with no timeout = fail.
- **SUP-REL-002** Maintenance/status communication: any mechanism to tell users the service is down/degraded (status page link, in-app banner capability)? Record presence.
- **SUP-REL-003** Recovery after failure: after SUP-REL-001, restore connectivity. Pass: app recovers without full reload or with a clear "reload" prompt; data entered during outage handled per stated behavior.

### SUP-PRED — Predicted demand drivers (synthesis check)
- **SUP-PRED-001** From everything observed this run, produce the **Top 10 predicted support drivers**: rank by expected frequency × user impact. For each: the driver, the evidence (check IDs), whether it is deflectable by product fix / help content / impossible to deflect, and the cheapest deflection. This table is the shift-left deliverable and must trend run-over-run (drivers resolved vs. persisting).

---

# 4. OUTPUT CONTRACT (machine-readable — required)

### 4.1 Findings JSON (one object per fail/warn)
```json
{
  "run_id": "QA-20260609-01",
  "check_id": "SEC-API-001",
  "status": "fail",
  "severity": "P0",
  "likelihood": "L1",
  "diff_status": "NEW",
  "age_runs": 1,
  "title": "Parent-role API response includes coach_private_notes field",
  "url_pattern": "/api/players/{id}",
  "role": "parent",
  "viewport": "390x844",
  "observed": "GET /api/players/p_123 response contains coach_private_notes: 'struggles under pressure...'",
  "expected": "Field absent for parent role per visibility spec",
  "repro_steps": ["1. Log in as parent fixture QA_..._ParentA", "2. Open player detail", "3. Inspect network response for GET /api/players/{id}"],
  "evidence": "verbatim response excerpt with sensitive values redacted to field names",
  "suggested_fix": "Enforce field-level filtering server-side (RLS/column policy), not client-side",
  "regression_test": "Assert parent-role API response schema excludes coach_* fields",
  "cross_refs": ["SEC-PRIV-001"]
}
```

### 4.2 Run manifest JSON (preserved for the next run)
```json
{
  "run_id": "...",
  "date": "...",
  "app_version": "...",
  "environment_fingerprint": { "browser": "...", "viewports": ["..."], "timezone": "..." },
  "surface_inventory": [ { "type": "route|api", "pattern": "...", "auth": true, "status": "tested|partial|untested", "first_seen_run": "..." } ],
  "check_results": [ { "check_id": "...", "status": "pass|fail|warn|blocked|not_applicable", "finding_ids": [] } ],
  "dimension_scores": { "SEC": 0, "UI": 0, "USA": 0, "SUP": 0 },
  "diff_summary": { "new": 0, "regressed": 0, "fixed": 0, "persistent": 0 },
  "top_support_drivers": [ "..." ],
  "coverage_gaps": [ { "check_id": "...", "reason": "..." } ]
}
```

### 4.3 Human report (in this order)
1. **Diff summary first** (or "baseline run" statement): NEW/REGRESSED/FIXED/PERSISTENT counts, dimension score trend, ship/no-ship with conditions.
2. **P0/P1 detail** — full finding objects rendered readably; REGRESSED items flagged loudly.
3. **Dimension scorecards** with the computed scores and the 3 dominant issues per dimension.
4. **The matrices**: authorization (SEC-AUTHZ-001), visibility leakage (SEC-PRIV-001), state inventory (UI-VIS-005), error-message corpus with scores (USA-ERR-001), self-service inventory (SUP-SELF-001), top-10 support drivers (SUP-PRED-001).
5. **Systemic root causes**: the patterns behind the findings (e.g., "all visibility enforcement is client-side" explains 9 findings) — one fix per pattern.
6. **Fix sequence**: P0 → REGRESSED → systemic roots → P1 by likelihood → quick wins.
7. **Coverage appendix**: full surface inventory with per-item status; every `blocked`/`not_applicable` with reason. An unstated gap is a defect in the audit itself.

# 5. RULES OF ENGAGEMENT
- Verification, never exploitation; your fixtures only; stop at proof of access, never read beyond proof, never modify Tenant data you don't own.
- Reproduce twice or label intermittent. Verbatim evidence at capture time. Redact sensitive values to field names in the report.
- P0 in security/privacy/minors-data/safety: surface immediately at top of output, then continue.
- Deduplicate to root cause; instances listed under one finding.
- Never let scores, diffs, or pass-counts soften individual finding language. The score is for trend; the finding is for action.
- If running in `smoke` mode: execute only checks that previously failed plus all P0-capable checks; everything else `not_applicable: smoke`.
