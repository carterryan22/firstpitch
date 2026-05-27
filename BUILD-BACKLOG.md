# Build Backlog — Player Development Platform

Single source of truth for what to build, in what order, with what dependencies and acceptance criteria. Synthesizes:

- [market-research-positioning.md](market-research-positioning.md) — wedge, personas, pricing, validation plan
- [player-development-metric-schema.md](player-development-metric-schema.md) — core engineering spec (`§19` data model + Phase 1–4 build order)
- [coach-platform-practice-compiler.md](coach-platform-practice-compiler.md) — coach product + MVP build order (`§14`)
- [product-feature-addendum.md](product-feature-addendum.md) — feature layer with P1/P2/P3/P4 tags
- [whosonsecond-ui-reference.md](whosonsecond-ui-reference.md) — UI patterns to borrow/improve (`§9`), tournament rulebook library (`§10`)
- [competitor-crawl-summary.md](competitor-crawl-summary.md) — feature gaps
- [youth-training-corpus-seed.md](youth-training-corpus-seed.md) + [corpus/](corpus/) — safety knowledge stack

---

## Legend

- **Priority**: `P0` validation/foundation · `P1` MVP · `P2` post-MVP · `P3` trust layer · `P4` recruiting
- **Source**: anchor in spec doc(s) where the requirement lives
- **DoD**: Definition of Done — acceptance criteria
- **Deps**: blocking dependencies (other epic/story ids)

Stories use ID format `E<epic>.<story>` (e.g., `E3.4`).

---

## Phase 0 — Validation & Foundations (Pre-Build, 4–8 weeks)

> Per [market-research-positioning.md §16](market-research-positioning.md), validate the wedge before heavy build.

### Epic E0 — Validation
| ID | Story | Source | DoD |
|---|---|---|---|
| E0.1 | Run 15–25 parent + 8–12 coach interviews on "stats → what next" pain | market §16 | Recorded findings; ≥70% confirm pain; quote bank captured |
| E0.2 | Click-through prototype of the closed loop (game tag → diagnosis → plan → re-test) | market §16 | 5 unmoderated tests with ≥80% task completion |
| E0.3 | Verify all `[VERIFY]` market figures against primary sources | market §10 notice | Spreadsheet of figure → source → confirmed value |
| E0.4 | COPPA + state privacy compliance audit (esp. <13 PII, parental consent flow) | market §10 | Memo from privacy counsel; gap list |
| E0.5 | Founding facility partner LOI (1 facility for combine pilot) | market §16 | Signed LOI or written intent |

### Epic E1 — Engineering Foundation
| ID | Story | Source | DoD |
|---|---|---|---|
| E1.1 | Monorepo + CI + secrets + envs (dev/stage/prod) | — | `main` deploys to stage on merge |
| E1.2 | Auth (parent + coach + player roles), magic link, parental-consent flow for <13 | addendum §A | <13 cannot complete signup without verified parent email |
| E1.3 | Org / Team / Player / User data model (multi-tenant) | core §19.1 | Seed script creates a 12-player U10 team |
| E1.4 | Audit log + privacy export/delete (data subject requests) | E0.4 output | Manual test: full export ≤24h |
| E1.5 | Feature flag system (per-org and per-user) | — | Hot-toggle without deploy |
| E1.6 | Observability (logs, traces, metrics) + on-call rotation tooling | corpus eval §8 | Pager alert on synthetic failure |

---

## Phase 1 — Best MVP (Development First)

> Maps to [core §19.2 Phase 1](player-development-metric-schema.md) + [compiler §14 Coach MVP](coach-platform-practice-compiler.md) + addendum `P1` items.

### Epic E2 — Player Profile & Baseline
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E2.1 | Player profile (name, DOB-derived age band, sport, handedness, positions, environment tier) | core §17.2; addendum §A | Profile renders age band 6-8/9-12/13-15/16+ correctly | E1.3 |
| E2.2 | Environment-tier onboarding wizard (T1 field / T2 cage-gym / T3 backyard / T4 living room) | core §17 | Equipment checklist persisted; substitutions enabled in compiler | E2.1 |
| E2.3 | Baseline combine flow (age-banded standardized protocols) | core §7; addendum §C.4 | Each baseline metric saves with `verification_state` | E2.1 |
| E2.4 | Verification ladder UI (self · video · device · coach · facility · event) | core §8.1 | Toggling level changes badge + dashboard sort | E2.3 |
| E2.5 | Goal setting (process goals, athlete-led; no comparison) | core §7; addendum §B.7 | Goals are private by default | E2.3 |
| E2.6 | Re-test reminders (cadence by metric) | core §13 | Push + email at correct interval | E2.3 |

