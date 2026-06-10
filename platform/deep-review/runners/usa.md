# Deep Review Harness — USA runner (Usability + UX-A11Y + copy · v3 · First Pitch)

> Self-contained. Paste this whole file into one fresh Claude-in-Chrome session. It runs the
> **USA** dimension only (this is where the v3 `ux` mode folds in — usability, accessibility,
> and language) and emits a partial manifest keyed to the shared `run_id`. Hand the partial to
> `merge.md` once every dimension is done. Derived from `deep_review_harness_v3.md`.

---

# 1. RUN CONFIGURATION (pre-filled — confirm before running)

```yaml
run:
  run_id: "FP-QA-{YYYYMMDD}-{NN}"          # SAME id across all dimension sessions of this review
  previous_run_manifest: "[paste prior MERGED manifest JSON, or null for baseline]"
  mode: "dimension:usa"                      # this runner = USA (usability + a11y + copy). Set "smoke" to rerun prior fails + P0/P1-capable only.
app:
  name: "First Pitch"
  url: "http://localhost:3000"              # localhost is fine + preferred for measured task timing; swap to prod for a release gate
  build_or_commit: "unknown"
  stack: "Next.js 15 App Router; mobile-first; custom magic-link auth; KV/JsonFile/InMemory storage. NOT Supabase. iOS = Capacitor WKWebView over the same app."
  stage: "mvp"
users:
  roles: ["head_coach", "assistant_coach", "parent", "player", "admin"]
  tenants_required: 1                        # USA is single-tenant; budgets are measured as a first-time user of Tenant A
context:
  primary_device: "mobile"                   # 390x844 — measure tasks here
  environment: "outdoor, bright sun, one-handed, poor connectivity, time pressure (this is the real budget context)"
  data_sensitivity: "minors_pii"
  top_tasks:                                 # THESE drive the USA-TASK budgets — tune the numbers with the owner before a release gate
    - { id: T1, task: "Coach: edit tonight's lineup after a no-show (auto-fill FieldBoard, honor Pitch Smart + fairness, save)", budget_seconds: 60, budget_taps: 12 }
    - { id: T2, task: "Coach: compile a 90-min practice plan (focus + age + field tier -> plan)", budget_seconds: 90, budget_taps: 16 }
    - { id: T3, task: "Coach: check who can pitch/catch tonight + log pitch counts", budget_seconds: 45, budget_taps: 10 }
    - { id: T4, task: "Coach: Fix-Last-Game — tap symptoms -> top-3 priorities -> recommended practice", budget_seconds: 60, budget_taps: 12 }
    - { id: T5, task: "Parent: open app -> tonight's lineup + child's assigned mission + any SHARED monthly report", budget_seconds: 30, budget_taps: 8 }
spec:
  reference: "In-repo: DECISION-LOG.md (AUTHORITATIVE). Brand voice = Coach RAC/Ballgame energy + Alex Hale (CHIPS) standards: fun-first, concrete cues, plain English, never shame/compare kids (corpus/brand-voice.md)."
  domain_safety_rules: ["Pitch Smart 'who can pitch' must be a one-glance answer", "no jargon a rec parent can't read", "kid-facing copy never shames or compares"]
support_model:
  channels_expected: ["in-app help (/policy)", "email (hello@firstpitch.app)"]
  slo_assumption: "solo developer, no support staff"
```

---

# 2. HARNESS PROTOCOL (read fully before executing any check)

### 2.1 Determinism rules
- **Namespaced fixtures:** prefix every entity `QA_{run_id}_`. Reuse fixture *definitions* across runs so budgets are comparable.
- **Fixed hostile dataset:** name `O'Brien-Smith`, `José Núñez 强`, 200-char name, `<b>bold</b>`,
  `x" onmouseover="x`, 1,000-char note, numeric fields {0, -1, 0.5, domain_max, domain_max+1},
  dates {today, 2028-02-29, Dec 31, future +1yr, DST spring-forward}. (USA uses these mainly in
  USA-FORM input-preservation and validation-timing checks.)
- **Stable check IDs:** reference exactly; new discoveries get a `-X` suffix (e.g., `USA-TASK-X1`).
- **Atomicity:** record `blocked` (with the blocking ID) rather than skipping.
- **Evidence at capture time:** exact URL, role, viewport, observed vs expected; quote the
  failing step and the measured taps/seconds verbatim.

### 2.2 Result vocabulary
`pass` | `fail` | `warn` | `blocked` | `not_applicable` (with reason). No other states.

