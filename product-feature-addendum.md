# Product & Feature Addendum — Development Operating System

**Companion to:** `player-development-metric-schema.md` (the core engineering spec). That document defines the metrics, the closed-loop training engine, driver-tree diagnosis, safety guardrails, the 9-box module, the verification ladder (§8.1), and the data model. **This addendum does not redefine those** — it specifies the product, UX, account, gamification, and business layers that sit on top of the engine.

**Product thesis:** this is not a stat tracker. It is a **youth baseball/softball development operating system** — the layer that owns the space between GameChanger (*what happened*), Perfect Game (*how you compare*), YouTube (*random drills*), and facilities (*paid training*). It answers the one question none of them do: **what should this player work on next, how do we do it safely, and is it actually working?**

> **Reading note:** features below are documented at equal depth. Sequencing lives in the core spec's build order (§18.2) and in the *Phase tags* on each feature here (`[P1]`–`[P4]`). A `[P1]` feature is MVP; `[P4]` is post-development-maturity. The tag is the only prioritization signal; depth of treatment is intentionally uniform.

> **Verification note:** anywhere this addendum references measurement trust ("verified," "device-captured," "facility-verified," etc.), it refers to the single **5-level Verification Ladder** defined in core spec §8.1 (`self_entered → video_attached → device_captured → coach_verified → facility_verified`). This addendum does not define a second system.

---

## A. Account & Identity Model

### A.1 Family account: Parent profile + Player profile `[P1]`
The app is a **family account system**, not a single-player login. The **parent owns the account; the player owns the development journey.** Multi-player support is built from day one — most baseball/softball families have more than one athlete.

**Parent / Guardian profile (the control center):**
| Field | Purpose |
|---|---|
| Name | Account identity |
| Email / phone | Login + notifications |
| Relationship | Parent, guardian, coach-parent |
| Family account | Links multiple kids |
| Notification preferences | Reminders, re-tests, soreness flags, weekly report |
| Equipment available | Tee, net, radar, cage access, etc. (drives §16 drill routing in core spec) |
| Training locations | Home, backyard, garage, facility |
| Safety permissions | Throwing-plan approvals, data sharing |
| Payment / subscription | Free, family, premium, coach, facility |
| Sharing controls | Who can see the kid's profile |

**Player / Kid profile (the athlete record):**
| Field | Purpose |
|---|---|
| Player name | Display identity |
| Age / birthdate | Age-banded plans + thresholds (core §10) |
| Sport | Baseball, softball, or both |
| Throws / bats | R / L / switch |
| Primary positions | P, C, IF, OF, etc. |
| Team / season | Current context (not an owner — see A.4) |
| Training level | Beginner, rec, select, travel, elite |
| Goals | Contact, command, speed, catching, etc. |
| Baseline metrics | Starting point (core §7.1 combine) |
| Progress history | Long-term development record |
| Injury / soreness flags | Safety guardrails (core §11–§12) |
| Player-mode settings | Fun mode vs. serious mode (see B) |

**Account JSON:**
```json
{
  "parent_profile": {
    "parent_id": "parent_001",
    "name": "Ryan Carter",
    "email": "parent@email.com",
    "role": "parent",
    "equipment_available": ["tee", "net", "pocket_radar", "cones"],
    "training_locations": ["garage", "backyard", "facility_sometimes"],
    "notification_preferences": {
      "practice_reminders": true,
      "retest_reminders": true,
      "soreness_alerts": true,
      "weekly_report": true
    },
    "linked_players": ["player_001", "player_002"]
  },
  "player_profiles": [
    {
      "player_id": "player_001",
      "name": "Hudson",
      "age_band": "10U",
      "sport": "baseball",
      "bats": "right",
      "throws": "right",
      "positions": ["catcher", "pitcher", "infield"],
      "gamification_mode": "u10_fun",
      "active_focus": "9-box command",
      "safety_status": "green"
    }
  ]
}
```

