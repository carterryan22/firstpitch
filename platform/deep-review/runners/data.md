# Deep Review Harness — DATA runner (Data integrity · v4 · First Pitch)

> Self-contained. Paste this whole file into one fresh Claude-in-Chrome session. It runs the
> **DATA** dimension only and emits a partial manifest keyed to the shared `run_id`. Hand the
> partial to `merge.md` once every dimension is done. Promoted to its own catalog in v4 (v3 only
> cross-referenced data integrity) — derived from `DEEP_REVIEW_HARNESS_V4.md` §3 and the
> functional/data-integrity audit lineage.
>
> **The app is only trusted if the numbers are right.** This dimension hand-recomputes displayed
> totals from their underlying events and proves the same datapoint reads identically across every
> surface (coach view, player view, parent report, Press Box, export). A parent-facing or
> coach-decision-facing mismatch is **high severity**, never a cosmetic nit.

---

# 1. RUN CONFIGURATION (pre-filled — confirm before running)

```yaml
run:
  run_id: "FP-QA-{YYYYMMDD}-{NN}"          # SAME id across all dimension sessions of this review
  previous_run_manifest: "[paste prior MERGED manifest JSON, or null for baseline]"
  mode: "dimension:data"                     # this runner = DATA only. Set "smoke" to rerun prior fails + all safety/parent-facing checks.
app:
  name: "First Pitch"
  url: "http://localhost:3000"              # localhost is fine + preferred (you need a seeded, known dataset to recompute against); swap to prod for a release gate
  build_or_commit: "unknown"
  stack: "Next.js 15 App Router; pure TS engines (@platform/lineup, @platform/compiler, app/lib/* fairness/coachMemory/devProfile/transfer/monthlyReport/snackRotation/digest); storage = KV (KvJsonStore, single-blob last-write-wins) | JsonFile | InMemory. NOT Supabase."
  stage: "mvp"
users:
  roles: ["head_coach", "assistant_coach", "parent", "player", "admin"]
  tenants_required: 1                        # DATA is single-tenant correctness; cross-tenant isolation is SEC/E2E
context:
  primary_device: "desktop"                  # recompute is easier on desktop; spot-check parent-facing values on mobile
  environment: "controlled — seed a KNOWN dataset so every total has a hand-computed expected value"
  data_sensitivity: "minors_pii"
  top_tasks:
    - { id: T1, task: "Coach: lineup + fairness ledger (field/bench/IF/OF innings per player)", budget_seconds: 0, budget_taps: 0 }
    - { id: T3, task: "Coach: pitch counts + catcher innings + Pitch Smart eligibility", budget_seconds: 0, budget_taps: 0 }
    - { id: T6, task: "Parent: monthly report values (attendance, playing time, improvement) match source", budget_seconds: 0, budget_taps: 0 }
spec:
  reference: "In-repo: DECISION-LOG.md (AUTHORITATIVE), coach-platform-build-plan.md, player-development-metric-schema.md."
  domain_safety_rules:
    - "Pitch Smart daily maxima + rest days (corpus/pitch-smart-tables.json) computed from pitch counts must be correct AND never silently permissive."
    - "Incomplete/self-reported arm-load data must derive to 'unknown', NEVER 'green' (DECISION-LOG D7)."
    - "No single composite 'player score'; dev profile = 5 separate pillars with confidence + 'unknown' bands when data is thin (never a fake 0)."
    - "Monthly-report 'improvement' may show ONLY when >=2 datapoints AND latest retest in-window AND improved per lowerIsBetter — never faked."
support_model:
  channels_expected: ["in-app help (/policy)", "email (hello@firstpitch.app)"]
  slo_assumption: "solo developer, no support staff"
```

