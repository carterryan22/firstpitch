# Deep Review Harness — E2E runner (End-to-end cross-surface journeys · v4 · First Pitch)

> Self-contained. Paste this whole file into one fresh Claude-in-Chrome session (real iPhone +
> Safari Web Inspector strongly preferred). It runs the **E2E** dimension only and emits a partial
> manifest keyed to the shared `run_id`. Hand the partial to `merge.md` once every dimension is
> done. New in v4 — derived from `DEEP_REVIEW_HARNESS_V4.md` §3.
>
> **Single checks prove a screen works; journeys prove the *product* works.** Each journey is run
> start-to-finish on the primary device, crossing every surface it touches (web, email, SMS/share
> sheet, a second role, a second device/tenant). A journey passes only if a real user could
> complete it **unaided**.

---

# 1. RUN CONFIGURATION (pre-filled — confirm before running)

```yaml
run:
  run_id: "FP-QA-{YYYYMMDD}-{NN}"          # SAME id across all dimension sessions of this review
  previous_run_manifest: "[paste prior MERGED manifest JSON, or null for baseline]"
  mode: "dimension:e2e"                      # this runner = E2E only. Set "smoke" to rerun prior fails + the J-FLOW + IDEMP checks only.
app:
  name: "First Pitch"
  url: "https://firstpitch.app"             # prod for honest email/auth/handoff; localhost ok for the FLOW timing if email is stubbed
  build_or_commit: "unknown"
  stack: "Next.js 15 App Router on Vercel; custom magic-link auth (15-min TTL, single-use, HttpOnly platform_session cookie); Resend email; KV/JsonFile/InMemory storage; iOS = Capacitor WKWebView over the same app. NOT Supabase."
  delivery: "wrapped_webview + responsive_web"
  stage: "mvp"
users:
  roles: ["head_coach", "assistant_coach", "parent", "player", "admin"]
  tenants_required: 2                        # J4 isolation + every MULTIROLE handoff needs Team A (subject) + Team B (observer)
context:
  primary_device: "iphone"                   # 390x844; run journeys here, cross to email/app/second device as the journey demands
  environment: "outdoor, bright sun, one-handed, intermittent LTE, time pressure (field-side at 6 PM)"
  data_sensitivity: "minors_pii"
  top_journeys:                              # THESE drive the E2E checks — measured end to end, not screen by screen
    - { id: J1, journey: "New Coach First Value: magic-link signup on iPhone -> create team -> add/import 12-player roster -> generate first lineup -> share Press Box link to an assistant", budget_minutes: 8 }
    - { id: J2, journey: "Parent Privacy: coach writes a coach-only note + a parent-safe monthly report, approves + shares it; parent taps the link from Apple Mail on iPhone and sees ONLY shared, parent-safe content", budget_minutes: 3 }
    - { id: J3, journey: "Game-Day Chaos: lineup ready -> a player goes unavailable -> re-auto-fill FieldBoard honoring Pitch Smart + fairness -> no pitch/catcher conflict -> re-share", budget_minutes: 2 }
    - { id: J4, journey: "Cross-Tenant Isolation: Tenant B coach attempts to reach Tenant A team/player/report/parent-report by route, by replayed API, and by guessed ID", budget_minutes: 5 }
    - { id: J5, journey: "Postgame -> Practice: Fix-Last-Game tap symptoms -> top-3 team priorities -> compiled 90-min practice plan the coach can use on the field", budget_minutes: 4 }
    - { id: J6, journey: "Player Development: record a baseline measurable -> retest later -> dev profile shows the trend -> monthly parent report summarizes progress safely (positive, non-shaming)", budget_minutes: 6 }
    - { id: J7, journey: "iOS Auth Reality: coach receives a magic link -> opens from Apple Mail / Gmail app / Messages -> ends up authenticated in the intended context (Safari AND the Capacitor app)", budget_minutes: 3 }
spec:
  reference: "In-repo: DECISION-LOG.md (AUTHORITATIVE), coach-platform-build-plan.md, coach-platform-practice-compiler.md."
  domain_safety_rules:
    - "Nothing reaches a parent until a coach reviews -> edits -> approves -> explicitly shares (J2 must prove the gate)."
    - "Re-fill after a no-show must still honor Pitch Smart + fairness; no pitch/catcher conflict may be introduced (J3)."
    - "Parent-facing development language is positive + non-shaming; no single composite 'player score', no ranking (J6)."
support_model:
  channels_expected: ["in-app help (/policy)", "email (hello@firstpitch.app; magic links + reports via Resend)"]
  slo_assumption: "solo developer, no support staff"
```

