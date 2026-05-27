# Who's on Second!? — UI / UX Reference

Structured reference compiled from a full authenticated crawl of `whosonsecond.com` (Coast Diamondbacks team, Coach Plan account) on **May 26, 2026**, plus the public `/demo` and marketing surfaces. Purpose: inform the Coach Platform product spec by mapping every surface to a **Borrow / Improve / Ignore** judgment. All real names, emails, and IDs from the source account have been redacted in the discussion sections; raw values appear only where structural (e.g., URL slugs).

---

## 1. Stack & Platform Signals

| Signal | Value |
|---|---|
| Framework | Next.js App Router (RSC payloads observable in `?_rsc=` requests) |
| Hosting / CDN | Cloudflare (RUM beacon `/cdn-cgi/rum`; Cloudflare Turnstile on login) |
| Auth methods | Google · Apple · Passkey · Email magic link · Email + password (with optional 2FA) |
| Billing | Stripe Customer Portal (payment method, invoices, cancellation) |
| Mobile | Native iOS app v1.4.0 (web is system of record; iOS is a thin client that gains features asynchronously) |
| Error reporting | Sentry (minified React errors surfaced in console; `browser.sentry-cdn.com` allowlisted in CSP) |
| CSP | `script-src 'self' 'nonce-…' 'strict-dynamic' https://browser.sentry-cdn.com` — Cloudflare email-decode script is *blocked* by their own CSP, leaving a recurring console error |
| Bottom tab nav | Web shell mirrors iOS tab bar — same 5 tabs on desktop and mobile (Home · Games · Roster · Pitching · More) |
| Internal APIs visible from network failures | `/api/tours`, `/api/announcements` (in-app onboarding tours + product announcement system) |

### 1.1 Notable build artifacts