### 2.3 Severity is computed, not vibed
| Condition | Severity |
|---|---|
| Core task (T1–T5) impossible or >3× over budget | P1 |
| Error with no recovery path and no support path | P1 |
| Input wiped on a validation error (USA-FORM-001) | P1 |
| Core task 1.5–3× over budget; destructive action without specific confirm/undo | P2 |
| Dead end on a core path; silent async action; failing error-corpus mean (<2.0) | P2 |
| Tap target <44px; keyboard trap; missing label; everything else | P3 |

Stage modifier: at `mvp`, downgrade P2→P3 for polish-class items only — never for data loss
(wiped input) or an impossible core task.

### 2.4 Per-dimension diff handling
Single-dimension session: compute **only the USA dimension score** and emit a **partial
manifest**. Cross-run diff + unified report are produced by `merge.md`. Set `diff_status` from
the pasted `previous_run_manifest` if present (fingerprint `check_id + url_pattern +
observed_class`), else `diff_status:"unknown"`. Record measured taps/seconds in `observed` so
budget regressions are trendable.

### 2.5 Dimension scoring (0–100, computed)
`score = 100 × Σ(weightᵢ × resultᵢ) / Σ(weightᵢ)`; pass=1/warn=0.5/fail=0; weight by worst
severity (P1=3, P2=2, P3=1). Report `dimension_scores.USA`.

### 2.6 Setup (every run)
1. Verify a Tenant A account with the seeded roster + at least one completed game (so T1/T3/T4
   have real data). Local dev login is gated by `PLATFORM_ALLOW_DEV_LOGIN=1`.
2. Reset to a **first-time-user mental model** before each USA-TASK run (no memorized paths).
3. Keep console open — you'll harvest the error-message corpus (USA-ERR-001) from errors you
   trigger across the run; capture each verbatim as it appears.
4. Capture environment fingerprint: device width, browser, timezone, target URL.
5. Refresh the Surface Inventory of the views each task traverses; mark drift vs prior manifest.

---

# 3. CHECK CATALOG — USA (Usability measured · UX-A11Y · Copy)

