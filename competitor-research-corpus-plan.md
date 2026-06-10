# Competitor Research & Corpus Build Plan

**Companion to:** `market-research-positioning.md` (market analysis, personas, pricing), `product-feature-addendum.md` (product/UX/account layer), and `player-development-metric-schema.md` (core engineering spec). This document is the **research-operations plan**: how we build a structured, taggable corpus of competitor and adjacent-platform signal so the product roadmap is driven by evidence, not vibes.

> **Thesis:** Don't just scrape "baseball apps." Build a corpus around **workflows**. The opportunity is not another scorekeeping app — it's the **broken handoffs** between `lineup → game stats → player development → training plan → parent/player profile`. Every corpus item exists to locate one of those broken handoffs.

> **Compliance first:** This plan is built on public product pages, help docs, first-party review APIs, official data APIs (Reddit/Product Hunt), and manual notes — **not** brittle TOS-violating scraping, and **never** wholesale ingestion of paid drill/training content. See §3.

---

## Workspace artifacts (what this plan produced)

| Artifact | Path | Role |
|---|---|---|
| This plan | `competitor-research-corpus-plan.md` | Strategy + operating manual |
| Corpus item schema | `corpus/competitor-research/corpus.schema.json` | JSON Schema (2020-12) for one corpus item (§4) |
| Controlled vocabulary | `corpus/competitor-research/taxonomy.json` | Roles / JTBD / pain / feature / category enums (§5) |
| Scoring config | `corpus/competitor-research/scoring.json` | 8-dimension opportunity-score model (§7) |
| Platform backlog | `corpus/competitor-research/platforms.json` | ~40 platforms × category × wave × priority (§6) |
| Feature matrix (data) | `corpus/competitor-research/feature-matrix.json` | Platform × feature source-of-truth (§10) |
| Corpus store | `corpus/competitor-research/corpus.json` | Tagged + scored signal items |
| Feature matrix (rendered) | `competitor-feature-matrix.md` | Human-readable matrix — generated from the JSON |
| Research report (rendered) | `corpus/competitor-research/research-report.md` | Top pains / requests / opportunities — generated |
| Engine + CLI | `platform/packages/research/` | `@platform/research`: load, validate, score, render |

**Tooling entry point** (from `platform/`):

```powershell
cmd /c "npm run research"            # summary to stdout
cmd /c "npm run research -- validate"  # validate corpus.json against schema/taxonomy
cmd /c "npm run research -- matrix"    # (re)generate competitor-feature-matrix.md
cmd /c "npm run research -- report"    # (re)generate research-report.md
```

---

## 1. Research universe — categories to cover

Eight categories. The first is the youth-coach wedge; the rest are context that keeps us from accidentally rebuilding an incumbent.

### A — Lineup, batting order, defensive rotation *(the wedge)*
Where volunteers still use spreadsheets, whiteboards, and clipboard charts. **GameChanger** (now AI lineup recommendations on sabermetric principles), **Stack the Lineup** (fair-play, infield/outfield balance, bench warnings, PDF export), **Rizzler** (all-in-one: lineups, fielding, pitching, AI optimization, tournament planning, pitch counting, scoring, evaluations, compliance), **GameTime Lineups** (simpler fair-rotation tool), **Baseball Fielding Rotation App / FreeBaseballLineups** (free generator), **Lineup Card** (legacy UX), **Coach Joel's Way**.
**Insight goal:** what lineup tools miss — multi-game planning, catcher/pitcher restrictions, fairness *history*, parent-proof transparency, development-first rotation logic.

### B — Scorekeeping, stats, livestream, game history *(the incumbent behavior)*
**GameChanger** (the default), **iScore** (deep scorebook, spray/pitch charts, no extra fee for stats), **TeamSnap** (admin incumbent), **AthletesGoLive** (mixed UX sentiment), **DiamondKast / Perfect Game** (tournament/showcase ecosystem), **Ballplayer** ("stats that follow the player").
**Insight goal:** don't beat GameChanger at GameChanger. Extract what users still do *outside* it — rotation spreadsheets, progress notes, parent reports, private development logs.

### C — Team / club / league / tournament management *(the operating layer)*
**TeamSnap** (+ MOJO acquisition), **SportsEngine**, **LeagueApps**, **Spond**, **TeamLinkt**, **SportsEngine Tourney / Tourney Machine**.
**Insight goal:** integrate with or complement these; don't replicate registration/payments/calendar without a youth-baseball-specific advantage.

