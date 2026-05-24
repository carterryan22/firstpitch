# Coach Platform — Practice Compiler & AI Layer

**Third pillar.** Companions: `player-development-metric-schema.md` (core engine), `product-feature-addendum.md` (product/UX/account), `market-research-positioning.md` (strategy). This document specifies the **coach-facing** surface: a constraint-aware practice compiler, its execution and grouping subsystems, the coach dashboard, monetization, and the grounded AI layer that sits across all three pillars.

> **This pillar consumes the core engine; it does not redefine it.** Drivers/diagnosis (core §9), drill objects + environment tiers (core §16–§17), safety gates + guardrail ceiling (core §11–§12), Game Transfer (core §15), the verification ladder (core §8.1), and age bands (core §10) are all defined in the core spec. The Practice Compiler is a *solver that arranges existing library content* under real-world constraints — it never invents drills or overrides safety.

**Coach's problem (same shape as the parent's):** *"I know what we need to improve, but I need a practice that fits my time, players, field space, equipment, and age group — today."* The compiler answers it.

**Coach positioning:** *Build the right practice in 60 seconds. Prove whether it worked.* / *Less guessing. Better practices. Real progress.*

---

## 1. Coach Profile

A third profile type alongside Parent and Player (account model in addendum §A).

| Field | Purpose |
|---|---|
| Coach name / team name | Identity + context |
| Age group | 8U–HS → drives age scaling (core §10) |
| Sport | Baseball / softball (softball first-class, not a toggle) |
| Team level | Rec, select, travel, elite |
| Practice-length defaults | 30/45/60/75/90/120 min |
| Player count / assistant count | Station sizing + plan complexity |
| Field access | Full field, half field, cage, gym, backyard |
| Equipment available | Tee, nets, balls, cones, L-screen, machine, radar (maps to core §16–§17 drill tiers) |
| Practice philosophy | Development, game prep, fundamentals, competitive |
| Safety rules | Pitch count/rest, catcher workload, no-throw days (feeds core §11–§12) |
| Team goals | Contact, throwing accuracy, baserunning, command, etc. |

---

## 2. The Practice Compiler (core coach feature)

Not "pick drills from a library." **Compile the best runnable practice from constraints.** This distinction is the whole product: the difference between *"here are 300 drills"* and *"here is exactly what to run today with 12 kids, 2 coaches, one field, 75 minutes, and a team that walked 11 batters last game."*

### 2.1 Inputs
**Required:** age group · practice length · player count · assistant count · space · equipment · focus · intensity (normal/light/pre-game/recovery) · season state (preseason/in-season/tournament/offseason).
**Optional, data-driven:** team GameChanger stats (core §15 CSV import) · player development profiles (core engine) · coach notes · last-game tags · upcoming opponent · pitcher/catcher workload (core §12 safety state).

### 2.2 Compiler algorithm
```
age band + available time + player count + assistant count
  + field/equipment access + team/player weaknesses (driver diagnosis, core §9)
  + safety/workload state (core §11–§12)
= a runnable practice plan
```
Constraint → adjustment examples:

| Constraint | Compiler adjustment |
|---|---|
| 1 coach, 12 players | Fewer stations, more partner drills |
| 3 coaches, 12 players | More stations, smaller groups |
| No field | Cage/gym/home-compatible plan |
| In-season | Lower volume, game-transfer work |
| Tournament weekend | Recovery, confidence, light reps |
| U10 | More games, shorter stations |
| U14 | More reps, metrics, position-specific |
| Heavy pitching week | **No extra throwing volume** (hard, from core §12) |
| Weak QAB trend | Add approach/contact station |
| High throwing errors | Add catch/throw accuracy block |

### 2.3 Standard practice structure
Arrival/setup → dynamic warmup → throwing progression (safe ramp) → skill stations → competitive challenge → team/game situation → wrap-up (one coaching point + next mission).