> **First Pitch journey facts (read before judging):**
> - **Email is the spine of two journeys.** Magic-link auth (J1/J7) and the monthly parent report
>   (J2) both go through **Resend**; if `RESEND_API_KEY`/`EMAIL_FROM` aren't set the link only hits
>   server stdout and **nobody logs in** — confirm real delivery + spam placement (E2E-EMAIL-001).
> - **J2 must prove the share gate, end to end across roles:** only a report with
>   `status:"shared"` may render at `/parent`; coach-only notes/Coach-Memory and `generated` vs
>   coach-edited `content` must never leak. A coach-only field visible to the parent via UI, API,
>   export, or link = P0 (cross-ref SEC-PRIV-001, SEC-API-001).
> - **J3 preserves work:** re-fill after a no-show should keep existing valid assignments where
>   possible and never silently introduce a Pitch-Smart or pitch/catcher violation.
> - **J4 is the isolation journey:** authz is in route handlers, not RLS — a live regression test
>   already exists (`scripts/qa-agent/.../authz-isolation.ts`: Coach B→403×5, Anon→401×5,
>   Parent→403×5). Reproduce it as a journey and extend to parent-reports + baselines. Any read of
>   Tenant A data as Tenant B = P0.
> - **J1 cold-start shortcut:** GameChanger CSV import (`/api/teams/import`) is the intended way to
>   skip manual roster entry — measure both the manual and the import path to first lineup.
> - **Idempotency risk:** KvJsonStore is single-blob **last-write-wins**; a double-fired create or
>   a WiFi→LTE retry can duplicate teams/players/records (E2E-IDEMP-001, cross-ref IOS-SYS-006).
> - The `/api/auth/login` dev endpoint is gated by `PLATFORM_ALLOW_DEV_LOGIN=1` — for an honest
>   prod E2E use the **real magic-link flow**, not the dev login.

---

# 2. HARNESS PROTOCOL (read fully before executing any check)

### 2.1 Determinism rules
- **Namespaced fixtures:** prefix every entity `QA_{run_id}_`. Reuse the same roster/journey
  fixtures across runs so journey timings and handoffs are comparable.
- **Fixed hostile dataset:** seed the standard set (long/unicode/markup names, 1,000-char note,
  boundary numerics, edge dates) in Tenant A so journeys carry realistic/hostile data end to end.
- **Stable check IDs:** the per-journey checks are `E2E-J{n}-{FLOW|HANDOFF|MULTIROLE|INTERRUPT|COLD}`
  plus `E2E-EMAIL-001` and `E2E-IDEMP-001`. New discoveries get a `-X` suffix.
- **Atomicity:** record each journey-check independently; if a journey dead-ends, record the
  remaining checks for that journey `blocked` with the failing step's check ID.
- **Evidence at capture time:** exact URL/screen at the failure step, role, device + surface,
  elapsed minutes vs budget, and the precise step where the journey broke. Quote verbatim.

### 2.2 Result vocabulary
`pass` | `fail` | `warn` | `blocked` | `not_applicable` (with reason) | `partial` (journey run on
emulator / email stubbed — state the reason). No other states.

### 2.3 Severity is computed, not vibed
| Condition | Severity |
|---|---|
| A journey crosses roles/tenants and leaks data (J2 coach-only→parent, J4 cross-tenant read) | P0 |
| Re-fill (J3) silently introduces a Pitch-Smart / pitch-catcher violation | P0 |
| Auth journey (J1/J7) cannot complete in a common email-app/in-app-browser context | P0 |
| A core journey dead-ends or requires switching to desktop to finish | P1 |
| An interruption (network drop, background, session expiry) loses journey data / forces restart-from-zero | P1 |
| Transactional email (magic link / report) lands in spam or fails to render on iOS Mail | P1 |
| The most important write-journey duplicates records when fired twice / from two devices | P1 |
| Journey completes but >3× its budget, or a handoff requires manual copy-paste workaround | P2 |
| Journey completes 1.5–3× budget; a confusing but non-blocking handoff | P2 |
| Everything else (cosmetic friction on a non-core journey) | P3 |

Stage modifier: at `mvp`, downgrade P2→P3 for polish-class friction only — never for a leak, a
silent safety violation, a dead-end core journey, or journey data loss.

### 2.4 Per-dimension diff handling
Single-dimension session: compute **only the E2E dimension score** and emit a **partial manifest**.
Cross-run diff + unified report are produced by `merge.md`. Fingerprint per journey-check
(`check_id + journey_id + failure_step_class`). A journey that regressed from pass→fail is
`REGRESSED` and merge auto-escalates one severity level.

