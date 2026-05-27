# Dugout Edge — Authenticated Crawl Notes

> Captured 2026-05-26 via browser tooling, logged into a fresh trial account ("DBacks", Spring 2026, Competitive, Minor League 9-10).
> Trial status: 7 days remaining, ends June 2, 2026, auto-enrolls into **$8/month** plan unless cancelled.
> Complements [dugoutedge-crawl.md](dugoutedge-crawl.md) (public marketing) and [competitor-crawl-summary.md](competitor-crawl-summary.md).

## 1. Pricing & Trial Mechanics

- Single paid tier: **$8 / month** (auto-renew). No annual price seen in app.
- Trial: 7 days, gated to a single team (free or paid), upgrades to Premium during trial.
- Persistent in-app trial banner: "You have N days left in your free trial / Manage Plan" on every authenticated page.
- Subscription managed via Stripe-style "Manage Subscription" button on [/account/subscription](https://www.dugoutedge.com/account/subscription).
- Refund policy linked from subscription page (`/legal#refund-policy`).
- Account settings tabs: Personal Info / Subscription / Change Password / Contact Support / Delete Account.

## 2. Information Architecture (Authenticated)

Side nav, identical on every premium page:

| Group | Items |
|---|---|
| Your Team | My Teams, My Schedule, Drill Library, Practice Templates |
| Tools & Resources | All Tools, Calculators, Coaching Handbook, Baseball Dictionary |
| Account | Profile, Subscription, Change Password, Contact Support |
| Support | FAQs, Feature Requests, Privacy Policy, Terms |

Top nav: logo → `/teams`, Notifications bell, profile menu.

Premium URL prefix is `/premium/*`. Public counterparts live at the root (`/drills`, `/coaching-handbook`, etc.) and are SEO-only.

## 3. Team Workspace

### `/teams`
- "Team Management" — list of team cards, each with: name, season label (e.g. "Spring 2026"), level (Recreational / Competitive), age group (e.g. "Minor League (9-10)"), Current-team checkbox.
- Card actions: Manage Team, View Schedule, **Create Game** (→ lineup generator pre-filled with team), **Create Practice** (→ practice planner pre-filled).
- `+ New Team` button → `/teams/create`.

### `/teams/{uuid}`
- Header: team name, Share button, Edit Team Settings (`/teams/{id}/edit?tab=roster`).
- Stat strip: Season, Level, Age Group, Sport, Current-team toggle.
- Sub-tabs: **Roster**, **League Rules**, **Schedule**.
- "Team Stats" panel (empty if no players logged) — implies stats are aggregated from completed games.
- "Danger Zone" with Delete Team.

### `/schedule`
- Filters: Team selector (Current Teams / All Teams / individual team), When (All / Upcoming / Past), Type (All / Games / Practices).
- View toggle: **List / Calendar**.
- Empty-state CTA → New Game / New Practice.
- Team-scoped URL: `/schedule?team={id}`.

## 4. Drill Library — `/premium/drills`

**248 drills total.** Top-level filters: All Sports / Baseball / Softball, plus Browse / Search toggle.

Category breakdown (collapsible accordions):

| Category | Count |
|---|---|
| Custom Drills (user-created) | 0 |
| Hitting Drills | 53 |
| Throwing | 35 |
| Infield Drills | 67 |
| Outfield Drills | 25 |
| Pitching Drills | 18 |
| Catching Drills | 12 |
| Baserunning Drills | 16 |
| Team Defense | 20 |
| Warmup | 19 |
| Strength & Conditioning | 27 |
| Mental Skills | 6 |
| Fun & Games | 38 |

> Category totals sum to 336; drills are multi-tagged (one drill can sit in several categories), so the "248 unique" count is real.

Each card shows: image, name, 1-line description, difficulty pill (beginner / intermediate / advanced), duration in minutes, favorite (heart) button, "View details" link.

### Drill detail page — `/premium/drills/{slug}`

URL pattern uses hyphenated slug (e.g. `/premium/drills/1-2-3-drill`).

Schema observed on `1-2-3-drill`:

- **H1**: `Hitting Drill: 1-2-3 Drill (Baseball & Softball)` — sport coverage stated inline.
- Hero **video** (thumbnail + Play button) — every drill has a demo video.
- **How to Run This Drill** — numbered step list (setup → execution → rotation cadence).
- **Coaching Points** — bullet list of cues / teaching points.
- **At a Glance** sidebar:
  - Categories (multi)
  - Focus Areas (e.g. "Mechanics")
  - Age Groups — multi-select chips: `7-8, 9-10, 11-12, 13-14, 15-16, 17-18, 18+` (same age band system as the rest of the site).
  - Players (e.g. "1-5 players")
  - Difficulty
- **Equipment Needed** — product cards with **Amazon affiliate links** (`tag=dugout-edge-20`):
  - Bownet L-Screen (`B01K8K9070`)
  - SKLZ Travel Tee Elite (`B09GMXKV1B`)
  - Rawlings Practice Balls bag of 12 (`B0BH2G2C7W`)
  - Each labelled by role ("Net or Screen", "Tee", "Baseballs or softballs"). Likely a meaningful secondary revenue stream.
- **Quick Actions**: Add to Favorites, Browse All Drills.
- **Related Drills** carousel (6 cards).
- **Coaching Resources** cross-promo block linking handbook / dictionary / tools.

**Custom Drills**: gated feature inside the same library. "Create your own drills with custom instructions, videos, and categories." Users can attach video URLs and categorise — so the library acts both as content and as a CMS for the coach.

## 5. Practice Plans — `/premium/practice-plans`

Page title: "Practice Plan Library". Layout: collapsible sections per age band.

### Top-level sections

1. **My Plans** — empty for new accounts, holds saved/customised practices.
2. **Blank Templates** — printable starting points:
   - Simple Blank Practice Plan Template
   - Detailed Blank Practice Plan Template
   - Station-Based Practice Plan Template
   - Compact Practice Plan Template
   - Drill-Focused Practice Plan Template
   - Printable Youth Baseball & Softball [template]
3. Age-band libraries (each with two sub-buckets, **Downloadable** PDFs and **Customizable** in-app plans):
   - **Tee Ball (Ages 4-6)** — 4 customisable: Station Rotations, Skills & Games, Team Building, Team Stations.
   - **Ages 7-8** (Coach Pitch) — 2 PDF + 4 customisable.
   - **Ages 9-10** — 2 PDF + 6 customisable.
   - **Ages 11-12** — 2 PDF + 6 customisable.
   - **Ages 13-14** — 2 PDF + 6 customisable.
   - **Ages 15-16** — customisable set.
   - **Ages 17-18**.
   - **Ages 18+**.

The same handful of plan archetypes recur per age band: *Station Rotations, Team Stations, Advanced Team Stations, Skills Station Rotations, Skills Development, Team Building, Advanced Fun Stations*. So the library = ~7 archetypes × 8 age bands ≈ 50+ plans, mostly the same skeleton retemplated.

### Practice Planner builder — `/premium/practice-planner?team={id}`

Three-step wizard: **Practice Details → Edit Practice → Export**.

**Step 1 — Practice Details:**

- Practice Plan Title (free text, placeholder "e.g., Pre-Season Skills Development")
- Practice Date (required)
- Start Time (default 17:00)
- **Duration** dropdown — 30 → 240 minutes in 15-minute increments. Shows live "Ends at HH:MM" hint.
- **Coaches** dropdown (1-10).
- **Field Resources** counters (− / +) — define what the venue offers:
  - Full Field (default 1)
  - Batting Cage
  - Bullpen Area
  - Infield Only
  - Open Space ("Gyms, turf, grass fields")
- **Practice Focus Areas** — multi-select chips with icons. All 12 categories surface here:
  Hitting, Throwing, Infield, Outfield, Pitching, Catching, Baserunning, Team Defense, Warmup, **Strength & Conditioning**, **Mental Skills & Game IQ**, **Fun, Games & Competition**.
- **Starting point** toggles:
  - "Start from a Template" (uses one of the age-band plans as scaffolding)
  - "Copy from Previous Practice" (clone saved plan)
  - Or click Continue to build from scratch.

**Hard gate:** "No Players on Your Roster — You need to add players to {team} before you can use the practice planner." Builder requires roster before stations can be assigned (suggests drills get assigned to players/stations explicitly).

## 6. Calculators & Tools — `/premium/calculators` & `/premium/tools`

### `/premium/tools` — hub
- **Lineup Generator** and **Practice Planner** as primary CTAs (top-of-page hero tiles).
- Resources block: Drill Library, Practice Templates, Coaching Handbook, Dictionary, Pitch Count Tracker, **Dugout Clicker**.
- Printables block: Coaching Printables, Lineup Card Templates, Scorecards, Scorebook Generator.
- "Calculators (11)" collapsible.

### `/premium/calculators`
- Sport toggle: Baseball / Softball.
- Tabs: **Dugout Tools / Stats / Utilities / Equipment**.
- Stat calculators visible: **ERA, OPS, Batting Avg, OBP, Slugging, Exit Velocity** (≥6 of the 11 calculators).
- Inline form (no separate page) — ERA form fields: Earned Runs Allowed, Innings Pitched, Game Length (default 9 innings), `Calculate ERA` button.
- Dugout Tools tab houses "Pitch Count Tracker" and "Dugout Clicker" (a generic counter — for outs, pitches, etc.) addressable via `?calc=pitch-count` or `?calc=dugout-clicker`.

## 7. Coaching Handbook — `/premium/coaching-handbook`

Single-page index of ~90 long-form articles, grouped into 13 sections:

1. **Position Guides** (9) — one per defensive position (P/C/1B/2B/3B/SS/LF/CF/RF).
2. **Special Plays** (5) — Bunt Defense, Cutoffs & Relays, First and Third, Pickoffs, Rundowns.
3. **Signs & Communication** (4) — Catcher Signs, Coach Signals, Pickoff Signs, Signs and Signals.
4. **Mental Game** (5) — Building Confidence, Focus, Game Day Mindset, Handling Failure, Pre-Pitch Routine.
5. **Game Situations** (8) — defensive guides for every base state (Nobody on, R1, R2, R3, R1+R2, R1+R3, R2+R3, Bases Loaded).
6. **Baserunning** (9) — guides per base + bases-loaded/multi-runner + lead/trail runner + stealing technique.
7. **Situational Hitting** (10) — first-pitch hitting, hitting by count, off-speed, RISP, moving runners, oppo field, reading pitchers, sac bunt, two-strike, bunting for a hit.
8. **Coaching Strategy** (15) — building culture, coaching 3B, dealing with errors, defensive positioning, game management, inning-by-inning, **lineup construction**, **pitch counts**, pitching strategy, pre-game prep, scouting, signs, team communication, **when to bunt**, **when to steal**.
9. **Practice Guides** (4) — 6U T-Ball, 8U Coach Pitch, 10U, 12U Practice Plan Guides.
10. **Mechanics**.
11. **Player Development**.
12. **Conditioning & Warm-ups**.
13. **Team Culture**.

This is essentially a textbook-as-feature, deeply cross-linked into drills.

## 8. Dictionary — `/premium/dictionary`

Single alphabetical page, **~161 baseball/softball terms** (1 H1 + ~160 H2 term entries). Each term has a definition body (terms include analytics-era vocabulary: Attack Angle, Bat Path, Blast Rate, Chase Rate, Barrel Rate, ABS Challenge, alongside basics like Balk, Bunt, Cheese). Free public version at `/baseball-terms-dictionary`.

## 9. Feature Requests — `/feature-requests`

Public-ish roadmap board. Anyone can submit + upvote.

### Open (6 items, 12 total upvotes — small but signal-rich)

| Votes | Title | Author | Theme |
|---|---|---|---|
| 7 | "Thank You!!!" (testimonial about saving hours/week on coach-pitch lineups + tracking innings played) | Anonymous Coach | testimonial |
| 4 | **Lock Certain Positions — Shuffle the Rest** (lock P+C pair, lock for multiple innings) | Coach Phillip | lineup |
| 1 | **No two innings in a row in the outfield** (rotation warning) | Coach Ryan | lineup |
| 0 | **Minimum Playing Time Requirements for League Rules** (e.g. each player must play ≥2 def innings incl. infield before 4th inning; no consecutive sits) | Coach DJ | lineup / league rules |
| 0 | **Pair pitcher sit-down inning before pitching** (bench a kid the inning before they pitch so they can warm up) | Coach Josh | lineup |
| 0 | **Improve Lineup Export Preview** (PDF should match on-screen preview; allow team logo on lineup card) | Anonymous Coach | export |

**Every open request is lineup-related.** The Practice Planner and Drill Library — which they market heavily — generate zero feature pressure here. Strong signal that **lineup is the load-bearing job-to-be-done** for their paying users and the rest is content padding.

### Closed / Completed (16 visible items)

Same lineup-centric pattern in recently shipped work:

- Mobile Use (Coach Jordan) — implies lineup was rebuilt for mobile.
- **Build a Practice Plan Generator** (Coach User) — practice planner is a *recent* addition; explains why it feels lighter than the lineup tool.
- Downloadable Blank Lineup Card Templates (Coach Miguel).
- **Current Team Designation** — Current-team checkbox.
- **Add a Feature Request Section** — meta.
- **Sync Practice Planner (Add Roster)** (Coach Shawn) — explains the gate on the planner.
- **Shuffle Lineup** (Coach Scott).
- **Lineup table adds batting order number and player** (Coach Ryan).
- **Add skill level at each position** (Anonymous) — per-player position ratings.
- **Scheduled Game Line Ups** (Coach Josh) — lineups bound to scheduled games.
- **Better Gender Balance Controls for Co-Ed Leagues** (Anonymous).
- **View and Copy Previous Lineups** (Coach Samantha).
- **Max # Innings Pitched and Min # of Innings…** (Coach Beau) — Pitch Smart integration.
- **Field display of positions for each inning** (Coach Shawn) — field-diagram view.
- **Utility 1 position** (Coach Ryan) — utility/extra-hitter slot.
- **Weekly Coaching Tips Email Newsletter** (Coach David).

### Implications for our positioning

1. **Lineup tool is their moat.** Practice Planner is new and under-pressured. We compete more easily on the *practice / development* axis than on lineup parity.
2. Concrete unmet asks that map to slices we already have or can ship cheaply:
   - **League-rule compliance checker** (DJ's "min playing time, no consecutive sits, infield requirement"). We have league-rules schema work in `packages/lineup`. A "compliance report" overlay would be a hard win.
   - **Lock pairs of positions / multi-inning locks** (Phillip's #2 ask).
   - **No-2-consecutive-outfield rule** (Ryan).
   - **Bench-pitcher-prior-inning** warmup rule (Josh) — pairs nicely with our pitch-count / Pitch Smart engine.
3. They have **no AI / no LLM features** in any roadmap item — green field for our AI-coached practice plans and personalised drill recommendations.
4. They have **no parent/family-facing surface** at all (no parent app, no player progress sharing) — matches our addendum. Their "Share" button on the team page is the only outward channel.
5. Their **content depth is the real product**: 248 drills (with video + Amazon affiliate equipment), 161-term dictionary, 13-section handbook with ~90 articles. To compete on perceived depth we either out-curate (quality over quantity) or out-personalise (drills suggested by player diagnosis, not browsed).
6. **Monetisation hint**: every drill page funnels equipment buys through Amazon Associates (`tag=dugout-edge-20`). Worth modelling as a possible secondary revenue line; also a UX cue (equipment is part of the drill artefact, not a separate page).

## 10. Notifications & Misc

- `/notifications` page exists with bell icon in top nav; for a new account it short-circuits to `/teams` (no notifications to render). Implies the platform supports system + activity notifications (likely tied to schedule changes, completed practices, comments on feature requests).
- "Share" button on team detail page — likely a public read-only team URL.
- Roster gating is consistent: practice planner blocked, team stats blocked, until players are added.

## 11. Concrete Pattern Library We Should Mirror or Beat

| Dugout Edge pattern | Our equivalent / opportunity |
|---|---|
| Persistent trial banner with "Manage Plan" CTA | We already have trial scaffolding — mirror the banner pattern. |
| Sidebar nav grouped by Team / Tools / Account / Support | Apply to our coach console. |
| Drill detail = video + steps + coaching points + age bands + equipment + related | Adopt as our canonical drill template (already aligned with `corpus/drill-template.md`). Replace Amazon affiliate with optional equipment list. |
| Practice planner step-1 captures **field resources** as counts (Full Field, Cage, Bullpen, Infield, Open Space) before drill selection | High-leverage idea — drives whether the AI plans single-station vs multi-station drills. Add to our practice compiler input schema. |
| Focus Areas as multi-select chip set (12 categories with icons) | Use as the focus-area taxonomy for our compiler + diagnosis engine. |
| Customisable plans = templates that adapt to user duration / coach count / focus / venue | Our AI compiler should out-perform this by *generating* rather than just substituting drills. |
| Public feature-requests board with upvotes | Worth shipping early — clear loop for differentiation signals (and the open list above is essentially our first backlog from real coaches). |
| Single `$8/mo` SKU with 7-day trial, auto-enroll | Defensible reference price for our coach tier; we already plan to bundle parent-facing features above this line. |