### A.2 Role-based views — same data, different interface `[P1]`
| User | Sees |
|---|---|
| Player | Missions, levels, PRs, streaks, next challenge |
| Parent | Progress, safety flags, re-test schedule, equipment needed, multi-kid dashboard |
| Coach | Team/player trends, drill assignments, attendance, notes |
| Facility | Verified test results, session history, combine tools |

**Parent mode** language is calm: *"This week's focus is cleaner throws. Two short sessions are enough."* — never *"Your child is behind."*
**Kid mode** language is motivating: *"New mission unlocked: Command Captain."* — never *"Your strike percentage is below benchmark."*

The canonical UX pattern (same plan, two interfaces):
```
PARENT sees:                          KID sees:
This week for Hudson:                 Mission: Command Captain
 Focus: 9-box command                  Hit called boxes. Beat 20 points.
 Plan: 2 short home sessions           Reward: unlock Target Master badge.
 Safety: Green
 Next test: Sunday
 Time needed: 10 minutes
```

### A.3 Family dashboard (multi-player) `[P1]`
| Player | Age | Focus | Status | Next action |
|---|---|---|---|---|
| Hudson | 10U | Command | 🟢 | 9-box challenge |
| Avery | 12U | Contact | 🟡 | Light tee work |
| Mason | 14U | Speed | 🟢 | 60-yard re-test |

This is the natural **Family plan** paid tier (see F).

### A.4 Permissions & data sharing `[P1` core, `P3` external sharing`]`
Parents control each capability; default is **privacy-first for U10/U12**.

| Capability | Parent control |
|---|---|
| Enter scores | Kid / parent / both |
| View benchmarks | Parent-only or player-visible |
| Share profile | Parent approval required |
| Message coach | Parent approval required |
| Join team | Parent approval required |
| Upload video | Parent approval required |
| Use recruiting profile | Older players only, parent-controlled |

| Shared with | Access |
|---|---|
| Parent | Full |
| Player | Kid-safe view |
| Coach | Assigned metrics + progress |
| Team | Limited team-challenge data |
| Facility | Testing-session data |
| Recruiter | Older-player verified profile only |

**Critical product rule:** the kid profile is **never permanently tied to one team.** Teams change, coaches change, apps change — the profile follows the player. Parent owns the account; kid owns the development record. This portability is a primary differentiator.

### A.5 Onboarding flow `[P1]`
1. **Create parent account** — name, email, password/Apple/Google, relationship, notifications.
2. **Add player** — name, birthdate, sport, bats/throws, positions, current level, goals.
3. **Add equipment** — tee, net, cones, radar, bat sensor, facility/mound/cage access.
4. **Choose mode** — younger: fun missions/badges/simple feedback; older: performance mode, PR tracking, position benchmarks, verified testing.
5. **Baseline** — short combine: hitting, speed, throwing, fielding, optional pitching/catching (core §7.1).

---

## B. Age-Scaled Gamification Layer

**Core design rule:** do **not** build separate products for U10 and U14. Build **one engine with different presentation layers.**

| Layer | Same across ages | Changes by age |
|---|---|---|
| Metrics | ✓ | Thresholds |
| Drills | mostly ✓ | Volume / intensity |
| Scoring | ✓ | Names / complexity |
| Plans | ✓ | Difficulty / readiness |
| Rewards | ✓ | Tone |
| Reports | ✓ | Detail level |

### B.1 Feel by age band `[P1]`
| Age | Product feel | Motivation style | Avoid |
|---|---|---|---|
| 8U–10U | Fun, playful, simple | Badges, streaks, mini-games, team-style challenges | Percentiles, rankings, pressure |
| 11U–12U | Skill-building game | Levels, weekly missions, personal bests | Public leaderboards |
| 13U–14U | Competitive development | PRs, skill ladders, benchmarks, position goals | Babyish badges |
| 15U–18U | Performance profile | Verified metrics, recruiting readiness, trendlines | Gimmicks |

> **U10 must never see:** recruiting language, "below average" labels, public rankings, pressure comparisons, too many numbers. Say *"You leveled up your command,"* not *"You are below percentile for 10U pitchers."*