### Epic E3 — Metric Tracking & 9-Box
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E3.1 | Metric catalog seeded from core §1–§5 (hitting, speed/baserun, pitching baseball, pitching softball, fielding) | core §1–§5 | DB has every metric with units, age-band defaults | E1.3 |
| E3.2 | Metric entry UI (manual, video upload, device capture stub) | core §8.1 | Entry stores `verification_state` | E3.1 |
| E3.3 | 9-Box Command module (PRD per core §6) | core §6; corpus drill `9BOX_COMMAND_INTRO` | Logs called vs actual; produces 9BOX_SCORE | E3.1 |
| E3.4 | Personal progress charts (no comparison view in MVP) | addendum §B.7 | Renders trend per metric; private by default | E3.2 |
| E3.5 | Age-banded labels & UI tone scaling | addendum §B; corpus age matrix | Same metric renders with different copy per band | E2.1 |

### Epic E4 — Game Transfer On-Ramp
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E4.1 | Manual game-improvement tag (lightweight, no CSV) | core §15.1; §19.2 P1 step 9 | Coach can tag a game with skill + note in <30s | E2.1 |
| E4.2 | Manual game-stat entry (batting/pitching/fielding/baserunning) | core §19.1 `GameStat` | Per-player per-game record persisted | E3.1 |
| E4.3 | GameChanger filtered CSV import + player-name mapping | core §15.2 | 100-row CSV maps with ≥95% accuracy; user resolves ambiguous names | E4.2 |
| E4.4 | Pre/post training-block comparison + one insight | core §15.5 | One natural-language insight per analysis | E4.3 |

### Epic E5 — Safety Stack v1 (Tier 1 corpus → enforced)
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E5.1 | Import `corpus/tier1-safety-rules.json` into rule engine | corpus | All 15 rules queryable by `applies_to` | E1.3 |
| E5.2 | Import `corpus/pitch-smart-tables.json` into pitching gate | corpus; addendum §C.3 | `canPitchToday()` returns correct result for sample fixtures | E5.1 |
| E5.3 | Readiness gates (core §11) wired to E5.1 | core §11 | A drill that violates a gate is blocked with reason | E5.1 |
| E5.4 | Guardrail ceiling (core §12) wired to E5.2 | core §12 | Compiler refuses over-volume sessions | E5.2 |
| E5.5 | "Don't do this today" engine (addendum §C.3) | addendum §C.3 | Daily check returns block reasons + safer alternatives | E5.1, E5.2 |
| E5.6 | Standardized test protocols rejecting forbidden ages (no 1RM <18) | addendum §C.4; corpus rule `NO_ONE_REP_MAX_MINORS` | UI refuses 1RM for minors with refusal copy | E5.1 |
| E5.7 | Injury / fatigue history log + escalation flow | addendum §C.5; corpus rule `STOP_ON_PAIN` | Pain self-report routes to parent + coach within 1 min | E5.1 |

### Epic E6 — Practice Compiler v1
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E6.1 | Coach profile + team setup + age group + duration + roster + equipment | compiler §1, §14 | All fields persist; usable across sessions | E1.3 |
| E6.2 | Drill library seeded from `corpus/drills/starter-library.json` + USA Baseball + Little League University attributions | compiler §11; corpus | ≥30 drills published across topics | E5.1 |
| E6.3 | Compiler algorithm (focus → drill selection → time-pack → safety gate) | compiler §2.2 | Returns a plan that respects pitch budget + age matrix | E5.4, E6.2 |
| E6.4 | Standard practice structure templates (warmup / skill / situational / closing) | compiler §2.3 | Selectable; auto-fills | E6.3 |
| E6.5 | Time-scaled templates (45 / 60 / 90 / 120 min) | compiler §2.4 | Same focus, length valid | E6.3 |
| E6.6 | Age scaling tone + structure | compiler §2.5; corpus age matrix | Visibly different copy per band | E6.3 |
| E6.7 | Equipment scaling (substitutions when missing gear) | compiler §2.6; drill template `equipment_substitutions` | A plan generated for T3 backyard never requires T1 gear | E6.3 |
| E6.8 | Save / export / share plan (PDF + shareable link) | compiler §14 | PDF renders cleanly; link is auth-aware | E6.3 |
| E6.9 | Home mission auto-generated per plan (one parent-facing drill) | compiler §7.4; addendum §B | Parent receives a single home mission per practice | E6.3 |

