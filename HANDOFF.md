# First Pitch — Developer Handoff

> End-to-end handoff for the First Pitch youth-baseball coaching platform.
> Pairs with [BUILD-BACKLOG.md](BUILD-BACKLOG.md) (what to build next) and
> [.github/copilot-instructions.md](.github/copilot-instructions.md) (agent rules).
> Last updated: 2026-06-09.

---

## 1. What this is

A youth-baseball **coaching + player-development platform**. The product wedge:
solve a coach's game-day pain (lineups, fair playing time, pitch-count/arm-care
safety, practice planning) first, then earn a longitudinal player-development
dataset over time.

Three audiences: **coaches** (primary), **parents**, **players**.

One-liner: *"Win the coach with lineup/fairness/practice pain, then earn the
player-dev dataset over time."*

Brand: "First Pitch" / "Dugout Dirt" vintage-baseball theme. Voice = Coach RAC /
Coach Ballgame energy + CHIPS (Alex Hale) standards: fun-first, high-energy,
concrete cues, plain English — but **safety always overrides voice**.

### Hard product rules (enforce in review)
No public leaderboards under 12 · no national rankings · no single "player
score" · no velo badges without arm-care context · no parent-visible negative
notes · no AI telling kids they're bad · no recruiting language for young
players · no batting-average obsession.

---

## 2. Repository layout

```
Baseball/                         # workspace root (strategy + corpus + this doc)
├── corpus/                       # versioned knowledge layer (JSON + md)
├── *.md                          # strategy / spec / competitor docs
└── platform/                     # npm-workspaces monorepo (node 24, npm)
    ├── apps/web/                 # Next.js 15 App Router (the product)
    ├── mobile/                   # Capacitor shell (iOS/Android WKWebView)
    ├── packages/                 # 13 engine packages (@platform/*)
    ├── scripts/                  # agent harnesses (qa/ux/code/launch/security/corpus-watch)
    └── reports/                  # generated launch-review + security-review
```

The repo is two layers:

- **Strategy / knowledge layer** at the workspace root — markdown strategy docs
  plus a versioned JSON **corpus** (safety rules, drills, age matrices, sources).
- **Code monorepo** at [platform/](platform) — npm-workspaces: a Next.js 15 web
  app plus 13 engine packages.

**Architecture principle:** business logic lives in **pure, isomorphic engine
packages** ([platform/packages/](platform/packages)) consumed by the Next.js app.
Packages avoid `fs`/DOM so they run in both server components and `"use client"`.
The app's own glue engines live in [platform/apps/web/app/lib/](platform/apps/web/app/lib)
(also pure + unit-tested).

**Module resolution:** [platform/vitest.config.ts](platform/vitest.config.ts) and
`next.config.mjs` `transpilePackages` alias `@platform/*` → `packages/*/src/index.ts`
(no build step between packages). `pnpm-workspace.yaml` exists but **npm
workspaces is the real package manager** — pnpm/corepack can't install here
(EPERM on Program Files).

---

## 3. Engine packages

| Package | Role |
|---|---|
| **@platform/storage** | Data model + repositories + storage backends. The spine. |
| **@platform/auth** | Magic-link auth: token issue/consume, session minting, SHA-256 token hashing. |
| **@platform/safety** | **The differentiator.** Pitch Smart gate, age-band matrix matcher, Tier-1 rules, "don't do today," escalation, workload, passport. |
| **@platform/corpus** | Static-imports the root `corpus/*.json` (no fs at runtime) and re-exports typed records. |
| **@platform/compiler** | Practice compiler: focus → drill selection → time-pack → safety gate; templates; player grouping; anti-pattern checks. |
| **@platform/lineup** | Auto-lineup allocator + `validateLineup` (league rules), rule-set presets, explain/parent-view. |
| **@platform/missions** | Mission catalog (18, age-banded), homework planner, points/XP. |
| **@platform/diagnosis** | Driver catalog + engine: metric → likely driver → recommended drill. |
| **@platform/ingest** | CSV/device import: GameChanger, HitTrax, Rapsodo, Blast, ICS schedule, Damerau-Levenshtein name matching. |
| **@platform/ai** | Grounded retrieval, provider abstraction (mock/OpenAI), prompts, post-filter refusals, intent search. |
| **@platform/gear** | Affiliate gear recommender (catalog in `corpus/gear-catalog.json`). |
| **@platform/eval** | AI eval harness + adversarial cases (CI gate for AI safety). |
| **@platform/db** | Legacy Prisma seed / metric registry (`seed.ts` METRICS) — mostly superseded by `storage`. |

