# Deep Review Harness — SUP runner (Supportability / shift-left · v3 · First Pitch)

> Self-contained. Paste this whole file into one fresh Claude-in-Chrome session. It runs the
> **Supportability** dimension only and emits a partial manifest keyed to the shared `run_id`.
> Hand the partial to `merge.md` once every dimension is done. Derived from
> `deep_review_harness_v3.md`. The standing question for every check: **when this app misbehaves
> at 6 PM on a field with one bar of signal, can the user self-recover — and if not, can whoever
> supports it diagnose it from what the user can tell them?**

---

# 1. RUN CONFIGURATION (pre-filled — confirm before running)

```yaml
run:
  run_id: "FP-QA-{YYYYMMDD}-{NN}"          # SAME id across all dimension sessions of this review
  previous_run_manifest: "[paste prior MERGED manifest JSON, or null for baseline]"
  mode: "dimension:sup"                      # this runner = SUP only. Set "smoke" to rerun prior fails + P0/P1-capable only.
app:
  name: "First Pitch"
  url: "https://firstpitch.app"             # use prod for version-visibility + resilience honesty; localhost ok for self-service inventory
  build_or_commit: "unknown"                # repo is single-commit; whether a user can READ a version is exactly SUP-DIAG-001
  stack: "Next.js 15 App Router on Vercel; custom magic-link auth; KV/JsonFile/InMemory storage; Resend email; /api/health liveness+readiness probe (NOT user-facing). NOT Supabase."
  stage: "mvp"
users:
  roles: ["head_coach", "assistant_coach", "parent", "player", "admin"]
  tenants_required: 1                        # SUP is mostly single-tenant; admin-tier tooling is head_coach over Team A
context:
  primary_device: "mobile"
  environment: "outdoor, bright sun, one-handed, poor connectivity, time pressure — the literal failure context for every SUP check"
  data_sensitivity: "minors_pii"
  top_tasks:
    - { id: T1, task: "Coach: edit tonight's lineup after a no-show", budget_seconds: 60, budget_taps: 12 }
    - { id: T2, task: "Coach: compile a 90-min practice plan", budget_seconds: 90, budget_taps: 16 }
    - { id: T3, task: "Coach: pitch/catcher availability + log pitch counts", budget_seconds: 45, budget_taps: 10 }
    - { id: T4, task: "Coach: Fix-Last-Game symptoms -> practice", budget_seconds: 60, budget_taps: 12 }
    - { id: T5, task: "Parent: tonight's lineup + child's mission + shared report", budget_seconds: 30, budget_taps: 8 }
spec:
  reference: "In-repo: DECISION-LOG.md (AUTHORITATIVE), HANDOFF.md."
  domain_safety_rules: ["A failure must never silently drop a Pitch Smart/arm-care alert", "incomplete arm-load data must show 'unknown', never 'green'"]
support_model:
  channels_expected: ["in-app help (/policy, /policy/data-requests)", "email (hello@firstpitch.app general; privacy@firstpitch.app privacy/DSR)"]
  slo_assumption: "solo developer, no support staff — every support-required path is effectively a launch risk"
```

---

# 2. HARNESS PROTOCOL (read fully before executing any check)

### 2.1 Determinism rules
- **Namespaced fixtures:** prefix every entity `QA_{run_id}_`. Reuse fixture *definitions* across runs.
- **Fixed hostile dataset:** seed the standard set (long/unicode/markup names, 1,000-char note,
  boundary numerics, edge dates) so "data looks wrong" checks (SUP-DIAG-005) have something to bite on.
- **Stable check IDs:** reference exactly; new discoveries get a `-X` suffix (e.g., `SUP-SELF-X1`).
- **Atomicity:** record `blocked` (with the blocking ID) rather than skipping.
- **Evidence at capture time:** exact URL, role, viewport, observed vs expected; quote console
  output and any error reference IDs verbatim.

### 2.2 Result vocabulary
`pass` | `fail` | `warn` | `blocked` | `not_applicable` (with reason). No other states.

### 2.3 Severity is computed, not vibed
| Condition | Severity |
|---|---|
| Error with no recovery path AND no support path | P1 |
| An account action that is **impossible** (no self-serve and no admin/vendor path) | P1 |
| A failure that silently drops a safety alert (Pitch Smart/arm-care) | P0 |
| Spinner-with-no-timeout / blank-screen on backend failure of a core view | P2 |
| Every "support-required" account action (predicted ticket driver) | P2 |
| Missing version visibility; missing error reference IDs (at production) | P2 |
| Everything else (console noise, missing in-context help) | P3 |

Stage modifier: at `mvp`, downgrade P2→P3 for polish-class items only — never for an impossible
account action or a dropped safety signal. `SUP-DIAG-002` error reference IDs = warn at mvp,
fail at production.