### D — Coaching, drills, practice plans, coach education
**MOJO** (TeamSnap content), **USA Baseball / USAB Develops / Mobile Coach** (free standards baseline — 300+ drills, Pitch Smart, Skills Matrix, badges/challenges), **Dominate the Diamond**, **Baseball Blueprint**, **Trosky 365**.
**Insight goal:** most apps offer "content." The opportunity is **contextual recommendation**: "Your 10U team struggled with force plays — here's a 90-minute plan." *(Do not ingest paid drill libraries wholesale — public metadata + reviews only.)*

### E — Player training & development systems
**Driveline / TRAQ** (data-driven; integrates Rapsodo/Blast/TrackMan/Pocket Radar/Diamond Kinetics/PitchLogic; "reduce clutter, integrate tech"), **Mustard** (phone-first pitching mechanics; video → report card → training plan, Tom House framework), **Trosky 365**, **CoachNow**, **OnForm** (video analysis), **KineVision / Coach's Eye successors**.
**Insight goal:** where training apps are too advanced, too narrow, too content-heavy, or disconnected from team/game context. Youth winner = **age-scaled, arm-health-first, measurable-based, coach-supervised**.

### F — Hardware-linked data platforms *(the data exhaust)*
**Pocket Radar / Smart Coach** (affordable velo, GameChanger integration), **Rapsodo** (hitting+pitching, facility/elite tier), **HitTrax** (cage sim), **Blast Motion** (bat sensor + swing metrics), **Diamond Kinetics** (bat sensor + games + MLB content), **TrackMan** (showcase/facility tier via PBR).
**Insight goal:** map which metrics are accessible to normal youth coaches vs facility-only. Support low-friction first: Pocket Radar, stopwatch, phone video, manual EV, home-to-first, throwing velo, catcher pop, strike %, 9-box command.

### G — Showcase, recruiting, player-profile platforms
**Perfect Game / DiamondKast / PG Profile**, **Prep Baseball / PBR**, **FieldLevel**, **SportsRecruits**, **NCSA**.
**Insight goal:** copy the **profile structure**, not the recruiting pressure. For youth: "development record that follows the kid," not "get recruited at 10U."

### H — Club development networks & emerging ecosystems
**CURVE Sports / Diamond Allegiance / CURVE Test** (unified club + testing + standards + recruiting; "Ball / Body / Brain"), **Pitch 2 Pitch**.
**Insight goal:** the future is **club OS + development platform + trusted testing**. Our opportunity is the lightweight version for independent teams, Little League, and small travel programs.

---

## 2. Deep corpus source map

| Source type | What to collect | Why it matters |
|---|---|---|
| Official product pages | Feature claims, pricing, target user, positioning | What competitors *say* they do |
| Help docs | Real workflows, limits, exports, integrations | Real behavior beyond marketing |
| App Store / Google Play reviews | Rating, text, date, version, dev response | Best structured sentiment |
| Reddit / forum threads | Questions, alternatives, complaints, hacks | Most honest workflow signal |
| YouTube demos / comments | Real usage, setup friction | UX + hidden pain points |
| Public pricing pages | Tiers, subscriptions, hardware lock-in | Willingness-to-pay model |
| Release notes | Bugs, fixes, roadmap hints | Product direction |
| Hardware docs | Required devices, metric defs, export ability | Measurables architecture |
| Showcase / recruiting profiles | Verified-stat model, profile structure | Long-term profile design |

---

## 3. Compliance-first ingestion rules

- **Use sanctioned access.** Reddit's official Data API (OAuth, ~100 queries/min/free client — respect headers). Apple App Store Connect API exposes reviews **for your own app**; for competitors use public pages carefully or a licensed provider. Google Play Developer API replies to **your own** app's reviews, not competitor mining at scale. Product Hunt has an official GraphQL API with documented limits.
- **No brittle TOS-violating scraping.** Prefer APIs, public pages, manual exports, licensed datasets.
- **Never ingest paid drill/training content wholesale.** For Trosky 365, Dominate the Diamond, Driveline, etc.: collect public feature claims, pricing, public reviews, and our own manual notes. The corpus learns **customer pain and product gaps**, not content to clone.
- **Respect copyright.** Store *paraphrased* `clean_text` + extracted structured insight + provenance `url`. Do not warehouse long verbatim review text. `raw_text` is optional and minimal.
- **Strip tracking params** (`utm_*`, `srsltid`, etc.) before storing URLs.