---

## 4. Data model

Defined in [platform/packages/storage/src/types.ts](platform/packages/storage/src/types.ts).
All types are JSON-serializable (single-blob persistence). Core entities:

- **UserRecord** — `role: parent | coach | player | admin`.
- **TeamRecord** — owned by `ownerCoachUserId`; carries `leagueRules` (scalar
  rule subset) + `appliedRuleSetId` (provenance).
- **PlayerRecord** — roster entry. `ageBand` (6-8/9-12/13-15/16+),
  `positionRatings` (the lineup engine's source of truth, **not** `positions[]`),
  `battingSkill 1-5`, `canPitch`/`canCatch`/`injured`, `parentUserId`, COPPA
  `consentStatus`.
- **TeamMembershipRecord** — links user→team with `role` and, for parents/players,
  `playerId`. This membership is the **only** link from a player/parent account
  to a roster `PlayerRecord` — there is no `playerUserId` field on the player.
- **GameRecord** — `lineup[inning][playerId]=pos`, `battingOrder`, `pitchCounts`,
  `snackDuty`, `shareEnabled` (Press Box), `sourceUid` (ICS reconcile),
  `isScrimmage`.
- **PlayerGameStatsRecord** — full box score (batting/pitching/fielding) from
  GameChanger CSV; carries a kind 1.0–5.0 `rating`.
- **MetricEntryRecord** — combine/dev metrics with a 6-level `verificationState`
  ladder (self → video → device → coach → facility → event).
- **MissionAssignmentRecord** — closes the coach→player loop (assign → parent/
  player completes → writes both assignment + completion so streaks fire).
- **ConsentRecord / LoginTokenRecord / SessionRecord** — auth + COPPA (token
  *hashes* stored, never plaintext).
- Plus: PlanRecord, AuditLogRecord, Field/FieldReview/FieldBooking/Favorite,
  GameNoteRecord, SnackDuty.

**Repositories:** [platform/packages/storage/src/repos.ts](platform/packages/storage/src/repos.ts)
exposes a typed `Store` + per-collection repos. `getRepos()` picks a backend by
env precedence.

**Storage backends** ([platform/packages/storage/src/stores.ts](platform/packages/storage/src/stores.ts)),
selected in order:

1. **KvJsonStore** (Vercel KV / Upstash REST) — production. Single-blob,
   last-write-wins (documented MVP trade-off; concurrent writers clobber).
2. **JsonFileStore** — local persistence; atomic-rename writes; quarantines a
   corrupt DB instead of crashing.
3. **InMemoryStore** — tests + dev (wiped by Next HMR — hence `PLATFORM_DATA_DIR`
   is required for any auth E2E).

---

## 5. Web app surfaces

Next.js 15 App Router, React 18, Tailwind. Routes by persona:

- **Coach (core):** [platform/apps/web/app/coach/](platform/apps/web/app/coach) →
  `teams/[id]/` holds the full game-day suite: `roster/` (+ `groups/`),
  `games/[gameId]/` (FieldBoard lineup, BattingOrder, GameTools dropdown, live
  mode, notes), `pitching/` (planning-aware Pitch Smart board), `fairness/`
  (verdict pills + per-position heatmap), `baselines/[playerId]/` (+ `diagnose/`,
  `transfer/`), `goals/`, `calendar/`, `import/`, `stats/`, `snack/`, `digest/`,
  `missions/`, `settings/` (rule presets), `ask/` (grounded AI), `more/`. Nav via
  `TeamTabs` (5-tab bottom bar on mobile, WoS parity).
- **Parent:** [platform/apps/web/app/parent/](platform/apps/web/app/parent) —
  read-only child progress, today's mission, coach-assigned homework with one-tap
  done, RSVP, position/home-training plans. No comparison views, no negative notes.
- **Player:** [platform/apps/web/app/missions/](platform/apps/web/app/missions) —
  age-band mission catalog. **Known gap:** not yet personalized to the signed-in
  player.
- **Public / funnel:** home `page.tsx` (Hero + SmartSearch intent), `/practice/new`
  (anon sandbox compiler), `/drills`, `/safety`, `/fields` (+ `[slug]`, booking,
  claim), `/gear` (affiliate quiz), `/teams/[slug]` (public team page),
  `/p/g/[gameId]/[sig]` (HMAC-signed Press Box game share), `/billing`,
  `/policy/*`, `/login`.
- **Admin:** `/admin/audit`, `/admin/status`.

**API:** ~30 route groups under [platform/apps/web/app/api/](platform/apps/web/app/api).
Most storage-touching routes carry `export const runtime = "nodejs"; export const
dynamic = "force-dynamic";`. Authz via `getSession` + `userCanManageTeam`/role
checks.

---

## 6. Deep dive — Lineup engine

Source: [platform/packages/lineup/src/index.ts](platform/packages/lineup/src/index.ts)
and [platform/packages/lineup/src/leagueRules.ts](platform/packages/lineup/src/leagueRules.ts).

> ⚠️ **Naming caveat for devs:** the build plan describes this as a "CSP solver
> (backtracking + forward checking)." The **actual** implementation is a
> **greedy, fairness-aware per-position allocator** — single forward pass, no
> backtracking. It is fast and deterministic but does *not* guarantee a globally
> optimal assignment. If you later need hard guarantees (e.g. always satisfy
> every league rule), that's a real algorithm swap, not a tweak.

### 6.1 `autoLineup(input): AutoLineupResult`

For each inning, in order:

1. **Apply locks.** Pinned cells (`locks[inning][playerId]`) stick exactly;
   absent/injured locked players are skipped. Locked field/bench cells update the
   fairness counters so the rest of the inning balances around them.
2. **Fill each position** (in `positions` order) by scoring eligible candidates
   and taking the top one.
3. **Bench the rest.** Any active player not used this inning gets `"BN"`.
4. **Update run-length counters** (`ofRun`, `benchRun`) for the next inning's
   soft constraints.

**Eligibility** (`eligible`): skip injured + absent; `P` requires `canPitch`,
`C` requires `canCatch`; never assign a position the player rated `"avoid"`
(`ratingScore` returns `-1`).

**Candidate score** (the heart of the engine):

```
score = skillScore * competitiveWeight
      + fair       * fairnessWeight        // fairnessWeight = 1 - competitiveWeight
      + rulePenalty
      + (hash(id) % 7) * 0.01              // stable per-player jitter
      + rng() * 0.001                       // seeded mulberry32 jitter
```

- `skillScore = rating*10 + skill*premium*4` — rewards preferred positions and
  higher `battingSkill` at **premium** spots (`P`, `C`, `SS`, `CF`).
- `fair = -(fieldCount*6) - (posCountAtThisPos*4)` — rewards players with fewer
  past field innings and positional variety.
- `competitiveWeight` ∈ [0,1], default **0.3** (fairness-leaning). `0` = pure
  fairness, `1` = pure skill. This is the "Competitive Priority slider."

**Soft constraints, each with fallback to the unfiltered pool** so a slot is
never left empty just to honor a preference:

- No back-to-back pitcher (`prevPitcher`).
- `pitcherUnavailable` — players on Pitch Smart required rest are **hard-excluded**
  from the `P` pool (caller computes this from recent pitch history + age).
- `maxConsecutiveOutfield` — the one *league rule* the generator proactively
  honors (filters the pool, then also applies a `-50` soft penalty).

**Determinism:** `mulberry32(seed)` PRNG seeded by `input.seed` (default 0) plus
the per-id hash → repeated calls with the same input produce the same lineup, so
"Shuffle" doesn't churn unrelated cells.

**Output:** `{ innings, warnings }`. Warnings look like `"Inning 3: no eligible
player for P"`.

**Presets** (`PRESET_POSITIONS`): `standard9` (full diamond) · `standard10`
(adds `RV` rover / 4th OF) · `coachPitch` (no P/C).

**Helpers:** `summarize` (per-player `FairnessRow`) · `buildLocks` /
`shuffleNonLocked` (lock-and-regenerate) · `toCsv` (export).

### 6.2 League rules — `validateLineup` (the other half)

> **Key nuance:** `autoLineup` only proactively satisfies `maxConsecutiveOutfield`.
> Every other rule (min field innings, infield-by-inning, equal bench time, etc.)
> is **validate-only** — the generator leans on its fairness heuristics to get
> close, and `validateLineup` surfaces any remaining gaps as violations for the
> coach to fix manually. Don't assume a generated lineup is rule-clean; always
> render the violations.

`validateLineup(innings, rules, presentPlayerIds): LineupViolation[]` is a pure
validator returning one entry per violation, grouped by rule (this powers the
Who's-on-Second-style "Rules & Compliance" panel). Rules implemented:

`minFieldInnings` · `infieldRequiredByInning` · `maxConsecutiveBench` ·
`maxConsecutiveOutfield` · `pitcherBenchInningBefore` · `minInfieldInnings` ·
`minOutfieldInnings` · `maxConsecutiveSamePosition` · `equalBenchTime` ·
`pairedPositions` (tandem locks).

Supporting exports:

- `RULE_SET_PRESETS` — 6 one-tap presets (LL 9-10, LL 11-12, Cal Ripken/Babe
  Ruth, Rec Balanced, Tournament, None). Each is a **complete** `LeagueRules`
  value (anything omitted = off).
- `ruleProvenance(key, rules, appliedPresetId)` → `preset | custom | off` — drives
  the per-rule "League rule" vs "Custom" badges in Settings.
- `LINEUP_RULE_META` — coach-voice label/description/origin per rule.

Provenance: `INFIELD_POSITIONS` includes `P` and `C` (battery counts as infield).

---

## 7. Deep dive — Practice compiler pipeline

Source: [platform/packages/compiler/src/index.ts](platform/packages/compiler/src/index.ts).
Entry point: `compile(input: CompileInput): CompileResult`.

Inputs that matter: `age`, `durationMin`, `environmentTier`
(T1_field/T2_cage_gym/T3_backyard/T4_living_room), `equipmentAvailable`,
`coaches`, `players`, `focus[]`, optional `fieldResources`,
`pitchHistoryByPlayer`, `selectedDrillIds` (coach-curated order), and
`transitionMinPerBlock`.

### Pipeline order

1. **Cap duration** to `sessionCapsFor(age).max_session_minutes` (from
   `@platform/safety`); warn if the request exceeded it.
2. **`pickDrills`** → candidate set filtered by: age band; environment tier
   (with a graceful fallback to *lower*-tier drills); `coaches_min`; player-count
   range; required equipment present; topic ∈ `focus` (plus always-allowed
   `warmup` / `mental_recovery`); not `retired`/`draft`.
3. **Required warmup** block — `DYNAMIC_WARMUP_8MIN`. If missing from the
   library, the plan is **blocked** (the age matrix mandates a warmup before
   throwing/speed).
4. **Skill blocks** — two paths:
   - **Coach-curated** (`selectedDrillIds`): walk the list in order; each drill
     re-validated; if dropped, the coach gets a specific reason ("needs 2+
     coaches", "missing equipment: L_screen", "age band 9-12 not supported").
   - **Auto-pick** (default): for each `focus` topic, sort published-first then
     shortest-first and place until time runs out.
   - `placeDrill` enforces the continuous-skill-block cap, checks remaining time
     (reserving cooldown + transition), inserts a transition block between content
     blocks, and runs the **Pitch Smart preflight** (`canPitchToday`) for throwing
     drills when `pitchHistoryByPlayer` is supplied — a player who can't pitch
     produces a `blocked[]` entry.
5. **Water breaks** — `maybeWaterBreak` injects a 2-min rest every
   `rest_or_water_break_every_minutes` (from the matrix).
6. **Top-up pass** — if ≥8 min slack remains, place one more eligible drill so the
   plan actually fills the requested slot.
7. **Cooldown** — `MENTAL_RESET_BREATH`.
8. **Throwing-load soft guard** — warn if cumulative `throwingLoad > 42`
   (≈50% of a typical daily max).
9. **Score + annotate** — `scorePlan` (0–100: warmup +25, cooldown +10, focus
   coverage up to +50, matrix-required-topic bonus +5 each), full `timeBudget`
   accounting, `deriveTheme`, and `deriveTalkingPoints` (pulled from each drill's
   `kid_friendly.why` / `coaching_cues`).

### Safety + corpus integration

- `@platform/safety`: `sessionCapsFor` (duration + continuous-block + break
  cadence), `canPitchToday` (per-player Pitch Smart preflight).
- `@platform/corpus`: `loadDrills`, `getAgeBandKeyForAge`, `getMatrixBand`.
- `stationCount(input)` caps parallel stations by `min(declared areas, coaches)`
  — a coach can supervise at most one area. Re-exports `extensions`
  (`antiLineCheck`), `templates`, `grouping`.

`CompileResult` carries `blocks`, `warnings` (soft), `blocked` (hard safety
refusals — surface prominently), `totalThrowingLoad`, `qualityScore`,
`timeBudget`, `theme`, `talkingPoints`. The web layer persists this as a
`PlanRecord.blocks` blob and renders it via `PlanView`.

---

## 8. Deep dive — Auth & session flow

Sources: [platform/packages/auth/src/index.ts](platform/packages/auth/src/index.ts),
[platform/apps/web/app/api/auth/request-link/route.ts](platform/apps/web/app/api/auth/request-link/route.ts),
[platform/apps/web/app/api/auth/verify/route.ts](platform/apps/web/app/api/auth/verify/route.ts),
[platform/apps/web/app/lib/session.ts](platform/apps/web/app/lib/session.ts).

### Magic-link flow

1. **`POST /api/auth/request-link`** `{ email, role, name?, redirectTo? }`
   - Validates email + role; rate-limits **6/email/hour** (in-process `Map` —
     per-serverless-instance, documented MVP limitation).
   - Sanitizes `redirectTo` to **internal paths only** (`/...`, no `//`, ≤256
     chars) — open-redirect guard.
   - `issueLoginToken`: random 32-byte (256-bit) token; stores only its
     **SHA-256 hash**; 15-min TTL.
   - Emails the link via Resend ([lib/email.ts](platform/apps/web/app/lib/email.ts));
     in dev (no provider) returns `devLink` in the JSON so localhost can log in
     without an inbox.

2. **`GET /api/auth/verify?token=`**
   - `consumeLoginToken`: `loginTokens.consume(hash)` is **atomic + single-use**
     (rejects already-consumed/expired), upserts the user, mints a session.
   - Sets the `platform_session` cookie: `httpOnly`, `sameSite=lax`,
     `secure` in production, `path=/`, 7-day `maxAge`.
   - Redirects to `redirectTo` or the role default (`coach→/coach`,
     `parent→/parent`, `player→/missions`, `admin→/admin/status`).

### Cookie + session

- Cookie value = `${sessionId}.${HMAC-SHA256(PLATFORM_AUTH_SECRET, sessionId)}`,
  verified with `crypto.timingSafeEqual`. The session **record** lives in storage;
  the cookie only carries the signed id.
- `PLATFORM_AUTH_SECRET` is required in production (`getSecret()` **throws** if
  unset in prod; falls back to a dev string locally).
- `resolveSession` → decode + verify cookie → load session → check expiry (delete
  if expired) → load user.
- App helpers: `getSession()` and `requireSession(roles?)` in
  [lib/session.ts](platform/apps/web/app/lib/session.ts) (use `next/headers`
  cookies); `requireRole(session, allowed)` throws `AuthError(401|403)`.

### Authorization (tenant isolation)

Membership-based, in [lib/teams.ts](platform/apps/web/app/lib/teams.ts):

- `userCanReadTeam(userId, teamId)` — any membership.
- `userCanManageTeam(userId, teamId)` — membership with `role === "coach"`.

There is no row-level DB security (single-blob store); **every team-scoped API
route must call these helpers itself.** This is verified live by the QA agent's
`authz-isolation` scenario (Coach B / anonymous / parent each attempt cross-tenant
writes and must be blocked).

### Legacy login

[platform/apps/web/app/api/auth/login/route.ts](platform/apps/web/app/api/auth/login/route.ts)
is the old direct-login endpoint kept only for the QA/UX agents. It returns
**410 in production** unless `PLATFORM_ALLOW_DEV_LOGIN=1` is set.

---

## 9. Safety stack (non-negotiable core)

[platform/packages/safety/src/](platform/packages/safety/src) enforces the corpus
at runtime:

- **pitchSmart.ts** — `canPitchToday()` against
  [corpus/pitch-smart-tables.json](corpus/pitch-smart-tables.json) (age daily-max
  + rest-day tables + global rules: annual cap, no-3-consecutive-days, re-entry).
- **ageMatrix.ts** — `isAllowedByAgeMatrix()` **substring-matches literal prose**
  (`required`/`conditions`/`forbidden`) from
  [corpus/age-band-matrix.json](corpus/age-band-matrix.json). ⚠️ Never strip
  numeric prose from the matrix — it breaks runtime matching.
- **rules.ts** — the 15 Tier-1 rules from
  [corpus/tier1-safety-rules.json](corpus/tier1-safety-rules.json).
- Plus `dontDoToday`, `escalation` (pain → parent + coach), `workload`, `passport`.

Pitch Smart age bands (7-8/9-10/11-12/13-14/15-16/17-18) are **finer** than the
`AgeBand` enum (6-8/9-12/13-15/16+). Keep both.

---

## 10. Corpus / knowledge layer

Versioned JSON in [corpus/](corpus), statically imported by `@platform/corpus`
(bundler inlines; no `CORPUS_DIR` at runtime):

- **drills/starter-library.json** — 44 drills, each with `kid_friendly` voice,
  `equipment_required`, `safety_rule_refs`, age bands.
- **tier1-safety-rules.json** (15) · **pitch-smart-tables.json** ·
  **age-band-matrix.json** (with practice blueprints) · **gear-catalog.json** (14
  products) · **sources.seed.json** (~106 attributed sources incl. top youth
  creators, all `safe_to_prescribe:false` + guardrails).
- **ai-system-prompts.md** (global + practice + Q&A) · **brand-voice.md** (wired
  into prompts §1) · **eval-harness.md** · **review-queue.json/.md** (corpus-watch
  output) · **competitor-research/** (parity schema/data).

> ⚠️ **Never** round-trip `corpus/*.json` through PowerShell `ConvertTo-Json`
> (rewrites the whole file) and **never** `git checkout` an uncommitted corpus
> file (this repo has minimal commit history — it silently destroys records).
> Edit corpus JSON with the file tools only.

---

## 11. Quality gates & agent harnesses

Under [platform/scripts/](platform/scripts), each with a matching VS Code custom
agent in `.github/agents/`:

- **qa-agent** — Playwright scenarios (anonymous tour, coach happy-path, parent,
  safety gates, **authz-isolation** cross-tenant, **a11y** axe scan).
- **ux-agent** — 5 persona journeys + heuristics (tap-targets, contrast, reading
  level).
- **code-agent** — static analyzer (7 analyzers incl. OWASP security).
- **launch-review** — orchestrates gates + QA + UX + code + a11y → scored go/no-go
  (`npm run launch-review`).
- **security-review** — stricter, launch-blocking gate (8 analyzers + npm-audit
  gate with an accepted-risk allowlist).
- **corpus-watch** — every-3-day creator scanner → review queue (never auto-edits
  the corpus).

### Verify recipe (from `platform/`)

- Tests (the gate): `cmd /c "npx vitest run"` — ~262 tests, currently green.
- Web typecheck: `Remove-Item apps/web/tsconfig.tsbuildinfo -EA SilentlyContinue;
  cmd /c "npx tsc --noEmit --project apps/web"`.
- Full launch gate after a major edit: boot a fresh dev server (data dir off
  OneDrive, `PLATFORM_ALLOW_DEV_LOGIN=1`, nuke `.next`, warm routes), then
  `cmd /c "npm run launch-review"`.

### Current status

- launch-review: **ACCEPTABLE 74/100, 0 blockers** ([platform/reports/launch-review.md](platform/reports/launch-review.md)).
- security-review: **ACCEPTABLE 95/100, 0 P0/P1** ([platform/reports/security-review.md](platform/reports/security-review.md)).
- Residual findings are documented false positives (analyzers matching their own
  detection strings) + one accepted, non-exploitable dev-only dep advisory
  (vitest GHSA-5xrq-8626-4rwp).

---

## 12. Toolchain quirks (Windows / PowerShell — read before coding)

- PowerShell blocks `npm.ps1` → **always** invoke via `cmd /c "npm ..."` /
  `cmd /c "npx ..."`.
- A fresh terminal starts at the workspace **root**, not `platform/` — `cd platform`
  first (running `tsc --project apps/web` from root hangs).
- `noUncheckedIndexedAccess` is **on** — guard index access:
  `counts[k] = (counts[k] ?? 0) + 1`.
- **Never** point `PLATFORM_DATA_DIR` under OneDrive (atomic-rename `EPERM`). Use
  `$env:TEMP\firstpitch-dev`.
- Nuke `.next` between dev restarts after env changes (Windows `EINVAL` on the
  middleware-manifest readlink).
- Do **not** bump **vitest** to 4.x — it breaks the entire suite. Pinned at
  **3.2.6**.
- `npm overrides` only re-resolve on a **clean** install (wipe `node_modules` +
  lockfile).

---

## 13. Deployment

- Vercel **Root Directory must be `platform/apps/web`** (PostCSS/Tailwind resolve
  relative to cwd — building from `platform/` fails with "bg-cream class does not
  exist").
- Security headers/CSP in `apps/web/next.config.mjs` (prod strips `unsafe-eval`;
  dev keeps it for react-refresh).
- Weekly digest cron wired in `apps/web/vercel.json` (Mon 13:00 UTC,
  Hobby-compatible). Vercel auto-attaches `Authorization: Bearer <CRON_SECRET>`.
- **Deploy blockers (env config, not code):**
  - Provision Vercel KV → set `KV_REST_API_URL` + `KV_REST_API_TOKEN` (else
    InMemoryStore loses all data on Vercel).
  - Set `PLATFORM_AUTH_SECRET` (auth won't boot in prod without it).
  - Set `RESEND_API_KEY` + `EMAIL_FROM` (else magic links only hit stdout → nobody
    logs in).
  - See [platform/.env.example](platform/.env.example) and
    `apps/web/.env.local.example` for the real env contract.

**Mobile:** [platform/mobile/](platform/mobile) is a Capacitor shell wrapping the
responsive web app in a WKWebView — nav parity is automatic (no separate native UI).

---

## 14. What's shipped vs. next

**Shipped & green:** roster CRUD · auto-lineup + league rules + FieldBoard ·
batting order · pitching board + Pitch Smart + capability badges · fairness
grid/heatmap · Press Box share · parent dashboard + RSVP · practice compiler +
templates · drills/missions surfaces · grounded AI Q&A + intent search ·
GameChanger/HitTrax/Rapsodo/Blast/ICS import · diagnosis + transfer score · gear
recommender · fields directory · snack rotation · weekly digest · magic-link auth
· COPPA consent · DSR export/delete · security headers · health endpoint ·
billing scaffolding (env-gated, off by default).

**Genuine gaps (per the current strategic reframe — not yet built):**

1. **Coach Memory** — the named "secret feature": one unified "what each player
   needs" surface (raw data exists but scattered).
2. **Lineup game modes** — Rec/FairPlay · Development · Competitive · Tournament ·
   Tryout-Eval.
3. **Fix-Last-Game** — tap symptoms → top-3 team priorities → recommended 90-min
   practice (compiler exists; tap-loop doesn't).
4. **One-tap quick-tags** that become structured data (game notes are freeform
   today) — feeds Coach Memory.
5. **Monthly parent narrative report** (weekly digest exists).
6. Player `/missions` personalization (assigned missions/streaks/XP for the
   signed-in player).
7. Stripe **webhook** (`/api/billing/webhook` absent → paid subs never recorded;
   only matters if billing is turned on).

**Known-acceptable MVP trade-offs (documented, not bugs):** KV single-blob
last-write-wins · magic-link rate limiter is per-serverless-instance.

---

## 15. Onboarding checklist for a new dev

1. Read this file, [BUILD-BACKLOG.md](BUILD-BACKLOG.md),
   [.github/copilot-instructions.md](.github/copilot-instructions.md), and
   [corpus/brand-voice.md](corpus/brand-voice.md).
2. `cd platform; cmd /c "npm install"` (~1 min, no progress output).
3. Boot dev: set `PLATFORM_DATA_DIR=$env:TEMP\firstpitch-dev` +
   `PLATFORM_ALLOW_DEV_LOGIN=1`, nuke `.next`, `cmd /c "npm run dev"`.
4. Run the gate: `cmd /c "npx vitest run"`.
5. For anything touching safety or voice, route through the read-only auditors
   (Safety & Voice Guardian, Security Review Agent) before shipping; hand fixes to
   Code Optimizer / Corpus Curator.

The two most load-bearing files to read first:
[platform/packages/storage/src/types.ts](platform/packages/storage/src/types.ts)
(the whole data model) and
[platform/packages/safety/src/index.ts](platform/packages/safety/src/index.ts)
(the non-negotiable safety core).