### Epic E7 — Coach & Parent Surfaces v1
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E7.1 | Coach dashboard: today/this week + team baseline + recent plans | compiler §8 | Loads in <2s; shows week-at-a-glance | E6.3 |
| E7.2 | Parent dashboard: child's progress + this week's home mission + safety messages | addendum §B, §F.2 | Reads-only; no comparison views | E6.9 |
| E7.3 | Weekly player card (private, shareable) | addendum §F.2 | Auto-generated each Sunday; opt-in share | E3.4 |
| E7.4 | Notifications (push + email + SMS opt-in) | — | Safety alerts always deliver; marketing opt-in only | E1.2 |

### Epic E8 — Grounded AI Layer v1 (read-only, coach-facing)
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E8.1 | Retrieval pipeline over `corpus/sources.seed.json` + Tier 1 rules + drill library | compiler §12.1 | Top-k retrieval returns relevant records on test set | E5.1, E6.2 |
| E8.2 | System prompts from `corpus/ai-system-prompts.md` (global + practice + Q&A) | corpus | Prompts deployed; non-overridable by user | E8.1 |
| E8.3 | Post-filter runtime guards (refusal templates) | corpus prompts §7 | All 5 refusal categories trigger correctly on fixtures | E8.2 |
| E8.4 | Eval harness (`corpus/eval-harness.md`) integrated into CI | corpus | Categories A-D failures block merge | E8.3 |
| E8.5 | Coach Q&A sidebar (freeform questions, retrieval-grounded) | compiler §12.1 | 50-prompt golden set passes ≥98% | E8.3 |
| E8.6 | AI-assisted practice planner (variation on E6.3 that explains its choices) | compiler §12 | Every block has a `reason_text` from retrieval | E6.3, E8.3 |

### Epic E9 — Pricing & Billing v1
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E9.1 | Stripe integration + plan catalog (Free, Plus, Family, Coach, Facility) | addendum §F.6; compiler §13 | Test mode end-to-end purchase | E1.2 |
| E9.2 | Free → Plus upgrade path with the "weekly player card" gate | addendum §F.6 | Conversion event tracked | E7.3 |
| E9.3 | Team Season Pass ($149/team/season recommended) coach purchase flow | compiler §13 | Coach can purchase + invite roster | E1.3 |

**Phase 1 Exit Gate:** validation interviews show coach + parent both complete the closed loop in <10 minutes without help.

---

## Phase 2 — Training Engine

> Maps to [core §19.2 Phase 2](player-development-metric-schema.md) + addendum `P2` items.

### Epic E10 — Driver Trees & Diagnosis
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E10.1 | Driver catalog seeded from core §9 | core §9 | Every metric maps to ≥1 driver | E3.1 |
| E10.2 | Diagnosis engine (verified-number-only; never invented) | core §9; §18 | A player with zero verified entries never receives a diagnosis | E3.2 |
| E10.3 | Driver-aware plan routing | core §8 | Diagnosis → plan selection observable in UI | E10.2, E6.2 |

### Epic E11 — Closed-Loop Plan Engine
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E11.1 | Plan library expanded (≥80 drills) with per-drill `metric_driver` | core §16; drill template | Library covers all age bands × all topics | E6.2 |
| E11.2 | Adjust branch / re-diagnose after re-test | core §13.2 | Plan auto-adjusts when re-test crosses threshold | E2.6, E10.2 |
| E11.3 | Neutral recommendation engine (vendor-agnostic) | core §14 | Recommendations include free + paid + competitor tools when appropriate | E10.3 |
| E11.4 | Plan-completion tracking + parent/coach notes | core §19.1; addendum §D | Coach sees completion % per assignment | E6.9 |
| E11.5 | Transfer Score + confidence thresholds + role-scaled views | core §15.5–§15.8 | Pre/post block math produces calibrated confidence | E4.4 |