### 2.5 Dimension scoring (0–100, computed)
`score = 100 × Σ(weightᵢ × resultᵢ) / Σ(weightᵢ)`; pass=1, warn=0.5, partial=0.5, fail=0; weight by
worst severity (P0-capable=5, P1=3, P2=2, P3=1). Report `dimension_scores.E2E`.

### 2.6 Setup (every run)
1. Two tenants with real role accounts (Coach/Assistant/Parent/Player in Team A; Coach/Parent in
   Team B). Use the **real magic-link flow** for any auth journey on prod.
2. A real email inbox you control for J1/J2/J7 (Apple Mail + the Gmail app on the device).
3. Dev-tools/Web Inspector network throttling + offline toggle ready for the INTERRUPT checks.
4. Capture environment fingerprint: device, surface (Safari vs app), browser, timezone, target URL.
5. Refresh the Surface Inventory of every route + API each journey traverses; mark drift vs prior.

---

# 3. CHECK CATALOG — E2E (cross-surface journeys)

> Run **every** `top_journey` through the five per-journey checks below, then the two global
> checks. A journey is only `pass` if a real first-time user could finish it unaided on the
> primary device.

### Per-journey checks (apply to J1–J7)
- **E2E-J{n}-FLOW** Run Jn end to end on iPhone Safari (and, for J3/J7, also the Capacitor app).
  Record: completed (y/n), total minutes vs budget, every surface crossed, every friction/confusion
  point, and the exact step of any failure. A journey that needs desktop to finish, or dead-ends, fails.
- **E2E-J{n}-HANDOFF** Verify every cross-surface handoff in Jn lands: the emailed link opens the
  right place (test from Apple Mail **and** the Gmail app — cross-ref IOS-AUTH-001/003), the
  shared Press Box/report link resolves for the intended audience, the share-sheet output is correct.
- **E2E-J{n}-MULTIROLE** Where Jn spans roles (J2 coach→parent, J6 coach→parent, J1 coach→assistant),
  execute both halves on separate accounts/devices and verify data + permissions line up exactly
  (cross-ref SEC-AUTHZ-001, SEC-PRIV-001). The receiver sees **only** what they should.
- **E2E-J{n}-INTERRUPT** Re-run Jn with a realistic interruption at the worst step (network drop
  mid-save, background the app, magic-link/session expiry mid-journey). Pass: resumable without
  data loss or restart-from-zero (cross-ref IOS-SYS-005/006, SUP-REL-003, DATA-PERSIST).
- **E2E-J{n}-COLD** Run Jn as a genuinely new user with empty data; measure **time-to-first-value**
  and name the single biggest abandonment risk (cross-ref USA-TASK-007).

### Journey-specific pass criteria (judge the FLOW against these)
- **J1** completed unaided on mobile, no data loss, under ~8 min, and the shared Press Box link
  actually opens for the assistant. Measure both manual roster entry and GameChanger CSV import.
- **J2** the parent sees **no** coach-only note in UI, API response, export, report, or link —
  only the explicitly **shared** parent-safe report. Any leak = P0.
- **J3** the no-show fix completes in **under 30 seconds**, preserves existing valid assignments
  where possible, and shows any Pitch-Smart / pitch-catcher conflict clearly (never silently).
- **J4** every Tenant-B attempt on Tenant-A data is denied **server-side** (route, replayed API,
  guessed ID), and no response body leaks Tenant-A names/fields. Any success = P0.
- **J5** the compiled plan reflects the actual tapped symptoms, the coach can edit it, and the
  output is usable field-side.
- **J6** values are correct across coach view → dev profile → parent report, and the parent-facing
  language is positive + non-shaming (no ranking, no composite score).
- **J7** the magic link results in an authenticated session in the **intended** context — Safari
  **and** the Capacitor app — with no stranded webview, no consumed link, no unexplained logout.

### Global checks
- **E2E-EMAIL-001** Deliverability & rendering: trigger every transactional email (magic link,
  shared monthly report, member/parent invite). Verify it **arrives** (check spam), renders in
  Apple Mail + the Gmail app on iOS, links work, and the sender/branding is correct. Auth email in
  spam or non-delivery (Resend/`EMAIL_FROM` misconfig) = P1 — users can't log in.