### 2.4 Per-dimension diff handling
Single-dimension session: compute **only the SUP dimension score** and emit a **partial
manifest**. Cross-run diff + unified report are produced by `merge.md`. Set `diff_status` from
the pasted `previous_run_manifest` if present (fingerprint `check_id + url_pattern +
observed_class`), else `diff_status:"unknown"`. The `SUP-PRED-001` top-10 table must be carried
into the manifest so merge can trend drivers resolved vs persisting.

### 2.5 Dimension scoring (0–100, computed)
`score = 100 × Σ(weightᵢ × resultᵢ) / Σ(weightᵢ)`; pass=1/warn=0.5/fail=0; weight by worst
severity (P0=5, P1=3, P2=2, P3=1). Report `dimension_scores.SUP`.

### 2.6 Setup (every run)
1. Verify a Tenant A head_coach + at least one parent + one player account so self-service and
   admin-tooling inventories are real.
2. Have dev-tools network throttling/offline toggle ready (SUP-DIAG-006, SUP-REL-001/003).
3. Keep console open for the clean happy-path noise count (SUP-DIAG-004).
4. Capture environment fingerprint: browser, viewport, timezone, target URL, and **search every
   plausible place a build/version string could appear** (footer, /policy, settings, `<meta>`,
   `/api/health` body) — its absence is `SUP-DIAG-001`.
5. Refresh the Surface Inventory; mark drift vs `previous_run_manifest`.

---

# 3. CHECK CATALOG — SUP (Supportability)