> **First Pitch anchors for this dimension:**
> - **Tap targets:** the standard here is **≥44px** in core flows (repo has repeatedly fixed
>   `min-h-[44px]`); the UX agent flags `<40px` on mobile. Hot spots: nav pills, mission/drill
>   CTAs, FieldBoard cells, quick-tag chips, "Generate/Approve/Share" report buttons.
> - **Numeric keyboards (USA-FORM-002):** jersey number, pitch counts, metric entries, durations,
>   and league-rule inputs must raise a numeric keypad, not the alpha keyboard.
> - **Destructive actions (USA-DEST-001) to inventory:** delete player, delete/archive team,
>   delete game, reset lineup, recall a *shared* parent report (editing an approved report
>   silently reverts it to draft — that's a blast-radius surprise worth a specific confirm),
>   delete account (`confirm:"DELETE"` exists — verify it names the blast radius).
> - **A11y baseline:** an automated axe scan already runs over 8 public routes
>   (`/`,`/login`,`/drills`,`/missions`,`/safety`,`/fields`,`/gear`,`/policy`) — reproduce, then
>   go **beyond** it into the authed coach/parent flows axe can't reach. Login is a
>   `role=radiogroup`; verify focus + announcement there.
> - **Outdoor contrast (USA-A11Y-004):** the budget context is bright sun — borderline contrast
>   is a real failure here, not a nicety, especially on the disabled-vs-active distinction of
>   the FieldBoard and Pitch Smart chips.
> - **Copy/voice (USA-COPY):** brand voice is plain-English, fun-first, never-shaming. Kid-facing
>   mission descriptions and `kind`/`minVerification` enums were humanized — verify no raw enum
>   (`T1_field`, `kLooking`) leaks to a user, and that the least-expert persona (a rec parent /
>   a 9-year-old player) can read every label.
> - First-run cold start (USA-TASK-007): brand-new coach account → first generated lineup or
>   first compiled plan is the activation moment; GameChanger CSV import is the intended
>   cold-start shortcut — measure it.

### USA-TASK — Task performance against budgets
- **USA-TASK-001..005** Execute T1–T5 as a first-time user on the primary device width. Record taps, seconds, wrong turns, hesitation points. Pass: within budget. 1.5–3× budget = warn→P2; >3× = fail→P1. Quote the exact step where time was lost.
- **USA-TASK-006** Interruption recovery: mid-T1, switch tabs 2 min, return. Pass: state preserved, resumable.
- **USA-TASK-007** First-run cold start: brand-new account → first unit of real value (first lineup generated / first plan compiled). Record minutes + steps; report the single biggest drop-off risk.

### USA-FORM — Form mechanics
- **USA-FORM-001** Input preservation on validation error: every core form submitted invalid; pass: all valid fields retained. Wiped input = P1.
- **USA-FORM-002** Correct mobile keyboard per field type (numeric jersey/pitch-count/metric/duration, email, tel) across core forms.
- **USA-FORM-003** Keyboard-open usability: with the on-screen keyboard up, the active field and submit remain reachable.
- **USA-FORM-004** Inline validation timing: errors appear on blur/submit, not on first keystroke; error clears when corrected.
- **USA-FORM-005** Tap targets ≥44px in core flows; list violations with element + view.

### USA-ERR — Error experience (rubric-scored)
- **USA-ERR-001** Error-message corpus: collect verbatim every distinct error triggered across the run. Score each 0–3: (1) says what happened in user language, (1) says what to do next, (1) preserves the user's work/context. Report the corpus with scores; mean <2.0 = dimension fail.
- **USA-ERR-002** Dead-end census: count states with no forward action (error with no retry, empty state with no CTA, 404 with no nav). Each dead end on a core path = fail instance.
- **USA-ERR-003** Async feedback: every async action (compile, save lineup, share report) has a pending + a definitive success/fail signal. List silent actions.

### USA-DEST — Destructive action protection
- **USA-DEST-001** Inventory every destructive action; per action record: confirmation? specific (names the object + blast radius)? undo? Pass requires specific-confirm OR undo on every irreversible action.

### USA-A11Y — Accessibility (WCAG 2.1 AA, automatable subset)
- **USA-A11Y-001** Keyboard-only completion of T1–T3; log traps, invisible focus, unreachable controls.
- **USA-A11Y-002** Focus order matches visual order on core forms; focus visible on every interactive element.
- **USA-A11Y-003** Programmatic labels: clicking each label focuses its field; icon-only buttons expose accessible names (inspect the accessibility tree).
- **USA-A11Y-004** Contrast: flag all visibly borderline text; mandatory check on disabled-vs-active distinction and on any outdoor-context primary text (FieldBoard, Pitch Smart chips).
- **USA-A11Y-005** Live regions: toasts/validation announce via `aria-live` (inspect DOM); silent dynamic errors = fail.
- **USA-A11Y-006** Heading hierarchy + landmark structure sane on the 5 core views.

### USA-COPY — Language
- **USA-COPY-001** Terminology map: one concept ↔ one name across the product; list every violation pair.
- **USA-COPY-002** Jargon test against the least-expert configured persona (rec parent / 9-yr-old player); list labels that assume training or leak raw enums.

---

# 4. OUTPUT CONTRACT (required)

**(a) Findings JSON** — one object per `fail`/`warn` (same shape as the SEC runner). For
USA-TASK findings, put the measured `taps`/`seconds` and the exact lost-time step in `observed`.

**(b) The USA matrices:** the error-message corpus with per-message scores (`USA-ERR-001`), the
destructive-action inventory (`USA-DEST-001`), and the task-budget table (T1–T5 actual taps/
seconds vs budget).

**(c) Partial manifest JSON** (save as `<run_id>.usa.partial.json`):
```json
{
  "run_id": "FP-QA-20260609-01",
  "dimension": "USA",
  "date": "ISO-8601",
  "app_version": "unknown",
  "environment_fingerprint": { "browser": "...", "viewports": ["390x844"], "timezone": "...", "target_url": "..." },
  "surface_inventory": [ { "type": "route", "pattern": "/practice/new", "auth": false, "status": "tested", "first_seen_run": "FP-QA-20260609-01" } ],
  "check_results": [ { "check_id": "USA-TASK-001", "status": "warn", "finding_ids": ["..."] } ],
  "dimension_scores": { "USA": 0 },
  "findings": [ { "...": "every finding object from (a)" } ],
  "coverage_gaps": [ { "check_id": "...", "reason": "..." } ]
}
```

**(d) Coverage appendix:** every `blocked`/`not_applicable` with a reason.

---

# 5. RULES OF ENGAGEMENT
- Verification, never exploitation; your `QA_{run_id}_` fixtures only.
- Measure as a first-time user; reproduce twice or label intermittent. Verbatim error text +
  measured taps/seconds at capture time.
- Deduplicate to root cause; list instances under one finding.
- Never let a good score soften finding language. The score is for trend; the finding is for action.
- `smoke` mode: execute only checks that failed in `previous_run_manifest` plus any P1-capable
  USA check (impossible core task, wiped input); mark everything else `not_applicable: smoke`.
- When a spec doc disagrees with `DECISION-LOG.md`, the log wins.
