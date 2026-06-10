# Deep Review Harness — UI runner (Visual quality · v3 · First Pitch)

> Self-contained. Paste this whole file into one fresh Claude-in-Chrome session. It runs the
> **UI** dimension only and emits a partial manifest keyed to the shared `run_id`. Hand the
> partial to `merge.md` once every dimension is done. Derived from `deep_review_harness_v3.md`.

---

# 1. RUN CONFIGURATION (pre-filled — confirm before running)

```yaml
run:
  run_id: "FP-QA-{YYYYMMDD}-{NN}"          # SAME id across all dimension sessions of this review
  previous_run_manifest: "[paste prior MERGED manifest JSON, or null for baseline]"
  mode: "dimension:ui"                       # this runner = UI only. Set "smoke" to rerun prior fails + P0-capable only.
app:
  name: "First Pitch"
  url: "https://firstpitch.app"             # for layout/theme; localhost:3000 is fine for UI too
  build_or_commit: "unknown"
  stack: "Next.js 15 App Router on Vercel; Tailwind (Dugout Dirt theme); custom magic-link auth; KV/JsonFile/InMemory storage. NOT Supabase."
  stage: "mvp"
users:
  roles: ["head_coach", "assistant_coach", "parent", "player", "admin"]
  tenants_required: 2
context:
  primary_device: "mobile"                   # 390x844; iOS = Capacitor WKWebView over the same web app, so Safari/WebKit parity is real
  environment: "outdoor, bright sun, one-handed, poor connectivity, time pressure"
  data_sensitivity: "minors_pii"
  top_tasks:
    - { id: T1, task: "Coach: edit tonight's lineup after a no-show (FieldBoard)", budget_seconds: 60, budget_taps: 12 }
    - { id: T2, task: "Coach: compile a 90-min practice plan", budget_seconds: 90, budget_taps: 16 }
    - { id: T3, task: "Coach: pitch/catcher availability + log pitch counts", budget_seconds: 45, budget_taps: 10 }
    - { id: T4, task: "Coach: Fix-Last-Game symptoms -> practice", budget_seconds: 60, budget_taps: 12 }
    - { id: T5, task: "Parent: tonight's lineup + child's mission + shared report", budget_seconds: 30, budget_taps: 8 }
spec:
  reference: "In-repo: DECISION-LOG.md (AUTHORITATIVE). Theme = Dugout Dirt (cream #F5EFE0 bg, ink #1A1410 fg, field-green accents); fonts Bungee/Rye/Special Elite/Roboto Slab."
  domain_safety_rules: ["Pitch Smart limits visible + unambiguous", "no parent-visible negative notes", "no single composite 'player score' rendered anywhere"]
support_model:
  channels_expected: ["in-app help (/policy)", "email (hello@firstpitch.app)"]
  slo_assumption: "solo developer, no support staff"
```

---

# 2. HARNESS PROTOCOL (read fully before executing any check)

### 2.1 Determinism rules
- **Namespaced fixtures:** prefix every entity `QA_{run_id}_`. Reuse fixture *definitions* across runs.
- **Fixed hostile dataset (the UI stressors):** name `O'Brien-Smith`, name `José Núñez 强`,
  200-char name (`A`×200), name `<b>bold</b>`, name `x" onmouseover="x`, note of 1,000 chars,
  numeric fields at {0, -1, 0.5, domain_max, domain_max+1}, dates {today, 2028-02-29, Dec 31,
  future +1yr, DST spring-forward}.
- **Stable check IDs:** reference exactly; new discoveries get a `-X` suffix (e.g., `UI-VIS-X1`).
- **Atomicity:** record `blocked` (with the blocking ID) rather than skipping.
- **Evidence at capture time:** exact URL, role, viewport, observed vs expected; quote verbatim.

### 2.2 Result vocabulary
`pass` | `fail` | `warn` | `blocked` | `not_applicable` (with reason). No other states.

### 2.3 Severity is computed, not vibed
Apply the shared table. UI-relevant rows:
| Condition | Severity |
|---|---|
| Missing empty/error state on a core view; systemic inconsistency | P2 |
| Layout break that blocks a core task (T1–T5) | P1 |
| Everything else (polish, single-view truncation, token drift) | P3 |

Stage modifier: at `mvp`, downgrade P2→P3 for **polish-class items only** (most UI findings) —
never for anything that hides a safety signal (e.g., a Pitch Smart alert clipped off-screen
stays at its computed severity).

### 2.4 Per-dimension diff handling
Single-dimension session: compute **only the UI dimension score** and emit a **partial
manifest**. Cross-run diff + unified report are produced by `merge.md`. If
`previous_run_manifest` is pasted, set `diff_status` per finding by fingerprint
(`check_id + url_pattern + observed_class`); else `diff_status:"unknown"`.

### 2.5 Dimension scoring (0–100, computed)
`score = 100 × Σ(weightᵢ × resultᵢ) / Σ(weightᵢ)`; pass=1/warn=0.5/fail=0; weight by worst
severity (P1=3, P2=2, P3=1). Report `dimension_scores.UI`.

### 2.6 Setup (every run)
1. Verify role accounts + two tenants; seed the hostile dataset in Tenant A.
2. Keep console open (broken-image/404 evidence); preserve log on nav.
3. Capture environment fingerprint: browser+version, viewport(s), timezone, target URL.
4. Build/refresh the Surface Inventory of every **view** (route pattern) you render; mark drift
   vs `previous_run_manifest`.

---

# 3. CHECK CATALOG — UI (Visual quality)

