# Deep Review Harness — MERGE pass (v3 · First Pitch)

> Run this **once**, after every dimension runner (`sec` / `ui` / `usa` / `sup`) has produced its
> partial manifest. It unions the partials, computes the run-over-run diff against the prior
> review, and emits the merged manifest + the unified human report. This is the only step that
> sees all dimensions and the previous baseline at once. Derived from `deep_review_harness_v3.md`.

---

## INPUTS (paste all of these below the prompt)

1. **Partial manifests** for this review — one per dimension, all sharing the same `run_id`:
   `<run_id>.sec.partial.json`, `<run_id>.ui.partial.json`, `<run_id>.usa.partial.json`,
   `<run_id>.sup.partial.json`. (Any missing dimension is allowed — record it as a coverage gap.)
2. **Previous merged manifest** — the prior review's `<prev_run_id>.merged-manifest.json`, or the
   literal `null` for a baseline review.

```yaml
inputs:
  run_id: "FP-QA-{YYYYMMDD}-{NN}"     # MUST match every partial's run_id; mismatch = stop and report
  partials: ["<paste sec partial>", "<paste ui partial>", "<paste usa partial>", "<paste sup partial>"]
  previous_run_manifest: "<paste prior merged manifest, or null>"
  stage: "mvp"                         # carry from the runners; affects the stage modifier
```

---

## MERGE ALGORITHM (deterministic — do exactly this)

1. **Validate.** Confirm every partial's `run_id` equals `inputs.run_id`. If any differ, stop and
   report the mismatch — do not merge across review ids. Note which of the 4 dimensions are
   present; each absent dimension becomes a `coverage_gaps` entry (`reason: "dimension not run"`)
   and its `dimension_scores` value is `null` (not 0 — absence ≠ a zero score).
2. **Union the surface inventory.** Dedupe by `type + pattern`. Keep the earliest `first_seen_run`.
   Compare to the previous manifest's inventory: list **added** and **removed** route/API patterns
   as *surface drift* (a removed authenticated endpoint that used to be tested is itself worth a
   note).
3. **Concatenate** all `check_results` and all `findings` across partials. Preserve check IDs and
   finding objects verbatim; do not re-judge severities except via step 5.
4. **Carry dimension scores.** `dimension_scores = { SEC, UI, USA, SUP }` taken from each partial
   (or `null` if absent). Do **not** recompute them — the runners own their own scoring.
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
     finding is open.
   - **ship_with_conditions** if P1s exist but no P0/regressed-P1.
   - **ship** otherwise.
   Apply the stage modifier (`mvp` downgrades P2→P3 for polish-class items only — never security,
   privacy, safety, or data loss). The decision is gated by findings, never by the numeric scores.

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
  "check_results": [ { "check_id": "...", "status": "pass|fail|warn|blocked|not_applicable", "finding_ids": [] } ],
  "findings": [ { "...": "full finding objects with diff_status + age_runs resolved" } ],
  "dimension_scores": { "SEC": 0, "UI": 0, "USA": 0, "SUP": null },
  "diff_summary": { "new": 0, "regressed": 0, "fixed": 0, "persistent": 0 },
  "top_support_drivers": [ "...carried from the SUP partial..." ],
  "decision": "no_ship",
  "coverage_gaps": [ { "check_id": "...", "reason": "..." } ]
}
```

## OUTPUT 2 — Unified human report (render in EXACTLY this order)

1. **Diff summary first** (or a one-line "baseline run — no prior manifest" statement): NEW /
   REGRESSED / FIXED / PERSISTENT counts, per-dimension score trend (this run vs prior), and the
   ship / no-ship decision with its conditions.
2. **P0/P1 detail** — full finding objects rendered readably; **REGRESSED items flagged loudly**
   at the top of this section.
3. **Dimension scorecards** — the computed SEC / UI / USA / SUP scores (mark absent dimensions
   "not run"), each with its 3 dominant issues.
4. **The matrices** — authorization (`SEC-AUTHZ-001`), visibility leakage (`SEC-PRIV-001`), state
   inventory (`UI-VIS-005`), error-message corpus with scores (`USA-ERR-001`), self-service
   inventory (`SUP-SELF-001`), and the Top-10 support drivers (`SUP-PRED-001`).
5. **Systemic root causes** — the patterns behind the findings (e.g., "visibility enforced in the
   client, not the API, explains N findings"), one fix per pattern.
6. **Fix sequence** — P0 → REGRESSED → systemic roots → P1 by likelihood → quick wins.
7. **Coverage appendix** — full surface inventory with per-item status, surface drift, every
   `blocked`/`not_applicable`/absent-dimension with its reason. An unstated gap is a defect in the
   audit itself.

---

## RULES
- Never let scores, diffs, or pass-counts soften individual finding language. The score is for
  trend; the finding is for action.
- A REGRESSED finding is never quietly re-listed — it is escalated and called out.
- Deduplicate to root cause across dimensions (a single client-side-trust pattern may surface in
  both SEC and a USA dead-end — merge them, cross-reference, keep the highest severity).
- Suggested save location: `platform/reports/deep-review/`.
- When a spec doc disagrees with `DECISION-LOG.md`, the log wins.
