# Canonical Decision Log

**Purpose:** one source of truth for the product decisions that the strategy docs currently contradict each other on. The repo today contains **two forks of the product** across separate `*.md` artifacts (and the shipped code leans a third way). This log reconciles them decision by decision so we stop re-litigating the same choices in parallel documents.

**Status legend**

- ✅ **Decided** — ratified by an owner directive and/or already true in shipped code; docs must conform to it.
- 🔶 **Recommended** — a proposed resolution with rationale; **owner to ratify** before docs are rewritten.
- ⏳ **Open** — needs more input (data, interviews, counsel) before deciding.

**How to use:** when a spec doc disagrees with this log, this log wins. When you change a decision, change it *here first*, then propagate to the affected docs (see §6 ratification checklist). Do not encode a new direction only inside a feature doc.

---

## 0. The core finding — why this log exists

A reviewer flagged that an external "handoff" strategy document conflicts with the existing five-doc spec set.

**Correction (verified 2026-06-09):** there *is* a [HANDOFF.md](HANDOFF.md) at the workspace root (untracked, dev-focused, self-dated today). An earlier pass here wrongly said "no handoff doc in the workspace." But the file on disk is **not** the problematic strategy draft the critique dissected — it's a *developer* handoff (repo layout, data model, engine deep-dives), and a grep finds **none** of the contested signature terms: no Bronze/Silver/Gold, no "Section 19," no "Module 6→5," no 12-must-have list, no 8×1–5→32/40 score, no 2-minute postgame review, no health-predicting "Pitch Load Passport" (it references `passport` only as the safety-engine arm-load module — consistent with **D7**'s recommended direction). On the contrary, HANDOFF.md already reflects the coach-first reframe: its one-liner is the owner directive verbatim, it uses the **6-level** verification ladder, and §14 lists the reframe's genuine gaps. So the contested draft appears to have been a chat/draft artifact that was never the on-disk doc; the current HANDOFF.md is already aligned with this log.

The deeper point stands regardless of which doc the critique meant: the conflict it names is **already real inside the repo**. The *strategy spec docs themselves* fork into two products, and the code has shipped a partial third reconciliation.

| Cluster | Documents | Implied product | V1 wedge |
|---|---|---|---|
| **A — Player-dev-first** | [player-development-metric-schema.md](player-development-metric-schema.md), [product-feature-addendum.md](product-feature-addendum.md), [market-research-positioning.md](market-research-positioning.md), [BUILD-BACKLOG.md](BUILD-BACKLOG.md) | "Player-owned development tracker" / parent-owned development OS | Measure → diagnose → train → re-test |
| **B — Coach-wedge-first** | [coach-platform-build-plan.md](coach-platform-build-plan.md), [coach-platform-practice-compiler.md](coach-platform-practice-compiler.md) | Coach lineup/fairness/practice painkiller | Lineup + fair rotation + pitch/catcher alerts |
| **C — Shipped code + owner directive** | `platform/`, repo memory (2026-06-09) | Coach painkiller shipped; player dataset earned over time | Same as B |

**Owner directive on record (2026-06-09, repo memory):** *"V1 wedge = lineup + fair defensive rotation + playing-time ledger + pitch/catcher alerts + practice recommendation. Do NOT lead with a profile/player-DB system."* One-liner: **"Win the coach with lineup/fairness/practice pain, then earn the player-dev dataset over time."**

This log adopts Cluster **B/C** as canonical and re-sequences Cluster **A** from "the product" to **"Act 2 — the development engine."** The two are not competing products; they are **Act 1 and Act 2 of one product**, and most of Act 1 is already built.

---

## 1. Canonical document roles (source-of-truth map)

To stop the fork, each doc gets one job:

