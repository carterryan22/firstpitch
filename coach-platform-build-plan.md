# Coach Platform — Build Plan

Compiled from: [competitor-gameday-os-ui-reference.md](competitor-gameday-os-ui-reference.md), [product-feature-addendum.md](product-feature-addendum.md), [player-development-metric-schema.md](player-development-metric-schema.md), [market-research-positioning.md](market-research-positioning.md), [competitor-crawl-summary.md](competitor-crawl-summary.md), [coach-platform-practice-compiler.md](coach-platform-practice-compiler.md), [youth-training-corpus-seed.md](youth-training-corpus-seed.md).

This file is the single source of truth for what gets built and in what order. Every line in the research docs that says "borrow", "ship", "match", or "we should" has been compiled into a tracked todo below with a phase, owner discipline, and acceptance criteria.

---

## Phase Map

| Phase | Goal | Duration target | Exit criteria |
|---|---|---|---|
| **0. Foundation** | Repo, infra, design system, data model, auth | — | Empty app boots, login works, role checks pass |
| **1. Core Wedge (MVP)** | Lineup generator + rulebook library + Quick Reference chip strip | — | 10 founding coaches use it for a full game and don't churn |
| **2. Game Day** | Live game surface, pitch/catcher workload ledger, parent share view | — | Coach runs a full game from phone with offline mode |
| **3. Development Engine** | Position Trust Matrix, Development Ledger, per-player season views | — | Coach can answer "why did Hudson play SS only twice?" with a chart |
| **4. Practice Compiler** | Practice planner with learning loop (outcomes feed back into goals) | — | Coach generates a practice plan informed by last 3 games |
| **5. League Tier** | Multi-team admin dashboard, CSV bulk import, co-admins-free pricing | — | A 10-team rec league uses Founding Leagues program for a full season |
| **6. Suite Expansion** | Scouting Companion + Workload IQ (catcher analytics) + Tournament Mode | — | Sells $799 tier on differentiated features |

---

## Cross-Cutting Design Tenets (apply to every todo)

These are non-negotiable and must be enforced in PR review:

- **PWA-first, installable** — no native app at launch; offline-first via service worker + IndexedDB.
- **Dark-mode first** — sunlight visibility is the default; light mode is the option.
- **One-handed dugout use** — minimum 44pt touch targets, gestures over taps, bottom-sheet UI.
- **Local-first, sync in background** — every write lands on-device instantly; sync is silent.
- **Speed over everything** — no spinners in live game flow; pre-fetch the next 3 likely screens.
- **Algorithm transparency** — every algorithmic output shows a "Why?" affordance with plain-language reasoning.
- **5-role permission model** — Admin / Head Coach / Staff / Player / Viewer (per LineupIQ — adopt as canonical).
- **3-pillar data model** — Organization → Season → Team. Season is a first-class object.
- **Privacy by default** — no real player names/emails/IDs leak to logs, analytics, or AI prompts without explicit consent.

---

## Phase 0 — Foundation

### 0.1 Repo & tooling
- [ ] Monorepo with `apps/web` (Next.js App Router), `apps/api` (or Next.js route handlers), `packages/ui`, `packages/db`, `packages/rules`, `packages/algorithms`.
- [ ] TypeScript strict mode, ESLint, Prettier, Vitest, Playwright.
- [ ] CI on PR: typecheck + lint + unit + e2e smoke.
- [ ] Sentry, PostHog (self-hosted or EU region), Stripe SDK wired but unused.

### 0.2 Data model (3-pillar, season-first)
- [ ] Tables: `organizations`, `seasons`, `teams`, `team_members` (with 5-role enum), `players`, `parents`, `games`, `lineups`, `lineup_slots`, `at_bats`, `pitches`, `practices`, `drills`, `practice_blocks`, `rule_packages`, `team_rule_overrides`.
- [ ] Audit log table (`audit_events`) — every write tracked with actor + timestamp + diff.
- [ ] Row-level security: org → season → team isolation enforced at DB layer (Postgres RLS or equivalent).
- [ ] Slug + base36 ID URL grammar follows a conventional `/teams/{slug}/{section}/{id}` pattern.