### Epic E12 — Practice Compiler v2
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E12.1 | Practice Quality Score | compiler §3 | Score visible; recompiles on edit | E6.3 |
| E12.2 | Anti-Line Engine | compiler §4 | Plans with long lines flagged + auto-fix offered | E6.3 |
| E12.3 | Player Grouping Engine | compiler §5 | Auto-groups by skill + need + chemistry | E6.3 |
| E12.4 | Coach Modes (Builder / Quick / Guided) | compiler §6 | 3 modes deliver the same data model | E6.3 |
| E12.5 | Live Practice Companion (run-the-practice UI) | compiler §7.1 | Timer + station rotation + completion taps | E6.3 |
| E12.6 | Assistant cards (printable per-station summaries) | compiler §7.3 | PDF stations print 1 per page | E12.5 |
| E12.7 | Position-specific tracks (P / C / IF / OF / hitter) | compiler §10 | Track surfaces relevant drills + metrics | E11.1 |

### Epic E13 — Safety Stack v2 + Season Awareness
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E13.1 | Season-aware scheduling (preseason / in-season / tournament / off) | addendum §C.1 | Compiler weights blocks by season state | E6.3 |
| E13.2 | Safety / Recovery score (sleep + soreness + 7-day throws + hydration) | addendum §C.2; corpus rules | Score visible to athlete + coach; gates intensity | E5.7 |
| E13.3 | Heat-day workflow (drill `HEAT_DAY_HYDRATION_CHECK`) | corpus drill; rule `HYDRATION_DEFICIT_CAP` | On heat-index threshold, workflow auto-triggers | E5.1 |
| E13.4 | Workload Budget extension (pitchers + catchers, multi-team carryover) | WoS ref §9.2 | A catcher who squatted 60 pitches yesterday is blocked from pitching today | E5.4 |
| E13.5 | League rulebook engine (Little League, NFHS, USSSA + Perfect Game, TTB) | WoS ref §10 | Pick-a-rulebook per game; rules cascade into pitch + lineup gates | E5.2 |

### Epic E14 — Gamification (Age-Scaled)
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E14.1 | Mission engine (U8–10 fun missions / streaks) | addendum §B | Daily streaks; no public leaderboards <12 | E2.1 |
| E14.2 | Challenges + PRs (U11–12) | addendum §B | Personal-best badges only | E3.4 |
| E14.3 | Position ladders (U13–14) | addendum §B | Ladder is private + opt-in | E11.1 |
| E14.4 | Verified-metrics view (U15+) | addendum §B | Surfaces only verification levels ≥ `coach_verified` | E2.4 |
| E14.5 | Progress-without-comparison views everywhere | addendum §B.7 | No "you vs. teammate" view ships | — |

### Epic E15 — Reports & Records
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E15.1 | Parent progress report (weekly + monthly) | addendum §F.1 | Email + in-app | E7.3 |
| E15.2 | Coach report (per team, per player) | addendum §F.1 | Filterable; exportable | E7.1 |
| E15.3 | Video checkpoints (structured capture, attached to metrics) | addendum §F.4 | Side / front / behind views captured + linked | E3.2 |
| E15.4 | Family timeline (private baseball memory book) | addendum §F.3 | Chronological feed of milestones + PRs | E14.2 |

### Epic E16 — UI System (WoS-borrowed patterns)
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E16.1 | 5-tab bottom nav (Home / Games / Roster / Practice / More) | WoS §9.1 | iOS + web parity | E7.1 |
| E16.2 | Accordion settings with rule-source badges | WoS §9.1 | Every rule shows provenance (League / Custom / League rule) | E13.5 |
| E16.3 | Inline rule warnings during plan build | WoS §9.1 | Violations explained inline with safer alt | E5.5 |
| E16.4 | Capability badges (`Can pitch`, `Can catch`, `Injured`) on player cards | WoS §9.1 | Auto-updated from gates + manual override | E5.3 |
| E16.5 | GameChanger ICS sync with diff (`N created/updated/unchanged/detached`) | WoS §9.1 | Diff visible before commit | E4.3 |
| E16.6 | Sandbox demo (2-hour, no signup) | WoS §9.1 | New visitor reaches the compiler in <30s | E6.3 |
| E16.7 | Press-Box-style public share link | WoS §9.1 | No-auth share works; parent flow downstream | E7.3 |
| E16.8 | Branded 404 + status pill grammar (`Scheduled / In Progress / Completed`) | WoS §9.1 | Visual QA passes | — |