### B.2 Universal progression loop `[P1]`
Every plan runs on: **Baseline** ("find your starting level") → **Mission** (3–6 short sessions) → **Challenge** (timed/scored/target test) → **Level up** (badge/rank/PR) → **Re-test** (confirm improvement) → **Next path** (app assigns next mission). This is the gamified skin over the core closed loop (core §8).

### B.3 Metric level ladders — same data, different language `[P1]`
Every metric gets a level ladder, not just a raw number. Hitting example:
| Level | U10 name | U14 name | Requirement |
|---|---|---|---|
| 1 | Contact Rookie | Foundation | Complete baseline test |
| 2 | Barrel Finder | Consistent Contact | 3 sessions completed |
| 3 | Line Drive Kid | Hard Contact | Improve average EV |
| 4 | Power Spark | Impact Contact | Hit target EV band |
| 5 | Rally Maker | Game Transfer | Improve hard-hit % in games |

### B.4 Per-drill gamification object `[P1]`
```json
{
  "gamification": {
    "u10_mode": {
      "name": "Barrel Quest",
      "scoring": "points_based",
      "badges": ["Barrel Finder", "Line Drive Kid", "Power Spark"],
      "feedback_style": "positive_simple"
    },
    "u14_mode": {
      "name": "Impact Contact Block",
      "scoring": "metric_based",
      "badges": ["Foundation", "Consistent Contact", "Hard Contact", "Impact Contact"],
      "feedback_style": "performance_development"
    }
  }
}
```

### B.5 Worked game examples `[P1]`

**9-Box Command** (engine in core §6):
- *U10 — "Target Master":* hit called boxes, collect points (called box 3 / same row-col 2 / strike wrong box 1 / miss 0). Milestones: 10 Target Rookie → 20 Box Hunter → 30 Command Captain → 40 Target Master.
- *U14 — "Command Ladder":* called box 3 / adjacent competitive miss 2 / strike-zone miss 1 / non-competitive miss 0. Advanced tracking: glove-side %, arm-side %, low-zone %, first-pitch strike %, command score by pitch type, fatigue drop-off after 15 pitches. Milestones: Bronze (≥50% competitive misses) → Silver (60% called-zone success) → Gold (70% strike-zone execution) → Black (75%+ with velo maintained).

**Hitting** (drivers in core §9.1):
- *U10 — "Barrel Quest":* 20 swings; whiff 0 / weak 1 / good 2 / hard line drive 3 / target hit +1. Badges: Barrel Finder, Line Drive Kid, Rally Starter, Power Spark.
- *U14 — "Impact Contact Block":* 30 swings; track avg EV, peak EV, hard-hit %, pull/middle/oppo distribution. Progression: Foundation → Consistent Contact → Hard Contact → Impact Contact → Game Transfer.

**Speed** (drivers in core §9.2):
- *U10 — "Base Burner":* first-step race, cone sprint, home-to-first, around-the-world. Badges: Quick Start, Fast Feet, Turn Master, Base Burner.
- *U14 — "Speed Ladder":* 10-yd split, home-to-first, 60-yd, around-the-world. Progression: Acceleration → Top Speed → Basepath Efficiency → Game Speed.

### B.6 Development badges tied to real behavior `[P1]`
Avoid empty gamification — tie every badge to a real action:
| Badge | Requirement |
|---|---|
| Consistency | Complete 3 sessions in a week |
| Command | Improve 9-box score |
| Recovery | Follow rest day after pitching |
| Team First | Complete assigned team challenge |
| Re-Test | Complete baseline + follow-up |
| PR | Beat a previous measurable |

### B.7 Progress-without-comparison mode `[P1]`
Default for younger ages: beat your PR, complete your mission, level up your skill, help your team. **Never** rank/percentile/leaderboard/showcase-score a young player. This is a deliberate brand-trust position, not just a setting.

### B.8 Printable player certificate `[P2]`
Especially for U10: *"Barrel Quest Level 2 Complete — New PR 58 mph exit velo — Best skill: line-drive contact — Next mission: Power Spark."* Parents value printable/shareable progress.