| Document | Canonical for | No longer the authority on |
|---|---|---|
| **This file** | Cross-doc product decisions, sequencing, scope | — |
| [coach-platform-build-plan.md](coach-platform-build-plan.md) | V1 build order, phases, pricing ladder | — |
| [coach-platform-practice-compiler.md](coach-platform-practice-compiler.md) | Practice compiler + coach modes | Overall wedge/sequencing |
| [BUILD-BACKLOG.md](BUILD-BACKLOG.md) | Epic/story tracking + DoD | Phase-1 framing (its "Development First" header is superseded — see D1) |
| [player-development-metric-schema.md](player-development-metric-schema.md) | **Act 2** metric/diagnosis/safety engineering spec | V1 wedge, V1 scope |
| [product-feature-addendum.md](product-feature-addendum.md) | **Act 2** product/UX/account/gamification layer | V1 wedge, V1 scope |
| [market-research-positioning.md](market-research-positioning.md) | Market map, personas, pricing, GTM, validation | — (but re-read its wedge framing through D1) |

---

## 2. Decision table (at a glance)

| # | Decision | Cluster A position | Cluster B / reviewer position | Resolution | Status |
|---|---|---|---|---|---|
| **D1** | Primary wedge | Player-owned dev tracker | Coach lineup/fairness painkiller | **Coach painkiller is V1; dev is Act 2** | ✅ Decided |
| **D2** | Softball | Co-equal, "first-class, not a checkbox" | Baseball-only | **Sport-agnostic in V1; softball dev content rides Act 2; never drop the name** | 🔶 Recommended |
| **D3** | Age bands | 8U–18U | 8U–12U rec | **V1 targets 8U–12U; data model stays 8U–18U; recruiting features 13U+ in Act 2** | 🔶 Recommended |
| **D4** | Verification tiers | 5-level (core §8.1) / 6-level (E2.4) | Bronze/Silver/Gold | **6-state engine model; collapse to 3 user-facing trust tiers; Act-2 only** | 🔶 Recommended |
| **D5** | GameChanger import | In MVP | V3 "if possible" | **Stays in MVP — already shipped; it's the cold-start answer** | ✅ Decided |
| **D6** | V1 scope | 12 must-haves | 5 painkiller functions | **5 functions = V1 (shipped); the game→practice loop is V1.5** | ✅ Decided |
| **D7** | Pitch Load Passport | Health status (green/yellow/red) | Rule-compliance tracking | **Reframe to compliance + advisory load; incomplete data can never show "green"** | 🔶 Recommended (launch gate) |
| **D8** | COPPA / data moat | "Longitudinal minors' dataset = moat" | Privacy as design constraint | **Privacy-by-design; moat = loop+trust+corpus, not data exploitation** | 🔶 Recommended (launch gate) |
| **D9** | Monetization | Tiered (Free→$799) | Parents/leagues pay; coaches churn | **Keep tiers; B2B league/club + parent passport are durable revenue; log churn risk** | 🔶 Recommended |
| **D10** | Tagging ritual | 2-min postgame review | In-game single tap / next-AM push | **In-game taps or morning push — never a postgame chore** | 🔶 Recommended |
| **D11** | Insight scoring | 8 × 1–5 criteria → 32/40 | frequency × severity × gap | **frequency × severity × competitive-gap is primary; rest are tie-breakers** | 🔶 Recommended |

---

## 3. Primary decisions (detailed)

### D1 — Primary wedge: coach painkiller first ✅ Decided

**Positions**
- **Cluster A:** "This is the data and logic spec for a **player-owned development tracker**" ([player-development-metric-schema.md](player-development-metric-schema.md)); "a **parent-owned, player-centered development app**" ([market-research-positioning.md](market-research-positioning.md) §1); Phase 1 is literally titled **"Best MVP (Development First)"** ([BUILD-BACKLOG.md](BUILD-BACKLOG.md)).
- **Cluster B/C:** Phase 1 = **"Core Wedge (MVP) — Lineup generator + rulebook library"**, exit criteria *"10 founding coaches use it for a full game and don't churn"*; Development Engine is **Phase 3** ([coach-platform-build-plan.md](coach-platform-build-plan.md)). Owner directive (2026-06-09). Code: roster, auto-lineup, fairness grid, pitching board, parent share **already shipped**.