---

## 4. Corpus schema

Each item conforms to `corpus/competitor-research/corpus.schema.json`. Shape:

```jsonc
{
  "source_id": "uuid",
  "source_type": "app_review | reddit | forum | product_page | help_doc | release_note | youtube | social | pricing_page | manual_note",
  "platform_name": "GameChanger",
  "platform_category": ["lineup", "scorekeeping", "stats", "team_management",
    "practice_planning", "training", "video_analysis", "hardware_metrics", "recruiting", "club_ops"],
  "source_platform": "apple_app_store | google_play | reddit | web | youtube | facebook | product_site",
  "url": "https://…",
  "date_published": "YYYY-MM-DD | null",
  "date_collected": "YYYY-MM-DD",
  "app_version": "optional",
  "rating": "1-5 | null",
  "review_title": "optional",
  "raw_text": "optional, minimal",
  "clean_text": "paraphrased insight (the field we actually reason over)",
  "author_role_inferred": "coach | parent | player | scorer | trainer | facility_owner | tournament_director | unknown",
  "age_band": "tee_ball | 8U | 10U | 12U | 14U | HS | college | adult | unknown",
  "sport": "baseball | softball | both | unknown",
  "workflow_stage": "pre_game | game_day | post_game | practice | off_season | tryout | tournament | recruiting",
  "job_to_be_done": [], "pain_points": [], "feature_requests": [], "delighters": [],
  "bugs_or_reliability_issues": [], "workarounds": [], "competitors_mentioned": [],
  "pricing_feedback": [], "trust_or_safety_concerns": [], "data_ownership_concerns": [],
  "export_or_integration_needs": [],
  "sentiment": "positive | neutral | negative | mixed",
  "urgency": "low | medium | high",
  "severity": "low | medium | high",
  "confidence": "low | medium | high",
  "product_implication": "short summary",
  "opportunity_score": 0
}
```

---

## 5. Extraction taxonomy

Controlled vocabulary lives in `corpus/competitor-research/taxonomy.json` and is enforced by `@platform/research` validation. Buckets:

- **User roles** — head/assistant/parent coach, team admin, scorekeeper, parent/fan, player, private instructor, facility owner, club director, tournament director, recruit/family, college coach/scout.
- **Jobs-to-be-done** — fair lineup, optimize batting order, balance IF/OF reps, track bench time, manage pitcher/catcher restrictions, score a game, track pitch count, share updates, stream, build practice plan, find drills, track progress, capture measurables, analyze mechanics, assign homework, build player profile, share video, prep tryouts, support recruiting, run a tournament, reduce parent complaints.
- **Pain points** — game-pressure friction, too many taps, bad UX, crashes, wrong stats, hard-to-fix scoring, roster pain, parent-access confusion, subscription frustration, locked data, no export, no season continuity, no player-owned history, no fairness tracking, no multi-game planning, no age scaling, no arm-care guardrails, generic training, expensive hardware, complex setup, high coach workload.
- **Feature opportunities** — fair rotation generator, playing-time ledger, pitcher/catcher restriction assistant, multi-game planner, GC import, Pocket Radar import, manual device import, player-owned profile, parent progress report, practice-plan generator, skill-test dashboard, age-band benchmarks, training recs, coach notes, player homework, tryout report, exportable PDF, shareable profile link, private coach notes, team development dashboard.

---

## 6. Research backlog — three waves

Full structured list in `corpus/competitor-research/platforms.json`.

- **Wave 1 — core baseball apps (cleanest signal).** GameChanger, iScore, TeamSnap, Stack the Lineup, Rizzler, FreeBaseballLineups/Fielding Rotation, Lineup Card, MOJO, USA Baseball Mobile Coach, Dominate the Diamond, Driveline/TRAQ, Mustard, Trosky 365, CoachNow, OnForm. *Target: 1,500–2,500 items.*
- **Wave 2 — data, hardware, player-profile.** Pocket Radar, Rapsodo, HitTrax, Blast, Diamond Kinetics, TrackMan (via PBR), Perfect Game/DiamondKast, PBR, FieldLevel, SportsRecruits, NCSA, CURVE/Diamond Allegiance. *Target: 1,000–1,500 items.*
- **Wave 3 — team/league/tournament ops.** SportsEngine, LeagueApps, Spond, TeamLinkt, Tourney Machine, registration/payment tools, local league sites, tournament rule PDFs. *Target: 750–1,250 items.*