---

## Phase 3 — Trust Layer

> Maps to [core §19.2 Phase 3](player-development-metric-schema.md) + addendum `P3` items.

### Epic E17 — Verified Measurement
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E17.1 | Facility combine mode (paid testing session) | addendum §F.6 | Facility staff can run a 12-station combine in <90 min | E2.3 |
| E17.2 | Coach validation flow (`coach_verified`) | core §8.1 | Coach can sign a metric entry in one tap | E2.4 |
| E17.3 | Video proof workflow (`video_attached` upgrade to `coach_verified`) | addendum §F.4 | Coach reviews video + promotes verification | E15.3 |
| E17.4 | Pocket Radar auto-capture integration | core §19.2 P3 | Live pitch velo writes directly to MetricEntry | E3.2 |
| E17.5 | Blast Motion + Rapsodo + HitTrax integrations | core §19.2 P3 | Vendor-neutral importers for each | E3.2 |
| E17.6 | Calendar (Apple/Google) + HealthKit integration | core §19.2 P3 | Sleep + HRV feed Safety/Recovery score | E13.2 |
| E17.7 | Multi-sport athleticism layer (sprint, jump, agility, throw, balance) | addendum §F.5 | Separate metric group; informs anti-specialization messaging | E3.1 |
| E17.8 | Portable player-owned profile (export + transfer) | addendum §F.3; core §19.2 P3 | Player can leave team, keep record | E1.4 |

### Epic E18 — Coach Development
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E18.1 | Coach education modules (PCA-aligned culture, NFHS mental wellness link-outs) | compiler §9; corpus | ≥6 modules published | E8.1 |
| E18.2 | Coach scorecard (engagement / safety adherence / practice quality) | compiler §9 | Visible to head coach + facility admin | E7.1 |
| E18.3 | Required-training checks (Little League Abuse Awareness, Diamond Leader) | corpus rule `LITTLE_LEAGUE_REQUIRED_TRAINING` | Compliance flag on coach profile | E1.2 |

### Epic E19 — Club / Facility Plan
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E19.1 | Multi-team org dashboard | compiler §13 | Club admin sees N teams + roll-up metrics | E7.1 |
| E19.2 | Facility combine report templates | addendum §F.1 | PDF + branded; emailed to family | E17.1 |
| E19.3 | Marketplace (vendor-neutral; partner programs + equipment referrals) | addendum §F.6; core §14 | Listings show neutrality disclosure | E9.1 |

---

## Phase 4 — Recruiting Layer

> Only after Phase 1–3 deliver development value. [core §19.2 Phase 4](player-development-metric-schema.md).

### Epic E20 — Recruiting-Lite
| ID | Story | Source | DoD | Deps |
|---|---|---|---|---|
| E20.1 | Shareable player profile (verified metrics surfaced) | addendum §F.1 | Public URL with only verified data | E17.8 |
| E20.2 | Academic info + coach references | core §19.2 P4 | Profile fields persist + display | E20.1 |
| E20.3 | Video clip highlight reel | addendum §F.4 | Auto-assembled from `video_attached` entries | E15.3 |
| E20.4 | Realistic fit guidance (anti-showcase-grift positioning) | market §4 | Engine recommends focus blocks over showcase spend | E11.3 |

---

## Cross-Cutting Tracks

### Epic E21 — Content & Corpus
| ID | Story | Source | DoD | Phase |
|---|---|---|---|---|
| E21.1 | Expand starter drill library 12 → 80+ | corpus drills | Coverage per age × topic ≥3 drills each | P1→P2 |
| E21.2 | Tier 1 rule re-verification (quarterly) | corpus | Re-pinned `last_verified` dates | recurring |
| E21.3 | Source-tier audit (drop/refresh links) | corpus | Broken links resolved | recurring |
| E21.4 | Coach-authored drill submission flow + review pipeline | drill template §4 | Submitted drills move draft → reviewed → published | P2 |
| E21.5 | Localization pass (Spanish first) | — | Tier 1 rules + onboarding fully translated | P3 |