---

## C. Safety, Trust & Standardization Layer

These features convert "another app" into something parents trust. Most pair directly with the core spec's guardrails (§12) and readiness gates (§11).

### C.1 Season-aware training `[P2]`
The app asks: in season? off season? tournament weekend? currently pitching? catching too? any soreness? — then adjusts:
| Season state | App behavior |
|---|---|
| Off season | More development blocks |
| In season | Maintenance, low volume, skill work |
| Tournament week | Recovery + light reps |
| Heavy pitch week | No extra throwing |
| Soreness reported | Stop throwing plan |

### C.2 Safety / Recovery score `[P2]`
**Not a medical diagnosis** — a training-readiness flag. Inputs: pitch count, catching workload, soreness, sleep/fatigue, tournament volume, days since last throwing session. Output:
| Status | Meaning |
|---|---|
| 🟢 Green | Normal training |
| 🟡 Yellow | Reduce volume |
| 🔴 Red | No throwing / recovery only |

### C.3 "Don't do this today" engine `[P2]`
Most apps only say what *to* do; this one also says what *not* to: *"Do not run another throwing session today — player pitched yesterday." / "Skip max-effort hitting — already two power sessions this week." / "Use recovery mode after tournament weekend."* Fast trust-builder.

### C.4 Standardized test protocols `[P1]`
**Without protocols, the data is junk.** Every metric needs a fixed test card. Example — *Tee Exit Velo Protocol:* same bat type, same ball type, same tee height, 10 swings, record average of top 5, record peak, optional Pocket Radar video. Product pillar: **repeatable tests, real progress.** (This is what makes the core §13 re-test deltas meaningful rather than noise.)

### C.5 Injury / fatigue history `[P2]`
Simple, non-medical log: arm sore / shoulder sore / elbow sore / back tight / tired / sick / no issue. App flags patterns: *"Arm soreness reported after 3 of last 4 catching-heavy weeks."*

### C.6 Confidence / session-feel check `[P2]`
After a session: felt great / okay / frustrated / tired. Correlate with performance: *"Best command sessions happen when player reports 'felt calm' and hasn't pitched in 3+ days."* Useful and parent-friendly, not therapy-ish.

---

## D. Personalization & Guidance Engine

These make the app feel like a coach, not a spreadsheet.

### D.1 "Next Best Rep" engine `[P2]`
Instead of a 200-drill library, surface **one** thing: *"Your next best rep: 10-minute barrel-control challenge."* or *"Your next best test: re-check home-to-first this weekend."* Parents want the next right thing, not a catalog.

### D.2 "One Thing This Week" `[P2]`
Every Sunday, one focus: *"This week: cleaner throws. Do 3 short sessions. Challenge: 10 clean throws in a row."* Prevents overtraining and overthinking.

### D.3 Player 90-day roadmap `[P2]`
Every player gets a simple phased path:
| Phase | Focus | Goal |
|---|---|---|
| Weeks 1–3 | Barrel control | More hard contact |
| Weeks 4–6 | Home-to-first | Better first step |
| Weeks 7–9 | 9-box command | Hit more called targets |
| Weeks 10–12 | Re-test week | Measure progress |

### D.4 Player archetypes (development identity) `[P2]`
A simple identity, personalized without complexity: Contact Builder, Power Riser, Speed Threat, Command Builder, Glove First, Catcher Engine. Derived from the driver diagnoses (core §9).

### D.5 "Development Age" / Skill Stage `[P3]`
Skill maturity, not actual age — e.g., a 10U-by-age player might be hitting-dev 11U, speed-dev 10U, throwing-dev 9U, command-dev 8U. Label it **Skill Stage**. Helps parents see *where to focus* without "your kid is bad." (Requires accumulated data to be meaningful — see core calibration disclaimer.)

### D.6 Coach-note translation `[P2]`
Coaches speak in jargon; parents don't know what to do with it. Translate:
- *"He needs to stay closed longer"* → *"Focus: front-side control. Home drill: stride-and-pause tee work."*