- **E2E-IDEMP-001** Run the most important write-journey (create team / add player / share report)
  **twice rapidly and from two devices**; verify no duplicate teams/players/records and no
  last-write-wins clobber (cross-ref SEC-API-004, DATA-PERSIST, IOS-SYS-006).

---

# 4. OUTPUT CONTRACT (required)

Produce, in this order:

**(a) P0/P1 first.** Any cross-role/tenant leak, silent safety violation, or broken auth journey at the top.

**(b) Findings JSON** — one object per `fail`/`warn`/`partial` (same shape as the SEC runner, plus
`journey_id`, `device`, `surface`, `elapsed_minutes`, `budget_minutes`, and `failure_step`):
```json
{
  "run_id": "FP-QA-20260609-01",
  "check_id": "E2E-J3-FLOW",
  "journey_id": "J3",
  "status": "fail",
  "severity": "P1",
  "likelihood": "L1",
  "diff_status": "unknown",
  "age_runs": 1,
  "title": "No-show re-fill takes 74s and drops the existing batting order",
  "url_pattern": "/coach/teams/{id}/games/{gameId}",
  "role": "head_coach",
  "device": "iPhone 15 Pro",
  "surface": "Safari",
  "elapsed_minutes": 1.2,
  "budget_minutes": 0.5,
  "failure_step": "Marking a player unavailable re-auto-fills the field but resets the saved batting order to jersey order",
  "observed": "Existing batting order lost on re-fill; 74s + 9 taps to recover",
  "expected": "Under 30s, existing valid assignments preserved, conflicts shown not silently fixed",
  "repro_steps": ["1. Open a game with a saved lineup", "2. Mark a starter unavailable", "3. Observe batting order + field re-fill"],
  "evidence": "screenshot ref; before/after batting order",
  "suggested_fix": "Preserve saved battingOrder + locked cells on availability change; only re-solve open slots",
  "regression_test": "E2E: assert battingOrder unchanged + no new validateLineup violation after marking one player unavailable",
  "cross_refs": ["DATA-LINEUP-001", "USA-TASK-001"]
}
```

**(c) The journey scorecard:** one row per J1–J7 — completed y/n, elapsed vs budget, surfaces
crossed, FLOW/HANDOFF/MULTIROLE/INTERRUPT/COLD results, and the biggest abandonment risk.

**(d) Partial manifest JSON** (save as `<run_id>.e2e.partial.json`):
```json
{
  "run_id": "FP-QA-20260609-01",
  "dimension": "E2E",
  "date": "ISO-8601",
  "app_version": "unknown",
  "environment_fingerprint": { "devices": ["iPhone 15 Pro / iOS 17.x"], "surfaces": ["Safari","Capacitor WKWebView"], "timezone": "...", "target_url": "https://firstpitch.app" },
  "journeys": [ { "id": "J1", "completed": true, "elapsed_minutes": 9.5, "budget_minutes": 8, "surfaces": ["web","email","share"], "biggest_dropoff": "manual roster entry" } ],
  "surface_inventory": [ { "type": "api", "pattern": "/api/teams/import", "auth": true, "status": "tested", "first_seen_run": "FP-QA-20260609-01" } ],
  "check_results": [ { "check_id": "E2E-J3-FLOW", "status": "fail", "finding_ids": ["..."] } ],
  "dimension_scores": { "E2E": 0 },
  "findings": [ { "...": "every finding object from (b)" } ],
  "coverage_gaps": [ { "check_id": "E2E-J7-FLOW", "reason": "no TestFlight build to test the app-surface auth return path" } ]
}
```

**(e) Coverage appendix:** every `blocked`/`not_applicable`/`partial` with a reason.

---

# 5. RULES OF ENGAGEMENT
- Verification, never exploitation; your `QA_{run_id}_` fixtures only; in J4, stop at proof of
  access — never read beyond proof, never modify Tenant-B/other-tenant data.
- Run journeys as a first-time user; reproduce twice or label intermittent; record elapsed vs budget.
- Surface any cross-role/tenant leak, silent safety violation, or broken auth journey immediately at top.
- Deduplicate to root cause across journeys (a single client-side-trust or last-write-wins pattern
  may surface in several journeys — merge, cross-reference, keep highest severity).
- Never let a good score or a completed FLOW soften a HANDOFF/MULTIROLE leak finding.
- `smoke` mode: run only the journeys whose checks failed in `previous_run_manifest`, plus every
  `E2E-J{n}-FLOW`, `E2E-EMAIL-001`, and `E2E-IDEMP-001`; mark the rest `not_applicable: smoke`.
- When a spec doc disagrees with `DECISION-LOG.md`, the log wins.