### 0.3 Auth & roles
- [ ] Email magic link + Google OAuth (no SMS at MVP).
- [ ] 5-role enforcement: Admin / Head Coach / Staff / Player / Viewer.
- [ ] Invite flow with role pre-selection (mirrors the game-day competitor's invite modal).
- [ ] Parent accounts are `Viewer` role scoped to their child(ren) only.
- [ ] **Public links with no login** for: snack/duty signup, schedule view, parent RSVP, score-share. (A competing lineup app's pattern.)

### 0.4 Design system
- [ ] Token set: dark-first palette, semantic colors for status/roles/badges.
- [ ] Component library: Sheet, Chip, ChipStrip, Drawer, BottomBar, Card, Table-as-Cards (mobile), Badge, RolePill, StatusPill, ToastQueue, OfflineBanner, SyncIndicator, WhyButton.
- [ ] Iconography: Lucide or custom; size variants 16/20/24/32.
- [ ] Voice/microcopy guide imported from §8 of UI reference.

### 0.5 Infra
- [ ] Cloudflare or Vercel edge hosting; Postgres (Neon or Supabase); R2/S3 for media.
- [ ] Service worker for offline cache of: rulebook JSON, current team roster, current/next game lineup, last 5 games' history.
- [ ] CSP: `script-src 'self' 'strict-dynamic'` (match the game-day competitor's CSP hardening).

---

## Phase 1 — Core Wedge (MVP)

The minimum lovable product. Ship nothing else until these are all done.

### 1.1 Roster management
- [ ] Add/edit/archive player with: name, jersey #, DOB → age auto-calc, positions (favorite/OK/disliked), skill level (optional, P/C only), parent contacts.
- [ ] **AI Lineup Card Scanning** — photo → roster extraction. (Adopt the OCR-scan approach.) Acceptance: 90%+ field accuracy on a printed lineup card photo.
- [ ] **CSV import with column auto-detection** for GameChanger and common team-management/league exports. (Mirror a guided import wizard.)
- [ ] Roster Stats tab: per-player season totals (games, PA, AVG, OBP, position innings split by IF/OF/bench).

### 1.2 Rulebook Library (the differentiator)
- [ ] `RulePackage` TypeScript schema implemented per §10.1 of UI reference.
- [ ] **Seed 9 rulebooks for 2026**: Little League, Perfect Game, Triple Crown / TTB, USSSA, NFHS, AAU, Babe Ruth / Cal Ripken, PONY, NCAA. Each with all age divisions.
- [ ] Team-level rule override UI: pick base package + overlay org/league/team deltas (3-tier inheritance, mirrors the game-day competitor).
- [ ] Diff viewer: pick body A + body B + age → side-by-side rules diff.
- [ ] **Cross-sanctioning pitch-count ledger**: every pitch logged once; eligibility re-computed against every active rule package the player is exposed to that week.
- [ ] Change Rule Set wizard with confirmation modal (mirrors the game-day competitor).

### 1.3 Lineup generator — **Game Script**
- [ ] **Algorithm: Game Script** = CSP solver (backtracking + forward checking) + multi-factor fairness scoring + summary notes output. (Adapt a competing lineup app's solver approach.)
- [ ] Hard constraints: 1 player/position/inning; no >2 consecutive innings same position; pitcher/catcher rest rules from active rule package.
- [ ] Soft constraints: position preferences, skill gates (P/C), bench equalization, development goals from Position Trust Matrix (Phase 3).
- [ ] **Top/Middle/Bottom band fairness** for batting order. Color-coded with gradients showing last→this game movement.
- [ ] **Summary Notes** output: plain-language explanation of every decision ("Locked Hudson at SS, rotated Mason out per his disliked-3B preference, gave Liam an OF inning to balance his season").
- [ ] **Why?** button on every slot → opens drawer showing constraint trace.
- [ ] Lock-and-shuffle: lock any slot → regenerate respects locks.
- [ ] PDF + CSV export. Print-friendly lineup card with all innings visible.

### 1.4 In-Game Quick Reference chip strip
- [ ] Persistent bottom strip during game mode showing active rule chips: pitch cap, current count, rest required, time limit, run rule status, courtesy runner eligibility.
- [ ] Each chip tappable → opens rule citation drawer with exact rulebook section.
- [ ] **Pre-pitch intelligence chip** (scouting-tool-inspired): if opponent data present, show count-specific tendency for current batter.

### 1.5 Free funnel tool
- [ ] **Cross-Sanctioning Pitch-Count Calculator** — public, no login. Input pitches by date → eligibility under LL/PG/TTB/USSSA/NFHS/AAU/PONY simultaneously. Funnels to signup with "Save this for your team."
- [ ] SEO landing page optimized for "youth baseball pitch count calculator".

### 1.6 Billing
- [ ] Stripe Checkout with 4 tiers: Free / Coach $39 / Multi-Team $79 / Club $299. (League $799 deferred to Phase 5.)
- [ ] Whole-team billing model: one paid coach unlocks for all team members. (Mirror the game-day competitor.)
- [ ] 14-day trial, no CC required.

### 1.7 MVP exit criteria
- [ ] 10 founding coaches recruited (manually reviewed, like a competing app's founding-leagues program).
- [ ] Each runs ≥3 games on the platform.
- [ ] <5% churn after 30 days.
- [ ] NPS ≥40.

---

## Phase 2 — Game Day

### 2.1 Game Day mode (offline-first)
- [ ] Installable PWA prompt on team detail page.
- [ ] Service worker pre-caches game roster, lineup, active rulebook, last 5 games' history.
- [ ] Game runs fully offline; writes queued and synced when network returns.
- [ ] Sync indicator visible at all times (Synced / Pending N writes / Error).

### 2.2 Pitch tracking — **tap-drag-release**
- [ ] Pixel-accurate location entry via tap-drag-release gesture. (Adopt the scouting-tool gesture.)
- [ ] Auto-tracks count, outs, runners, score.
- [ ] One-tap pitch result: ball / strike-called / strike-swinging / foul / in-play.
- [ ] In-play: tap-drag-release on field diagram for hit location.
- [ ] **Undo** always one tap away. (Coaching-tools-competitor parity.)

### 2.3 **Workload Passport** (cross-body fatigue ledger)
- [ ] Every pitch logged once → recomputes pitcher eligibility under every rule package they're exposed to (LL Sun game + PG Sat tournament = both checked).
- [ ] Catcher innings tracked the same way (most rule packages limit C→P same day).
- [ ] Quick Reference chip turns yellow at 80% of any cap, red at 100%.
- [ ] Pre-game eligibility report: "These 4 pitchers are clear; Caleb is at 35/40 LL but 0/55 PG."

### 2.4 Parent share view
- [ ] Public game link, no login. Shows: current score, batting order, current pitcher, last play, win probability optional.
- [ ] Auto-refresh every 30s; works on parent's phone in the bleachers.
- [ ] Opt-out toggle per game (private games stay private).

### 2.5 Live scorekeeping
- [ ] Full ball/strike/foul tracking with auto-walk/auto-K. (Coaching-tools-competitor parity.)
- [ ] All hit types (1B/2B/3B/HR), all out types (ground/fly/line/pop/K/sac bunt/sac fly/DP).
- [ ] Live stats panel: AVG, OBP, H, RBI, BB, K.
- [ ] Per-game summary with leaders after game end.

---

## Phase 3 — Development Engine

### 3.1 **Position Trust Matrix**
- [ ] Per-player × per-position eligibility model learned from: coach-set preferences (favorite/OK/disliked), historical performance (errors, runs allowed, completion of routine plays), age-appropriate position progression curves.
- [ ] Heatmap visualization per player.
- [ ] Used as input to Game Script generator (Phase 1.3) — closes the loop.

### 3.2 **Development Ledger**
- [ ] Per-player, per-skill running totals: reps at each position, pitches thrown by type, at-bats by situation.
- [ ] Coach-set development goals: "Hudson — 20 SS innings this month; Mason — 5 LH at-bats."
- [ ] Goal progress bars visible on player detail page.
- [ ] Goals feed into Game Script soft constraints (player below target gets boosted weight for that position/situation).

### 3.3 Season views (per-player + per-team)
- [ ] Per-player season page: Top/Mid/Bot band counts, position innings split (IF/OF/bench), games played, total innings, goal progress.
- [ ] Per-team season page: fairness heatmap (every player × every position), goals achieved, workload distribution.
- [ ] Year-over-year comparison enabled by Season being a first-class object.

### 3.4 Snack/Duty public signup
- [ ] Per-team public signup page, no login. Slots auto-rotated by Game Script logic.
- [ ] Allergy warnings, custom instructions per slot, reminder emails 48h before. (Competing lineup-app parity.)
- [ ] Parents sign up on behalf of specific players via roster dropdown.
- [ ] Generalize to "Team Duties": Snack, Field Setup, Scorebook, Pitch Counter, Dugout Parent.

---

## Phase 4 — Practice Compiler

### 4.1 Drill library
- [ ] Seed 200+ drills tagged by: age group, sport, focus area (11-axis taxonomy from the coaching-tools competitor), equipment, duration, station-capable (Y/N), max players.
- [ ] CRUD for custom team drills.
- [ ] Public preview of library (free tool) — full library is paid.

### 4.2 Practice generator inputs
- [ ] Date, start time, duration (45/60/75/90/custom min).
- [ ] **Number of coaches** (drives concurrent station count).
- [ ] **Field resources** with quantities: Full Field / Batting Cage / Bullpen / Infield Only / Open Space.
- [ ] **Focus areas** multi-select from 11-axis taxonomy.
- [ ] Optional roster (assigns specific players to specific minutes).

### 4.3 Practice generator output
- [ ] Time-blocked plan with stations, drill selections, equipment lists.
- [ ] PDF export with cover page + roster + station rotations.
- [ ] Reusable templates ("Tuesday Practice Standard").

### 4.4 **Learning loop** (the differentiator)
- [ ] Per-player development goals (from Phase 3.2) are inputs to drill selection — drills tagged to skills get prioritized for players with open goals at that skill.
- [ ] In-practice outcome capture: one-tap "got it / needs work / not attempted" per player per drill (coach-side, on phone).
- [ ] Outcomes feed back into Development Ledger.
- [ ] Next practice's generator uses updated goal state — practice plans evolve over a season.

---

## Phase 5 — League Tier

### 5.1 League admin dashboard
- [ ] Org → Season → Division → Team hierarchy navigable in one tree view.
- [ ] Cross-team views: pitch-count compliance audit, fairness audit, roster completeness.
- [ ] **Co-admins do NOT need paid subscriptions** — one league seat covers all coordinators. (Mirror a competing app's model.)

### 5.2 Bulk operations
- [ ] CSV bulk import: rosters, divisions, schedules in one upload with column auto-detection.
- [ ] Bulk team creation from CSV.
- [ ] Bulk rule package assignment per division.

### 5.3 Tournament Mode (for sanctioning bodies)
- [ ] Bracket generator: single elim, double elim, pool play. (Coaching-tools-competitor parity.)
- [ ] **Cross-sanctioning workload ledger** at tournament level: every team's pitchers/catchers tracked against tournament-day caps + carry-over from league play.
- [ ] Director dashboard: real-time eligibility status for every roster.

### 5.4 Founding Leagues GTM
- [ ] Hand-pick 5–10 leagues at launch for free season in exchange for written feedback within 30 days. (Mirror a competing app's launch model.)
- [ ] Public application form with manual review.

### 5.5 Pricing tier ship
- [ ] $799 League tier with: unlimited teams + divisions, custom branding on print artifacts, SSO, dedicated support contact.

---

## Phase 6 — Suite Expansion

### 6.1 Scouting Companion (scouting-tool class)
- [ ] **AI Scouting Reports** from historical game data: threat levels, tendencies, strategic recommendations per opponent batter.
- [ ] **5×5 zone heatmaps** for pitcher command + hitter tendencies.
- [ ] **Spray charts** per opponent batter.
- [ ] **Pocket Cards** — printable 3×5" defensive positioning cards per batter, handed to fielders pre-AB.
- [ ] **Pre-Pitch Intelligence chip** integrated into Quick Reference strip (Phase 1.4).

### 6.2 Workload IQ — catcher + pitcher analytics
- [ ] Phone-video catcher framing analysis: Smoothness, Efficiency, Directional Gain, Stability.
- [ ] Pop-time analysis: Catch / Release / Arrival → Exchange Time + Ball Flight Time. Sub-2.00s = Elite.
- [ ] AI strike-zone detection from single frame.
- [ ] Annotated video export for recruiters.
- [ ] Pitcher mechanics fatigue indicator from in-game pitch sequence (optional IMU sensor support deferred).

### 6.3 Tournament Director suite
- [ ] White-label option for tournament organizers.
- [ ] Bracket + workload + schedule + scorekeeping in one director console.
- [ ] Public spectator view per tournament.

### 6.4 SEO content moat
- [ ] **9 baseball calculators** (pitch count, ERA, OPS, WHIP, batting avg, on-base, slugging, fielding pct, magic number).
- [ ] **70+ term glossary**.
- [ ] **Free PDF lineup card templates** per sanctioning body.
- [ ] **Coaching handbook** as long-form content.

---

## Algorithm Naming Glossary (use everywhere — branding moat)

| Brand name | What it does | Phase |
|---|---|---|
| **Game Script** | Lineup + position generator (CSP solver + multi-factor fairness scoring) | 1.3 |
| **Workload Passport** | Cross-sanctioning pitcher/catcher fatigue ledger | 2.3 |
| **Position Trust Matrix** | Per-player × per-position learned eligibility model | 3.1 |
| **Development Ledger** | Per-player rep + goal accounting across season | 3.2 |
| **Practice Compiler** | Practice plan generator with learning loop | Phase 4 |
| **Scouting Companion** | Opponent intelligence suite | 6.1 |
| **Workload IQ** | Phone-video catcher/pitcher analytics | 6.2 |

---

## Pricing Ladder (final, from §12.10)

| Tier | $/yr | Cap | Phase available |
|---|---:|---|---|
| Free | $0 | 1 team / 12 players / current season | Phase 1 |
| Coach | $39 | 2 teams / unlimited players / history | Phase 1 |
| Multi-Team | $79 | 5 teams / cloning / staff collab | Phase 2 |
| Club | $299 | 25 teams / 5 divisions / co-admins free | Phase 5 |
| League | $799 | Unlimited teams + divisions | Phase 5 |
| Enterprise | Custom | — | Phase 6 |

---

## Risk Register

| Risk | Mitigation | Owner |
|---|---|---|
| Rulebook drift (sanctioning bodies update rules annually) | Versioned rule packages with `validFrom`/`validUntil`; subscribe to body announcements; annual rulebook refresh sprint each January | Rules eng |
| AI Lineup Card OCR accuracy | Manual fallback + correction UI; collect corrections as training data | Roster eng |
| Offline sync conflicts | Last-write-wins for additive events (pitches, at-bats); coach-prompted merge for structural edits (lineup changes) | Game Day eng |
| Privacy (kids' data) | No real names in analytics/logs/AI prompts without consent; per-org data isolation via RLS; parental consent flow at signup | All |
| Stripe integration complexity at league tier | Defer League tier to Phase 5; use Stripe Billing native invoicing | Billing |
| Native iOS pressure (a competing lineup app has a native app, we don't) | Lead with PWA install rate metrics; consider Capacitor wrapper at Phase 5 if signups stall | Product |

---

## Out of Scope (explicit non-goals)

- Native iOS/Android apps before Phase 5.
- Video streaming/highlight reels (a scorekeeping app's lane — don't compete).
- Payment processing for league registration fees (team-management/registration platforms' lane).
- Team messaging/chat (team-management apps' lane — integrate, don't replicate).
- Replacing scorebooks for non-coach scorekeepers (parent-facing scorekeeping is a scorekeeping app's lane).
- Mechanics breakdown video coaching (Krossover/Hudl lane).

---

## Next 5 Actions (do these first)

1. **Stand up the monorepo** with Phase 0.1 tooling. Skeleton boots, CI green.
2. **Build the `RulePackage` schema** + seed `LL-2026.json` for the 10U division as proof. Validate against rulebook PDF.
3. **Wireframe the Quick Reference chip strip** (Figma or coded prototype) and dogfood with one volunteer coach on paper before implementation.
4. **Recruit 10 founding coaches** from local leagues with a one-page pitch and the wireframe. Lock them in writing for Phase 1 testing.
5. **Spike the cross-sanctioning pitch-count ledger math** — build a CLI tool that takes a pitch log + 2 rule packages and outputs eligibility windows. Prove the math before any UI.