**Conflict** — These are different products with different buyers (coach vs. parent), different cold-start dynamics, and different GTM. Running both as "the MVP" forks every downstream decision.

**Resolution** — **The coach lineup/fairness/practice painkiller is the V1 wedge.** Player development is **Act 2**, earned on top of coach trust and the data the coach already generates. Rationale: lineup/fairness pain is *weekly, acute, and already monetized* by narrow tools; the dev tracker is a "vitamin" with a cold-start data problem. This matches the owner directive and shipped reality.

**Actions** — Retitle [BUILD-BACKLOG.md](BUILD-BACKLOG.md) Phase 1 from "Development First" to the coach wedge; add the Act-1/Act-2 banner to the two Cluster-A specs (D-ref §6).

---

### D2 — Softball: keep the name, stage the content 🔶 Recommended

**Positions**
- **Cluster A:** "Sport — Baseball / softball (**softball first-class, not a toggle**)" and "**Softball is first-class here, not a checkbox** … a deliberate market wedge against baseball-first tools" ([coach-platform-practice-compiler.md](coach-platform-practice-compiler.md)); core scope "**Baseball + Softball**"; "baseball + softball **day one**" as a stated novelty axis ([market-research-positioning.md](market-research-positioning.md) §3E).
- **Reviewer/handoff:** baseball-only, softball an afterthought.

**Conflict** — "First-class softball" carries real cost (windmill pitching mechanics, slapper tracks, different field dimensions, separate drill corpus, distinct thresholds) — but the *V1 coach wedge* (roster, lineup, fairness, playing-time, pitch/catcher alerts) is almost entirely **sport-agnostic**.

**Resolution** — **Keep softball co-equal at the data/brand level from day one** (the `sport` flag, co-ed lineup rules, and softball thresholds already specified cost nothing extra in a sport-agnostic V1). **Stage the expensive softball *development* content** (windmill/slapper tracks, softball drill corpus) to ship **with the Act-2 development engine**, where the mechanical divergence actually matters. **Do not rename to baseball-only** — softball is a named market wedge and the decision affects branding, corpus, and market size.

**Actions** — Confirm product/brand name stays baseball **+ softball**; tag softball-specific dev tracks as Act 2 in the compiler doc.

---

### D3 — Age bands: 8U–12U V1, 8U–18U platform 🔶 Recommended