### D.7 "Coach notes that become data" `[P3]`
Let coaches write normal notes; the app tags them into categories over time, building a coaching-intel layer:
| Note | App tag |
|---|---|
| Opening early | Hitting mechanics / front side |
| Late foot down | Timing |
| Rushing delivery | Pitching tempo |
| Casting hands | Bat path |

### D.8 Practice-to-game transfer `[P2]`
Connect practice and game data instead of siloing them — the "aha" moment: *"Completed 3-week barrel-control block → tee hard-contact +18% → in-game hard-hit rate 22% → 31%."* The product constantly answers: **did the training show up in games?**

### D.9 Home training setup builder `[P2]`
Ask what the family has, generate their setup (e.g., *Garage Hitting Setup: tee, net, 12 balls, phone tripod, tape target, Pocket Radar behind net if available*), then: *"Here are the 12 drills you can do with your setup."*

### D.10 Practice menu generator `[P2]`
Input: *"I have 25 minutes, one kid, tee/net, working on contact."* → returns 5-min warmup, 10-min drill, 5-min challenge, 5-min re-test/game.

### D.11 Smart equipment substitutions `[P1]`
Every drill carries substitutions so families don't quit for lack of perfect gear: *Assigned: tee barrel-control; Missing: net; Substitute: wiffle balls into fence / soft-toss sock balls / dry-swing mirror.* (Implements core §16.3 at the drill-content level.)

### D.12 Visual skill trees `[P2]`
Make progression visual. Hitting tree: Contact Quality (tee barrel control → front-toss timing → spray-chart control) · Bat Speed (rotational power → lower-half sequence → strength block) · Game Transfer (hard-hit % → zone decisions → two-strike contact). Mirrors the core driver trees (§9) as a kid-facing visualization.

---

## E. Coach, Facility & Team Layer

The B2B and B2B2C surface — where the product becomes sticky for organizations.

### E.1 Coach assignment mode `[P2]`
Coach assigns team / position-group / individual challenges:
| Group | Assignment |
|---|---|
| Catchers | Pop-time transfer block |
| Pitchers | 9-box command challenge |
| Hitters | Barrel Quest |
| Speed group | Home-to-first starts |
| Whole team | Clean-throw streak |

### E.2 Team baseline week `[P3]`
One-tap "run baseline week for the whole team." Day 1: speed, throwing, exit velo. Day 2: fielding, 9-box, catcher pop time. Output: individual player cards, team strengths, team weaknesses, suggested practice plan. Killer team-adoption wedge.

### E.3 Team practice planner from data `[P3]`
Once a team has baselines: *"Team weakness: throwing accuracy + first-step speed → Suggested practice: 15 min throwing-accuracy challenge, 15 min first-step sprint work, 20 min defensive reps, 10 min team challenge."* Moves the product from individual app to coach tool.

### E.4 Team challenges without public ranking `[P2]`
Good: beat your own PR · team completed 500 clean throws · pitchers hit 100 called boxes this week · everyone completes baseline week. **Bad (never build):** public U10 leaderboard, ranking 9-year-olds by exit velo, shame-based comparison. Use team energy without parent insanity.

### E.5 Facility Combine Kit / "Run a Combine" mode `[P3]`
Walks a facility/club through a full combine: check-in → height/weight (optional) → exit velo → bat speed → home-to-first → 60-yd → throwing velo → pop time → 9-box command → auto-generated player report. Gives facilities a concrete reason to adopt.

### E.6 "Verified Event" business model `[P3]`
App-powered mini-combines a facility charges families for: club baseline night, winter facility testing day, preseason assessment, end-of-season progress report, catcher skills night, pitcher command night. Facility charges families; the app powers testing + reporting. Clean B2B2C wedge. (Outputs land at `coach_verified`/`facility_verified` on the §8.1 ladder.)

---

## F. Reports, Records & Monetization