---

## 7. Opportunity-scoring model

Config in `corpus/competitor-research/scoring.json`; computed by `@platform/research`. **Don't average star ratings** — score each insight 1–5 on eight dimensions:

| Dimension | Measures |
|---|---|
| Frequency | How often the issue appears |
| Severity | How much it hurts coach/player/parent |
| Youth specificity | Real baseball problem vs generic app whining |
| Workflow proximity | Closeness to our product wedge |
| Competitive gap | Whether current apps clearly fail to solve it |
| Willingness to pay | Whether users already pay or build workarounds |
| Trust impact | Affects fairness, safety, stats accuracy, parent conflict |
| Implementation leverage | Solving it unlocks multiple workflows |

`opportunity_score = Σ(eight dimensions)` → **8–40**. **≥ 32 ⇒ MVP consideration.**

---

## 8. Insights we expect to surface

1. **GameChanger is dominant but not development-first.** Position around the missing layer: *"GameChanger tracks the game. We track the player."*
2. **Fair defensive rotation is a real wedge.** Make it core, not a side feature: game-by-game grid, season innings-by-position, bench count, IF/OF ratio, catcher innings, pitcher/catcher eligibility, parent-proof history, exportable PDF.
3. **Training apps are too serious / too narrow / too disconnected.** Youth training should be coach-supervised, age-scaled, arm-health-first, tied to measurable deltas, family-light — not a velo-chasing machine.
4. **Objective measurables are fragmented.** Support manual entry *and* device imports. Start: exit velo, pitch velo, throwing velo, home-to-first, 60-yd, catcher pop, strike %, first-pitch strike %, 9-box command, attendance, coach notes.
5. **Recruiting/profile platforms prove persistent player records matter.** Build a **player-owned development profile** that can grow into recruiting later — without youth recruiting pressure.

---

## 9. Product wedge

**Don't build:** another GameChanger, another TeamSnap, another generic drill library, another recruiting marketplace, another hardware-locked data platform.

**Build: the Youth Baseball Development OS** — player profile (follows the kid across teams/seasons; measurables, coach notes, video, history) · team development dashboard (strengths/weaknesses, practice priorities, testing cadence, attendance, progression) · lineup + fair-rotation engine (batting order, defensive grid, bench fairness, catcher/pitcher restrictions, tournament planning) · measurable capture (phone/manual first, Pocket Radar-friendly, optional device import) · age-scaled training plans (arm-health guardrails, 6-week blocks, coach-approved homework) · parent/player report (improvement-focused, no toxic ranking).

---

## 10. 30-day research plan

- **Week 1 — competitor feature matrix.** ~30 platforms × ~24 columns → `competitor-feature-matrix.md` (source: `feature-matrix.json`).
- **Week 2 — sentiment corpus.** ~500 store reviews + 300 Reddit/forum + 100 product/help-doc chunks + 100 YouTube/social + 100 manual test notes; tag every item (role, age, workflow, sentiment, pain, request, workaround, implication).
- **Week 3 — workflow teardown.** Top 12 platforms: manually walk roster → lineup → rotate → score → stats → export → practice → train → measurable → profile → share; record taps, friction, missing features, pricing walls, parent confusion, data portability.
- **Week 4 — MVP scope.** Top 25 pains, top 25 requests, top 10 workflow gaps, top 10 review quotes, MVP feature list, landing copy, positioning map, RAG-ready corpus.

---

## 11. MVP feature order

1. **Youth coach wedge** — roster, lineup builder, defensive rotation grid, season playing-time ledger, bench/IF/OF fairness dashboard, printable lineup card, coach notes, basic player profile.
2. **Development tracker** — testing-day module, EV/velo/speed/pop/command tracking, progress charts, age-band context, parent progress report, practice-plan recommendations.
3. **Training engine** — skill driver trees, 6-week blocks, arm-care guardrails, player homework, coach approval, video upload/feedback.
4. **Ecosystem integrations** — GameChanger import/export, Pocket Radar capture, CSV import (Rapsodo/HitTrax/Blast/DK), TeamSnap/SportsEngine schedule import, shareable profile.

---

## 12. Positioning

**"The player development layer for youth baseball."**

> Scorekeeping apps track what happened in the game. Team apps track where everyone needs to be. Training apps teach isolated skills. **We connect it all into one player development record:** lineups, fair reps, objective measurables, coach notes, practice priorities, and age-appropriate training. That is the gap.