**Positions**
- **Cluster A:** "**Age bands: 8U → 18U**" ([player-development-metric-schema.md](player-development-metric-schema.md)); verification ladder explicitly sets "recruiting eligibility" for older players.
- **Code reality:** four internal bands `6-8 / 9-12 / 13-15 / 16+` ([BUILD-BACKLOG.md](BUILD-BACKLOG.md) E2.1) — a **third** representation.
- **Reviewer/handoff:** implicitly an 8U–12U rec product (anti-ranking stance, parent reports, arm-care passport all fit 10U; they're insufficient for 16U travel players who *want* recruiting-relevant verified metrics).

**Conflict** — The anti-ranking / no-recruiting-language posture (repo memory "TOXIC TRAPS") is correct for ≤12U and **wrong** for 16U. Three different band encodings also drift across docs and code.

**Resolution** — **V1 targets 8U–12U rec/competitive**, where lineup/fairness/playing-time pain is most acute and the anti-ranking stance is right. **Keep the data model age-complete (8U–18U)** so Act 2 can extend up to travel/recruiting. **Recruiting-relevant verified metrics turn on only for 13U+ in Act 2.** Standardize on **one display scheme: `8U / 10U / 12U / 14U / 16U / 18U`**, mapped to the four internal code bands; stop emitting raw `6-8/9-12/...` to users.

**Actions** — Pick the canonical band labels in code + docs; gate recruiting language behind 13U+ (already a TOXIC-TRAP rule for <12).

---

### D4 — Verification tiers: 6-state engine, 3 user tiers 🔶 Recommended

**Positions**
- **Cluster A (two encodings already):** core §8.1 = **5-level** ladder (`self_entered → video_attached → device_captured → coach_verified → facility_verified`), and the addendum insists "this addendum does not define a second system" ([product-feature-addendum.md](product-feature-addendum.md)) — **but** the backlog story E2.4 lists **6** ("self · video · device · coach · facility · **event**") ([BUILD-BACKLOG.md](BUILD-BACKLOG.md)).
- **Reviewer/handoff:** simpler **Bronze / Silver / Gold**.

**Conflict** — Two ladder encodings already disagree (5 vs 6); a third (Bronze/Silver/Gold) is proposed. Worse, "Bronze/Silver/Gold" is **already used for a different thing** — the "Command Ladder" *skill* milestones in [product-feature-addendum.md](product-feature-addendum.md) — so adopting it for *measurement trust* collides two systems.

**Resolution** — This axis only matters in **Act 2** (V1 doesn't gate anything on measurement trust). **Keep the engineering model as the 6-state ladder** (the `event` tier — verified at a sanctioned event — is genuinely useful for recruiting; don't drop it). **Collapse the user-facing display to 3 trust tiers** (the reviewer is right that simpler is better): **Self-reported → Device-measured → Verified** (coach/facility/event). **Reserve Bronze/Silver/Gold for skill milestones only** — do not overload it onto measurement trust.

**Actions** — Reconcile core §8.1 (5) with E2.4 (6) → declare 6 canonical; define the 3-tier display mapping; keep skill-milestone naming distinct.

---

### D5 — GameChanger import stays in MVP ✅ Decided

**Positions**
- **Cluster A / code:** GameChanger CSV import is MVP; story E4.3 is **DONE** (repo memory), with team-bootstrap-from-CSV and ICS schedule sync shipped in `platform/packages/ingest`.
- **Reviewer/handoff:** push to **V3 "if possible."**

**Conflict** — Import-in-MVP is the answer to the **cold-start data problem** (bootstrap a team + roster + schedule + history from one file). Deferring it to V3 removes that wedge and contradicts shipped code.

**Resolution** — **GameChanger import stays in V1.** It's built, it's the cold-start on-ramp, and it feeds the game→practice loop. The handoff is simply wrong against reality here.

**Actions** — None (conform docs to reality if any say otherwise).

---

### D6 — V1 scope: 5 functions, not 12 ✅ Decided

**Positions**
- **Cluster B:** Phase 1 is already narrow — "Lineup generator + rulebook library + Quick Reference chip strip" ([coach-platform-build-plan.md](coach-platform-build-plan.md)).
- **Reviewer:** real V1 painkiller = **roster, availability, batting order, defensive grid, pitch/catcher alerts**. Coach tags, parent-safe summaries, infield/outfield ledger = V1.5+.
- **Code reality:** all five are **shipped**; the reframe's net-new gaps are Coach Memory, lineup modes, Fix-Last-Game, structured quick-tags, monthly parent report (repo memory).

**Conflict** — A 12-must-have V1 is three products. The "secret feature" (game→practice loop) is the **differentiator** but depends on an input ritual that doesn't yet exist (see D10).

**Resolution** — **V1 = the five-function painkiller (done).** The **game→practice intelligence loop — Coach Memory + Fix-Last-Game + structured quick-tags — is V1.5**, sequenced immediately after, because it is the genuine differentiator (nobody connects last game's tags to next practice's plan). Parent-safe summaries and the IF/OF ledger are V1.5/V2. Hold the scope line.

**Actions** — Label the reframe gaps as V1.5 in the backlog; gate the loop on D10's input ritial working.

---

## 4. Secondary decisions (raised by the review)

### D7 — Pitch Load Passport: compliance, not health prediction 🔶 Recommended (launch gate)

**Position / reality** — `platform/packages/safety/src/passport.ts` returns a single parent-readable **arm status (green / yellow / red)** by folding *game pitching, bullpens, catching, practice throwing, long toss, lessons, and other teams* into one picture. The engine is "conservative by design," but the **framing is health-adjacent**, and it depends on data nobody reliably enters (private lessons, backyard throws, the other team).

**Conflict** — Incomplete load data producing a **"green"** status is *worse than no status* — it's false assurance about a child's arm. That's a liability and an App-Store-review risk.

**Resolution** — **Reframe from health prediction to rule-compliance + advisory load.**
- User-facing status uses **compliance language** tied to things we can *verify from tracked games*: Pitch Smart counts, required rest days, daily/weekly limits, catcher↔pitcher same-day conflicts.
- Self-reported non-game throwing (lesson/other-team/long-toss) is **advisory context that can only add caution (downgrade)** — it can **never** be the basis for an all-clear.
- **Rule:** incomplete data **cannot** render "green." Default to "logged load may be incomplete."
- Keep Tier-1 safety + Pitch Smart as the authority (they already win conflicts per repo conventions).

**Actions** — Rewrite passport status labels/copy; add the "no green on incomplete data" guard; route through the Security/Safety review before launch.

---

### D8 — COPPA as a design constraint; rewrite the "moat" 🔶 Recommended (launch gate)

**Position / reality** — COPPA is better handled than the handoff implied: backlog E0.4 (COPPA audit), E1.2 (`<13` parental consent), E1.4 (export/delete) ([BUILD-BACKLOG.md](BUILD-BACKLOG.md)); consent flow, DSR, and data-requests are **shipped** (repo memory); "Privacy by default" is a build tenet ([coach-platform-build-plan.md](coach-platform-build-plan.md)).

**Conflict** — The "longitudinal minors' dataset = data moat" framing **undermines itself**: that dataset (video, coach notes, biometric-ish measurables on under-13s) is the one you're *most* legally constrained from exploiting (verifiable consent, data minimization, deletion rights).

**Resolution** — **Treat privacy as a first-class design constraint, and rewrite the moat thesis.** The moat is the **closed loop + coach trust + the safety/drill corpus**, **not** monetization of a children's dataset. Keep video/coach-notes/measurables behind **explicit per-child parental consent**; never reuse minors' data for ads, cross-sell, or model training without separate consent. Data minimization and deletion are load-bearing, not a section-10 afterthought.

**Actions** — Edit the moat section in [market-research-positioning.md](market-research-positioning.md)/[product-feature-addendum.md](product-feature-addendum.md); keep this under the Security Review Agent's launch-blocking authority.

---

### D9 — Monetization: who pays, and the coach-churn trap 🔶 Recommended

**Position / reality** — Monetization is **not absent in the spec set** (only in the handoff). There's a full ladder: **Free / Coach $39 / Multi-Team $79 / Club $299 / League $799** ([coach-platform-build-plan.md](coach-platform-build-plan.md) Pricing Ladder; [market-research-positioning.md](market-research-positioning.md) §11). For reference, the coaching-tools competitor sells at ~$8/mo (repo memory).

**Conflict** — Volunteer rec coaches are price-sensitive, and narrow lineup tools sell cheap. The realistic payer is **parents (per-player passport)** or **leagues/clubs (B2B)** — not the individual volunteer coach. Plus **coach churn**: rec coaches quit when their kid ages out, so coach-side acquisition never compounds the way a player-side dataset would.

**Resolution** — **Keep the tiered model, but reconcile it to the wedge and the payer reality:**
- Price the individual **Coach** tier to parallel/undercut DE (validate ~$8–15/mo or ~$30–40/season).
- Treat **B2B league/club (Club $299 / League $799)** and the **per-player parent passport (Act 2)** as the **durable** revenue.
- **This is the bridge, not a contradiction:** because coach acquisition doesn't compound (churn), the **player/parent dataset is the long-term LTV/retention play** — which is *exactly why* "coach wedge now, earn the dataset later" (D1) is the right sequence.

**Actions** — Add explicit market sizing + the coach-churn note to [market-research-positioning.md](market-research-positioning.md) (its figures are already `[VERIFY]`-flagged, E0.3).

---

### D10 — Tagging ritual: in-game taps, not a postgame review 🔶 Recommended

**Conflict** — A "2-minute postgame review" won't happen; postgame, coaches are dragging gear and managing parents. The game→practice loop (D6) **dies if the input ritual doesn't fit reality.**

**Resolution** — Capture tags via **single taps during the game** from the dugout (on the lineup/pitch-count surface the coach already has open) **or** a **next-morning push** with ≤3 taps. **Never** a separate postgame chore. This is a hard UX constraint on the differentiator.

**Actions** — Spec the in-game quick-tag affordance as part of the V1.5 loop (D6); structured one-tap tags become the data that feeds Coach Memory.

---

### D11 — Insight scoring: drop the false precision 🔶 Recommended

**Conflict** — Eight equally-weighted 1–5 criteria summing to a 32/40 threshold *looks* rigorous, but the weights are arbitrary — false precision (the same trap core §0 warns about with 🟡 "directional" numbers).

**Resolution** — Rank insights/priorities by **frequency × severity × competitive-gap** as the primary signal; use any remaining criteria as **tie-breakers only**. Don't present the composite as a precise score.

**Actions** — Apply to the practice "Quality Score" / insight ranker; show bands, not false-precise totals.

---

## 5. Affirmed — keep (no conflict, explicitly endorsed)

These are correct as-is; logging them so they aren't accidentally re-opened:

- **Modes** (lineup: Rec/FairPlay · Development · Competitive · Tournament · Tryout-Eval; practice "Coach Modes" §6) — one engine serving coaches with different values. This is also what **de-risks D3**: a 16U competitive coach selects Competitive/Tryout mode rather than needing a separate product.
- **"Development fairness" > plain fairness** — a real insight; keep it.
- **Game→practice intelligence** (last game's tags → next practice's plan) — the genuine differentiator; keep it (sequenced as V1.5 per D6/D10).
- **Event-based data model with confidence + visibility flags on every event** — right architecture; aligns with existing `verification_state` + share flags.
- **The "what not to build" discipline** — keep it; it's the antidote to D6 scope creep.

---

## 6. Ratification checklist (next actions)

Owner ratifies each 🔶, then propagate:

- [ ] **D1** — Retitle [BUILD-BACKLOG.md](BUILD-BACKLOG.md) Phase 1; add "Act 2 — development engine" banner to [player-development-metric-schema.md](player-development-metric-schema.md) + [product-feature-addendum.md](product-feature-addendum.md).
- [ ] **D2** — Confirm baseball **+ softball** name; tag softball dev tracks as Act 2 in the compiler doc.
- [ ] **D3** — Choose canonical band labels (`8U…18U`) + map to code bands; gate recruiting at 13U+.
- [ ] **D4** — Declare the 6-state ladder canonical (fix core §8.1 vs E2.4); define the 3-tier display; keep Bronze/Silver/Gold for skill milestones only.
- [ ] **D5** — None (conform any stray doc to "import in V1").
- [x] **D6** — Mark Coach Memory / Fix-Last-Game / quick-tags as **V1.5** in the backlog. → done: **Epic E26** added to [BUILD-BACKLOG.md](BUILD-BACKLOG.md) (E26.1–E26.4 ✅ shipped; E26.5 monthly report in progress).
- [ ] **D7** — Rewrite Pitch Load Passport copy + "no green on incomplete data" guard (launch gate).
- [ ] **D8** — Rewrite the data-moat section; keep privacy under Security Review authority (launch gate).
- [ ] **D9** — Add market sizing + coach-churn note; validate Coach-tier price point.
- [ ] **D10** — Spec in-game quick-tag / morning-push ritual.
- [ ] **D11** — Replace additive insight score with frequency × severity × gap.

**Open / needs input before deciding (⏳):** verify the `[VERIFY]` market figures (E0.3) before any external use; pick the validated Coach-tier price; confirm whether 13U+ travel is in the 12–18-month roadmap or explicitly out (drives D3/D4 effort).
