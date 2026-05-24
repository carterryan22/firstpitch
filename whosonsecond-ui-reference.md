# Who's on Second!? — UI / UX Reference

Structured reference compiled from a full authenticated crawl of `whosonsecond.com` (Coast Diamondbacks team account) plus the public `/demo` and marketing surfaces. Purpose: inform the Coach Platform product spec by mapping every surface to a **Borrow / Improve / Ignore** judgment. All real names, emails, and IDs from the source account have been redacted.

---

## 1. Stack & Platform Signals

| Signal | Value |
|---|---|
| Framework | Next.js App Router (RSC payloads observable in `?_rsc=` requests) |
| Hosting / CDN | Cloudflare (RUM beacon `/cdn-cgi/rum`) |
| Auth methods | Google · Apple · Passkey · Email magic link · Email + password (with 2FA option) |
| Billing | Stripe |
| Mobile | Native iOS app v1.4.0 (web is the system of record; iOS is a thin client) |
| Error reporting | Sentry (minified React errors surfaced in console) |
| CSP | `script-src 'self' 'strict-dynamic'` |
| Bottom tab nav | Web shell mirrors iOS tab bar — same 5 tabs on desktop and mobile |

---

## 2. Information Architecture Map

### 2.1 URL grammar

```
/                                                  marketing home
/demo                                              public sandbox (2h, no signup)
/login  /signup  /forgot-password                  auth
/dashboard                                         post-auth landing (redirects to active team)
/profile                                           account profile
/help                                              help center (single-page accordion)
/help#contact-support                              deep-linked support section

/teams/{slug}                                      team home dashboard
/teams/{slug}/roster                               roster (Positions | Stats tabs)
/teams/{slug}/roster/new                           add player form
/teams/{slug}/roster/{playerId}                    player detail
/teams/{slug}/games                                games list
/teams/{slug}/games/new                            new game form
/teams/{slug}/games/{gameId}                       game (Field | Roster | Summary tabs)
/teams/{slug}/games/{gameId}/stats                 post-game review + pitch entry
/teams/{slug}/games/{gameId}/edit                  ❌ 404 — edit lives in Tools dropdown
/teams/{slug}/pitching                             pitching availability board
/teams/{slug}/fairness                             fairness table
/teams/{slug}/press-box                            press box (parent-facing share view)
/teams/{slug}/more                                 More menu (catch-all)
/teams/{slug}/settings                             team settings (accordion)
/teams/{slug}/apply-rule-set?returnTo=…           rule-set wizard (full page, not modal)
```

Conventions:
- Slug = team kebab-case (e.g. `coast-diamondbacks`).
- IDs are 8-character base36 (`wys2j7re`).
- The wizard pattern uses `?returnTo=` round-trips instead of modals.
- A 404 returns a branded baseball pun page ("That one went foul.") with `Go home` / `Go to dashboard` links.

### 2.2 App shell

```
┌─────────────────────────────────────────────────────────────────┐
│  [Team Switcher ▾]                                  [User RC ▾] │  ← banner
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                          main / content                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│   Home    Games    Roster    Pitching    More                   │  ← bottom tab nav
└─────────────────────────────────────────────────────────────────┘
```

