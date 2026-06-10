# Deep Review Harness — MERGE pass (v4 · First Pitch)

> Run this **once**, after every dimension runner has produced its partial manifest. It unions the
> partials, computes the run-over-run diff against the prior review, and emits the merged manifest +
> the unified human report. This is the only step that sees all dimensions and the previous baseline
> at once. Derived from `DEEP_REVIEW_HARNESS_V4.md`.
>
> **v4 dimensions (8):** `sec` (Security **+ PRIV** — privacy ships as the `SEC-PRIV-*` block in the
> SEC runner) · `ui` · `usa` (usability + a11y + copy) · `sup` · **`ios`** · **`e2e`** · **`data`** ·
> **`perf`**. The four bold ones are new/promoted in v4; a review with only the v3 four is still a
> valid merge (the rest become coverage gaps).

---

## INPUTS (paste all of these below the prompt)

1. **Partial manifests** for this review — one per dimension, all sharing the same `run_id`:
   `<run_id>.sec.partial.json`, `<run_id>.ui.partial.json`, `<run_id>.usa.partial.json`,
   `<run_id>.sup.partial.json`, `<run_id>.ios.partial.json`, `<run_id>.e2e.partial.json`,
   `<run_id>.data.partial.json`, `<run_id>.perf.partial.json`. (Any missing dimension is allowed —
   record it as a coverage gap. PRIV has no separate partial; its findings arrive inside the SEC partial.)
2. **Previous merged manifest** — the prior review's `<prev_run_id>.merged-manifest.json`, or the
   literal `null` for a baseline review.

```yaml
inputs:
  run_id: "FP-QA-{YYYYMMDD}-{NN}"     # MUST match every partial's run_id; mismatch = stop and report
  partials: ["<paste sec partial>", "<paste ui partial>", "<paste usa partial>", "<paste sup partial>", "<paste ios partial>", "<paste e2e partial>", "<paste data partial>", "<paste perf partial>"]
  previous_run_manifest: "<paste prior merged manifest, or null>"
  stage: "mvp"                         # carry from the runners; affects the stage modifier
```

---

## MERGE ALGORITHM (deterministic — do exactly this)

1. **Validate.** Confirm every partial's `run_id` equals `inputs.run_id`. If any differ, stop and
   report the mismatch — do not merge across review ids. Note which of the **8 dimensions**
   (SEC[+PRIV], UI, USA, SUP, IOS, E2E, DATA, PERF) are present; each absent dimension becomes a
   `coverage_gaps` entry (`reason: "dimension not run"`) and its `dimension_scores` value is `null`
   (not 0 — absence ≠ a zero score).
2. **Union the surface inventory.** Dedupe by `type + pattern`. Keep the earliest `first_seen_run`.
   Compare to the previous manifest's inventory: list **added** and **removed** route/API patterns
   as *surface drift* (a removed authenticated endpoint that used to be tested is itself worth a
   note).
3. **Concatenate** all `check_results` and all `findings` across partials. Preserve check IDs and
   finding objects verbatim; do not re-judge severities except via step 5.
4. **Carry dimension scores.** `dimension_scores = { SEC, UI, USA, SUP, IOS, E2E, DATA, PERF }`
   taken from each partial (or `null` if absent). Do **not** recompute them — the runners own their
   own scoring. A `partial` result (iOS real-device-required run on a simulator) is never diffed as
   `FIXED`; treat it as still-open for the decision.