> **First Pitch anchors for this dimension:**
> - **SUP-DIAG-001 version visibility:** the repo is single-commit and nothing is known to render
>   a build/version to a user. `/api/health` reports config as booleans only (no version, and
>   it's not user-facing). Expect a likely **fail** — there's no "what version are you on?" answer.
> - **SUP-DIAG-002 error reference IDs:** `reportError(err, ctx)` exists (monitoring) but does the
>   *user* get a quotable correlation ID? Coach-chat/500 paths return a generic "Something went
>   wrong" — verify whether any reference ID reaches the screen.
> - **SUP-DIAG-006 / SUP-REL:** there's a `MobileRefresh` component and Vercel serverless; with
>   connectivity dropped, does a core view (FieldBoard, `/api/compile`) distinguish **offline**
>   from a generic error, or spin forever? Spinner with no timeout = fail.
> - **SUP-SELF-001 account self-service:** **delete account exists** (`/api/account/delete`,
>   `confirm:"DELETE"`, 30-day non-destructive) and **data export exists**
>   (`/api/account/export`). Verify **change email**, **change display name**, and **recover from
>   lost email access** — magic-link-only auth means a lost inbox can be a hard lockout (likely a
>   support-required or impossible path → ticket driver / P1).
> - **SUP-SELF-003 admin-tier tooling:** head_coach can add/remove members (`AddMemberForm`,
>   `/api/teams/{id}/members`) and re-send invites — inventory whether they can also reset a
>   member's access and fix a wrong record without the vendor.
> - **SUP-SELF-002 undo/repair:** likely-mistake set for this app: wrong pitch count logged,
>   accidental player delete, wrong player quick-tagged (Coach Memory roll-up), wrong game date
>   from CSV/ICS import, a parent report shared in error (a `recall` path exists — verify it).
> - **SUP-HELP-004 contact path:** in-app help routes to `/policy` + `/policy/data-requests`;
>   support email is `hello@firstpitch.app` (privacy `privacy@firstpitch.app`). With a
>   solo-developer SLO, no in-app feedback channel that auto-captures page/version = warn (fail
>   at production). Check whether a submitted contact even tells the user what to include.
> - **SUP-PRED-001** is the shift-left deliverable: synthesize the whole run into a ranked Top-10
>   support-driver table with the cheapest deflection for each. It trends run-over-run.

### SUP-DIAG — Diagnosability
- **SUP-DIAG-001** Version visibility: app version/build readable somewhere a user could quote it (settings/footer/`/policy`). Absence = fail.
- **SUP-DIAG-002** Error reference IDs: do user-facing errors carry a correlation/reference ID? Pass: present on server-originated errors. Absence = warn at mvp, fail at production.
- **SUP-DIAG-003** Reproducibility from a user report: pick 3 failures found this run; write the ticket a real user would send ("it didn't save"). Could support reproduce from that alone + what the app exposes? Score each easy/possible/impossible; any "impossible" on a core flow = fail.
- **SUP-DIAG-004** Console hygiene: count console errors/warnings during a clean happy-path run of T1–T5. Pass: zero errors. (Known benign output is CLI/dev-only — any app-route noise counts.) PII in console cross-refs SEC-CLNT-004.
- **SUP-DIAG-005** State inspectability: when data looks wrong, can the user articulate it (timestamps, last-saved/last-updated indicators, sync status)? List core entities lacking a last-updated signal (lineups, pitch counts, parent reports, Coach Memory).
- **SUP-DIAG-006** Network-failure visibility: with connectivity dropped, does the app distinguish "offline" from a generic error? Pass: explicit offline state.

### SUP-SELF — Self-service & demand reduction
- **SUP-SELF-001** Account self-service inventory: change email, change display name, delete account, re-auth when a link expires, recover from lost email access. Per item: self-serve / support-required / impossible. Every support-required item is a predicted ticket driver; every impossible item = fail.
- **SUP-SELF-002** Undo/repair coverage: for the 5 most likely mistakes (wrong pitch count, accidental delete, duplicate record, wrong player tagged, wrong import date), verify a user-reachable correction path. List mistakes with no path.
- **SUP-SELF-003** Admin-tier tooling: can the head_coach fix common team-level issues without the vendor — remove a member, reset access, fix a wrong record, re-send an invite? Inventory + score.
- **SUP-SELF-004** Data portability: user-reachable export of their data (cross-ref SEC-PRIV-005 / `/api/account/export`). Absence = warn + ticket-driver flag.
- **SUP-SELF-005** Stuck-state escape hatches: for every blocking state found (pending invite, unverified email/consent, mid-wizard abandon, expired magic link), verify the user can escape/restart without support.

### SUP-HELP — Help content & in-context guidance
- **SUP-HELP-001** Coverage map: does help (docs, tooltips, onboarding) exist for each of T1–T5? Per task: covered / partial / absent.
- **SUP-HELP-002** In-context help: at the 5 most confusing moments observed in the USA-TASK runs, is guidance present where the confusion occurs (not in a separate doc)?
- **SUP-HELP-003** Help accuracy: spot-check 3 help items against the current UI; stale screenshots/instructions = fail per item.
- **SUP-HELP-004** Contact path: a reachable feedback/support channel exists; submitting it captures context automatically (page, version) or at least tells the user what to include. No contact path with a solo-developer SLO = warn; at production = fail.

### SUP-REL — Operational resilience surface
- **SUP-REL-001** Graceful backend failure: simulate an API failure (offline toggle / block request) on a core view. Pass: human-readable degradation, not a blank screen or a forever-spinner. Spinner with no timeout = fail.
- **SUP-REL-002** Maintenance/status communication: any mechanism to tell users the service is down/degraded (status link, in-app banner capability)? Record presence.
- **SUP-REL-003** Recovery after failure: after SUP-REL-001, restore connectivity. Pass: app recovers without a full reload, or with a clear "reload" prompt; data entered during the outage is handled per stated behavior.

### SUP-PRED — Predicted demand drivers (synthesis)
- **SUP-PRED-001** From everything observed this run, produce the **Top 10 predicted support drivers**, ranked by expected frequency × user impact. For each: the driver, the evidence (check IDs), whether it's deflectable by product fix / help content / impossible to deflect, and the cheapest deflection. This is the shift-left deliverable; it must trend run-over-run (drivers resolved vs persisting).

---

# 4. OUTPUT CONTRACT (required)

**(a) Findings JSON** — one object per `fail`/`warn` (same shape as the SEC runner).

**(b) The SUP matrices:** the self-service inventory (`SUP-SELF-001`, per item
self-serve/support-required/impossible) and the **Top-10 predicted support drivers**
(`SUP-PRED-001`) — both rendered as tables.

**(c) Partial manifest JSON** (save as `<run_id>.sup.partial.json`):
```json
{
  "run_id": "FP-QA-20260609-01",
  "dimension": "SUP",
  "date": "ISO-8601",
  "app_version": "unknown",
  "environment_fingerprint": { "browser": "...", "viewports": ["390x844"], "timezone": "...", "target_url": "..." },
  "surface_inventory": [ { "type": "route", "pattern": "/policy/data-requests", "auth": false, "status": "tested", "first_seen_run": "FP-QA-20260609-01" } ],
  "check_results": [ { "check_id": "SUP-DIAG-001", "status": "fail", "finding_ids": ["..."] } ],
  "dimension_scores": { "SUP": 0 },
  "findings": [ { "...": "every finding object from (a)" } ],
  "top_support_drivers": [ { "rank": 1, "driver": "...", "evidence": ["SUP-SELF-001"], "deflectable_by": "product|help|none", "cheapest_deflection": "..." } ],
  "coverage_gaps": [ { "check_id": "...", "reason": "..." } ]
}
```

**(d) Coverage appendix:** every `blocked`/`not_applicable` with a reason.

---

# 5. RULES OF ENGAGEMENT
- Verification, never exploitation; your `QA_{run_id}_` fixtures only.
- Reproduce twice or label intermittent. Verbatim console output + error reference IDs at capture time.
- Every "support-required" account action is a recorded predicted ticket driver — do not soften it.
- Deduplicate to root cause; list instances under one finding.
- Never let a good score soften finding language. The score is for trend; the finding is for action.
- `smoke` mode: execute only checks that failed in `previous_run_manifest` plus any P0/P1-capable
  SUP check (impossible account action, dropped safety signal); mark everything else
  `not_applicable: smoke`.
- When a spec doc disagrees with `DECISION-LOG.md`, the log wins.