- **Team switcher** (banner left): button labeled with team name + chevron. Dropdown for a single-team account contains only `+ Create New Team` and `+ Create New League` (no team list rendered when there's only one). League is exposed as a sibling concept to Team.
- **User menu** (banner right): circular avatar with initials ("RC"). Dropdown = Name + email header → `Profile` / `Contact Support` (deep-link `/help#contact-support`) / `Sign out`. Notably **no** Settings, Billing, or device-management entries — those live elsewhere.
- **Bottom nav**: `Home · Games · Roster · Pitching · More`. Same 5 tabs on web and iOS.
- **Breadcrumb** appears on deep pages as a single back link, e.g. `← More › Settings`.
- **Skip to main content** link is the first focusable element on every page (a11y).

### 2.3 More menu (catch-all)

Routes accessible from More: `Settings`, `Fairness`, `Press Box`, `Help`, `Subscription` (billing), plus app version footer.

---

## 3. Page-by-Page Catalog

### 3.1 Marketing & Auth (public)

| Surface | Notes |
|---|---|
| `/` home | Headline-first marketing; "Less spreadsheet, more coaching" tagline appears in the footer logo block. |
| `/demo` | H1 **"Build a fair lineup in 30 seconds"**, single `Try it free` CTA → sandbox expires in 2h, no signup. Three feature tiles: *Auto-generate lineups · Track pitch counts · Import from GameChanger*. |
| `/login` / `/signup` | OAuth row (Google · Apple · Passkey) + email magic link + password fallback. 2FA prompt on enabled accounts. |
| 404 | Branded "That one went foul." page. Header collapses to logo + Sign in. |

### 3.2 Home dashboard `/teams/{slug}`

- "Next Game" card (large): opponent, date/time, venue, days-until counter, CTAs `Open Game` / `View Field`.
- "Today" card: shows upcoming game-day tasks when applicable.
- Quick-action row: `New Game` · `Add Player` · `Pitching` · `Fairness`.
- Recent-activity feed: lineup created, pitch counts entered, member joined.

### 3.3 Roster `/teams/{slug}/roster`

Tabs: **Positions** | **Stats**.

**Positions tab** — player cards grid:
- Number badge · Name · `B/T` (bats/throws) · position chips · per-player flags: `Can pitch` · `Can catch` · `Injured` pill.
- Card click → `/roster/{playerId}` detail.

**Stats tab** — table:
| # | Player | Parents | B/T | AVG | H | HR | RBI | BB | SO | Notes |

- Same player cell shows the `Can pitch` / `Can catch` icon badges and `Injured` pill inline.
- **Staff** section below table: Head Coach + Assistant Coaches with emails.
- **Parents** section below staff: linked parent accounts (empty if none).

### 3.4 Player detail `/teams/{slug}/roster/{playerId}`

- Header: large number, name, B/T, status pills (`Can pitch` / `Can catch` / `Injured`).
- "Position Ratings" sliders or chips (used by the auto-lineup engine).
- "Availability" calendar marking missed/excused games.
- "Pitch History" mini-table: date · pitches · innings · rest status.
- "Parents" section: linked parent accounts (invite from here).
- Edit / Archive actions.

### 3.5 Add Player form `/teams/{slug}/roster/new`

Fields:
- Jersey number · First/Last name · Date of birth (optional)
- Bats (L/R/S) · Throws (L/R)
- `Can pitch` toggle · `Can catch` toggle
- Position ratings (per position: Preferred / OK / Avoid — drives auto-lineup eligibility)
- Notes
- Parent email (optional invite at creation)

### 3.6 Games list `/teams/{slug}/games`

- Grouped by **Upcoming** / **Past**.
- Each row: date · opponent · venue · status badge (`Scheduled` / `In Progress` / `Completed`) · result if past.
- `+ New Game` button top-right.

### 3.7 New Game form `/teams/{slug}/games/new`

Fields: Opponent · Date · Time · Venue (Home/Away with field name) · Innings (default 6) · Notes. Save → lands on the game page.

### 3.8 Game page `/teams/{slug}/games/{gameId}`

Tabs: **Field** | **Roster** | **Summary**.

**Field tab** — the lineup builder, the core workflow:
- Per-inning columns × player rows; cells are position chips (`P, C, 1B, 2B, 3B, SS, LF, CF, RF` + `BN`).
- Auto-generate button creates a rule-compliant lineup in one tap.
- Real-time rule warnings (e.g. minimum outs unmet, pitch-rest violation).

**Roster tab** — toggle player attendance for this game (`Present` / `Absent`).

**Summary tab** — final check before save, batting order, position rotation summary.

**Tools dropdown** (top-right of game page) — *this is the edit surface; there is no `/edit` route*:
- `Edit Game Details` (opens an in-page sheet for opponent/date/venue/innings)
- `Duplicate Game`
- `Reset Lineup`
- `Mark Complete`
- `Delete Game`

### 3.9 Game Stats `/teams/{slug}/games/{gameId}/stats`

Post-game review, read-only once `Completed`.

- Header: `Game Stats: vs. {Opponent}` + `Completed` pill + datetime line.
- Banner: "This game is complete. Data is read-only." with `Edit in Lineup Builder` deep-link back to the game.
- **Lineup Review** table: player rows × inning columns showing the position played each inning (or `BN`).
- `Absent: {names}` line below the table.
- **Pitch Counts** entry section (one card per pitcher): `{Pitches}` + `{Innings}` number inputs. Footer counter: `N pitchers · N total pitches`. Inputs disabled when game is `Completed`.

### 3.10 Pitching `/teams/{slug}/pitching`

Availability board:
- Roster filtered to `Can pitch` players.
- Per player: last-pitched date · pitches · innings · `Rest status` pill (`Available` / `1 day rest` / `2 days rest` / etc.).
- Calendar strip projecting eligibility forward to the next game.

### 3.11 Fairness `/teams/{slug}/fairness`

Season-to-date fairness table:
- Per player: games played · innings · bench innings · infield innings · outfield innings · positions played count · `at-bats`.
- Heat-mapped cells highlight imbalance.
- Used as the input signal for the auto-lineup fairness term.

### 3.12 Press Box `/teams/{slug}/press-box`

Parent-facing public share view (read-only) — game schedule, lineups (after game start), pitch counts, and the snack-duty rotation if enabled. Shareable via link without a parent account.

### 3.13 Help `/help`

Single-page accordion. Sections observed:
1. Getting Started
2. Rules Engine
3. Pitch Count Tracking
4. Parent Access
5. Roles & Permissions
6. Billing
7. League Management
8. Contact Support (anchor target of user-menu link)

Each section is independently expandable; TOC sidebar deep-links via fragment.

### 3.14 Profile `/profile`

- Avatar / initials, display name, email.
- Connected accounts (Google / Apple / Passkey).
- 2FA enrollment.
- Email preferences (game reminders, snack-duty, weekly summary).
- Delete account (with confirmation).

### 3.15 Settings `/teams/{slug}/settings`

Accordion of sections. Header shows a `Replay team-rules tour` icon button.

| Section | Notes |
|---|---|
| **Team Information** | Sport · League name · Season label (e.g. "Spring 2026") |
| **{Applied rule set} card** | Inline banner: governing body, "Applied {date} · {year} rules · N from {body}", source link, `Change Rule Set` button |
| **Calendar Import** | GameChanger / ICS feed: connected source, `webcal://…` URL, Timezone, "Last synced: …, N created, N updated, N unchanged, N detached", `Disconnect` + `Sync Now` |
| **Defensive Play & Minimum Play** | 10 toggles + numeric spinners — see §5 |
| **Batting** | 3 rules (e.g. Continuous batting order, BB → 1B only, etc.) |
| **Pitching Limits** | Pitch-count ceiling rules |
| **Rest & Recovery** | Single tier table: `Up to & including (pitches)` × `Rest days required`; rows like 20→0, 35→1, 50→2, 65→3; `+ Add tier`. Helper copy: *"the most restrictive matching tier applies."* |
| **Position Restrictions** | E.g. Catcher → Pitcher same game limits |
| **Snack Duty** | Single toggle: "Snack Duty Rotation — Automatically assign snack duty to families for each game. Parents with linked accounts get email notifications." |
| **Game Day** | Pre-game notification timing, lineup share window, etc. |
| **Team Invitations** | Inline invite form (Email + Role: `Assistant Coach \| Scorekeeper \| Parent`) + History list with status pills |
| **Transfer Head Coach** | `Start Transfer` — recipient's subscription unlocks the team for all members |
| **Leave This Team** | `Leave Team…` confirmation flow |

### 3.16 Change Rule Set `/teams/{slug}/apply-rule-set?returnTo=…`

Full-page wizard (not a modal). Cards:
- ⚾ **Little League Baseball** — pitch counts, 5-tier rest, mandatory play (6 outs + 1 AB), catcher/pitcher restrictions.
- 🏫 **NFHS Baseball** — state-specific (state selector follows).
- 🏆 **USSSA Baseball** — innings-based limits (not pitches), no pitcher re-entry.
- `Skip, I'll set up rules manually`
- `Remove current rule set`

### 3.17 Invite Member (inline form, not modal)

Email + Role combobox: `Assistant Coach · Scorekeeper · Parent` (Head Coach is implicit — the inviter). `Send Invitation` / `Cancel`. Below: History list with `Accepted` / `Pending` / `Expired` status pills and accept date.

### 3.18 Billing / Subscription (under More)

Stripe Customer Portal–style: plan, next renewal, payment method, invoices, cancel.

---

## 4. Component Inventory & Naming

### 4.1 Atoms

| Component | Naming convention | Example |
|---|---|---|
| Status pill | adjective | `Completed` · `In Progress` · `Scheduled` · `Accepted` · `Pending` · `Available` |
| Capability badge | "Can ____" | `Can pitch` · `Can catch` |
| Injury marker | noun pill | `Injured` |
| Rule source badge | governing body | `Little League` · `NFHS` · `USSSA` · `Custom` |
| Position chip | abbreviation | `P · C · 1B · 2B · 3B · SS · LF · CF · RF · BN` |
| Number badge | `#N` prefix | `#7` |
| Toggle | `switch` role | every rule is a switch + descriptive helper |
| Spinner | `spinbutton` role | tier values, minimum-outs counters |

### 4.2 Molecules

- **Rule row**: title · helper text · source-badge (`Little League` / `Custom`) · switch · optional nested numeric input(s) that appear when switched on.
- **Accordion section**: heading · summary chips (e.g. `3 rules · 2 Little League · 1 custom`) · chevron · expanded body.
- **Player row** (Stats): `#N` · Name · capability badges · injury pill · stat columns.
- **Inning cell** (Field / Game Stats): position chip or `BN`.
- **Tier row** (Rest & Recovery): two spinners + `Remove tier` icon button.
- **Tile** (marketing / demo): icon · heading · 1-sentence description.

### 4.3 Page templates

1. **Marketing**: hero (H1 + CTA + reassurance line) → 3-tile feature row → footer.
2. **App shell with bottom-nav** (authenticated).
3. **Accordion settings page**.
4. **Tabbed detail page** (Roster has Positions/Stats; Game has Field/Roster/Summary).
5. **Full-page wizard** (rule-set picker, with `?returnTo=`).
6. **Read-only review page** (Game Stats post-completion banner pattern).
7. **404 branded page**.

---

## 5. Rule Catalog (Settings → Defensive Play & Minimum Play)

| Rule | Type | Source | Notes |
|---|---|---|---|
| 4 Outfielders | switch | Custom | LCF + RCF for larger rosters |
| No Pitcher (coach pitch) | switch | Custom | Removes P from the field |
| No Catcher | switch | Custom | Common in 6U / tee-ball |
| Minimum innings per player per game | switch + count | — | per-inning floor |
| Minimum defensive outs per game | switch + outs spinner | Little League | e.g. 6 outs = 2 full innings |
| No consecutive bench innings | switch | Custom | can't sit two in a row |
| Equal bench time | switch | — | no second bench until all have sat once |
| No consecutive position innings | switch | — | encourage rotation |
| Minimum infield innings per game | switch + count | — | infield = P/C/1B/2B/SS/3B |
| Minimum outfield innings per game | switch + count | — | OF = LF/CF/RF (+ LCF/RCF if enabled) |
| Compound minimum play | switch | — | thresholds scale with game length |

**Pitching Limits** (Little League defaults): pitch-count ceiling tier table + max-pitches-per-day cap.
**Position Restrictions** (Little League defaults): catcher→pitcher day, pitcher→catcher same game, etc.
**Rest & Recovery**: tiered `pitches → rest days`; "most restrictive matching tier applies."

---

## 6. Roles & Permissions Matrix

Inferred from the invite combobox (`Assistant Coach · Scorekeeper · Parent`), settings visibility, and Help → Roles & Permissions.

| Capability | Head Coach | Asst Coach | Scorekeeper | Parent |
|---|:---:|:---:|:---:|:---:|
| Manage team settings & rules | ✅ | ✅ | — | — |
| Invite members | ✅ | ✅ | — | — |
| Transfer Head Coach | ✅ | — | — | — |
| Manage billing | ✅ | — | — | — |
| Add / edit / archive players | ✅ | ✅ | — | — |
| Create / edit games | ✅ | ✅ | — | — |
| Build lineups | ✅ | ✅ | — | — |
| Enter pitch counts after game | ✅ | ✅ | ✅ | — |
| Mark game complete | ✅ | ✅ | ✅ | — |
| View Press Box / lineups | ✅ | ✅ | ✅ | ✅ |
| Receive snack-duty notifications | ✅ | ✅ | — | ✅ |
| Mark own child availability | — | — | — | ✅ |

Notes:
- Only the Head Coach's subscription unlocks paid features for the entire team.
- Transferring HC requires the recipient to have an active subscription.
- Parent role is per-player linkage; one parent account can be linked to multiple kids across teams.

---

## 7. League Inheritance (3-tier model)

```
League  ──▶  Team  ──▶  Game
 (defaults)    (overrides)    (per-game overrides allowed, e.g. innings)
```

- A **League** holds shared rule-set defaults and a schedule master.
- A **Team** inherits and can override.
- A **Game** can override innings and (per Help) opt out of specific minimums.
- Rule rows display `Little League` / `Custom` badges so coaches can see at-a-glance what they've diverged from.

---

## 8. Voice, Microcopy & Brand Tells

- **Tagline**: "Less spreadsheet, more coaching."
- **Demo hero**: "Build a fair lineup in 30 seconds."
- **404**: "That one went foul. The page you're looking for doesn't exist or has been moved."
- **Rule helpers** are written as one-sentence plain-English explanations (not jargon).
- **Source attribution everywhere**: any rule sourced from a governing body links out (e.g. `littleleague.org ↗`).
- Tone = friendly coach, not enterprise SaaS. Emoji used sparingly and only in the rule-set picker.
- Empty states are descriptive prose, not illustrations.
- Numbers and dates are always human-formatted ("May 19, 2026, 10:17 PM").

---

## 9. Borrow / Improve / Ignore — mapping to Coach Platform spec

> Cross-reference with `player-development-metric-schema.md`, `product-feature-addendum.md`, `market-research-positioning.md`.

### 9.1 BORROW (proven patterns to adopt as-is)

| WoS pattern | Coach Platform application |
|---|---|
| **5-tab bottom-nav app shell** identical on web + iOS | Adopt. Tabs: `Home · Games · Roster · Practice · More`. Practice replaces Pitching because Practice Compiler is our wedge. |
| **Accordion settings with rule-source badges** | Adopt for the Rules Engine. Show `Little League` / `Custom` / `League` provenance on every rule. |
| **Per-rule plain-English helper text** | Adopt verbatim style — every toggle gets a one-sentence "why" line. |
| **Inline rule warnings during lineup build** | Adopt for both lineup and *practice* compilation (e.g. "this drill violates Workload Budget"). |
| **`Can pitch` / `Can catch` capability badges + `Injured` pill on player cards** | Adopt — extend to `Can lead off` / `Can call game` etc. driven by Position Trust Matrix tiers. |
| **3-tier league inheritance (League → Team → Game)** | Adopt directly — same model fits our 3-tier governance. |
| **`?returnTo=` full-page wizard pattern** (vs. modals) | Adopt. Modals collapse on mobile; wizards stay scannable. |
| **Branded 404 with baseball pun + dual CTA** | Adopt the dual-CTA structure (Home + Dashboard). Tone TBD. |
| **Status pill grammar** (`Scheduled / In Progress / Completed`) | Adopt verbatim — already an industry idiom. |
| **GameChanger ICS sync** with detailed sync diff (`N created / updated / unchanged / detached`) | Adopt — table-stakes for any coach moving from GC. |
| **Sandbox demo (2-hour, no signup)** | Adopt — strongest funnel signal observed. |
| **Public Press Box share link** (no parent account needed) | Adopt — eliminates an invite friction step. |

### 9.2 IMPROVE (present but limited; we can do better)

| WoS gap | Coach Platform improvement |
|---|---|
| Player ratings are static Preferred/OK/Avoid chips | Replace with **Position Trust Matrix** — auto-updated from observed reps + coach overrides + practice outcomes. |
| Fairness page shows aggregate counts only | Combine into **Fairness + Development Ledger** — same table, but each cell is a debit/credit against per-player development goals. |
| Pitch counts entered manually after the game on the Stats page | **Live pitch-counter** during the game (one tap per pitch, tracks pitch type), with reconciliation pass on the Stats page. |
| Rest & Recovery covers pitchers only | Extend to a **Workload Budget**: pitchers + catchers (squats), with optional pitcher-of-record carryover across teams. |
| Tools dropdown is the only edit surface for a game (no `/edit` route, fails on direct link) | Provide a real `/games/{id}/edit` route that mirrors the dropdown actions — better deep-linkability and parent communication. |
| Auto-lineup considers rules + fairness; no development objective | **Game Script** = auto-lineup with an explicit development weighting (e.g. "give Hudson 2 innings at SS this game"). |
| Help is a single-page accordion | Keep accordion but add a contextual `?` chip on every settings row that opens the relevant Help anchor — keeps support cost low. |
| Roles are 4 fixed buckets | Add **Player** role (kid-facing PWA) for self-service availability + practice video review. |
| Snack-duty rotation is a single toggle | Generalize to **Team Duties** (snacks · field setup · scorekeeping · drink cooler) with the same rotation engine. |
| No practice surface at all | Practice Compiler is our wedge. Mirror the Game page tabs (`Plan / Roster / Summary`) but for practice blocks. |

### 9.3 IGNORE (don't replicate)

| WoS pattern | Why skip |
|---|---|
| Single-vendor calendar import only (GameChanger) | We need a generic ICS + Google Cal + Apple Cal + TeamSnap export path on day one. GC alone leaves money on the table. |
| Inline-only invite flow under Settings | Move invites to a first-class `/team/{slug}/people` page so they're discoverable without digging through settings. |
| User menu has no Settings / Billing links | Add direct links. Two extra taps is a meaningful UX cost on mobile. |
| Marketing site uses emoji as the rule-set picker iconography | Use a real icon set for credibility with HS / club programs. |
| Help → Contact Support is a fragment anchor | Use a real `/support` route with form + ticket history. |
| Press Box has no comment / RSVP from parents | Parents need to be able to RSVP availability without an invite. We bake this in. |
| "Continuous batting order" hard-coded as a rule toggle | Treat batting model as an enum (Continuous · Standard 9 · DH · EH) instead of a boolean. |

---

## 10. Tournament Rulebook Library & In-Game Quick Reference

WoS ships three pre-built rule sets (Little League, NFHS, USSSA). For travel-ball reality this is not enough — the same weekend a 10U team can play Saturday under **Perfect Game** rules and Sunday under **Top Tier (TTB)** rules, with completely different pitch caps, run rules, and pace-of-play. Coach Platform pre-seeds a full **Tournament Rulebook Library** and exposes an in-dugout **Quick Reference** mode.

### 10.1 Pre-seeded rulebooks (v1 launch set)

| Sanctioning body | Age divisions covered | Key rule axes captured |
|---|---|---|
| **Little League International** (LL Baseball, Intermediate 50/70, Junior, Senior; LL Softball Minors / Majors / Junior / Senior) | 6U–16U | Pitch-count tiers + rest days, mandatory play (6 outs + 1 AB / 9 outs + 2 AB for tournaments), catcher→pitcher restrictions, continuous batting option, mercy rule (15/4 · 10/5 · 8 after 6), special pinch runner |
| **Perfect Game (PG)** | 8U–18U + WWBA / BCS / National Showcase events | Innings-based pitching limits (e.g. 8U=6 IP/day, 9–10U=6, 11–12U=7, 13U+=7 with rest tiers), tie-breaker (Cal Ripken / international), run rules per age, batting (straight 9 / continuous / EH), courtesy runner for P/C, time limits (no new inning after 1:40 pool / drop dead 1:50) |
| **Top Tier Baseball (TTB)** | 8U–14U + High-School Showdown | Pitch-count *and* innings caps (whichever hits first), per-day + per-tournament caps, catcher-to-pitcher day-of, run rules (15/3 · 10/4 · 8/5), 1:40 / 1:50 time limits, on-deck restrictions, base-stealing windows by age |
| **USSSA Baseball** | 6U–18U | Innings-based, no pitcher re-entry, age-specific lead-off / steal rules, run-rule ladder, pool-play tie-breakers (head-to-head → runs allowed → run differential capped) |
| **NFHS** | HS Varsity / JV / Frosh | Pitch-count by state (NFHS publishes framework; each state adopts numbers), DH/EH, courtesy runners, mercy rule per state |
| **AAU Baseball** | 6U–18U | Innings + pitch counts, age-specific bat restrictions (USA / USSSA stamp), run rules |
| **Babe Ruth / Cal Ripken** | 4U–18U | Continuous batting (Cal Ripken Minor), pitch counts mirror LL with variations, mandatory play |
| **PONY Baseball** | Shetland–Palomino | Innings limits, base path lengths drive position-eligibility rules |
| **NCAA** (reference only) | College | DH rules, pitcher-of-record carryover (relevant for HS showcase events) |

Each rulebook is versioned by **publication year** (e.g. `LL-2026`, `PG-2026-Spring`). Updates ship as data-only releases — no app update required.

### 10.2 Data model

Every rule in the library normalizes to a single schema so the same engine can evaluate any sanctioning body:

```ts
RulePackage {
  id:            "ttb-2026-10u"
  body:          "Top Tier Baseball" | "Perfect Game" | "Little League" | ...
  ageDivision:   "10U"
  effective:     { from: "2026-01-01", to: "2026-12-31" }
  sourceUrl:     "https://toptierbaseball.com/rules/…"
  lastVerified:  "2026-05-19"
  rules: [
    { kind: "pitchCount",   tiers: [{ uptoPitches: 20, restDays: 0 }, …], dailyMax: 75 },
    { kind: "inningsCap",   perDay: 6, perTournament: 10 },
    { kind: "catcherToPitcher", maxCatcherInnings: 3, blocksPitchingSameDay: true },
    { kind: "mandatoryPlay", outsMin: 6, plateAppearancesMin: 1, scope: "perGame" },
    { kind: "battingOrder",  modes: ["continuous","straight9","EH"], default: "continuous" },
    { kind: "courtesyRunner",positions: ["P","C"], withTwoOuts: true },
    { kind: "runRule",       ladder: [{ afterInning: 3, lead: 15 }, { afterInning: 4, lead: 10 }, { afterInning: 5, lead: 8 }] },
    { kind: "timeLimit",     noNewInningAfter: 100, dropDeadAfter: 110, unit: "minutes" },
    { kind: "tiebreaker",    method: "calRipken", startingRunnerBase: 2, outs: 1 },
    { kind: "stealing",      ageWindow: "leadOffAllowed", liftOffPitcherRelease: false },
    { kind: "batRestriction",stamps: ["USA","USSSA"], maxBarrel: 2.625 }
  ]
}
```

Provenance metadata stored per package: `source PDF hash`, `verifier`, `verified date`, `diff vs previous version`. A change-log feed (`/rulebooks/changelog`) shows what moved between editions so coaches aren't surprised mid-season.

### 10.3 Pre-seeding flow

When a coach creates a tournament-eligible game:

1. **Tournament autocomplete** — type "PG Memorial Day Classic" → matches a known event in our tournament index → pre-fills:
   - Sanctioning body + age division + year
   - Time limit, mercy rule, tiebreaker
   - Pool-play vs. bracket rules (often different — pool=tie allowed, bracket=tiebreaker)
2. **Rule diff banner** — "This game uses Perfect Game 10U rules. **3 rules differ from your team defaults:** pitch cap 75 vs. your 85, no lead-offs allowed, drop-dead 1:50." Coach reviews and accepts.
3. **Per-day stacking** — when the same player pitches Saturday under one body and Sunday under another, the engine carries forward pitch counts but evaluates rest against **whichever body's tier is more restrictive** (same "most restrictive matching tier applies" principle WoS uses internally).
4. **Manual override path** — for unknown tournaments, coach picks body + age + year from a 3-step picker (same data model, no autocomplete).

### 10.4 In-Game Quick Reference

A persistent **rule-chip strip** on the Field tab during live games. Each chip is a one-tap pop-over with full rule text + source link.

```
┌───────────────────────────────────────────────────────────────────┐
│ Field   Roster   Summary                          [Tools ▾]      │
├───────────────────────────────────────────────────────────────────┤
│ PG 10U  ·  Pitch cap 75  ·  No new inn 1:40  ·  Run rule 10/4    │  ← chip strip
│ Stealing: pitch crosses plate  ·  Courtesy runner: P/C w/ 2 outs │
├───────────────────────────────────────────────────────────────────┤
│ [ inning grid ]                                                   │
```

Tap any chip → bottom sheet:
- Plain-English summary (3 lines max)
- Exact rulebook citation (e.g. "PG 2026 §4.3.b")
- Source PDF deep-link (page anchor)
- "Show me an example" mini-walkthrough
- Quick action when relevant (e.g. Pitch-Cap chip shows live pitches-thrown + pitches-remaining for current pitcher)

**Live enforcement signals** (not blocking — advisory by design):
- Pitch-cap chip turns **amber at 80% of cap, red at cap**, with haptic on iOS.
- Time-limit chip counts down in real time; red at "no new inning" threshold.
- Stealing chip flashes if a runner leads off before legal release in a no-lead-off division.
- Tiebreaker chip activates only after final scheduled inning ends tied — shows the international-tiebreaker setup (runner on 2B, 1 out) without the coach hunting through the rulebook.

**Offline-ready**: rulebook packages cached locally so the Quick Reference works in dugouts with no signal. Sync on reconnect.

### 10.5 Cross-sanctioning awareness

A travel team carries a **rule passport** across tournaments. The pitch-rest engine tracks a unified pitch-count ledger per pitcher and evaluates rest under every applicable body simultaneously:

```
Hudson — last pitched 5/22 (38 pitches)
  ✅ Little League rest: cleared (1 day req, 2 elapsed)
  ⚠ Perfect Game rest: cleared (1 day req)
  ❌ Top Tier rest:    blocked (2 days req for 36–50 tier, only 2 elapsed → ready 5/25)
```

The most restrictive answer is what we surface to the coach; the rest are accessible via the chip pop-over.

### 10.6 Editorial & legal posture

- All pre-seeded rules cite their public source; we **link out**, we don't host the PDF unless the body permits redistribution.
- A "Verify" badge on each rulebook shows the date we last reconciled against the source.
- Coaches can mark a rule as **House Override** (e.g. local league relaxes PG's drop-dead) — overrides are flagged in the diff banner and never silently override a sanctioned rule.
- For tournaments we can't verify, the chip strip shows a **"Unverified — coach-entered"** badge so umpires/parents know the source.

### 10.7 Borrow / Improve / Ignore deltas this adds

- **Borrow**: WoS's `Custom` source badge — extend to `Body / Year` (`PG 2026`, `TTB 2026`).
- **Improve**: WoS only carries 3 bodies and one tier per team. We carry 9+ bodies × N age divisions × per-tournament profiles, with cross-body rest stacking.
- **Improve**: WoS surfaces rules only in Settings. We surface them in the dugout *during the game*.
- **Ignore**: Don't auto-block. Always advisory + audit. Umpires call the game; we inform.

---

## 11. Competitive Scan — 5 Lineup-Generator Products

Crawled May 24, 2026: Dugout Edge, Coach Joel's Way, Inning Wizard, Dugout Boss, LineupIQ. Below = unique mechanics each ships that WoS does *not*, plus how each maps to Coach Platform.

### 11.1 Feature matrix (✓ = ships it, • = partial / paid-only, — = absent)

| Capability | WoS | DugoutEdge | CoachJoel | InningWiz | DugoutBoss | LineupIQ | Coach Platform plan |
|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| Auto-generate fair lineup | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ baseline |
| Drag-and-drop lineup editor | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Per-inning position lock | • | ✓ paid | — | ✓ | ✓ | ✓ | ✓ |
| Undo / redo (per cell) | — | ✓ paid | — | — | — | — | **borrow** |
| Competitive ↔ Fair slider | — | ✓ | — | — | ✓ mode toggle | — | **borrow** (per-game weighting) |
| Recreational vs Competitive mode | — | • slider | — | — | ✓ explicit modes | — | **borrow** as profiles |
| Visual on-field view (drag on diamond) | • Field tab | — | — | — | ✓ "Game Day Mode" | ✓ field diagrams | **improve** |
| Depth chart with 1° / backup / emergency tiers | — | — | — | — | ✓ "Position Pools" | — | **borrow** (feeds Position Trust Matrix) |
| AI swap suggestions | — | — | — | — | ✓ | — | **improve** (with explainability) |
| AI schedule import from photo / paste | — | — | — | — | — | ✓ | **borrow** (huge friction kill) |
| Multi-game / weekend batch generate | — | — | — | ✓ | • via copy | — | **borrow** for tournaments |
| Paste-roster onboarding | — | • manual | — | ✓ | — | — | **borrow** |
| Per-player attendance pre-generate | ✓ Roster tab | • | • | ✓ | ✓ smart-autofill | ✓ | ✓ |
| Pitcher role classes (SP / RP / CL) | — | — | — | — | ✓ | — | **borrow** for HS+ |
| DH / DP-FLEX / EH validated live | — | — | — | — | — | ✓ | **borrow** for HS / College |
| Co-ed M/F field-ratio rules | — | ✓ | — | — | — | — | **borrow** for softball / coed-rec |
| Continuous batting / Standard 9 / EH modes | • implicit | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ enum |
| Custom positions (UTL slots, Rover) | • 4-OF | ✓ 3 UTL slots | — | — | — | ✓ Rover | **borrow** |
| Print: umpire exchange card | — | ✓ | ✓ | ✓ | ✓ | ✓ branded | **must-have** |
| Print: per-inning defensive grid | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Print: field diagram | — | — | — | — | — | ✓ | **borrow** |
| CSV export | — | ✓ | — | • paid | — | — | **borrow** |
| Historical playing-time tracking across season | ✓ Fairness | • template-only | ✓ branded | ✓ history | • | ✓ | ✓ |
| Top/Middle/Bottom batting-order balancing | — | — | ✓ | — | — | — | **borrow** |
| Tournament bracket generator | — | ✓ adjacent tool | — | • for-leagues | — | — | **borrow** as adjacent |
| Practice planner | — | ✓ adjacent | — | — | — | — | **wedge** for us |
| Catcher framing / pop-time analytics | — | — | — | — | — | ✓ Framework IQ | **borrow** (Workload Budget input) |
| Pitch-by-pitch scouting w/ heatmaps + AI report | — | — | — | — | — | ✓ Scouting IQ | **borrow** (Scouting Companion) |
| Coaching staff collaboration | ✓ roles | — | • | — | — | ✓ | ✓ |
| Org → Team → Season hierarchy | • League → Team | — | ✓ | — | — | — | ✓ confirms 3-tier model |
| PWA / install-like-app | — | — | — | ✓ | — | ✓ | **borrow** (instead of native at launch) |
| Native iOS app | ✓ | — | ✓ | — | — | — | TBD |
| GameChanger import | ✓ ICS | — | ✓ | — | — | — | ✓ |
| Free tier with hard limit | • | ✓ free core | ✓ free | ✓ 1 team / 12 / 6inn | — | • | ✓ |
| Podcast / content marketing | — | ✓ blog | — | — | — | ✓ podcast | **borrow** |

### 11.2 Standout ideas worth stealing (or beating)

**Dugout Edge** — *the "free comprehensive toolkit" play*
- Treats lineup as the wedge into a broader free-tools ecosystem: Practice Planner, Virtual Scoreboard, Schedule Maker, Scorekeeper, Bracket Generator, Lineup Card templates, Scorebooks. **Lesson**: every adjacent tool is a SEO landing page + funnel into the paid platform. Coach Platform should ship at least one free public tool (e.g. "Free Pitch-Count Calculator under PG / LL / TTB / USSSA rules").
- **Competitive priority slider** (fun ↔ competitive) — single control that re-weights the optimizer. Cleaner UX than two separate modes.
- **Co-ed rules** (min M/F on field) — entire category WoS ignores. Softball/coed rec is a real market; LL Softball alone has ~360k players.
- 14-position picker with explicit UTL1/UTL2/UTL3 slots — flexes for non-standard formats (slow-pitch with Rover, etc.).
- **Premium lock-and-shuffle**: lock a cell, regenerate the rest. Different from "lock player to position for inning N" — it's "lock this exact cell, recompute everything else."

**Coach Joel's Way** — *the "fairness-as-brand" play*
- Markets a named **fairness algorithm** with quantified outcomes ("99.2% fairness score", "2× more balanced at-bats", "30% less bench variance"). Even if the numbers are squishy, the *commitment to publishing a fairness metric* is a brand differentiator.
- **Top/Middle/Bottom batting-order balancing** — rotates players through batting tiers across the season so the same kid doesn't always hit 9th. Goes beyond "everyone hits the same number of times" to "everyone gets equal high-leverage at-bats."
- **Org → Team → Season** explicit hierarchy (matches the 3-tier we already planned).
- Historical playing-time tracking is *persistent across games*, not just current-game balancing — this is how their fairness score earns its number.

**Inning Wizard** — *the "fast and cheap" play*
- $15/year paid tier — the floor for monetizing this category. Anything we charge must justify the delta.
- **Multi-game generate** — produces a whole tournament weekend in one click, respecting cross-game pitcher rest. Directly aligns with our §10 Tournament Rulebook vision and is something WoS still does game-by-game.
- **Paste-roster** (no reformatting) — eliminates the worst onboarding step.
- PWA-only delivery — no app store friction, zero install time, works on Saturday morning in the dugout.
- Free-tier hard limits as the upgrade trigger (1 team / 12 players / 6 innings) — cleaner than feature gating.

**Dugout Boss** — *the "AI optimizer + visual field" play*
- **Recreational Mode vs Competitive Mode** as a top-level toggle, not a slider. Two different optimization functions surfaced as two different products under one UI. Lower cognitive load than DugoutEdge's slider for less-technical coaches.
- **Visual Position Pools** — drag-and-drop depth chart with explicit Primary / Backup / Emergency tiers per position. This *is* the Position Trust Matrix UI, already shipped by a competitor. We should adopt the same visual idiom.
- **"Game Day Mode"** — when a kid shows up late or leaves early, drag a replacement onto the diamond and AI auto-fills the cascade. This is the real "live" use case; our Quick Reference chip strip should sit alongside this mode, not separate from it.
- **Pitcher role classes** (Starter / Reliever / Closer) with innings limits across a tournament series — relevant for travel ball, currently absent from WoS.
- AI swap suggestions: "swap A and B for better defense" with one-tap accept. Coach Platform should ship the same, but with an **explainability tooltip** ("because B's trust at SS is +0.4 and A's trust at 2B is +0.3, this swap saves 0.7 expected defensive runs").

**LineupIQ** — *the "platform suite for serious programs" play*
- **AI schedule import from a photo of a bracket** — the bracket gets pinned to a tree on Friday night, coach snaps it, schedule is built. Massive friction kill. Same model as Apple Calendar event-from-screenshot. Must-borrow.
- **DH / DP-FLEX / EH validated in real time** — HS softball coaches specifically need this; nobody else in the scan does it. Opens the HS market.
- **Branded umpire exchange cards** — they sell the printable lineup card as a *prestige* item (your team logo + colors on the card the ump keeps). Cheap differentiator.
- **Field diagrams** in print output — visual lineup card alongside the text card.
- **IQ family of products**: LineupIQ + Framework IQ (catcher analytics: framing, pop time, video annotation on a phone) + Scouting IQ (pitch-by-pitch w/ heatmaps + AI scouting reports). They're building a **suite**, not a tool. Coach Platform should plan the same — Practice IQ, Development IQ, Workload IQ as siblings.
- **Tiered by level**: Youth/Rec → Travel/Club → HS/College, with different feature sets surfaced to each tier. Same product, different defaults — a packaging insight.
- **Coaching staff collaboration** explicit at HS/College tier — multi-coach editing, role-based comments, change history.
- **Podcast (Learning Lab)** as content moat — coaching content credibility cheap to produce, hard for competitors to backfill.

### 11.3 Gaps no competitor in the scan fills (white-space for Coach Platform)

1. **Tournament-rulebook pre-seeding with cross-body pitch-rest stacking** (§10) — every competitor surfaces one rule set per team at a time. Nobody handles "Saturday PG, Sunday TTB" with a unified pitcher ledger.
2. **In-dugout Quick Reference chip strip** (§10.4) — no product surfaces live rule context during the game. Closest is Dugout Boss's Game Day Mode, but it shows the *field*, not the *rules*.
3. **Position Trust Matrix as a learned model** — Dugout Boss has manual depth-chart tiers; nobody auto-updates trust from observed reps + practice outcomes + game performance.
4. **Practice Compiler tied to development goals** — Dugout Edge has a Practice Planner (free) but it's a static template; nobody compiles a practice plan from each player's development gaps.
5. **Workload Budget that includes catchers** — every product caps pitchers; nobody tracks catcher squats / throws as a fatigue input. Real injury-prevention gap.
6. **Player-facing PWA** (kid does self-availability, sees their own development goals, reviews drill video) — entirely absent.
7. **Explainable AI suggestions** — Dugout Boss has AI swaps but the rationale isn't surfaced. "Why this swap?" with metric attribution is open.
8. **Public Press-Box-style share with RSVP** — WoS has read-only press box; nobody lets parents RSVP attendance from the public link.
9. **Auto-arbitration between league rules and tournament rules** — when LL season overlaps with a PG weekend, which restrictions apply? Coach Platform's rule-passport model handles this; nobody else even attempts it.
10. **Scouting Companion at youth level** — LineupIQ's Scouting IQ is the only entrant, and it's pitched at HS+. There's room for a youth-friendly pitch-by-pitch + opponent tendencies tool.

### 11.4 Pricing landscape (visible signals)

| Product | Free tier | Paid floor | Notes |
|---|---|---|---|
| Dugout Edge | Full lineup gen free, 7-day premium trial | Unknown — premium gates "lock cells / undo / save" | Adjacent tools free as funnel |
| Coach Joel's Way | "Completely free" core | Premium features hinted; org/season tier likely paid | iOS app on App Store |
| Inning Wizard | 1 team / 12 players / 6 innings | **$15 / year** | Cheapest in scan |
| Dugout Boss | Demo mode only | Pricing page exists (not crawled) | "Join Now" = pricing wall |
| LineupIQ | Free to start, no CC | Unclear | Multiple IQ products = bundling story |
| WoS | None observed (subscription required after trial) | Stripe-billed monthly/annual | Premium positioning |

**Implication**: a $15/yr floor exists and is staked out by Inning Wizard. WoS plays at the premium end. The middle ($40–80/yr) is contested by Dugout Boss / LineupIQ with AI + visual differentiators. Coach Platform's tournament-rulebook + workload-passport story can justify the **premium tier** ($120–180/yr), but we'll want a free tool (e.g. cross-body pitch-count calculator) to feed the funnel — Dugout Edge's adjacent-tools strategy is the proven pattern.

### 11.5 Net additions to Borrow / Improve / Ignore (deltas from §9)

**Add to BORROW**
- Competitive ↔ Fair slider (one control re-weighting the optimizer).
- Recreational vs Competitive **modes** (presets of the slider for less-technical coaches).
- Visual Position Pools (Primary / Backup / Emergency drag-drop) as the Position Trust Matrix UI.
- Multi-game / weekend batch generate, with shared pitcher ledger.
- Paste-roster onboarding.
- AI schedule import from photo of bracket.
- Branded printable umpire exchange card + field diagram.
- CSV export day one.
- PWA delivery (install-like-app, no app store at launch).
- Co-ed M/F field-ratio rules for softball / coed-rec markets.
- Top/Middle/Bottom batting-order balancing across the season.
- Pitcher role classes (SP / RP / CL) with cross-game innings limits.
- DH / DP-FLEX / EH live validation for HS / College tier.
- Suite-of-products framing (Practice IQ / Workload IQ / Development IQ as siblings).
- Coaching content moat (podcast or article series).
- Free adjacent tool for top-of-funnel (e.g. "Cross-Sanctioning Pitch-Count Calculator").

**Add to IMPROVE**
- AI swap suggestions **with explainability** (metric attribution per swap).
- Game Day Mode merged with the Quick Reference chip strip — one screen, both functions.
- Persistent fairness metric with a publishable number (Coach Joel's marketing playbook), but computed against development *and* equality goals.

**Add to IGNORE**
- Generic "AI" branding without grounded rationale — every competitor is starting to do this; we won't out-buzzword them, we'll out-explain them.
- Static practice templates (Dugout Edge style) — Practice Compiler must be dynamic per player or it's table-stakes parity.

---

## 12. Deep Dive — Pricing, Algorithms, Suites, and Adjacent Tools

Second-pass crawl of pricing pages, feature pages, app pages, and adjacent tools across all five competitors.

### 12.1 Pricing landscape — actual numbers

| Product | Tier | $/yr | Team cap | Player cap | Key gate |
|---|---|---:|---:|---:|---|
| Inning Wizard | Individual Coach | **$15** | 2 | 16 | 9 innings, season history, CSV import/export |
| Inning Wizard | Rec Group | **$119** | 10 | — | 2 divisions, league admin dashboard, bulk CSV, co-admins free |
| Inning Wizard | League / Unlimited | **$499** | ∞ | — | Unlimited divisions, full admin controls |
| Dugout Boss | Starter | **$20** | 1 | ∞ | AI optimizer (included in all plans) |
| Dugout Boss | Coach | **$30** | 5 | ∞ | Team cloning, email support |
| Dugout Boss | Club | **$500** | ∞ | ∞ | Multi-coach access (coming soon) |
| Dugout Edge | Pro | **~$60** ($8/mo, save 38% annual) | ∞ | ∞ | Full field view (all innings), advanced algorithm, lock-and-shuffle, drill library, practice plans, custom drills, priority support |
| Dugout Edge | League | "group pricing" (contact) | — | — | Org-wide rollout |
| Coach Joel's Way | App (iOS/iPad) | Not stated; iOS subscription via App Store | — | — | "Premium" features hinted at org/season level |
| LineupIQ | Free start, no CC | — | — | — | Pricing not published; "install like an app, no app store" PWA |
| WoS | Premium (subscription required after trial) | Stripe-billed, not publicly listed | — | — | Whole-team subscription unlocks for all members |

**Pricing implications**:
- **Sub-$20/yr floor**: Inning Wizard ($15) and Dugout Boss Starter ($20) — entry single-coach tier is a commodity. Coach Platform shouldn't compete here unless we want top-of-funnel.
- **$25–60/yr middle**: Dugout Boss Coach ($30), Dugout Edge Pro (~$60) — multi-team coaches and serious volunteers. This is where features matter.
- **$120/yr small-league**: Inning Wizard Rec Group ($119) — first real league tier. **Includes free co-admins** — important pricing innovation, eliminates "do we need to pay for every coordinator" friction.
- **$500/yr enterprise**: Dugout Boss Club and Inning Wizard League both land at ~$500/yr for unlimited everything. This appears to be the ceiling for "small org/club." Real leagues (100+ teams) likely on custom quotes.
- **Founding Leagues**: Inning Wizard's GTM hook — first 5 qualifying leagues free for a season in exchange for feedback. Worth borrowing for Coach Platform launch (manual review = quality signal, not just freemium).

### 12.2 Algorithm transparency — what each product actually publishes

WoS keeps its lineup engine a black box. Competitors increasingly *publish* their algorithms as a trust signal.

**Coach Joel's Way — most detailed published algorithm in the scan**:
- Branded as **Top • Middle • Bottom Band Fairness Algorithm**.
- **Mechanics**: divide the lineup into thirds (dynamic band sizing for non-multiples of 3). Extra players go to the Middle band. Track every player's career band totals (Top/Mid/Bot counts) *plus* per-exact-slot counts (#1, #2, #3...).
- **Cross-band rotation**: players with most Top starts drift to Bottom; most Bottom drift to Top.
- **Intra-band rotation**: inside each band, slots are filled by the player with fewest historical starts at that exact slot.
- **Tie-breakers**: band totals → current order.
- **Visualization**: color-coded bands with gradients showing last→this game movement; per-slot count badges; "Fairness Applied" status pill.
- **Defensive engine**: separate **modified CSP (Constraint Satisfaction Problem) solver** with backtracking + forward checking.
  - **Hard constraints**: 1 player / position / inning, no excessive consecutive position assignments (≤2 in a row).
  - **Soft constraints**: position preferences (favorite / OK / disliked), skill level (optional gate for P/C).
  - **Multi-factor fairness score** per candidate assignment: historical position frequency, bench equalization, preference match.
  - **Optimization passes** improve fairness scores without violating constraints.
  - **Summary notes** after generation: "what the system filled in, what stayed locked" — explainability baked into output.

**Dugout Edge** publishes a "competitive priority slider" but algorithm is described, not opened.

**Dugout Boss** publishes only marketing language ("AI", "smart rotation") — no mechanics.

**Inning Wizard** publishes plain-English principles: "every kid plays infield and outfield, bench time spread evenly, position preferences for P/C stick, drag-drop is the final 5%."

**LineupIQ** focuses validation, not generation: "DH / DP-FLEX / EH validated in real time."

**Implication for Coach Platform**: publishing the algorithm is a moat. Coach Joel's playbook is the model — describe both the **fairness scoring function** and the **constraint solver** in plain language with diagrams, and give each algorithm a **brand name**. Suggested names:
- **Position Trust Matrix** (the learned eligibility model)
- **Development Ledger** (the fairness + development credit/debit system)
- **Workload Passport** (the cross-sanctioning pitcher/catcher fatigue ledger)
- **Game Script** (the lineup generator that combines all three)

### 12.3 Adjacent free tools — the funnel pattern

Dugout Edge has the deepest free-tools ecosystem in the scan, all serving as SEO landing pages and funnel entries:

**Dugout Edge tool inventory**:
- Lineup Generator (free, premium gates Save/Lock/Shuffle/Full-Field)
- **Practice Planner** — 240+ drills tagged by age + 11 skill focus areas (Hitting · Throwing · Infield · Outfield · Pitching · Catching · Baserunning · Team Defense · Warmup · S&C · Mental Skills · Fun/Games). **Resource accounting**: select quantities of Full Field / Batting Cage / Bullpen / Infield Only / Open Space; specify # of coaches; auto-builds station rotations. Sample plan: 10/20/20/20/15/5 (Warmup/Hit/Field/Team Def/Live/Cool). Marketing claim: "8–10 swings/hr with one cage → 40+ swings/hr with 4 stations = 4× more reps."
- **Virtual Scoreboard** (free)
- **Schedule Maker** (free)
- **Scorekeeper App** — free, no account, runs in browser. Tracks ball/strike/foul with auto-walk/auto-K, all hit types (1B/2B/3B/HR), all out types (ground/fly/line/pop/K/sac bunt/sac fly/DP). LED scoreboard with live base runners. **Live stats**: AVG, OBP, H, RBI, BB, K. Per-game summary with category leaders. **Undo button**. Hit location "coming soon." Season-long stats arriving 2026.
- **Tournament Bracket Generator** (free) — single elim, double elim, pool play
- **Lineup Card Templates** (free PDFs) — Tee ball / Little League / USSSA / DP-FLEX variants
- **Scorebook Generator** (custom multi-game scorebook with cover + roster, DP/FLEX option)
- **Scorecards** (printable PDFs)
- **9 Baseball Calculators**
- **Drill Library** (240+) — public preview, full library is premium
- **Coaching Handbook + Glossary** (70+ terms)
- **Practice Plans** library
- **Free Coaching Guides**

**The pattern**: every adjacent tool is (1) free, (2) keyword-targeted for SEO ("free baseball lineup generator", "softball scorekeeper app"), (3) lightly funnels to the paid product via "Save this for next time" / "Premium unlocks unlimited" prompts. Most tools work without an account; account creation only triggers when the user wants persistence.

**Implication for Coach Platform**: ship at least one free adjacent tool at launch as the funnel front-door. Recommended:
- **Cross-Sanctioning Pitch-Count Calculator** — input pitches by date, get rest-day clearance under LL / PG / TTB / USSSA / NFHS / AAU simultaneously. Nobody offers this. Maps directly to our §10 vision and proves the rulebook differentiation without a signup.
- **Tournament Rule Diff** — pick body A + body B + age, get the diff (pitch caps, time limits, mercy, stealing) side-by-side.
- **Free batting-order fairness analyzer** — paste your season's lineups, get a per-player band heatmap.

### 12.4 Coach Joel's Way — the "fairness brand" deep dive

The most distinctive marketing position in the scan. Worth dissecting because it's the most defensible.

**The 4-tier role hierarchy** (more granular than WoS or Dugout Boss):

| Role | Access | Use case |
|---|---|---|
| **Owner** | Full Access — manage roles, delete/archive, org settings | Organization founders |
| **Admin** | Operational Control — create seasons/teams, manage staff, oversee schedules | Season coordinators |
| **Head Coach** | Day-to-Day — lineup builder, player notes, game management | Head coaches |
| **Assist Coach** | Focused Access — view lineups, record results, limited roster edits | Assistant coaches |

**Three-pillar IA**: Organization → Season → Team. Seasons are first-class objects (year-over-year data isolation). WoS does League → Team but doesn't surface Season as a pillar.

**Snack signup (theirs vs WoS)**:
- WoS: single toggle, auto-rotates, emails linked parents.
- Coach Joel's: **public signup page (no login)**, allergy warnings, custom instructions, reminder emails, parent-roster integration so parents sign up on behalf of specific players.
- WoS loses on this surface — parents shouldn't need an account to sign up for snack.

**Lineup History page**:
- Per-game: full batting order with positions played each inning, plus opponent / date / result.
- Per-player season view: **Top/Middle/Bottom band counts**, defensive position breakdown (per-position innings) split by infield / outfield / bench. Games-participated counter, total innings, games-not-played.
- Visual: color-coded bands, gradients showing movement from last game.

**GameChanger import**: not just ICS — three separate imports: **Schedule, Stats, Locations**. WoS only does schedule via ICS.

### 12.5 LineupIQ — the suite strategy deep dive

LineupIQ is the most strategically interesting competitor because they're building a *suite*, not a tool. Two sibling products are publicly announced (both "currently in development"):

#### Framework IQ — catcher analytics on a phone

| Capability | Detail |
|---|---|
| Capture | In-app 1080p/60fps with real-time pitch marking; or import from camera roll. Multi-lens + pinch-zoom + frame-accurate scrubbing. |
| Framing analysis | **Three-point annotation** → 4 metrics: **Smoothness · Efficiency · Directional Gain · Stability** |
| Pop-time analysis | Timestamp markers for **Catch · Release · Arrival** → split into Exchange Time vs Ball Flight Time. **Sub-2.00s = Elite** grade. |
| Strike zone | **AI strike zone detection** from a single frame — no manual zone setup |
| Session management | Group clips into Game / Bullpen / Practice; dashboards with zone heat maps, radar charts, grade distributions, pop time trends |
| Export | **Annotated video** with metrics burned in — optimized for scout/recruiter sharing |
| Calibration | Separate models for baseball (60'6") and softball (43') |

**Why this matters for Coach Platform**: Framework IQ proves the **"smartphone replaces stadium hardware"** thesis for one position. We should plan an analogous **Workload IQ** that uses phone video + IMU sensors to measure catcher squat reps and pitcher mechanics fatigue — same productization model, broader fatigue ledger.

#### Scouting IQ — pitch-by-pitch + AI scouting

| Capability | Detail |
|---|---|
| Pitch tracking | **Tap-drag-release** interface for pixel-accurate location and result. Auto-tracks count / outs / runners / score. |
| AI Scouting Reports | Feed historical game data → AI-generated brief: threat levels, tendencies, strategic recommendations. |
| **AI Lineup Card Scanning** | Photo a handwritten or printed opponent lineup card → AI extracts names, jersey #, positions, batting order. **Eliminates manual opponent entry entirely**. |
| Heatmaps | **5×5 zone heatmaps** for pitcher command + hitter tendencies |
| Spray charts | Every batted ball plotted by type/outcome |
| Pocket Cards | Printable **3×5" defensive positioning cards** per batter — handed to fielders before each AB |
| Pre-Pitch Intelligence | Count-specific tendency display ("swings at first pitch 68%") shown when pitcher needs it most |
| Practice Modes | 3 specialized: **Bullpen** (pitcher command/arsenal) · **Batting Practice** (plate discipline/swing decisions) · **Live ABs** (full simulated AB) |
| Staff collab | **5 roles**: Admin / Head Coach / Staff / Player / Viewer |

**Design philosophy** (explicitly stated): **Dark-mode first** (sunlight visibility), **one-handed use** (large touch targets, gestures), **local-first/offline** (data stored on-device immediately, sync in background), **speed over everything** (zero network latency in live action, no spinners).

**Why this matters**: Scouting IQ's **5-role permission model** extends beyond the 4-role coach hierarchy that WoS / Coach Joel's use. Notably adds:
- **Staff** (non-coach analysts — important for HS/college programs)
- **Player** (kid-facing access — long-asked, nobody else ships this)
- **Viewer** (read-only public)

Coach Platform should adopt the 5-role model. Adding **Player** and **Viewer** roles to our spec unlocks the kid-facing PWA and the parent-facing share view as proper role grants instead of bolt-ons.

**Tools to outright copy from Scouting IQ**:
1. **AI Lineup Card Scanning** — kills the worst data-entry friction in the entire category.
2. **Pocket Cards** (printable per-batter defensive positioning cards) — physical artifact, hard to compete with digitally, cheap to print.
3. **Pre-Pitch Intelligence** chip — count-specific tendency display. Marries directly with our §10 Quick Reference chip strip.
4. **Tap-drag-release** pitch entry — the right gesture for one-handed phone use in the dugout.
5. **Dark-mode first + offline-first** as explicit design tenets. Both are table-stakes for any dugout product; nobody but LineupIQ has called it out.

### 12.6 Dugout Boss — what their FAQ reveals

Dugout Boss's public FAQ is sparse (6 questions: fielding rotation, position restrictions, edit specific inning, batting order, save lineups, share lineup) — suggesting their UX is simple enough not to need a help center. But pricing reveals the product strategy:

- **AI optimizer included in ALL plans** (recent change — was likely a premium gate before).
- **Team cloning** is a paid-tier feature at $30/yr. Worth noting: this is a small feature with disproportionate retention value.
- **Multi-coach access** is "coming soon" even at the $500 Club tier. Suggests Dugout Boss is still single-coach per account today — surprising for the price.
- No native mobile app — web-only despite "Game Day Mode" being heavily marketed.

### 12.7 Inning Wizard — the league GTM model

The **For Leagues** page is the most instructive league-tier pitch in the scan:

- **Multi-level admin hierarchy**: League admin → Co-admin/Division manager → Head coach → Assistant.
- **Co-admins DO NOT need paid subscriptions** — one paid invoice covers all administrators within the org. (Critical pricing decision; Coach Platform should match.)
- **CSV column auto-detection** for major team-management platforms (TeamSnap, GameChanger, etc.) — onboarding pattern: import the CSV the league already has rather than rebuild rosters.
- **Bulk roster import**: single CSV upload populates every team, division, and player at once.
- **Founding Leagues program**: first 5 qualifying leagues get full League plan FREE for one season in exchange for written feedback within 30 days. "Manually reviewed — real leagues only." Cheap, high-signal GTM.
- Positioning: "fair lineups + league management, one tool" — solving the two-tools-becomes-one problem.

**Coach Platform actions**:
- Match the **co-admins-free** pricing model at our league tier.
- Ship CSV column auto-detection from TeamSnap, GameChanger, SportsEngine, LeagueApps exports.
- Run a **Founding Leagues** equivalent at launch — 5–10 hand-picked leagues free for a season.

### 12.8 Dugout Edge — the practice planner mechanic to steal

Dugout Edge's Practice Planner is the only well-developed practice tool in the scan, and it's worth dissecting because it's *exactly the wedge feature* we planned (Practice Compiler).

**Inputs**:
- Start time + duration (45/60/75/90 min)
- Sport + Age Group
- **Number of coaches** (drives concurrent station count — every coach = a station)
- **Focus areas** (11 selectable): Hitting · Throwing · Infield · Outfield · Pitching · Catching · Baserunning · Team Defense · Warmup · Strength & Conditioning · Mental Skills & Game IQ · Fun, Games & Competition
- **Field resources** (quantity selectors): Full Field · Batting Cage · Bullpen Area · Infield Only · Open Space
- Optional roster (assigns specific players to specific minutes)

**Output**:
- Time-blocked plan with stations (e.g. 10/20/20/20/15/5 = Warmup/Hit/Field/TeamDef/Live/Cool)
- Drill selections from 240+ library, age-tagged
- Equipment list per station
- PDF export

**What's missing (our opportunity)**:
- **Not tied to development goals** — drills are generic-best-fit, not "Hudson needs work at SS."
- **No per-player practice ledger** — no concept that "Player A got 12 SS reps over the last 5 practices, needs 8 more this month."
- **No drill outcome capture** — the practice plan goes out, but coach has no way to log "kid struggled with X" back into the system.
- **Static drill library** — no learning loop from outcomes.

**Coach Platform Practice Compiler v1 design** (informed by this):
- Same input scaffold (time / coaches / facility resources / focus areas) — copy the UI.
- **Plus**: per-player development goals as input (auto-pulled from Position Trust Matrix gaps + injury-return protocols + coach-set goals).
- **Plus**: drill outcome capture during practice (one-tap "got it / needs work" per player per drill).
- **Plus**: per-player practice ledger that accumulates reps by position/skill and shows progress vs goals.
- Result: a practice plan that *learns*, not just a template that generates.

### 12.9 Net additions to Borrow / Improve / Ignore (deltas from §11.5)

**Add to BORROW**
- **AI Lineup Card Scanning** (Scouting IQ) — photo opponent lineup → extract roster. Single highest-value friction kill in the scan.
- **Pocket Cards** (Scouting IQ) — printable per-batter 3×5" defensive positioning cards.
- **Pre-Pitch Intelligence chip** (Scouting IQ) — count-specific tendency display, merges into our §10 Quick Reference strip.
- **Tap-drag-release** gesture (Scouting IQ) — for pitch entry and any one-handed dugout interaction.
- **Dark-mode-first + Local-first/offline + Speed-over-everything** as explicit design tenets — codify in our design system doc.
- **5-role permission model** (Scouting IQ): Admin / Head Coach / Staff / Player / Viewer. Adopt as our canonical role list.
- **Public snack signup with allergy warnings, custom instructions, no login** (Coach Joel's) — generalize to "Team Duties" public signup.
- **Three-pillar IA**: Organization → Season → Team (Coach Joel's). Season as a first-class object enables year-over-year data isolation.
- **Modified CSP solver with summary notes** (Coach Joel's) — both the engine and the explainability output.
- **Co-admins-free pricing** at league tier (Inning Wizard) — one paid invoice covers all coordinators.
- **CSV column auto-detection** from major team-management platforms (Inning Wizard) — onboarding accelerator.
- **Founding Leagues GTM** — hand-pick 5–10 leagues for free season in exchange for feedback.
- **Team Cloning** (Dugout Boss) — small feature, high retention value across seasons.
- **Field-resource accounting** in Practice Compiler (Dugout Edge) — full field / cage / bullpen / infield-only / open-space quantity inputs.
- **11-focus-area taxonomy** (Dugout Edge) — adopt as the standard skill axes for both Practice Compiler and Position Trust Matrix.
- **Branded fairness sub-metrics** (Coach Joel's playbook) — name each algorithm (Position Trust Matrix, Development Ledger, Workload Passport, Game Script).
- **Free adjacent tool as funnel front-door** (Dugout Edge playbook) — ship Cross-Sanctioning Pitch-Count Calculator at launch.
- **Sub-2.00s "Elite" grading** (Framework IQ) — use named tier grades, not just numbers, in our analytics.
- **9 baseball calculators + 70+ term glossary** (Dugout Edge) — SEO content moat.

**Add to IMPROVE**
- **Practice Compiler as a learning loop** (vs. Dugout Edge's static templates) — close the practice→outcome→goal cycle.
- **Algorithm transparency as a marketing surface** (Coach Joel's playbook) — publish our algorithms with diagrams, give them brand names, show before/after data.
- **Multi-coach access at every paid tier** (vs. Dugout Boss gating it behind "coming soon" at $500) — collaborative editing is table stakes.
- **Season-aware data model from day one** (vs. WoS treating season as a label) — Season is a first-class object that owns rosters/positions/schedule.

**Add to IGNORE**
- iOS-only releases at launch (Coach Joel's) — PWA-first cross-platform beats native-iOS-only.
- Hit-location "coming soon" placeholders — don't ship placeholders, ship working features only.
- Web-only Game Day Mode (Dugout Boss) — if we ship a Game Day surface, it must be installable PWA with offline support.
- Sparse FAQs as the support story — invest in contextual `?` chips on every settings row that deep-link to Help.

### 12.10 Updated pricing recommendation for Coach Platform

Based on the full landscape:

| Tier | $/yr | Cap | Differentiation |
|---|---:|---|---|
| **Free** | $0 | 1 team / 12 players / current season only | Cross-sanctioning pitch calculator + read-only Press Box + parent RSVP — funnel front-door |
| **Coach** | $39 | 2 teams / unlimited players / season history | All algorithms (Position Trust, Development Ledger, Workload Passport, Game Script), full rulebook library, Quick Reference chip strip, PWA |
| **Multi-Team** | $79 | 5 teams / team cloning / staff collaboration | Adds Practice Compiler, Scouting Companion (basic), assistant coach roles, Player/Viewer access |
| **Club** | $299 | 25 teams / 5 divisions / co-admins free | League admin dashboard, CSV bulk import, Founding Leagues program |
| **League** | $799 | Unlimited teams + divisions | Full multi-coach collaboration, custom branding on print cards, SSO, dedicated support |
| **Enterprise** | Custom | — | Conference/state federation contracts, white-label, analytics export |

**Rationale**:
- $39 Coach tier sits between Inning Wizard ($15) and Dugout Edge (~$60). Justifies the premium with rulebook library + Quick Reference chip + Game Script generator.
- $79 Multi-Team adds Practice Compiler and Scouting Companion — neither competitor ships both at this price.
- $299 Club is below Dugout Boss Club ($500) but above Inning Wizard Rec Group ($119). Includes co-admins-free pricing innovation.
- $799 League beats Inning Wizard League ($499) but adds custom branding, SSO, and dedicated support — moves up-market.

---

## 13. Open Questions for User Testing

1. **Does Game Script need to be visible to parents in Press Box?** WoS shows lineup only after game start; we should test "lineup intent" vs. "lineup final."
2. **How much of Workload Budget should be auto-enforced vs. advisory?** WoS hard-blocks pitch-rest violations; consider a soft-block with override + audit trail.
3. **Practice Compiler attendance**: does it consume the same `Roster` tab attendance toggle as games, or separate?
4. **Player PWA scope**: read-only at launch (availability + lineup view), or include drill self-rating?
5. **League admin role**: does it need its own dashboard, or does it overload the Head Coach surface with a scope-switcher?

---

*Compiled from authenticated crawl of whosonsecond.com, May 2026. All real player names, emails, and IDs from the source account are redacted from this document.*