> **First Pitch anchors for this dimension (where the math lives + where it bites):**
> - **Fairness ledger** (`/coach/teams/{id}/fairness`, FieldBoard): field innings, **bench
>   innings**, **infield vs outfield** innings per player (note INFIELD set **includes P/C**),
>   `maxConsecutive*` and `equalBenchTime` rule checks in `@platform/lineup/leagueRules.ts`. The
>   heat-map verdict pills are computed vs the roster mean ±15% — recompute the band.
> - **Pitch/catcher safety derivations:** `canPitchToday` over `pitchCounts` by date (rest days),
>   catcher innings, and the **pitch/catcher conflict** flag. These are decision-facing **and**
>   safety-facing — a wrong total here is P0, not P2.
> - **Dev profile** (`app/lib/devProfile.ts`): 5 pillars (Skill 30 / Athleticism 20 / IQ 20 /
>   Compete 15 / Durability 15) with confidence none/low/med/high and `unknown` band when no data.
>   Verify a thin dataset yields `unknown` (null score), **not** a fabricated 0, and that
>   Durability leads with the safety note when in monitor/rest.
> - **Transfer analysis** (`app/lib/transfer.ts`): pre/post split is a **day-key string compare**
>   (`iso.slice(0,10)`) — single-digit days must be zero-padded or the split is wrong; verify the
>   confidence tiers and the "need ~N more PA/BF/chances" insufficiency path.
> - **Monthly report** (`app/lib/monthlyReport.ts`): attendance from games+plans in-window,
>   playing time from lineup slots ≠ BN, improvement only under the freshness rule above. The
>   `generated` snapshot is immutable; coach-edited `content` is the diff source — verify the
>   parent sees the right one.
> - **Cross-view surfaces to reconcile a single datapoint across:** coach team view ↔ player
>   detail/baselines ↔ **parent monthly report** ↔ **Press Box** `/p/g/...` ↔ any export/print ↔
>   weekly digest ↔ dashboard counts (e.g., "Fields scouted", roster counts).
> - **Persistence reality:** KvJsonStore is **single-blob last-write-wins**; optimistic UI can show
>   success before a write lands. Hunt silent data loss (DATA-PERSIST).
> - **Known date trap:** game `datetime-local` needs the local-time conversion (subtract
>   `getTimezoneOffset` before `toISOString`); ICS import unfolds RFC5545 lines with **no** inserted
>   space. Leap day 2028-02-29, Dec 31, and DST are in the fixture set for a reason.

---

# 2. HARNESS PROTOCOL (read fully before executing any check)

### 2.1 Determinism rules
- **Seed a KNOWN dataset (this is the core of the dimension):** build Tenant A with a roster whose
  events you control — N games with explicit per-inning defensive assignments, explicit bench
  innings, explicit pitch counts per date, ≥2 metric datapoints for at least one player (for
  improvement + transfer), and at least one injured player. Write down the **hand-computed expected
  value** for every total before you read it from the UI. Reuse this dataset run-to-run.