5. **Compute the run-over-run diff.** For each finding, fingerprint = `check_id + url_pattern +
   observed_class` (the class of the observation, not the exact value). Compare against the
   previous merged manifest's findings:
   - in previous AND in current → **PERSISTENT** (increment `age_runs`).
   - in previous as `fail`, the same check now `pass` → **FIXED** (verify against the prior repro
     before declaring; if you can't verify, label `LIKELY_FIXED`).
   - not in previous → **NEW**.
   - **FIXED in any prior run, failing again now → REGRESSED** → **auto-escalate one severity
     level** (P1→P0, P2→P1, …) and flag it loudly.
   Set each finding's `diff_status` accordingly (overwriting any `"unknown"` the runners left).
6. **Compute the overall decision.** `ship | ship_with_conditions | no_ship`:
   - **no_ship** if any P0 exists, or any REGRESSED P0/P1, or any safety/privacy/minors-data
     finding is open. v4 P0 triggers explicitly include: iOS auth broken in a common in-app browser
     or unreachable inside the Capacitor app (IOS-AUTH-001/005), ITP silent logout (IOS-AUTH-002),
     a cross-tenant/cross-role leak surfaced by a journey (E2E-J2/J4), a wrong safety derivation or
     silent data loss (DATA-SAFETY-*, DATA-PERSIST-001), and a fabricated parent-facing value
     (DATA-CALC-009).
   - **ship_with_conditions** if P1s exist but no P0/regressed-P1.
   - **ship** otherwise.
   Apply the stage modifier (`mvp` downgrades P2→P3 for polish-class items only — never security,
   privacy, safety, or data loss). The decision is gated by findings, never by the numeric scores.
7. **Cross-dimension synthesis (v4).** Cluster findings into **systemic root causes** (one pattern,
   many findings — e.g., "auth persists in script-writable storage" can explain an ITP logout +
   an in-app-browser failure + an app-session loss: one fix, three P0s; merge them, keep the
   highest severity). Then write the **field-test narrative**: the realistic worst case — a new
   coach on an iPhone, parking-lot LTE, the link opened from the Gmail app, bright sun, five
   minutes before first pitch — and state plainly whether the product survives it, citing check IDs.
   This is the single most useful paragraph in the report; carry it into the manifest.

---

## OUTPUT 1 — Merged manifest JSON (save as `<run_id>.merged-manifest.json`; it is next review's baseline)

```json
{
  "run_id": "FP-QA-20260609-01",
  "date": "ISO-8601",
  "app_version": "unknown",
  "environment_fingerprint": { "browser": "...", "viewports": ["..."], "timezone": "...", "target_url": "..." },
  "surface_inventory": [ { "type": "route|api", "pattern": "...", "auth": true, "status": "tested|partial|untested", "first_seen_run": "..." } ],
  "surface_drift": { "added": ["..."], "removed": ["..."] },
  "check_results": [ { "check_id": "...", "status": "pass|fail|warn|blocked|not_applicable|partial", "finding_ids": [] } ],
  "findings": [ { "...": "full finding objects with diff_status + age_runs resolved" } ],
  "dimension_scores": { "SEC": 0, "UI": 0, "USA": 0, "SUP": null, "IOS": 0, "E2E": 0, "DATA": 0, "PERF": 0 },
  "diff_summary": { "new": 0, "regressed": 0, "fixed": 0, "persistent": 0 },
  "field_test_narrative": "...the worst-case field story + survives?/doesn't, citing check IDs...",
  "systemic_root_causes": [ { "pattern": "...", "explains": ["<finding ids>"], "one_fix": "..." } ],
  "ios_test_matrix_covered": [ { "device": "...", "ios": "...", "surface": "Safari|Capacitor", "checks_run": 0, "checks_partial": 0 } ],
  "journeys": [ { "id": "J1", "completed": true, "elapsed_minutes": 0, "budget_minutes": 0, "biggest_dropoff": "..." } ],
  "consistency_matrix": [ { "datapoint": "...", "by_surface": { }, "expected": null, "pass": true } ],
  "perf_budget_table": [ { "flow": "...", "budget_ms": 0, "median_warm_ms": 0, "cold_ms": 0, "result": "pass" } ],
  "top_support_drivers": [ "...carried from the SUP partial (now incl. iOS drivers)..." ],
  "decision": "no_ship",
  "coverage_gaps": [ { "check_id": "...", "reason": "..." } ]
}
```

## OUTPUT 2 — Unified human report (render in EXACTLY this order)

1. **Diff summary first** (or a one-line "baseline run — no prior manifest" statement): NEW /
   REGRESSED / FIXED / PERSISTENT counts, per-dimension score trend (this run vs prior), and the
   ship / no-ship decision with its conditions.
2. **Field-test narrative** — the worst-case field story from algorithm step 7: does the product
   survive a new coach on parking-lot LTE, link opened from the Gmail app, five minutes before
   first pitch? Cite check IDs. (The single most useful paragraph for this product.)
3. **P0/P1 detail** — full finding objects rendered readably; **iOS-auth findings first**, then
   other P0s, with **REGRESSED items flagged loudly** at the top of the section.
4. **Dimension scorecards** — the computed SEC / UI / USA / SUP / IOS / E2E / DATA / PERF scores
   (mark absent dimensions "not run"), each with its 3 dominant issues.
5. **The matrices** — authorization (`SEC-AUTHZ-001`), visibility leakage (`SEC-PRIV-001`), state
   inventory (`UI-VIS-005`), error-message corpus with scores (`USA-ERR-001`), self-service
   inventory (`SUP-SELF-001`), **iOS device coverage** (from the IOS partial), the **journey
   scorecard** J1–J7 (from the E2E partial), the **data consistency matrix** (`DATA-CONS-001`), the
   **perf budget table** (cold vs warm), and the Top-10 support drivers (`SUP-PRED-001`, now incl.
   iOS drivers).
6. **Systemic root causes** — the patterns behind the findings (one fix per pattern), from step 7.
7. **Fix sequence** — P0 (iOS-auth / safety / leak first) → REGRESSED → systemic roots → P1 by
   likelihood → quick wins.
8. **Coverage appendix** — full surface inventory with per-item status, surface drift, every
   `blocked`/`not_applicable`/`partial`/absent-dimension with its reason. An unstated gap is a
   defect in the audit itself.

---

## RULES
- Never let scores, diffs, or pass-counts soften individual finding language. The score is for
  trend; the finding is for action.
- A REGRESSED finding is never quietly re-listed — it is escalated and called out.
- Deduplicate to root cause across dimensions (a single client-side-trust pattern may surface in
  both SEC and a USA dead-end — merge them, cross-reference, keep the highest severity).
- Suggested save location: `platform/reports/deep-review/`.
- When a spec doc disagrees with `DECISION-LOG.md`, the log wins.