### 2.4 Time-scaled templates (same focus, different length)
- **30-min emergency:** 5 warmup / 8 throwing accuracy / 10 main station / 5 challenge / 2 wrap. (Rain delay, short cage slot, pre-game, young kids.)
- **60-min standard:** 8 warmup / 10 throwing / 30 (3×10 stations) / 8 team challenge / 4 wrap.
- **90-min full:** 10 / 12 / 36 (3×12 stations) / 20 team defense-live / 8 competitive / 4 wrap.
- **120-min advanced:** 12 / 15 / 45 stations / 25 team-situational / 15 controlled live / 8 review+assignments.

### 2.5 Age scaling (tone + structure, one engine)
| Rule | U8–U10 | U12 | U14 |
|---|---|---|---|
| Station length | 7–10 min | 10–12 min | 12–18 min |
| Instructions | One cue only | One cue + one checkpoint | Cue + measurable target |
| Competition | Team points / missions | PRs, station scores | Position ladders, PRs, team goals |
| Metrics | Simple scores | Accuracy %, contact/command score | EV, strike %, pop time, QAB transfer |
| Throwing volume | Conservative | Conservative | Purposeful, still guardrailed |
| Team concepts | Minimal, keep moving | Cutoffs, rundowns, bunt D, reads | Situations, pressure reps, standards |

U10 cue style: *"Field it clean, throw it to a target"* — never *"Your arm slot is inconsistent and your exchange is late."*

### 2.6 Equipment scaling
Every station carries substitution variants tied to the core §16–§17 drill tiers (no-gear → basic → radar/sensor → cage → facility tech). The compiler only assigns variants the coach's equipment supports, and offers substitutions otherwise (core §17.3 logic, applied at team scale).

---

## 3. Practice Quality Score

The compiler **grades the plan before the coach runs it** — because youth practices fail for predictable reasons. This is a strong differentiator: no competitor critiques the practice itself.

| Category | Checks |
|---|---|
| Reps per player | Are kids actually moving? |
| Idle time | Are lines too long? |
| Age fit | Too advanced or too babyish? |
| Equipment fit | Can they actually run it? |
| Coach load | Can 1–2 coaches manage it? |
| Safety | Throwing/catching overuse risk? (core §12) |
| Game relevance | Does it attack the real team issue? (core §9, §15) |
| Fun factor | Especially U8–U12 |
| Measurability | Can progress be tracked? |
| Home carryover | One simple follow-up mission? |

Output: *"Practice Quality: 87/100 — strong plan, good movement and game relevance. Warning: throwing volume may be high for pitchers who threw this weekend."*

---

## 4. Anti-Line Engine

Detects and fixes the #1 youth-practice failure: standing in line. Critical for U10.

| Problem | Fix |
|---|---|
| Too many kids at one tee | Split into dry-swing + tee + tracking stations |
| One coach, too many stations | Reduce to 2 stations |
| Too much dead time | Add a partner challenge |
| 1 fielder, 1 hitter, 10 waiting | Convert to rapid-rep rotation |
| Pitching station too slow | Use target-throwing / command game instead |

Warning surfaced to coach: *"This plan creates too much standing. Add a second tee station or reduce group size."* A great U10 practice is high-touch, low-line, high-energy — not "advanced."

---

## 5. Player Grouping Engine

Auto-creates groups intelligently, not randomly.

| Mode | Use |
|---|---|
| Balanced | Normal stations |
| Skill-based | Differentiated instruction |
| Position | Catchers, pitchers, IF, OF |
| Buddy | Pair stronger with newer |
| Safety | Pitchers/catchers → lower-volume station (core §12) |
| Competition | Fair teams for challenges |

Example: *"Group pitchers and catchers away from the high-volume throwing station today — both caught/pitched this weekend."* That workload-aware detail is what earns coach trust.

---

## 6. Coach Modes