> **First Pitch anchors for this dimension:**
> - **Core-task views to sweep:** `/coach`, team home `/coach/teams/{id}`, roster + player
>   detail, games list + game page (FieldBoard, BattingOrder, Pitching board, fairness grid +
>   heat-map), `/practice/new` (TileBuilder), Coach Memory, Fix-Last-Game, parent-reports
>   manager, `/parent`, `/missions`, `/drills`, `/gear`, Press Box `/p/g/...`.
> - **Content stress targets:** roster cards, FieldBoard cells (9–10 positions × innings is the
>   tightest grid), Coach Memory cards, parent dashboard, Press Box. Long names + 1,000-char
>   notes most likely break the FieldBoard grid and the report preview.
> - **Theme tokens (Dugout Dirt):** real Tailwind keys include `cream`, `ink`, `field-700`,
>   `field-400`, `dirt-300/100`, `badge`/`badge-ok`/`badge-warn`/`badge-danger`/`badge-info`,
>   `.btn-primary`/`.btn-ghost`/`.btn-dark`, `.card`, `.input`, `.eyebrow`. **Not** keys:
>   `clay`, `grass-700`, `btn-secondary`. A class typo renders as unstyled — log as `UI-CON`.
> - **Five-state coverage** is the high-value UI check here: confirm intentional empty/loading/
>   one-item/full/error states on every core view (a new team, a roster of 1, a 15-player roster).
> - **Browser pass is mandatory, not optional:** iOS ships as a WKWebView, so Safari/WebKit
>   divergence is a real shipped bug, not a curiosity. Date inputs and flex gaps are the usual
>   suspects (per repo notes).
> - Safety-signal legibility outranks polish: a clipped/overflowing Pitch Smart "hold" or
>   arm-care chip is **not** a P3.

### UI-VIS — Layout integrity
- **UI-VIS-001** Breakpoint sweep: every major view at 360 / 390 / 768 / 1024 / 1440 px. Log each overflow/overlap/truncation with view + width. Pass: zero breakage in core-task views.
- **UI-VIS-002** Content stress: the 200-char name and 1,000-char note rendered in every displaying view. Pass: graceful wrap/ellipsis everywhere; layout break = fail per view.
- **UI-VIS-003** Zoom: 200% browser zoom on the 5 core-task views. Pass: reflow without horizontal scroll or hidden controls.
- **UI-VIS-004** Orientation change mid-task on mobile width. Pass: no state loss, no layout break.
- **UI-VIS-005** Five-state coverage: per major view, confirm intentional empty / loading / one-item / full / error states. Output the state inventory table. Each missing state on a core view = fail instance.

### UI-CON — Consistency system
- **UI-CON-001** Token audit: sample 15 screens; inventory distinct button styles, font sizes, spacing units, and colors used for the same semantic role. Pass: ≤2 variants per role; report the counts (they trend across runs).
- **UI-CON-002** Icon semantics: same icon never means two things; same action never has two icons. List violations.
- **UI-CON-003** Date/number formats identical across all views and exports (cross-ref data-integrity).
- **UI-CON-004** Interaction states: hover/active/disabled/focus styles exist and are distinguishable on primary controls.

### UI-AST — Assets & polish
- **UI-AST-001** Broken images, missing favicon/app icons, placeholder text (`lorem`, `TODO`, `test`, `asdf`) anywhere in the production surface — scan the rendered text of every inventoried route.
- **UI-AST-002** Browser pass: full core-task run in Chrome AND Safari/WebKit. Log divergences (date inputs, flex gaps).
- **UI-AST-003** Theming: if dark mode exists, run UI-VIS-001 core views in it; if not, record N/A.

---

# 4. OUTPUT CONTRACT (required)

**(a) Findings JSON** — one object per `fail`/`warn` (same shape as the SEC runner; set
`check_id` to the UI ID, include `viewport` always since it's load-bearing here).

**(b) State inventory table** (`UI-VIS-005`) and the token-audit counts (`UI-CON-001`).

**(c) Partial manifest JSON** (save as `<run_id>.ui.partial.json`):
```json
{
  "run_id": "FP-QA-20260609-01",
  "dimension": "UI",
  "date": "ISO-8601",
  "app_version": "unknown",
  "environment_fingerprint": { "browser": "Chrome + Safari/WebKit", "viewports": ["360","390","768","1024","1440"], "timezone": "...", "target_url": "..." },
  "surface_inventory": [ { "type": "route", "pattern": "/coach/teams/{id}/games/{gameId}", "auth": true, "status": "tested", "first_seen_run": "FP-QA-20260609-01" } ],
  "check_results": [ { "check_id": "UI-VIS-001", "status": "fail", "finding_ids": ["..."] } ],
  "dimension_scores": { "UI": 0 },
  "findings": [ { "...": "every finding object from (a)" } ],
  "coverage_gaps": [ { "check_id": "UI-AST-003", "reason": "no dark mode" } ]
}
```

**(d) Coverage appendix:** every `blocked`/`not_applicable` with a reason.

---

# 5. RULES OF ENGAGEMENT
- Verification, never exploitation; your `QA_{run_id}_` fixtures only.
- Reproduce twice or label intermittent. Verbatim evidence + screenshot reference at capture time.
- Deduplicate to root cause (a single bad token explaining 9 views is one finding with instances).
- Never let a good score soften finding language. The score is for trend; the finding is for action.
- `smoke` mode: execute only checks that failed in `previous_run_manifest` plus any P0/P1-capable
  UI check (safety-signal legibility); mark everything else `not_applicable: smoke`.
- When a spec doc disagrees with `DECISION-LOG.md`, the log wins.
