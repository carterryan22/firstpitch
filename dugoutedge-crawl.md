# Dugout Edge — Competitor Crawl

Source target: `https://www.dugoutedge.com/premium/practice-plans` (sign-in gated).
Crawled equivalents (public): `/practice-plans`, `/practice-plans/baseball`, `/practice-planner`, `/drills`, `/pricing`.
Date: 2026-05-26.

---

## 1. Premium gate behavior

`/premium/practice-plans` redirects unauthenticated visitors to the **Sign In** screen (email/password + Google OAuth). No public preview of premium-only plan content. The premium plan content is the same library shown on `/practice-plans/baseball` and `/practice-plans/softball`, but premium unlocks:

- Save / reuse plans against a team roster
- Custom team drills
- Roster-aware player assignment per minute
- Player attendance integration
- Print-ready PDF + CSV exports beyond the free download set

---

## 2. Pricing

- **Dugout Edge Pro — $8/mo monthly** (yearly plan advertised as **"Save 38%"** vs monthly).
- 7-day free trial, cancel anytime.
- Stripe-processed; Visa/MC/Amex/Discover.
- League/group pricing exists at `/league-pricing`.
- No refunds post-trial (case-by-case).

Premium feature matrix (vs free public tools):

| Feature | Free | Premium |
|---|---|---|
| Lineup per game + season history | — | ✓ |
| Unlimited teams | — | ✓ |
| Full field view (all innings) | — | ✓ |
| Lineup algorithm | Basic | Advanced (pin + reshuffle) |
| PDF/CSV exports | Limited | Full |
| Reusable practice playbook | — | ✓ |
| Drill library (240+ drills, 25+ templates) | Browse only | Add to plans |
| Custom team drills | — | ✓ |
| Sideline printables + coaching handbook | — | ✓ |
| Priority email support | — | ✓ |

Note: the pricing page claims "240+ drills, 25+ templates" in one place and "100+ drills" in the FAQ — inconsistent self-reporting.

---

## 3. Practice Plan Library — structure

The library is organized as **age bands × format** with three classes per band:

- **Downloadable** — static PDF, branded thumbnail, no customization.
- **Customizable** — opens in the drag-and-drop Practice Planner with a `customizeSlug=v2-{ageBand}-{duration}-{coachCount}coach-baseball-{variant}` URL parameter.
- **Blank templates** (6 layouts): Simple, Detailed, Station-Based, Compact, Drill-Focused, Generic Printable.

### Age bands covered
4-6 (Tee Ball), 7-8 (Coach Pitch), 9-10, 11-12, 13-14, 15-16, 17-18, 18+.

### Plan-count per band (baseball)
- Tee Ball: 4 customizable (all 120 min, 1- and 2-coach variants).
- 7-8: 2 downloadable (90/120 min) + 4 customizable.
- 9-10: 2 downloadable + 6 customizable (incl. a 90-min "Team Defense Focus").
- 11-12: 2 downloadable + 6 customizable.
- 13-14: 2 downloadable + 6 customizable.
- 15-16: 6 customizable.
- 17-18: 6 customizable.
- 18+: 6 customizable.

Hero metrics on the index: **"12+ Templates · 50+ Practice Plans · 100% Free"**.

### Slug taxonomy (customizable plans)
Pattern: `v2-{age}-{duration}min-{N}coach-baseball-{a|b|defense}`

Variant naming scheme that repeats across age bands:
- 1-coach-a → "Team Building"
- 1-coach-b → "Skills Development"
- 2-coach-a → "Team Station Rotations"
- 2-coach-b → "Skills Station Rotations"
- 3-coach-a → "Advanced Team Stations"
- 3-coach-b → "Advanced Fun Stations"
- 9-10 only: `1coach-baseball-defense` → "Team Defense Focus" (90 min)

So the library is **algorithmically generated** from a 6-variant × 8-age-band matrix (mostly 120 min, with a single 90-min specialty). This is a useful signal about how their content team scaled — and how thin the differentiation between bands likely is.

---

## 4. Plan internal structure (visible block previews)

Each card surfaces the first 3-4 timeline blocks with timestamps, e.g.:

```
5:00  WARM-UP AND THROWING       2 drills
5:15  INFIELD WORK               3 drills
5:15  OUTFIELD WORK (parallel)   3 drills
5:40  STATION A: TEE WORK        3 drills
+3-4 more blocks...              Customizable
```

Common block taxonomy across plans:
- WARM-UP AND THROWING (Dynamic Warm-up for 13+)
- INFIELD WORK / OUTFIELD WORK (parallel, same start time → multi-coach split)
- STATION A/B/C: TEE WORK, hitting rotations
- FIELDING / HITTING / BASERUNNING (single-coach timeline format)
- TEAM DEFENSE
- 21 OUTS (drill name)
- FUN GAME: KNOCKOUT HITTING
- Closing fun-game block

Two layout formats are explicitly offered: **station-based** (parallel tracks) vs **timeline** (sequential).