| Mode | What it does |
|---|---|
| **Build Practice** | Balanced plan from time/players/coaches/space |
| **Fix Last Game** | Coach picks the symptom (too many walks, Ks, bad throws, missed cutoffs, poor baserunning, low energy, catchers struggled, couldn't hit velo) → compiler builds around it |
| **GameChanger-Driven** | Imports stats (core §15) → diagnoses team issue → recommends focus → builds plan. *Ingests/interprets GameChanger signals; does not compete with GameChanger's own layer.* |
| **Tournament Recovery** | Light throwing only, tee/contact, baserunning reads, confidence reps, mobility — no overuse (core §12; aligns with Pitch Smart rest guidance) |
| **Indoor / Rainout** | Cage/gym/no-balls/no-bats/one-net/30-min → footwork, dry swing, reaction, mirror, plyo/sock-ball patterns, video review |
| **Substitute Coach** | For a parent volunteer: "Run this exact 45-min practice. One cue per station. Rotate every 8 min." Setup diagram, one cue, safety note, success picture, common mistake, easy scoring. (Makes the app beloved by rec coaches.) |
| **Tryout / Evaluation Day** | Timed sprint, throwing accuracy, fielding, hitting contact, catcher pop, command, coachability, effort → player cards + position suggestions + dev needs (not just ranking) |
| **Baseline Week** | Day 1 speed/throwing/hitting · Day 2 fielding/pitching-catching/situations → team heatmap + player cards + focus rec + parent reports + home missions. Major coach/facility wedge. |

---

## 7. Execution Layer (run the practice, don't just print it)

### 7.1 Live Practice Companion
A run-the-session screen: current block · countdown timer · next rotation · station groups · quick scoring · safety warning · coaching cue · mark-complete · skip-block · "need shorter version" · send-home-mission. This is the habit-forming surface — it beats static PDFs.

### 7.2 Dynamic adjustment (real life happens)
Coach taps a disruption → compiler recompiles live: player/coach absent, field unavailable, running late ("we lost 15 minutes" → compress), one coach today (reduce station complexity), kids losing focus, station too hard/easy, rain starts, equipment missing.

### 7.3 Assistant Coach Cards
Every station gets a tiny card for the volunteer parent running it:
```
Station: Target Throw Challenge
Goal: Clean catch, set feet, hit target
Time: 10 min   Scoring: 1 pt per accurate throw
Only cue: "Feet before throw."
Watch for: rushing / throwing off back foot
Easier: shorten distance   Harder: add shuffle / time pressure
```

### 7.4 Coach recap in 30 seconds
Post-practice prompts (what went well / needs work / soreness / who stood out / assign home mission?) → generates internal team record, player notes, a parent message, and a next-practice recommendation. Closes the coach → parent → player loop.

---

## 8. Coach-Facing Dashboards

### 8.1 Team Development Map (not a stat table — a development map)
| Skill area | Team status | Confidence | Suggested focus |
|---|---|---|---|
| Contact quality | Improving | Medium | Barrel-control + zone decisions |
| Throwing accuracy | Weak | Strong | Catch/throw under pressure |
| Pitcher command | Mixed | Medium | 9-box + first-pitch strike |
| Baserunning | Strong | Low | Maintain, add reads |
| Catching | Watch | Low | Blocking + transfer |

Confidence ratings come from core §15 (game-data sample size). The map answers, at a glance: *what does my team need?*

### 8.2 Per-player coach card
One sentence, not a mid-practice report: *"Hudson — next coaching point: command glove-side low without adding throwing volume."* Pulls from the player's core-engine diagnosis + safety state.

### 8.3 Coach roster view
| Player | Focus | Missions | Safety | Game transfer |
|---|---|---|---|---|
| Hudson | Command | 2/3 | 🟢 | Improving |
| Quinn | Contact | 3/3 | 🟢 | Strong |
| Collin | Catching | 1/2 | 🟡 | Not enough data |

---

## 9. Coach Development Layer (make coaches better, not just players)

A non-cheesy coach progression that unlocks capability as the coach demonstrates good practice habits:

| Level | Unlock |
|---|---|
| Practice Builder | Generate basic practices |
| Station Coach | Run low-line stations |
| Development Coach | Assign player-specific missions |
| Data Coach | Use GameChanger transfer |
| Safety Coach | Manage workload + recovery |
| Program Coach | Run baseline/re-test cycles |

Optional coach badges tied to real behavior: Low-Line Practice, Baseline Week Complete, Safe Workload Streak, Game Transfer Detected, Parent Follow-Up Sent. Plus an optional **team culture layer** — coach picks team values ("Every throw counts," "Next pitch win it") that the compiler weaves into challenge names (great for U10/U12).

---

## 10. Position-Specific Tracks

The compiler knows a catcher, shortstop, pitcher, and outfielder need different paths. Tracks: pitcher, catcher, middle infield, corner infield, outfield, utility, first base, hitter/DH — plus **softball-specific** slapper and windmill-pitcher tracks. Each track carries its own key metrics, practice blocks, home missions, facility tests, safety flags, and game-transfer stats (all defined in the core engine). Catcher track example: pop time, exchange, blocking, receiving, throw accuracy, workload, pitcher communication, SB-allowed/CS/passed-ball notes.

> **Softball is first-class here, not a checkbox** — underhand-pitching and slapper tracks, faster field dimensions, adjusted catcher metrics, different baserunning pressure, and a softball-specific drill library. This is a deliberate market wedge against baseball-first tools.

---

## 11. Practice Plan Data Model
```json
{
  "practice_plan_id": "practice_10u_contact_throwing_75min_v1",
  "team_id": "team_001",
  "coach_id": "coach_001",
  "sport": "baseball",
  "age_group": "10U",
  "duration_minutes": 75,
  "player_count": 12,
  "coach_count": 3,
  "space": ["full_field", "batting_cage"],
  "equipment": ["tee", "net", "cones", "bucket_balls"],
  "season_state": "in_season",
  "intensity": "normal",
  "primary_focus": ["throwing_accuracy", "barrel_contact"],
  "safety_flags": { "heavy_pitching_week": false, "catcher_workload_high": false },
  "quality_score": 87,
  "blocks": [
    { "name": "Dynamic Warmup", "start_minute": 0, "duration_minutes": 8, "type": "warmup" },
    { "name": "Throwing Progression", "start_minute": 8, "duration_minutes": 10, "type": "throwing", "volume_level": "moderate" },
    { "name": "Stations", "start_minute": 18, "duration_minutes": 30, "type": "rotation",
      "stations": ["tee_barrel_quest", "target_throw_challenge", "ground_ball_footwork"] }
  ],
  "home_mission": { "name": "Clean Throw Challenge", "duration_minutes": 10, "assigned_to": "all_players" }
}
```
New entities beyond the core data model: `CoachProfile`, `Team`, `PracticePlan` (above), `PracticeBlock`, `Station`, `AssistantCard`, `PracticeQualityReport`, `CoachRecap`. All reference existing core entities (Player, Drill, Diagnosis, GuardrailState, GameStat) rather than duplicating them.

---

## 12. Grounded AI Layer

The AI is a **grounded baseball/softball development assistant**, not a generic chatbot. It sits across all three pillars on top of real data: `player profile + coach notes + GameChanger stats + practice history + equipment + age + workload + goals → recommendation`.

### 12.1 Architecture — retrieval over generation (library-first)
```
user request
 + player/team data + age band + equipment + workload/safety rules
 + APPROVED drill/plan library + practice templates + GameChanger trends
= grounded recommendation
```
The AI's job is to **select, arrange, and explain** vetted library content under the user's constraints — the same job the Practice Compiler does, with a natural-language front door. It does not free-author baseball prescriptions.

### 12.2 The freeform boundary (the hard rule)
Per the chosen "library-first, freeform clearly flagged" model:
- **Default = library-only.** Any recommendation that becomes a plan, mission, drill assignment, or anything written to a player's record comes **only** from the vetted library, inheriting that item's age band, equipment, risk level, and re-test metadata.
- **Freeform lane = allowed but walled off.** For genuinely novel coach questions the AI may offer a *general* idea, but it must be **labeled "custom suggestion — not vetted,"** cannot be saved as a player plan/mission, and **must never touch anything safety-relevant**: throwing volume, max-effort work, pitch counts, return-from-soreness, weighted-ball/velo programming, or any minor-specific physical prescription. Those are library-only, always — no exceptions, regardless of how the question is phrased.
- The AI surfaces confidence (core §15 levels) and says *"not enough data yet"* rather than inventing certainty.

### 12.3 Roles (one engine, different voices)
| Role | User | Example |
|---|---|---|
| Practice Planner | Coach | "75 min, 12 U10s, 2 coaches, full field, tee/net/cones, we walked too many and threw poorly" → full plan + stations + assistant cards + safety notes + home mission + parent summary |
| Stat Interpreter | Coach/Parent | "Issue isn't hitting overall — it's Ks with runners on and low QAB. Next: zone decisions + two-strike contact." |
| Coach-Speak Translator | Parent | "He's pulling off" → plain explanation + one home drill (from library) + one cue + what *not* to overcorrect + how to know it improved |
| Mission Guide | Player | U10: "Mission: Target Master, beat 20 pts." U14: "Command consistency, 65%+ competitive misses over 20 pitches." |
| Safety Checker | Parent/Coach | "Don't run another throwing session — pitched yesterday." / "Not enough game data to judge this block yet." |
| Recap Writer | Coach | Turns 4 tapped notes into coach recap + parent message + next-practice rec |
| Facility Report Writer | Facility | Combine/baseline → player reports |

### 12.4 AI MVP (start with five)
1. Practice Plan Generator (coach value, immediate) · 2. Coach-Speak Translator (parent painkiller) · 3. One Thing This Week (retention; addendum §D.2) · 4. GameChanger Stat Summary (connects to games; core §15) · 5. Parent Recap Generator (saves coach time).
**Do not** start with AI swing analysis — harder, riskier, easy to overpromise.

### 12.5 What makes the AI different
Bad: *"Here are 20 hitting drills."* Great: *"Your 10U team has 75 minutes, 12 players, 2 coaches, high strikeouts, and one tee. Run this 3-station practice. Keep pitchers out of extra throwing — they threw Sunday. Send parents this 10-minute home mission."* Product line: *Not more drills. The right next rep.*

---

## 13. Monetization (Coach/Facility tiers)

| Tier | Price | Includes |
|---|---|---|
| Free Coach | $0 | 3 saved practices |
| Coach Plus | $14.99/mo | Full compiler, station builder, quality score |
| Team Season Pass | $99–$199/season | + player cards, team baseline, parent home missions, GameChanger import |
| Club Plan | $499+/season | Multi-team, club dashboard |

**Best offer:** *$149/team/season — practice builder + player cards + team baseline + parent home missions.* (Prices directional; see market-research doc — verify against competitors before external use.)

---

## 14. Coach MVP build order

**Coach MVP (ship first):** coach profile → team setup → age group → duration → player count → coach count → equipment checklist → field/facility access → practice focus → **auto-generated plan** → station rotation → home mission → save/export/share.

**Then add:** GameChanger import + player mapping (core §15) → data-driven practice suggestions → practice quality score → anti-line + grouping engines → live practice companion → grounded AI practice planner → game-transfer check.

> **The strategic shift this pillar completes:** the product is no longer just player development — it's a **development operating system for the time between games.** GameChanger owns the game; this platform owns what to practice, how to practice, who needs what, what parents do at home, whether it transferred, how coaches plan better practices, and how facilities verify progress.

---

## 15. The killer end-to-end workflow

1. Coach imports GameChanger stats (core §15). 2. AI/engine diagnoses team issues (core §9). 3. App checks player profiles + workload (core §11–§12). 4. Coach picks available time/equipment. 5. Compiler builds the practice (§2) and grades it (§3). 6. Stations include assistant cards (§7.3). 7. Players complete missions (addendum §B). 8. Parents get one home mission (§7.4). 9. Players re-test (core §13). 10. GameChanger import checks transfer (core §15). 11. Compiler adjusts the next practice. 12. Season report shows the development arc.

That loop — game data → team diagnosis → constraint-aware practice → player missions → home/facility reps → re-test → transfer check → next plan — **is the platform.** Every rep has a reason; every practice fits reality; every improvement gets checked on the field.