### F.1 Report templates `[P2`–`P4]`
| Report | Use | Phase |
|---|---|---|
| Parent progress report | "Is my kid improving?" | P2 |
| Coach report | "What should we work on?" | P2 |
| Facility combine report | Paid testing session | P3 |
| Player card | Shareable highlight | P2 |
| Recruiting-lite profile | Older kids only | P4 |
| Season review | End-of-season summary | P3 |

### F.2 Weekly player card `[P2]`
Auto-generated, private by default, shareable: *"Hudson — Weekly Progress: Best moment — new 9-box PR; Skill focus — glove-side command; Completed — 3 of 4 missions; Next goal — 30-point command score; Parent note — keep throws light this week after pitching Saturday."*

### F.3 Private family timeline `[P2]`
A chronological development log — first baseline, first PR, first verified test, completed 9-box challenge, improved home-to-first, coach note added, season review generated. Becomes the kid's baseball memory book *plus* performance record.

### F.4 Video checkpoints `[P2]`
Not full AI swing analysis at first — structured capture. Every baseline/re-test asks for side view, front view, behind hitter/pitcher, optional slow-mo, attached to the metric: *"Exit velo 61 → 66 mph; video shows better lower-half sequence."* (Feeds `video_attached` and above on the §8.1 ladder.)

### F.5 Multi-sport athleticism layer `[P3]`
Especially for younger kids: track sprint, jump, agility, throwing, balance, coordination. Message: *"Better athletes become better baseball players."* Helps avoid early-specialization vibes.

### F.6 Monetization model `[P1` free/Plus`, P2`+ rest`]`
| Tier | Offer |
|---|---|
| Free | Player profile, basic metrics, limited drills |
| Plus | Full training plans, progress tracking, badges |
| Family | Multiple players |
| Coach | Team dashboard + assignments |
| Facility | Combine mode + verified reports |
| Marketplace | Partner programs / equipment referrals (vendor-neutral — core §14) |

**Best first paid feature:** the **player development report + training plan.** Parents pay for clarity.

---

## G. Positioning

**For parents:** *Fun enough that younger kids want to train. Serious enough that older players can see real progress.*
**For players:** *Beat your score. Level up your skills. Prove your progress.*
**Cross-audience:** *Simple enough for parents. Fun enough for kids. Structured enough for coaches. Verified enough for older players.*

**The OS framing:** the app owns the space between GameChanger (*what happened*), Perfect Game (*how you compare*), YouTube (*random drills*), facilities (*paid training*), and the parent's recurring question (*what do we do next?*). It answers: **what should this player work on next, how do we do it safely, and is it actually working?**

---

### Build-phase index (every feature, by tag)

**[P1] — MVP / now:** Family account + profiles (A.1), role-based views (A.2), family dashboard (A.3), permissions core (A.4), onboarding (A.5), gamification feel + loop + ladders + objects + examples + behavior-badges + no-comparison mode (B.1–B.7), standardized test protocols (C.4), equipment substitutions (D.11), monetization free/Plus (F.6).

**[P2] — training engine era / next:** printable certificate (B.8), season-aware training (C.1), recovery score (C.2), don't-do-this-today (C.3), injury/fatigue log (C.5), confidence check (C.6), Next Best Rep (D.1), One Thing This Week (D.2), 90-day roadmap (D.3), archetypes (D.4), coach-note translation (D.6), practice-to-game transfer (D.8), home setup builder (D.9), practice menu (D.10), skill trees (D.12), coach assignment (E.1), team challenges (E.4), most reports (F.1), weekly card (F.2), family timeline (F.3), video checkpoints (F.4).

**[P3] — trust/team layer:** external sharing (A.4), Skill Stage (D.5), coach-notes-as-data (D.7), team baseline week (E.2), team practice planner (E.3), combine kit (E.5), verified-event model (E.6), season review + facility report (F.1), multi-sport layer (F.5).

**[P4] — recruiting maturity:** recruiting-lite profile (F.1). Gated on a strong development-data base and `facility_verified` measurements (core §8.1, §18.2 Phase 4).