- All client JS in one bundle (`/_next/static/chunks/<hash>.js`), minified, sourcemaps not exposed.
- React production build (Minified Error #418 — hydration mismatch — surfaces on Press Box & Profile, suggesting some server/client time-dependent rendering).
- Service worker not detected.

---

## 2. Information Architecture Map

### 2.1 URL grammar (verified May 26, 2026)

```
/                                                  marketing home
/demo                                              public sandbox (2h, no signup)
/login  /signup  /forgot-password                  auth
/dashboard                                         post-auth landing (redirects to last-active team)
/profile                                           account profile (subscription, security, prefs)
/pricing                                           upgrade / switch plans
/help                                              help center (single page; 21 accordion sections + ticket form)
/more                                              ⚡ GLOBAL More menu (was team-scoped in prior crawl)
/press-box                                         ⚡ GLOBAL changelog feed (was team-scoped)
/ref/{code}                                        referral landing

/teams/{slug}                                      team home dashboard (calendar + Next Up + Recent + To-Do)
/teams/{slug}/roster                               roster (Positions | Stats tabs)
/teams/{slug}/roster/new                           add player form
/teams/{slug}/roster/{playerId}                    player detail
/teams/{slug}/games                                games list (Upcoming / Needs Attention / Completed)
/teams/{slug}/games/new                            new game form
/teams/{slug}/games/{gameId}                       game (Field | Roster | Summary tabs)
/teams/{slug}/games/{gameId}/stats                 post-game review + pitch entry
/teams/{slug}/games/{gameId}/print                 printable lineup card
/teams/{slug}/games/{gameId}/edit                  ❌ 404 — edit lives in Tools dropdown
/teams/{slug}/pitching                             pitching availability board
/teams/{slug}/fairness                             season-long fairness table
/teams/{slug}/settings                             team settings (accordion of rule categories)
/teams/{slug}/apply-rule-set?returnTo=…           rule-set wizard (full page, not modal)
```

### 2.2 Global vs team scope (recent IA shift)

Prior crawl had `/teams/{slug}/more` and `/teams/{slug}/press-box`. As of this crawl those are **hoisted to root** (`/more`, `/press-box`). The active-team chip stays in the header, but cross-cutting menus (changelog, settings entry, help, profile, signout) no longer require a team in scope. Breadcrumbs on Fairness / Settings / Press Box / Help / Profile all say **"Back to More"** linking to `/more`.

**Implication:** they're treating the user (not the team) as the navigation root for everything except game/roster/lineup workflows. This matters if/when they ever support cross-team views or league admin roles.

### 2.3 Bottom-tab nav (5 tabs, always visible, web + iOS)

| Tab | Target | Notes |
|---|---|---|
| Home | `/teams/{slug}` | Team dashboard |
| Games | `/teams/{slug}/games` | Schedule + status buckets |
| Roster | `/teams/{slug}/roster` | Player table |
| Pitching | `/teams/{slug}/pitching` | Availability board |
| More | `/more` | Catch-all |

The Pitching tab being top-level (not buried under More) is the single strongest signal that **pitch-count compliance is their #1 use case after the lineup itself**.

---

## 3. Auth

- **Login URL:** `/login?callbackUrl=…` (Next-Auth style return-URL). Page hero: "Welcome Back — Your lineups, pitch counts, and fairness data are waiting."
- **Sign-in options (in order):** Continue with Google · Continue with Apple · Sign in with Passkey · then email + password form, with secondary buttons "Resend email verification" / "Send magic email link instead."
- **Below the fold:** "Don't have an account? Create an account" + "Want to see how it works? Try the interactive demo" → `/demo`.
- **Cloudflare Turnstile** preloaded but invisible until challenge needed.

**Borrow:** the "Try the interactive demo" CTA on the login screen — a try-before-buy escape hatch that costs them nothing because the demo is just a seeded sandbox. We should mirror this for the Coach Platform with a 15-minute coach-mode sandbox seeded with a "U10 Spring" team.

---

## 4. Team Home (`/teams/{slug}`)

### 4.1 Layout

```
┌───────────────────────────────────────────────────────────┐
│ [TeamChip ▼]                                  [User: RC] │  ← header (banner)
├───────────────────────────────────────────────────────────┤
│ Coast Diamondbacks         [↺ Replay dashboard tour]      │  ← h1 + tour replay
│                                                           │
│ ┌──────────── Calendar (current month) ─────────────────┐ │
│ │ ◀ May 2026 ▶                                  [Today] │ │
│ │ Sun Mon Tue Wed Thu Fri Sat                          │ │
│ │  …grid with game pills inside day cells…             │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                           │
│ ┌── Next Up ──────────────────┐  ┌── To-Do ───────────┐  │
│ │ vs Marlins · Wed May 27     │  │ [+ Add reminder...] │  │
│ │   6:00 PM · Field address    │  │ No reminders yet    │  │
│ │   [Imported] [Ready]         │  └────────────────────┘  │
│ │   View details · Edit lineup │                          │
│ │   [edit][delete]             │                          │
│ ├── Recent Results ──────────┤                          │
│ │ vs Reds · Wed May 20 ✓     │                          │
│ │ vs Reds · Sat May 16 ✓     │                          │
│ │ vs Phillies · Mon May 11 ✓ │                          │
│ │ vs Red Sox · Sat May 9  ✓  │                          │
│ │ vs Cubs · Mon May 4 ✓      │                          │
│ └────────────────────────────┘                          │
│                                                           │
│ Team ID: cmmjhbvm…01mf10thj860 📋                        │
└───────────────────────────────────────────────────────────┘
│  Home   Games   Roster   Pitching   More  │  ← bottom tab nav
```

### 4.2 Notable details

- **Calendar dots** show every scheduled game in-month; tapping a date with a game opens the game directly. Days with multiple games show stacked links inside one cell.
- **Next Up card** carries badges `Imported` (came from a calendar/GameChanger source) and `Ready` (lineup status). Inline action chips: *View details*, *Edit lineup*, plus an `[edit game]` / `[delete game]` cluster.
- **Recent Results** card lists last 5 completed games with mini-cards, each with `Imported` + `Completed` badges and edit/delete affordances.
- **To-Do** is a freeform reminder list scoped to the team; lives next to Recent Results, not on its own page.
- **Team ID** is exposed at the bottom with a copy-button — clearly meant for support tickets / integration.
- **`[Replay dashboard tour]`** button next to the H1 → re-runs the in-app onboarding tour (one of several; see §11).

**Borrow:** the *Next Up* + *Recent Results* + *To-Do* triad is a fantastic post-auth landing. Cognitive load is "what's next, what just happened, what do I owe." No KPIs, no fluff.

**Improve:** their To-Do is just text reminders. Ours should auto-populate task chips from rule violations and missed pitch entries.

---

## 5. Roster (`/teams/{slug}/roster`)

### 5.1 Tabs: **Positions** | **Stats**

The default *Positions* tab is a sortable table; each column header is a button (climbing-rank icon = sortable).

**Columns:** `#` (jersey) · `Player` · `P` `C` `1B` `2B` `SS` `3B` `LF` `CF` `RF` · `B/T` · `Parents` · `Notes`

**Cell legend (position ratings — printed below the table):**

| Code | Label | Meaning |
|---|---|---|
| O | Only | Only player capable at this position |
| P | Primary | Top choice |
| S | Secondary | Comfortable |
| E | Emergency | Last resort |
| N | Never | Do not play |

**Row decorations:**
- Avatar = initials chip (e.g., `MM`).
- Inline badges on the player name: `Can pitch` (baseball icon), `Can catch` (mask icon), `Injured` (text label, not icon — visually weaker than the other two).
- Each row links to `/teams/{slug}/roster/{playerId}`.

### 5.2 Header actions

- `[↺ Replay roster tour]`
- `[Import CSV]` — modal upload
- `[+ Add Player]` → `/teams/{slug}/roster/new`

### 5.3 Below the player table — **Staff** and **Parents** panels

```
Staff:
  • Head Coach   (current user)
  • Assistant Coach × N
Parents:
  No parent accounts on this team
```

Each staff entry shows avatar initials, role label, and email. Parents section is empty until parents accept invitations (see §8.3).

### 5.4 Observed roster shape

12 players · 7 can pitch · 3 can catch · 1 marked Injured. Jersey numbers are noncontiguous (1, 3, 4, 5, 6, 7, 8, 10, 11, 12, 17, 20).

**Borrow:** the OPSEN scale (Only / Primary / Secondary / Emergency / Never) is dense and immediately readable across a wide table. We're proposing a similar scale in the coach-platform builder.

**Improve:** their `Injured` flag is just a string; no expected-return date and no impact on suggestion algorithms is visible from the table (the algo *does* honor it — see Press Box May 6 entry).

---

## 6. Pitching Availability (`/teams/{slug}/pitching`)

### 6.1 Layout

- H1 "Pitching Availability" / sub "Roster pitching eligibility at a glance"
- **Status banner** at top: green check + "All Pitchers Available — N pitchers ready — no rest restrictions"
- **Table** of every pitcher:

| Column | Content |
|---|---|
| Player | avatar + name + jersey + "Pitcher" badge |
| Status | colored pill (e.g., `Available`) |
| Last Pitched | date + `N pitches · vs {Opponent} · NN% strikes` |
| This Week | weekly pitch count vs limit (currently `—` for all) |
| Limits | rest-day status (currently `—`) |
| Details | freeform note (e.g., `No rest required`) |

- **Rest Day Thresholds** card below the table:

| Pitches | Required Rest |
|---|---|
| 1–20 | No rest |
| 21–35 | 1 day |
| 36–50 | 2 days |
| 51–65 | 3 days |

Footer note: *"Using team-configured thresholds"* — meaning these are pulled from Settings → Pitching Limits, not hard-coded.

### 6.2 Data signals

- Strike % is captured per outing — implies they have at least pitch-level outcome data (ball/strike), not just totals. That's substantially deeper than most youth tools.
- Even when zero players need rest, the entire table renders so coaches see the pitch totals at a glance.

**Borrow:** the pitch-count + strike-% line per outing as a single dense row. We've already speced this for our compiler but seeing it shipped reinforces the priority.

**Improve:** add **projected** availability (e.g., "available Tue if you use ≤20 pitches today"). Their UI is reactive; ours should be planning-aware because we're already building schedule context.

---

## 7. Games

### 7.1 List view (`/teams/{slug}/games`)

Three buckets, always present even when empty:

1. **Upcoming** — future games with `Lineup ✓` indicator, optional `Notes` badge, status pill (`Ready` / `Draft`).
2. **Needs Attention** — past games missing pitch-count entry or some other completion step.
3. **Completed** — chronological history with `Lineup ✓` and `Completed` badges.

Every row: date · time · address · innings count · status pills + inline `[edit game]` icon.

Header has `[+ New Game]` linking to `/teams/{slug}/games/new`.

**Borrow:** the *Needs Attention* bucket is the right metaphor for nudges. A coach who opens this list immediately sees what's blocking them, which is the closest thing to a "what do I owe" screen on the site.

### 7.2 Game detail (`/teams/{slug}/games/{gameId}`)

#### 7.2.1 Header bar

```
vs Marlins (Coast)                                 [Game Stats →]
Wednesday, May 27 · 6:00 PM · {address} · 6 innings
```

#### 7.2.2 Inning ribbon + Tools

```
[1][2][3][4][5][6] [−][+] ………………………………  [Tools ▾]
```

- Inning buttons toggle which inning the field view shows.
- `[−]/[+]` adds or removes innings (variable game length, 1–9 per Help).
- `[Tools ▾]` opens a dropdown (see §7.2.4).
- `[↺ Replay lineup-builder tour]` button surfaces here too.

#### 7.2.3 Sub-tabs: **Field** | **Roster** | **Summary**

The **Field** sub-tab is the lineup builder:

- ASCII representation of the diamond/outfield with a position chip in each slot (P, C, 1B, 2B, SS, 3B, LF, CF, RF), showing player initials + jersey number.
- **Bench** strip below the field listing unassigned players as draggable/tappable chips.
- Each position slot is itself a button (action menu: swap, clear, etc.).

#### 7.2.4 Tools dropdown contents (in order)

| Tool | Purpose |
|---|---|
| Undo (disabled when no history) | step back one edit |
| Version History | full per-edit timeline |
| **Revert to Draft** | back-out a `Ready` lineup to editable state |
| **Complete Game** | mark game completed, unlocking stats entry |
| Game Stats | jump to `/games/{id}/stats` |
| Edit Game Details | opens game-edit modal (this is the answer to "where's `/games/{id}/edit`") |
| Mark as Scrimmage | excludes from official fairness/stats |
| Share Lineup | generate read-only share link |
| Print | open `/games/{id}/print` |

#### 7.2.5 Rules & Compliance panel

- Header: `Rules & Compliance` + violation count badge (`No violations` green / `N violation(s)` amber).
- Each violation rendered as a card: rule name (e.g., "No Consecutive Bench"), inning chips showing where the rule fires, plain-English explanation, and a per-player breakdown:

```
No Consecutive Bench
   Innings [1][2][3][4][5]
Cannot sit out two innings in a row
  • Player A · Innings 1, 2
  • Player B · Innings 3, 4, 5
  • Player C · Innings 3, 4
  • Player D · Innings 2, 3
  • Player E · Innings 1, 2
```

#### 7.2.6 Pitching This Game

Empty state for not-yet-played games:
> No pitch counts recorded yet. Use the button below to record pitching.
>
> `[+ Record Live Pitching]`

Once recorded, this becomes a per-pitcher line list with totals.

#### 7.2.7 Game Notes

Freeform textarea ("Record notable plays or anything to remember…") with a small label *"Saves automatically as you type"*. Pre-filled with a coaching note in our sample data (e.g., a pitch-eligibility reminder).

#### 7.2.8 Footer

Delete-game icon + `Game ID: {8-char id}` copy chip.

**Borrow heavily:**
- The Tools dropdown as the home for "advanced" verbs keeps the primary UI clean.
- The Rules & Compliance card grouping violations by *rule* (not by player) is the right abstraction for a coach trying to find a fix.
- Auto-saving game notes — coaches will not push a Save button mid-game.

**Improve:** their violation panel lists players but doesn't propose a fix. Ours should one-click resolve the most common (consecutive bench → swap inning N+1 with bench).

---

## 8. Settings (`/teams/{slug}/settings`)

Breadcrumb: `More › Settings`. Top H1 "Team Settings" + `[↺ Replay team-rules tour]`. Sub "Configure rules and preferences for *{Team Name}*."

### 8.1 Section list (top-to-bottom, all collapsible accordions except where noted)

1. **Team Information** — name · sport · league · season summary in the row.
2. **Rule Set badge (non-collapsible)** — current rule set chip, e.g., `Little League Baseball: Minors (Ages 9-10)` · `Applied Mar 21, 2026 · 2026 rules · 9 from Little League · littleleague.org` link. `[Change Rule Set]` button → `/apply-rule-set?returnTo=…`.
3. **Calendar Import** — connector to import games from an external calendar (sub-options not explored here; likely ICS subscription).
4. **Defensive Play & Minimum Play** (open by default in our crawl) — see §8.2.
5. **Batting** — `3 rules · 2 Little League · 1 custom`.
6. **Pitching Limits** — `2 rules · 2 Little League`.
7. **Rest & Recovery** — `1 rule · 1 Little League`.
8. **Position Restrictions** — `3 rules · 3 Little League`.
9. **Snack Duty** — assignment + reminder system.
10. **Game Day** — game-day specific settings (lineup share defaults, share format, etc. — not enumerated here).
11. **Team Invitations** — invite Assistant Coaches / Scorekeepers / Parents + History list (accepted/pending).
12. **Transfer Head Coach** — danger-styled card; new HC's subscription unlocks the team for all members.
13. **Leave This Team** — danger-styled card; coach loses access; team data preserved.

### 8.2 Defensive Play & Minimum Play (representative rule UI)

Each rule = a row with name + plain-English description + toggle switch. Origin badge shows where the default came from (`Little League` / `Custom`). Rules with parameters reveal an inline numeric stepper when enabled.

| Rule | Default in our team | Notes |
|---|---|---|
| 4 Outfielders | off | "Splits center field into Left-Center and Right-Center — common in younger leagues with larger rosters to get more kids on the field each inning" |
| No Pitcher (coach pitch) | off | `Custom` origin |
| No Catcher | off | `Custom` origin — "Common in 6U and tee-ball leagues" |
| Minimum innings per player per game | off | numeric param when on |
| **Minimum defensive outs per game** | **ON** (6 outs) | `Little League` origin · "Every player must record at least this many defensive outs (e.g., 6 outs = 2 full innings)" |
| **No consecutive bench innings** | **ON** | `Custom` origin · "A player cannot sit out two innings in a row" |
| Equal bench time | off | "No player sits out a second inning until every player has sat out once" |
| No consecutive position innings | off | "A player cannot play the same defensive position two innings in a row — encourages rotation across the field" |
| Minimum infield innings per game | off | numeric |
| Minimum outfield innings per game | off | numeric |
| Compound minimum play | off | "Set minimum defensive, infield, and outfield innings based on game length. Longer games can require more playing time." |

### 8.3 Invitation history (observed shape)

```
{email}    Assistant Coach    Accepted M/D/YYYY   [Accepted]
{email}    Assistant Coach    Accepted M/D/YYYY   [Accepted]
```

### 8.4 Borrow / Improve / Ignore (Settings)

- **Borrow:** the origin badge (`Little League` / `Custom`) is a brilliant trust signal — a coach knows instantly whether a rule is league-mandated or self-imposed and can switch confidently.
- **Borrow:** rule descriptions written in *coach voice* ("Common in 6U and tee-ball leagues", "encourages rotation across the field"). Tight microcopy, no legalese.
- **Improve:** the categories are flat. We're proposing a "preset" tier above categories (e.g., "Apply Cal Ripken 9-10 default", "Apply our local league's house rules") so a coach changes 12 toggles in one tap.
- **Borrow:** Compound Minimum Play as a single switch that scales requirements by game length is a great example of "one toggle controls a smart policy."
- **Ignore for v1:** Transfer Head Coach + Leave This Team flows. Necessary but low priority.

---

## 9. Fairness (`/teams/{slug}/fairness`)

Breadcrumb: `More › Fairness`. H1 "Fairness Summary" · sub "Season stats across N completed games".

### 9.1 Columns

`Player` · `GP` (games played) · `Played` (innings on the field) · `Sat` (bench innings) · then one column per position (`P C 1B 2B SS 3B LF CF RF`) showing innings count, with `·` for never-played. Last column **Playing Time** is a verdict pill.

### 9.2 Verdict pills (observed)

- `Sitting more than most`
- `Even`
- `Playing more than most`

Players on the Injured list display an `INJ` chip next to their name and still appear in the table — partial-season data is included.

### 9.3 Sortability

All columns are sortable (clickable headers with sort icons). No filter UI; coaches sort to surface outliers.

**Borrow:** the per-position innings cells are the single best fairness diagnostic I've seen on a youth tool — a coach instantly sees a player concentrated at one position vs distributed.

**Improve:** the verdict pill is binary-ish (under / even / over). Ours should explain *why* and propose a swap ("If you start Player X at LF instead of Player Y next game, both verdicts move toward Even").

---

## 10. Press Box (`/press-box`)

A **public-style changelog** but actually gated behind login (hits the same shell + banner). Breadcrumb back to `/more`.

### 10.1 Layout

- Top 5 entries fully expanded with rich content (date, type pill, title, intro paragraph, bullet list, body paragraph).
- All older entries collapsed into accordion buttons grouped chronologically below.
- Entry types observed: `Feature` (gold) · `Improvement` (blue).

### 10.2 Recent changelog (Mar–May 2026)

| Date | Type | Title | Substance |
|---|---|---|---|
| May 14, 2026 | Feature | Import games from your phone's calendar (iOS 1.4.0) | Pulls title/time/location from iCal events; filterable by calendar source |
| May 6, 2026 | Improvement | Save edits without leaving Ready (iOS 1.3.2) | `Save Changes` button preserves Ready status when last-minute edits happen |
| May 6, 2026 | Feature | Press Box on iPhone (iOS 1.3.2) | In-app changelog with red-dot + "N new" pill, cross-device read state |
| May 6, 2026 | Improvement | Smarter batting order suggestions | Suggest Order + Auto-Generate now honor Absent + Injured |
| May 4, 2026 | Improvement | Print Lineup polish | Blank box score, larger inning headings, missing game-ball list |
| May 3, 2026 | Feature | Bench upcoming pitcher for warmup | |
| Apr 17, 2026 | Feature | Game day reminders on iPhone | |
| Apr 7, 2026 | Feature | Pitching Stats on Player Profiles | |
| Mar 16, 2026 | Feature | Batting Stats from Your Scorebook | |
| Mar 15, 2026 | Feature | Softball Innings Tracking | |
| Mar 13, 2026 | Feature | Rule Sets for Governing Bodies | (foundation of §8.2 origin badges) |
| Mar 12, 2026 | Feature | Late Player Tracking | |
| Mar 12, 2026 | Feature | Live Game Mode & Live Game Assistant | |
| Mar 11, 2026 | Feature | Game Ball Tracking | |
| Mar 10, 2026 | Feature | Scheduled Pitch Limits | |
| Mar 9, 2026 | Feature | Copy Previous Inning | |
| Mar 8, 2026 | Feature | Batting Order Strategies | |
| Mar 4, 2026 | Feature | Share from GameChanger | |
| Mar 3, 2026 | Feature | Batting Statistics | |
| Mar 2, 2026 | Feature | Disable Pitcher or Catcher Positions | |
| Mar 2, 2026 | Feature | GameChanger Import | |

### 10.3 Strategic read

- Their **shipping cadence is roughly 2× / week** in March, slowing to ~1/week in May. Indicative of a small team in fast post-seed iteration.
- The product wedge has moved from *baseball lineup builder* → *baseball lineup + pitch counts + fairness + import + scorebook + softball*. They're consolidating the youth-coach toolbelt.
- Notable **lack** of: practice planning, drill library, player development, parent/player-facing communication, AI coaching. **This is exactly our wedge** — they've left the field of "what happens between games" wide open.

**Borrow:** *the Press Box concept itself*. A coach-facing changelog with red-dot notification + cross-device read state turns release notes into a retention mechanic. Cheap to build, big trust payoff.

---

## 11. In-app onboarding tours (new since prior crawl)

`[↺ Replay {area} tour]` buttons appear on:

- Dashboard (`Replay dashboard tour`)
- Roster (`Replay roster tour`)
- Game detail / lineup builder (`Replay lineup-builder tour`)
- Settings (`Replay team-rules tour`)

The `/api/tours` endpoint visible in network failures confirms a server-backed tour engine (probably tracks seen/unseen state per user). This means new tours can ship without a release.

**Borrow strongly:** named, replayable, per-surface tours. Implementation hint: keep tour definitions in a JSON resource served by an `/api/tours` endpoint so we can iterate copy without a deploy.

---

## 12. Profile (`/profile`)

Breadcrumb: `More › Profile`. The page has its own simplified header (`WoS | Profile` + `Back`) — only screen besides Press Box / Help that does this.

### 12.1 Sections

1. **Header** — H1 "Your Profile" + plan chip (`Coach Plan`).
2. **Identity card** — avatar (initials) + Upload Photo (JPEG/PNG/WebP, ≤5MB) · Member since · Last login · ID (opaque 32-char string).
3. **Account Info** — Email · Name · Display Name · Phone (`Edit` opens a modal).
4. **Password** — `Change Password` (sends reset email; "Last set via email + password").
5. **Subscription & Billing**
   - Plan chip · Billing cadence (Monthly) · Next renewal · Team slots (`1 / 1 slot used`).
   - Four buttons: Update payment method · View invoices · Switch to season billing · Cancel subscription. All open the **Stripe Customer Portal**.
   - Slot-upsell card when slots are full ("Add a team slot — Sign Up to Subscribe").
6. **Referrals** — copyable link `/ref/{code}`; reward = free month for both parties once referee adds 3 players. Counter `0 / 10 used` (10-referral cap).
7. **Email Preferences** — seven toggles + a master "Unsubscribe from all":
   - Setup Reminders · Trial Updates · Tips & Features · Updates & News · Snack Duty Reminders · Post-Game Reminders.
   - Disclaimer: transactional emails (password reset, magic links, team invitations) cannot be turned off.
8. **Security** — Password reset link · Two-Factor Authentication (lazy-loaded) · Passkeys (`Add a Passkey`, lazy-loaded list) · Active Sessions (lazy-loaded device list).
9. **Delete Account** — irreversible; clarifies that *coach-created team data is preserved*.

**Borrow:** the **email preference granularity** (one toggle per category) is far better than the typical "marketing email yes/no." Coaches will trust the product more if they can keep Snack Duty Reminders on while killing Tips & Features.

**Borrow:** the referral terms ("3 players added, both earn a free month") with a hard 10-referral cap. Clear, low-fraud, and the 3-player threshold means a referred coach has to actually onboard before paying out.

---

## 13. Help (`/help`)

Breadcrumb: `More › Help`. Single page, 20+ collapsible sections + a Contact Support form + Your Tickets list at the bottom + a `[Sections]` jump button.

### 13.1 Sections (in order observed)

Getting Started · Interactive Demo · Roster Management · Building Lineups · Rule Sets · Rules Engine · Pitch Count Tracking · Games · Game Stats · Calendar Import · Fairness Summary · Parent Access · Roles & Permissions · Billing & Subscriptions · League Management · Team Settings · Snack Duty · Support Tickets · Email Preferences · Account Security.

### 13.2 Getting Started content shape (representative)

- Lead paragraph framing the product
- **How To** — numbered steps (5 in this section)
- **FAQ** — collapsible Q&A list (11 items here)
- **Tip callouts** — light-bulb icons with one-line nuggets (e.g., "You can change the number of innings per game in Team Settings. The default is 6 but can be set anywhere from 1 to 9.")

### 13.3 Contact Support form fields

- Subject (≤200 chars · counter shown)
- Category select: Bug Report (default) · Feature Request · Account Issue · General Question
- Priority select: Low · Normal (default) · High · Urgent
- Related Team select (optional; pulls from user's teams)
- Description (≤5000 chars · counter shown)
- Attachments: JPEG/PNG/WebP/GIF/PDF · ≤10MB each · drop-zone with paste-image support
- `[Submit Ticket]` button
- "Your Tickets" history list below the form

**Borrow:** single-page accordion help + in-product ticket form (no Zendesk redirect). Fast for the user, defensive for the team (everything's in one place to search). Paste-image support in the drop-zone is a small but high-value touch — coaches will paste a screenshot of the lineup violation.

**Improve:** their Help is exhaustive but text-only. Ours should embed a short Loom-style video per section (the Coach Platform spec already has a video budget).

---

## 14. iOS app signals (inferred from Press Box + UI parity)

- Web is the system of record; iOS gains features asynchronously (visible from version-gated changelog entries: `iOS 1.3.2`, `iOS 1.4.0`).
- Bottom-tab parity is intentional — iOS tab bar = web shell footer.
- iOS-only features called out: Calendar event import, in-app Press Box with red-dot notifications, push reminders.
- Native parity gap: lineup builder UI on iOS is presumed touch-optimized but otherwise mirrors web. The web Field tab already uses touch-friendly chip targets.

---

## 15. What's missing (the gap = our wedge)

After a full sweep, **none of the following exist** on Who's on Second:

- **Practice planning** — no `/practice`, no calendar event type for practices, no drill library.
- **Drill library / curriculum** — Press Box never mentions drills, plans, or skill development.
- **Player development tracking** — fairness is about *playing time equity*, not skill growth. No skill rubric, no checkpoint, no trend line per player.
- **Parent-facing app** — Parents can be invited but there's no `/parent` route and the Press Box mentions no parent features.
- **AI / coach assistant** — no `/ai`, no chat surface, no LLM-touched copy anywhere in the product.
- **League / org admin** — League Management is a *Help section* but no shipped `/leagues` or `/org` routes were observed.
- **Multi-team views for assistants** — assistants accept invites per-team; no cross-team dashboard.
- **Safety / overuse alerting beyond pitch counts** — no heat-illness rules, no concussion protocol, no rest-day reasoning beyond pitch totals.

**Implication for Coach Platform positioning:**

> Who's on Second is a **Game-Day OS** for youth coaches. The Coach Platform should position as the **Practice-and-Development OS** — covers everything between games (drills, plans, skill growth, parent comms, AI assistant, safety) and either integrates with WoS (import roster + games) or absorbs lineup-builder as a v2 feature.

---

## 16. Borrow / Improve / Ignore — consolidated checklist

| Surface | Verdict | Action for Coach Platform |
|---|---|---|
| Login screen: "Try the interactive demo" CTA | **Borrow** | Add a "Coach Demo Sandbox" link below login |
| 5-tab bottom nav (Home/Games/Roster/Pitching/More) | **Adapt** | Ours: Home / Practice / Roster / Players / More (Games moves down a tier) |
| Global `/more` + `/press-box` + `/help` | **Borrow** | Decouples cross-cutting menus from team scope |
| Calendar + Next Up + Recent + To-Do dashboard triad | **Borrow** | Replace To-Do with auto-generated nudge cards |
| OPSEN position-rating scale | **Borrow** | Same 5-tier scale for our position table |
| `Can pitch` / `Can catch` / `Injured` chips on roster | **Borrow + Extend** | Add `Lefty`, `Switch`, `Returning from injury` |
| Pitching availability board with strike % | **Borrow + Improve** | Add projected availability for upcoming games |
| Games list with `Upcoming` / `Needs Attention` / `Completed` buckets | **Borrow** | Same trichotomy |
| Game Tools dropdown (Undo, Version History, Revert, Complete, Stats, Edit, Scrimmage, Share, Print) | **Borrow** | Keep advanced verbs out of primary UI |
| Rules & Compliance card grouped by *rule* not *player* | **Borrow + Improve** | Add one-click "fix it" suggestions |
| Auto-saving Game Notes | **Borrow** | Same pattern for Practice Plan notes |
| Rule origin badges (`Little League` / `Custom`) | **Borrow** | Same pattern for our presets and house rules |
| Compound Minimum Play (one switch controls scaled requirements) | **Borrow** | Adopt the pattern for our "Safety Mode" toggle |
| Fairness table with per-position innings + verdict pill | **Borrow + Improve** | Add "Why" + one-click rotation suggestion |
| Press Box changelog with red-dot + read-state | **Borrow** | Cheap retention loop |
| Replayable named onboarding tours | **Borrow** | Use `/api/tours` JSON pattern so copy changes don't require deploys |
| Granular email preference toggles | **Borrow** | One toggle per email category, not a single marketing toggle |
| Stripe Customer Portal for all billing actions | **Borrow** | Same pattern, zero billing UI of our own |
| Referrals: free month for both after 3 players added | **Borrow + Tune** | Use "3 practice plans completed" as the activation gate for the referee |
| Single-page Help + in-product ticket form + paste-image attachments | **Borrow** | Add embedded video per section |
| Transfer Head Coach / Leave Team | **Ignore for v1** | Build when we have multi-coach teams |
| Snack Duty | **Ignore** | Out of scope for our wedge |
| Press Box gold-pill "X new" | **Borrow** | Use same UX for unread practice-plan templates |

---

## 17. Open questions / things not crawled

- `/teams/{slug}/games/{gameId}/stats` — post-game pitch entry + box-score UI not captured in this pass.
- `/teams/{slug}/games/new` — the new-game form fields and Calendar Import variant on web.
- `/teams/{slug}/apply-rule-set` — the rule-set wizard (a clear "Borrow" candidate but not re-verified here).
- `/teams/{slug}/roster/{playerId}` — player detail page (pitch history, batting stats per recent Press Box entries).
- `/teams/{slug}/roster/new` — add-player form fields.
- Mobile-specific UI on the web (sub-768 breakpoint).
- The Snack Duty + Game Day setting subsections (collapsed in our crawl).

These are easy follow-ups when needed; the patterns above are sufficient to drive Coach Platform IA decisions.