---

## 5. Practice Planner generator (free tool)

Inputs:
- Sport, age group (6U–12U marketed; library actually goes to 18+)
- Start time, duration
- Number of coaches/helpers (drives station fan-out)
- Focus areas (multi-select): Hitting, Throwing, Infield, Outfield, Pitching, Catching, Baserunning, Team Defense, Warmup, Strength & Conditioning, Mental Skills & Game IQ, Fun/Games & Competition
- Field resources (quantities): Full Field, Batting Cage, Bullpen, Infield Only, Open Space
- Optional roster (names + position preferences) → drives per-minute player assignment

Output:
- Drag-and-drop timeline editor, resizable blocks, reorderable
- PDF export (free, no account)
- "Demo practice" preload

Marketing claims:
- 240+ tagged drills
- "4x more swings" vs single-cage BP via station model
- Sample 90-min practice: 10 warm-up / 20 hitting / 20 fielding / 20 team defense / 15 live / 5 cool-down

---

## 6. Drill Library

- Public landing page is a 2-card split: Baseball Drills / Softball Drills (each "100+ drills").
- Categorized by skill (icons match the planner focus-area list).
- Each drill claims: setup diagram, step-by-step instructions, common mistakes, progressions by skill level, some video.
- CTA throughout funnels to Practice Planner.

---

## 7. Site IA / surrounding surfaces

Top-level nav groups:
- **Tools**: Lineup Generator, Practice Planner, Virtual Scoreboard, Schedule Maker, Scorekeeper App, Free Tools index
- **Learn**: Coaching Handbook, Drill Library, Practice Plans, Baseball Dictionary, Articles, Free Coaching Guides
- **Printables**: Lineup Card Templates, Coaching Printables, Scorecards (baseball/softball), Scorebooks
- **Company**: About, Pricing, Reviews, FAQs, Contact, Compare

Heavy SEO-content tail on every page (long-form "Complete Guide to…" copy, FAQ accordions). Pages are Next.js (image URLs are `_next/image?url=...&dpl=dpl_...`).

---

## 8. Competitive takeaways for our coach platform

Relevant deltas vs `coach-platform-build-plan.md` / `product-feature-addendum.md`:

1. **Generation is templated, not AI.** Dugout Edge's "customizable plans" are a 6-variant × 8-age-band matrix — no per-team adaptation, no diagnosis-driven content. Our `compiler` + `diagnosis` packages already aim higher; the differentiator to lean on is **plans that respond to last-week's data + roster context**, not just static catalog filtering.
2. **Price anchor at $8/mo** for a single-team coach. Our pricing should account for this anchor — premium positioning needs either league/club bundles (their `league-pricing` gap) or a clearly richer per-team value (compliance, fairness reports, player development tracking).
3. **No safety / compliance posture.** Zero mention of Pitch Smart, throwing limits, age-band rules, refusal logic. Our `tier1-safety-rules.json` + `corpus/pitch-smart-tables.json` + safety package is an untouched moat.
4. **No fairness/equity tooling.** Their "Advanced Lineup Algorithm" is marketed as pin-and-reshuffle. Our Slice 8 fairness grid (per-team innings × position, season + last-5) is a structurally different artifact — parents and league boards will value this; Dugout Edge has nothing comparable.
5. **No parent/player-facing surface.** Entirely coach-side. Our `parent/` and `missions/` app routes are net-new category.
6. **Block taxonomy to mirror.** Their block names (WARM-UP AND THROWING, STATION A: TEE WORK, TEAM DEFENSE, FUN GAME, BASERUNNING) align with conventions coaches already recognize — worth aligning our compiler's section headers to this vocabulary for UX familiarity.
7. **Field-resource input is good signal.** Quantities of full field / cage / bullpen / infield-only / open space is a clean constraint format we should accept in our practice compiler. Not currently surfaced in `coach-platform-practice-compiler.md`.
8. **Coach-count → station fan-out** is their core scheduling primitive. Worth making explicit in our compiler too (already implicit in `customizeSlug` pattern `{N}coach`).
9. **Free PDF export is table stakes.** They give it away with no account. Our gated exports need to either match this for a free tier or pair the gate with clear premium value (roster-aware, fairness-flagged, safety-annotated).
10. **Library is SEO bait, not product.** Each plan page is wrapped in 800+ words of generic "how to run a practice" content. Their growth motion is organic search, not product-led. We should expect their funnel to be Google → free PDF → trial nag.

---

## 9. Things we did not capture (gated or absent)

- Full drill body content (each drill's exact steps, coaching points, common-mistake list) — would require sign-in or per-drill page crawl.
- Premium-only plan variants (if any exist beyond what's listed on the public `/practice-plans/baseball` page — appears the public list IS the catalog and premium just unlocks save/customize).
- Softball plan list (mirror structure assumed but not fetched).
- League pricing tiers (page exists, not crawled).
- Coaching Handbook content depth.