- **Fixed hostile dataset:** the standard set (long/unicode/markup names, 1,000-char note, numeric
  boundaries {0, -1, 0.5, domain_max, domain_max+1}, dates {today, 2028-02-29, Dec 31, +1yr, DST})
  — here used to prove **correctness/round-trip**, not just XSS-inertness (that's SEC-INP).
- **Stable check IDs:** reference exactly; new discoveries get a `-X` suffix (e.g., `DATA-CALC-X1`).
- **Atomicity:** record `blocked` (with the blocking ID) rather than skipping.
- **Evidence at capture time:** the **source events**, the **hand-computed expected**, the
  **displayed actual**, the surface/URL, and the role. A mismatch finding without the recompute is
  not a finding.

### 2.2 Result vocabulary
`pass` | `fail` | `warn` (off but within a documented rounding tolerance) | `blocked` |
`not_applicable` (with reason). No other states.

### 2.3 Severity is computed, not vibed
| Condition | Severity |
|---|---|
| A Pitch Smart / arm-care / pitch-catcher derivation is wrong in the permissive direction (allows what should be blocked) | P0 |
| Silent data loss — success shown but the write did not persist | P0 |
| Arm-load shows "green" on incomplete/self-reported data | P0 |
| A parent-facing value (monthly report) is wrong or fabricated (e.g., faked "improvement") | P0 |
| A coach-decision-facing total (fairness field/bench/IF-OF innings, pitch count) is wrong | P1 |
| The same datapoint disagrees across two views (coach vs player vs parent vs Press Box vs export) | P1 |
| A safety derivation wrong in the conservative direction (blocks what's actually allowed) | P1 |
| Date/timezone parse error that shifts a game day, leap/DST mishandled | P1 |
| Boundary numeric/date stored but mis-displayed within a documented tolerance | P2 |
| Cosmetic rounding/format drift with no decision impact | P3 |

Stage modifier: at `mvp`, downgrade P2→P3 for **display-format** drift only — never for a wrong
safety derivation, silent data loss, or a wrong parent-facing value.

### 2.4 Per-dimension diff handling
Single-dimension session: compute **only the DATA dimension score** and emit a **partial
manifest**. Cross-run diff + unified report are produced by `merge.md`. Fingerprint
(`check_id + datapoint + surface`). Carry the **consistency matrix** into the manifest so
mismatches trend run-over-run.

### 2.5 Dimension scoring (0–100, computed)
`score = 100 × Σ(weightᵢ × resultᵢ) / Σ(weightᵢ)`; pass=1/warn=0.5/fail=0; weight by worst severity
(P0-capable=5, P1=3, P2=2, P3=1). Report `dimension_scores.DATA`.

### 2.6 Setup (every run)
1. Seed the known dataset above; record every expected total in a worksheet before reading the UI.
2. Keep the source events handy (game defensive grids, pitch-count log, metric entries) for recompute.
3. Have all reconciliation surfaces reachable: coach team views, player detail/baselines, the
   parent monthly report (generate → approve → share so it renders at `/parent`), Press Box, any
   print/PDF, the weekly digest.
4. Capture environment fingerprint: browser, timezone (**run once in a non-US timezone** for
   DATA-TIME), target URL.
5. Refresh the Surface Inventory of every view/endpoint that displays a computed total; mark drift.

---

# 3. CHECK CATALOG — DATA (Data integrity)

### DATA-CALC — Hand-recomputed totals (recompute ≥10 displayed stats from source events)
- **DATA-CALC-001** **Field innings per player:** recompute from the defensive grid; matches the fairness ledger + player view. Mismatch = P1.
- **DATA-CALC-002** **Bench innings per player** and the `equalBenchTime` "within 1 across roster" check; recompute and confirm the heat-map verdict pill (vs roster mean ±15%).
- **DATA-CALC-003** **Infield vs outfield innings** per player (INFIELD includes P/C); confirm the split and any `minInfieldInnings`/`minOutfieldInnings` rule flag.
- **DATA-CALC-004** **Pitch counts** per player per date and any season/inning aggregate; recompute from the pitch log. Decision + safety facing.
- **DATA-CALC-005** **Catcher innings** per player and the **pitch/catcher conflict** flag (caught recently → shouldn't pitch, and vice-versa per the safety rule).
- **DATA-CALC-006** **`canPitchToday` rest-day derivation:** recompute eligibility from prior outings by date against Pitch Smart rest tables; confirm the badge ("Resting Nd" / "hold" / "can pitch").
- **DATA-CALC-007** **Dev-profile pillars:** recompute each pillar band/score from the seeded metrics; confirm a thin dataset yields `unknown` (null), not a fake 0, and weights (30/20/20/15/15) are applied.
- **DATA-CALC-008** **Transfer deltas:** recompute pre/post metric splits by the day-key boundary; confirm deltas, the confidence tier, and the insufficiency message when sample < threshold.
- **DATA-CALC-009** **Monthly-report values:** recompute attendance (games+plans in-window), playing time (slots ≠ BN), and improvement (only when ≥2 datapoints AND latest retest in-window AND improved). A fabricated/faked improvement = P0.
- **DATA-CALC-010** **Snack rotation / digest aggregates:** recompute the snack balance (no back-to-back, season-fair) and any weekly-digest totals; confirm they match source.
- **DATA-CALC-011** **Dashboard/roster counts:** "Fields scouted", roster count (non-archived), games count, Press Box share count — each matches its source list.

### DATA-CONSISTENCY — Same datapoint, every surface
- **DATA-CONS-001** **Cross-view consistency matrix:** pick ≥8 datapoints (a player's field innings, bench innings, pitch count, a measurable, an attendance figure, the monthly-report playing-time, a Press Box lineup slot, a digest total). For each, record the value as shown in: source entry · coach team view · player/baselines view · parent monthly report · Press Box · export/print. Any disagreement = P1 (P0 if parent-facing). Output the matrix.
- **DATA-CONS-002** **Format consistency:** the same date and the same number render in one format across all of the above (cross-ref UI-CON-003) — a 24h vs 12h or M/D vs D/M drift between views is a finding.
- **DATA-CONS-003** **Parent-safe projection:** the parent report / Press Box shows the **intended** computed values only — no coach-only Coach-Memory or unshared `content` numbers leak into a parent-facing total (cross-ref SEC-PRIV-001).

### DATA-PERSIST — Writes land; no silent loss; idempotent
- **DATA-PERSIST-001** **Write-through:** after each core write (save lineup, log pitch count, edit report, record metric), hard-reload and confirm the value persisted (not just optimistic UI). Success shown but not persisted = P0.
- **DATA-PERSIST-002** **Concurrent edit / last-write-wins:** open the same lineup in two tabs, edit both, save both; confirm the documented behavior and that no unrelated field is silently clobbered (KvJsonStore is single-blob LWW — characterize the real blast radius).
- **DATA-PERSIST-003** **Idempotency:** double-fire a create/save (and a WiFi→LTE retry); confirm no duplicate records (cross-ref SEC-API-004, E2E-IDEMP-001, IOS-SYS-006).
- **DATA-PERSIST-004** **Delete/archive propagation:** delete/archive a player; confirm historical lineups, fairness totals, Coach Memory, parent reports, Press Box, and digest update or anonymize consistently (cross-ref SEC-PRIV-004). Resurrected/stale data = P1.

### DATA-TIME — Dates, timezones, boundaries
- **DATA-TIME-001** **Game datetime round-trip:** create/edit a game with `datetime-local`; confirm the saved + displayed time matches the intended local time (the `getTimezoneOffset` conversion) across coach view, Press Box, and digest. Run once in a non-US timezone.
- **DATA-TIME-002** **ICS schedule import:** import a GameChanger/generic `.ics`; confirm dates parse (RFC5545 unfold has no inserted space), the created/updated/unchanged/detached diff is correct, and re-import reconciles by `sourceUid` without duplicating.
- **DATA-TIME-003** **Edge dates:** seed today / 2028-02-29 (leap) / Dec 31 / +1yr / a DST spring-forward date; confirm each stores and displays correctly and that any in-window calc (monthly report, transfer day-key split) includes/excludes them correctly.
- **DATA-TIME-004** **Boundary numerics:** jersey/pitch-count/metric fields at {0, -1, 0.5, domain_max, domain_max+1} store and round-trip per their validation (0..20 clamps, integer rules); a silently-accepted out-of-range value that then feeds a total = P1.

### DATA-SAFETY — Safety-critical derivations (never silently wrong, never permissively wrong)
- **DATA-SAFETY-001** **Pitch Smart never permissive:** construct a roster state at and just over the daily max / insufficient rest; confirm the app blocks/warns and never silently allows. Permissive miss = P0.
- **DATA-SAFETY-002** **Arm-load never green on thin data:** with incomplete/self-reported arm-load, confirm the status derives to `unknown`/monitor, never `green` (DECISION-LOG D7).
- **DATA-SAFETY-003** **No composite score / no ranking leaks as data:** confirm no surface computes or displays a single composite "player score" or a public ranking for <12 (cross-ref USA-COPY, the toxic-traps list).

---

# 4. OUTPUT CONTRACT (required)

Produce, in this order:

**(a) P0/P1 first.** Any wrong safety derivation, silent data loss, or wrong parent-facing value at the top.

**(b) Findings JSON** — one object per `fail`/`warn` (same shape as the SEC runner, plus
`datapoint`, `source_events`, `expected_value`, `actual_value`, `surfaces_checked`):
```json
{
  "run_id": "FP-QA-20260609-01",
  "check_id": "DATA-CALC-002",
  "status": "fail",
  "severity": "P1",
  "likelihood": "L1",
  "diff_status": "unknown",
  "age_runs": 1,
  "title": "Bench innings undercount on the fairness ledger",
  "datapoint": "QA_..._OBrienSmith bench innings, game G1",
  "url_pattern": "/coach/teams/{id}/fairness",
  "role": "head_coach",
  "source_events": "G1 defensive grid: player on BN innings 1,3,5",
  "expected_value": "3",
  "actual_value": "2",
  "surfaces_checked": ["fairness ledger", "player detail"],
  "observed": "Ledger shows 2 bench innings; grid has 3",
  "expected": "Bench innings == count of BN slots across the game",
  "repro_steps": ["1. Seed G1 with the player benched innings 1,3,5", "2. Open the fairness ledger"],
  "evidence": "grid screenshot + ledger screenshot",
  "suggested_fix": "Count BN slots inclusively when aggregating bench innings",
  "regression_test": "Unit: benchInnings(grid) === count of BN slots; add to lineup/fairness tests",
  "cross_refs": ["DATA-CONS-001"]
}
```

**(c) The consistency matrix** (`DATA-CONS-001`): datapoint × surface grid with expected vs actual and pass/fail per cell.

**(d) Partial manifest JSON** (save as `<run_id>.data.partial.json`):
```json
{
  "run_id": "FP-QA-20260609-01",
  "dimension": "DATA",
  "date": "ISO-8601",
  "app_version": "unknown",
  "environment_fingerprint": { "browser": "...", "timezone": "America/Los_Angeles + one non-US run", "target_url": "..." },
  "seed_dataset_ref": "QA_FP-QA-20260609-01 roster + N games with known grids/pitch logs/metrics",
  "surface_inventory": [ { "type": "route", "pattern": "/coach/teams/{id}/fairness", "auth": true, "status": "tested", "first_seen_run": "FP-QA-20260609-01" } ],
  "check_results": [ { "check_id": "DATA-CALC-001", "status": "pass", "finding_ids": [] } ],
  "consistency_matrix": [ { "datapoint": "...", "by_surface": { "coach": 3, "player": 3, "parent_report": 3, "press_box": 3, "export": 3 }, "expected": 3, "pass": true } ],
  "dimension_scores": { "DATA": 0 },
  "findings": [ { "...": "every finding object from (b)" } ],
  "coverage_gaps": [ { "check_id": "DATA-TIME-002", "reason": "no .ics fixture exercised this run" } ]
}
```

**(e) Coverage appendix:** every `blocked`/`not_applicable` with a reason.

---

# 5. RULES OF ENGAGEMENT
- Recompute from source before judging — a mismatch finding must carry the hand-computed expected.
- A wrong safety derivation (Pitch Smart / arm-care / pitch-catcher) or a wrong parent-facing value
  is surfaced immediately at the top, then continue.
- Reproduce twice or label intermittent. Verbatim source events + expected + actual at capture time.
- Deduplicate to root cause (one aggregation bug can explain several totals + a cross-view mismatch).
- Never let a good score soften a safety or parent-facing data finding. The score is for trend.
- `smoke` mode: execute only checks that failed in `previous_run_manifest` plus all DATA-SAFETY-*
  and all parent-facing DATA-CALC/CONS checks; mark the rest `not_applicable: smoke`.
- When a spec doc disagrees with `DECISION-LOG.md`, the log wins.