### Epic E22 — Compliance & Privacy
| ID | Story | Source | DoD | Phase |
|---|---|---|---|---|
| E22.1 | COPPA-compliant <13 flow + parental verifiable consent | E0.4; addendum §A | Counsel-signed; demoed end-to-end | P1 |
| E22.2 | State-specific (CA, IL, etc.) youth privacy compliance | E0.4 | Region-aware consent UI | P1 |
| E22.3 | Data export + delete (GDPR-style) | E1.4 | Self-serve in account settings | P2 |
| E22.4 | Security review (pen test) before launch | — | Findings remediated; report on file | P1 |

### Epic E23 — Quality & Eval
| ID | Story | Source | DoD | Phase |
|---|---|---|---|---|
| E23.1 | Golden test suite for AI (50 prompts → 200 by P2) | corpus eval §5 | Drift gate in CI | P1 |
| E23.2 | Pitch Smart numeric assertion suite (auto-generated) | corpus eval §3 | 100% pass on every CI run | P1 |
| E23.3 | Age-matrix forbidden-item suite | corpus eval §3 | 100% pass on every CI run | P1 |
| E23.4 | Monthly human-in-loop review (coach + clinician + parent advocate) | corpus eval §7 | Monthly report filed; findings → backlog | recurring |
| E23.5 | Production AI failure escalation runbook | corpus eval §8 | On-call drill executed | P1 |

### Epic E24 — Go-to-Market
| ID | Story | Source | DoD | Phase |
|---|---|---|---|---|
| E24.1 | Sandbox demo + landing page (no-signup compiler) | WoS §9.1 sandbox; market §12 | Public; analytics wired | P1 |
| E24.2 | 3 founding facility pilots (verified combine + reports) | market §12 | Signed; first reports delivered | P1–P2 |
| E24.3 | Coach-first content (60-second practice-builder demo videos) | market §12 | 10 short demos shipped | P1 |
| E24.4 | Parent-acquisition story (anti-showcase, safety-first) | market §7, §15 | Landing copy + 3 case studies | P2 |
| E24.5 | League / club partner program | market §12 | First two leagues signed | P2 |

### Epic E25 — Team Operations Surfaces (WoS-parity IA)

> Maps to [whosonsecond-ui-reference.md §2.1, §3.2–§3.12](whosonsecond-ui-reference.md). The current platform exposes coach + parent dashboards but no `/teams/{slug}/...` team-centric surfaces (roster, games, lineup, pitching board, fairness, press box). E16 captures borrowed *patterns*; this epic captures the *surfaces themselves*.

| ID | Story | Source | DoD | Phase | Deps |
|---|---|---|---|---|---|
| E25.1 | URL grammar `/teams/{slug}` + team switcher in header | WoS §2.1, §2.2 | Slug-based routing live; multi-team account switches in <300ms | P1 | E1.3 |
| E25.2 | Team home `/teams/{slug}` — Next Game card + quick-action row + activity feed | WoS §3.2 | Next Game shows opponent/date/venue + days-until + CTA | P1 | E25.1, E4.2 |
| E25.3 | Roster `/teams/{slug}/roster` with Positions / Stats tabs | WoS §3.3 | Player cards show number, B/T, position chips, capability badges | P1 | E25.1, E2.1 |
| E25.4 | Player detail `/teams/{slug}/roster/{playerId}` with position-rating sliders, availability, pitch history, parent links | WoS §3.4 | Editing rating affects auto-lineup; pitch history reflects safety rules | P2 | E25.3, E5.2 |
| E25.5 | Add Player form `/teams/{slug}/roster/new` (jersey, DOB, B/T, capabilities, position ratings, parent email invite) | WoS §3.5 | Player created in one form pass; parent invite sent | P1 | E25.3 |
| E25.6 | Games list `/teams/{slug}/games` (Upcoming / Past grouping, status badges) | WoS §3.6 | Games sorted + filterable; status grammar matches `Scheduled / In Progress / Completed` | P1 | E25.1, E4.2 |
| E25.7 | New Game form `/teams/{slug}/games/new` (opponent, datetime, venue, innings) | WoS §3.7 | Save lands on game page | P1 | E25.6 |
| E25.8 | Game page `/teams/{slug}/games/{gameId}` with **Field / Roster / Summary** tabs | WoS §3.8 | All three tabs render; tab state in URL | P1 | E25.7 |
| E25.9 | Lineup builder (Field tab): per-inning × player grid, auto-generate, inline rule warnings | WoS §3.8 | Auto-lineup respects pitch-rest + age matrix; warnings cite rule_id | P2 | E25.8, E5.4 |
| E25.10 | Tools dropdown pattern (Edit details / Duplicate / Reset Lineup / Mark Complete / Delete) — no `/edit` route | WoS §3.8 | All five actions reachable from game page; no orphan route | P2 | E25.8 |
| E25.11 | Game Stats `/teams/{slug}/games/{gameId}/stats` (post-game review, read-only once Completed, pitch-count entry per pitcher) | WoS §3.9 | Counts persist; locked when game = Completed | P2 | E25.8, E4.2 |
| E25.12 | Pitching availability board `/teams/{slug}/pitching` (last-pitched, rest pill, forward calendar) | WoS §3.10 | Rest pills computed from `canPitchToday()`; forward projection per next game | P2 | E25.6, E5.2 |
| E25.13 | Fairness table `/teams/{slug}/fairness` (games/innings/bench/infield/outfield/positions/at-bats per player, heat-map cells) | WoS §3.11 | Numbers reconcile to game-stat entries; heat-map highlights imbalance | P2 | E25.11 |
| E25.14 | Press Box `/teams/{slug}/press-box` (parent-facing public share — schedule, lineups after start, pitch counts, snack-duty) | WoS §3.12 | Shareable link works without auth; no PII beyond first names | P2 | E16.7, E25.11 |
| E25.15 | More menu `/teams/{slug}/more` (Settings, Fairness, Press Box, Help, Subscription) + bottom-tab parity | WoS §2.3, §3.13 | 5-tab nav (Home / Games / Roster / Pitching / More) on web + iOS | P2 | E16.1, E25.1 |
| E25.16 | Apply-rule-set wizard `/teams/{slug}/apply-rule-set?returnTo=…` (full-page, not modal) | WoS §2.1 | Tournament rulebook selectable; layers correctly with safety rules | P2 | E13.5, E25.1 |
| E25.17 | Snack-duty / volunteer rotation (Press-Box opt-in) | WoS §3.12 | Rotation auto-balances; parents notified | P3 | E25.14 |
| E25.18 | Team settings accordion (rules, communication, members, billing) | WoS §3.13 | Each section reachable; rule-source badges visible | P2 | E16.2, E25.15 |

---

## Top-Risk Items (track separately, review monthly)

| Risk | Owner | Mitigation |
|---|---|---|
| AI generates medical or pitch-count violation | Safety lead | Eval harness E23.x; feature-flag kill switch (E1.5); refusal templates (corpus prompts §6) |
| GameChanger changes CSV format | Eng lead | E4.1 manual tags ship first; CSV is fallback not foundation |
| Facility partner churn | GTM | E24.2 LOIs + paid pilot pricing |
| <13 privacy violation | Counsel | E22.1 + E22.2 + audit trail E1.4 |
| Recruiting-first creep | PM | Phase-gate enforced; no Phase 4 work until Phase 3 in-market |
| Drift toward "another stat app" | PM | Closed-loop dogfood metric: % of users completing tag → plan → re-test cycle |

---

## Suggested Milestones

- **M0 — Validation complete** (Phase 0 done): proceed/no-proceed decision.
- **M1 — Coach MVP demo**: E1, E2.1–E2.4, E5.1–E5.4, E6.1–E6.8, E7.1.
- **M2 — Closed-loop alpha**: + E3.3, E4.1–E4.2, E6.9, E7.2–E7.3, E8.1–E8.4.
- **M3 — Public launch (Phase 1 complete)**: + E4.3–E4.4, E5.5–E5.7, E8.5–E8.6, E9, E16.6, E22.1–E22.4, E23.1–E23.3, E24.1, E24.3, E25.1–E25.3, E25.5–E25.8.
- **M4 — Training engine GA (Phase 2 complete)**: + E10, E11, E12, E13, E14, E15, E16, E25.4, E25.9–E25.16, E25.18.
- **M5 — Trust layer GA (Phase 3 complete)**: + E17, E18, E19.
- **M6 — Recruiting beta (Phase 4)**: + E20.

---

## Cadence

- **Weekly**: backlog grooming; risk review; eval harness drift report.
- **Bi-weekly**: design review; safety-rule diff review.
- **Monthly**: human-in-loop AI review (E23.4); roadmap re-prioritization.
- **Quarterly**: corpus re-verification (E21.2); pricing review (compiler §13; addendum §F.6); competitive scan refresh.
