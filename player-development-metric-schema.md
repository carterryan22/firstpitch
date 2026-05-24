# Player Development Metric Schema

**Scope:** Baseball + Softball · **Age bands:** 8U → 18U

**Two different "floors" — do not conflate them:**
- **Participation floor = a smartphone.** A player can onboard, train, and log progress with no special gear at all (driveway, wall, tennis ball). Training is never gated behind equipment.
- **Measurement floor = Pocket Radar (Ball Coach / Smart Coach class) or a sensor.** A *trustworthy number* (and therefore the personalized **diagnosis**) requires radar/sensor or a facility test. Without it, the player still trains on general/foundational plans; the personalized diagnosis stays **locked** until a real measurement exists.

This separation is deliberate and is the accessibility wedge: **start in the driveway tonight, improve with basic gear, verify at a facility later.** See §8.1 (measurement verification states) and §17 (drill environment tiers).

This is the data and logic spec for a player-owned development tracker. It is organized so a developer can build directly from it: every metric has a unit, a data type, a measurement method, a re-test cadence, and age-banded reference thresholds.

---

## 0. How to read this spec

### Metric classes
Every metric belongs to exactly one class. The class determines whether you can set a goal on it, baseline it, or only log it.

| Class | Goal-able? | Baseline-able? | Examples |
|---|---|---|---|
| **Measurable** | Yes (delta goals) | Yes | Exit velo, 60-yd, pop time, FB velo |
| **Skill score** | Yes (rate goals) | Yes | Strike %, 9-box command score |
| **Game-context** | No (log only) | No | RBI, AVG, OBP, ERA |
| **Guardrail** | No (safety cap) | No | Pitch count, days rest |

> **Design rule:** Never let a user set a target on a game-context stat. "Hit .400" is not a development goal — it depends on opponents and luck. Goals attach only to Measurables and Skill scores. Game-context stats are recorded for history and motivation only.

### Threshold confidence
Each threshold table is tagged:
- 🟢 **Established** — widely published / standardized (e.g., PitchSmart counts, catcher pop-time tiers).
- 🟡 **Directional** — synthesized from common showcase/coaching reference ranges; treat as starting calibration, refine against your own user data.

**Do not present 🟡 numbers to users as precise percentiles.** Show them as "developing / on-track / advanced / elite" bands until you have a real dataset.

### Tier labels (used in every threshold table)
- **Developing** — typical for a player newer to the age band
- **On-track** — solid for the age band
- **Advanced** — clearly above the age band
- **Elite** — recruiting-grade / top percentile for the band

---

## 1. Hitting

### 1.1 Exit Velocity — off tee
- **Class:** Measurable · **Unit:** mph · **Type:** float
- **Method:** Pocket Radar behind/beside the cage, ball off a stationary tee. Take 5 swings, record top 3 average + peak.
- **Cadence:** Every 3–4 weeks (weekly is noise)
- **Why:** Most predictive single hitting number; tee removes pitch-quality variance so it's a clean strength+contact signal.

**Baseball (🟡 directional, top-3 average mph)**

| Age | Developing | On-track | Advanced | Elite |
|---|---|---|---|---|
| 8U | <40 | 40–48 | 48–55 | 55+ |
| 10U | <48 | 48–58 | 58–66 | 66+ |
| 12U | <58 | 58–68 | 68–76 | 76+ |
| 14U | <68 | 68–80 | 80–90 | 90+ |
| 16U | <80 | 80–90 | 90–98 | 98+ |
| 18U | <85 | 85–95 | 95–102 | 102+ |

**Softball (🟡 directional, top-3 average mph)**

| Age | Developing | On-track | Advanced | Elite |
|---|---|---|---|---|
| 8U | <35 | 35–43 | 43–50 | 50+ |
| 10U | <43 | 43–52 | 52–58 | 58+ |
| 12U | <52 | 52–60 | 60–66 | 66+ |
| 14U | <58 | 58–66 | 66–72 | 72+ |
| 16U | <62 | 62–70 | 70–76 | 76+ |
| 18U | <65 | 65–72 | 72–78 | 78+ |

### 1.2 Exit Velocity — front toss / live
- **Class:** Measurable · **Unit:** mph · **Type:** float
- **Method:** Same radar setup, front toss or live BP. Record top-3 average + peak.
- **Cadence:** Monthly
- **Why:** Shows whether tee gains transfer to timing against a moving ball. Track the **gap** between tee and live — a shrinking gap means improving timing.

> Thresholds: use the tee table minus ~3–6 mph as a rough live expectation; do not hard-code separate bands until you have data.

### 1.3 Bat Speed
- **Class:** Measurable · **Unit:** mph · **Type:** float
- **Method:** Bat sensor (Blast/Diamond Kinetics) if available; **otherwise mark as premium/optional** — not in the phone+radar floor.
- **Cadence:** Monthly
- **Why:** Pairs with exit velo to diagnose *why* a number moved — bat speed up = strength/mechanics; exit velo up but bat speed flat = better contact quality.

### 1.4 Hard-Hit % (in games)
- **Class:** Skill score · **Unit:** % · **Type:** float (derived)
- **Method:** Tag each game at-bat as hard-hit (Y/N) by feel or by radar if cage-tested standard known. Rolling 10-game window.
- **Cadence:** Per game, displayed as rolling rate
- **Why:** The development-friendly replacement for batting average — far less luck-dependent.

### 1.5 Game-context hitting stats (LOG ONLY)
- **Class:** Game-context · **No goals permitted**
- Fields: `AVG`, `OBP`, `SLG`, `RBI`, `H`, `2B/3B/HR`, `BB`, `K`, `SB`
- **Why track:** History, milestones, motivation, shareable record. **Why not goal:** outcome-dependent.

---

## 2. Speed & Baserunning

### 2.1 Home-to-First Time
- **Class:** Measurable · **Unit:** seconds · **Type:** float (2 decimals)
- **Method:** Phone stopwatch or video frame-count, contact-to-bag. Best of 3.
- **Cadence:** Every 4–6 weeks
- **Why:** Directly cited by coaches/recruiters. Note handedness — lefties start ~1.5 ft closer.

**Baseball (🟡 directional, seconds; lower = better)**

| Age | Developing | On-track | Advanced | Elite |
|---|---|---|---|---|
| 10U | >5.0 | 4.7–5.0 | 4.4–4.7 | <4.4 |
| 12U | >4.8 | 4.5–4.8 | 4.3–4.5 | <4.3 |
| 14U | >4.6 | 4.4–4.6 | 4.2–4.4 | <4.2 |
| 16U | >4.5 | 4.3–4.5 | 4.1–4.3 | <4.1 |
| 18U | >4.4 | 4.2–4.4 | 4.0–4.2 | <4.0 (RH) / <3.9 (LH) |

**Softball (🟡 directional, seconds; lower = better)** — bases are 60 ft vs. 90 ft, so times are much lower.

| Age | Developing | On-track | Advanced | Elite |
|---|---|---|---|---|
| 10U | >3.6 | 3.4–3.6 | 3.2–3.4 | <3.2 |
| 12U | >3.4 | 3.2–3.4 | 3.0–3.2 | <3.0 |
| 14U | >3.2 | 3.0–3.2 | 2.9–3.0 | <2.9 |
| 16U | >3.1 | 2.95–3.1 | 2.85–2.95 | <2.85 |
| 18U | >3.0 | 2.9–3.0 | 2.8–2.9 | <2.8 |

### 2.2 60-Yard Dash (baseball) / 20-Yard or Home-to-First (softball)
- **Class:** Measurable · **Unit:** seconds · **Type:** float
- **Method:** Timed sprint, best of 2 with full rest. 60 yd is the baseball recruiting standard. For softball, the home-to-first and a short shuttle are more relevant than 60.
- **Cadence:** Every 6 weeks

**Baseball 60-yd (🟡 directional, seconds)**

| Age | Developing | On-track | Advanced | Elite |
|---|---|---|---|---|
| 12U | >9.0 | 8.3–9.0 | 7.8–8.3 | <7.8 |
| 14U | >8.2 | 7.6–8.2 | 7.2–7.6 | <7.2 |
| 16U | >7.6 | 7.1–7.6 | 6.8–7.1 | <6.8 |
| 18U | >7.4 | 6.9–7.4 | 6.6–6.9 | <6.6 |

### 2.3 "Around the World" (Home → 2B → 3B → Home)
- **Class:** Measurable · **Unit:** seconds · **Type:** float
- **Method:** Full base circuit, timed, best of 2. This is your composite conditioning + turns + speed metric — and a fun recurring test.
- **Cadence:** Monthly
- **Why:** No clean public benchmark exists, so **treat this as a personal-best / delta metric**, not a tiered one. The product value is the improvement curve, not a percentile.

### 2.4 First-Step / 10-Yard Split
- **Class:** Measurable · **Unit:** seconds · **Type:** float
- **Method:** Timed first 10 yards of a sprint, best of 2. Phone-timed acceptable.
- **Cadence:** Every 6 weeks (with the 60-yd)
- **Why:** Isolates explosiveness (steal/jump ability) from top-end speed. **Required for the speed diagnosis loop** (§9.3): comparing the 10-yd split against the 60-yd is what separates a first-step problem from a top-speed problem. Not optional once the training engine is live.

---

## 3. Pitching — Baseball

### 3.1 Fastball Velocity
- **Class:** Measurable · **Unit:** mph · **Type:** float
- **Method:** Pocket Radar behind the plate/L-screen. Record bullpen peak + top-3 average. Log mound distance (it changes by age).
- **Cadence:** Monthly peak; per-bullpen logging

**Baseball FB velo (🟡 directional, mph; note mound distance changes)**

| Age (distance) | Developing | On-track | Advanced | Elite |
|---|---|---|---|---|
| 10U (46 ft) | <40 | 40–48 | 48–54 | 54+ |
| 12U (50 ft) | <48 | 48–55 | 55–62 | 62+ |
| 14U (60.5 ft) | <60 | 60–70 | 70–78 | 78+ |
| 16U (60.5 ft) | <72 | 72–80 | 80–86 | 86+ |
| 18U (60.5 ft) | <78 | 78–85 | 85–90 | 90+ |

### 3.2 Strike % / First-Pitch Strike %
- **Class:** Skill score · **Unit:** % · **Type:** float (derived)
- **Method:** From pitch log. First-pitch strike % is the higher-value one.
- **Cadence:** Per outing, rolling
- **Why:** At youth levels, command predicts success better than velocity. 🟢 ~60%+ strike rate and ~60%+ first-pitch strikes are strong at most amateur levels.

### 3.3 9-Box Command Score
- **Class:** Skill score · **See Section 6 for full logic.**

### 3.4 Spin Rate / Movement
- **Class:** Measurable · **Premium/optional** (requires Rapsodo-class device — not in the floor tier).

---

## 4. Pitching — Softball (fastpitch)

Softball pitching is underhand and mechanically unrelated to baseball — **separate metric set, separate thresholds.**

### 4.1 Fastball Velocity (windmill)
- **Class:** Measurable · **Unit:** mph · **Method:** radar at release/plate, 43 ft for 14U+.
- **Cadence:** Monthly peak

**Softball FB velo (🟡 directional, mph)**

| Age | Developing | On-track | Advanced | Elite |
|---|---|---|---|---|
| 10U | <38 | 38–44 | 44–49 | 49+ |
| 12U | <45 | 45–52 | 52–57 | 57+ |
| 14U | <52 | 52–58 | 58–62 | 62+ |
| 16U | <56 | 56–62 | 62–66 | 66+ |
| 18U | <58 | 58–64 | 66–68 | 68+ |

### 4.2 Spin Rate (rise/drop/curve)
- **Class:** Measurable · **Premium/optional.** Spin matters more in softball than youth baseball, but still needs a Rapsodo-class tool.

### 4.3 Strike % / First-Pitch Strike %
- Same as baseball 3.2 — class Skill score, command-first philosophy applies.

### 4.4 9-Box Command Score
- Same logic as baseball (Section 6).

---

## 5. Fielding & Throwing

### 5.1 Position Velocity (IF / OF)
- **Class:** Measurable · **Unit:** mph · **Type:** float
- **Method:** Radar on throws — infield across the diamond, outfield on a crow-hop throw. Top-3 average.
- **Cadence:** Monthly

**Baseball throwing velo (🟡 directional, mph)**

| Age | IF Developing→Elite | OF Developing→Elite |
|---|---|---|
| 12U | <50 → 65+ | <52 → 68+ |
| 14U | <62 → 78+ | <64 → 82+ |
| 16U | <74 → 86+ | <76 → 90+ |
| 18U | <78 → 90+ | <80 → 94+ |

> Softball throwing velo runs roughly 8–15 mph lower than baseball at the same age; band separately once you have data.

### 5.2 Catcher Pop Time (home → 2B)
- **Class:** Measurable · **Unit:** seconds · **Type:** float (2 decimals)
- **Method:** Glove-pop to middle-infielder's glove at 2B. Best of 3. 🟢 This is a well-standardized metric.
- **Cadence:** Monthly

**Catcher pop time (🟢 established tiers, seconds; lower = better)**

| Level | Developing | On-track | Advanced | Elite |
|---|---|---|---|---|
| Baseball 14U | >2.4 | 2.2–2.4 | 2.05–2.2 | <2.05 |
| Baseball 16U | >2.2 | 2.05–2.2 | 1.95–2.05 | <1.95 |
| Baseball 18U | >2.1 | 2.0–2.1 | 1.9–2.0 | <1.9 |
| Softball 14U | >2.0 | 1.9–2.0 | 1.8–1.9 | <1.8 |
| Softball 18U | >1.9 | 1.8–1.9 | 1.7–1.8 | <1.7 |

### 5.3 Glove-to-Release / Transfer Time
- **Class:** Skill score · **Optional** — isolates hands/transfer from arm strength.

---

## 6. The 9-Box Command Competition (full logic)

A repeatable, gamified command test. Works for baseball and softball pitching identically.

### 6.1 The grid
```
 [7] [8] [9]        Corners (1,3,7,9) = 3 pts
 [4] [5] [6]        Edges   (2,4,6,8) = 2 pts
 [1] [2] [3]        Middle  (5)       = 0 pts  (middle-middle is a mistake)
```

### 6.2 Core mechanic: call-then-throw (tests command, not luck)
1. Pitcher **declares the target box** before each pitch.
2. Catcher/coach logs the **actual box** the pitch hit (or "miss" if out of zone).
3. Scoring rewards hitting the *declared* box:

| Result | Points |
|---|---|
| Hit declared corner box | 3 |
| Hit declared edge box | 2 |
| Hit declared middle box | 0 |
| Hit a *different* box (in-zone, wrong target) | 1 |
| Out of zone entirely | 0 |
| Out of zone but intentional chase target (advanced mode) | +1 if declared "off" |

### 6.3 Round structure
- A **round = 18 pitches** (2 attempts per box, or 9 declared targets ×2).
- **Round score** = sum of points (max 54 if all declared corners hit — adjust by target mix).
- Store **per-box hit-rate** separately: `attempts[box]`, `hits[box]`.

### 6.4 The insight layer (this is the differentiator)
From per-box data, surface things no scoreboard app shows:
- **Command heatmap** — % success by box over time.
- **Blind-spot detection** — e.g., "Glove-side-low (box 1 or 7 depending on handedness) success is 22% vs. 71% arm-side. Recommended drill focus."
- **Velo-on-command tradeoff** (older players) — log radar with each pitch; show whether command collapses at peak velo.

### 6.5 Velocity-weighted mode (14U+)
Combined score per pitch = `location_points × velo_multiplier`, where `velo_multiplier` scales from the player's own rolling-average velo (e.g., 1.0 at average, up to 1.3 at peak). Keeps command primary while rewarding live-velo execution.

### 6.6 Head-to-head mode
Two pitchers alternate rounds; same target sequence; higher round score wins. Drives practice engagement.

---

## 7. Baselines, Intervals & Goals (the engine)

This is the layer that makes it a *development* product rather than a logger.

### 7.1 Baseline capture ("Combine Day")
On onboarding (and ideally each season start), run a structured session that records every applicable Measurable at once:
- Hitting: tee exit velo
- Speed: home-to-first, 60-yd (or softball equivalent)
- Around-the-world
- Position throwing velo
- Pitchers: FB velo, one 9-box round
- Catchers: pop time

Store as the player's `baseline_set` with a timestamp. Everything downstream measures against this.

### 7.2 Re-test cadence table
| Metric | Cadence | Rationale |
|---|---|---|
| Tee exit velo | 3–4 wks | Strength/mechanics move slowly; weekly = noise |
| Live exit velo | Monthly | Timing signal |
| Home-to-first | 4–6 wks | |
| 60-yd | 6 wks | |
| Around-the-world | Monthly | Fun recurring, motivational |
| FB velo (peak) | Monthly | Arm needs recovery between max efforts |
| Pop time | Monthly | |
| Throwing velo | Monthly | |
| 9-box | Weekly | Skill/command moves fast with reps |
| Strike % / hard-hit % | Rolling per game/outing | |

> The app should **schedule** the next re-test and gently prompt — not let users spam-test (which produces noise and false "progress").

### 7.3 Goal types
- **Delta goal** (Measurables): `+3 mph tee exit velo within 8 weeks`. Progress = (current − baseline) / (target − baseline).
- **Rate goal** (Skill scores): `first-pitch strike % from 52% → 62% over 6 weeks`.
- **Personal-best goal** (un-benchmarked metrics like around-the-world): beat your own best.
- ❌ **No outcome goals** on game-context stats.

### 7.4 Milestone badges (threshold-crossing events)
Trigger on first time a player crosses a tier boundary or a notable absolute:
- First sub-4.3 home-to-first (baseball) / sub-3.0 (softball)
- First 2.0 pop time
- First 70 / 80 / 90 mph exit velo
- First 60 mph FB (12U) etc.
- "Personal best" badge on any metric improvement
- Streak badges (e.g., 5 consecutive 9-box rounds improving)

### 7.5 Percentile/context display rule
Always render a raw number **with band context**: "82 mph exit velo — Advanced for 14U baseball." Until you have a real user dataset, show the **band label**, not a false percentile ("78th percentile"). Swap to true percentiles once your own data supports them — and make that dataset a selling point.

---

## 8. Closed-Loop Training Plan Engine

**Purpose:** convert player measurements into safe, age-appropriate development plans. The product does not just say *"your exit velo is 62 mph."* It says: *"Your exit velo is developing for 12U. Your bat speed is solid, but contact quality is lagging. Start the 3-week barrel-control plan. Re-test tee exit velo in 21 days."*

This is the core product loop:

```
  Measure → Diagnose → Assign Plan → Train → Re-test → Adjust
     ▲                                                    │
     └──────────────────────── loop ─────────────────────┘
```

This is the layer that separates the product from every competitor. Hardware (Pocket Radar, Blast, HitTrax) *measures*; content (CamWood, BRX, Slash-Your-60, YouTube/IG) *prescribes*; nothing connects the kid's measured data to the plan that addresses it. **We close that loop.** We are the intelligence/connection layer — we diagnose and route to age-appropriate, credentialed programming. We do not need to author superior drills to win; we win on connection, personalization, safety, and neutrality.

### 8.1 Verification Ladder (the gear/diagnosis/trust gate)

Training is **never** gated behind equipment. The personalized **diagnosis is** — because a diagnosis built on an untrustworthy number is worse than none. Not every measurement carries equal trust, so every metric value sits on a 5-level verification ladder. This single system serves three jobs at once: it gates diagnosis, it powers the profile display, and it sets recruiting eligibility.

| Level | `state` | Source | Drives diagnosis? | Recruiting-eligible? |
|---|---|---|---|---|
| 1 | `self_entered` | Parent/player typed it in manually | **No** | No |
| 2 | `video_attached` | Self-entered + a proof video of the rep | **No** (but higher display trust) | No |
| 3 | `device_captured` | Pocket Radar / sensor / app timing | **Yes** | No |
| 4 | `coach_verified` | A coach confirms the result | **Yes** | Partial |
| 5 | `facility_verified` | Facility/combine-administered test | **Yes (high trust)** | **Yes** |
| 6 | `event_verified` | Sanctioned combine/showcase event under standardized conditions | **Yes (highest trust)** | **Yes (strongest)** |

> Levels 5 and 6 are both facility-grade; the distinction is that `event_verified` comes from a one-off sanctioned testing event (a combine/showcase) under controlled, comparable conditions, which carries the most weight for recruiting. Treat it as the ceiling of the ladder.

**The diagnosis gate:** personalized diagnosis unlocks at **Level 3 (`device_captured`) and above**. Levels 1–2 are logged for the player's own history and shown with honest provenance, but never drive a personalized plan — the app never treats a typed-in or merely video'd number as a basis for diagnosis, and **never invents a number** of its own.

**Profile display uses the ladder directly:**
```
Exit Velo:        64 mph   — Facility Verified
Home-to-First:    4.72 s   — Video Attached
9-Box Score:      28       — Self-Tracked
```

**Rule:** a player at Level 1–2 (typically no radar/sensor; Tier 0–1 in §17) still trains — they receive **general/foundational plans** by age band and skill area. Their personalized diagnosis stays **locked** with a plain-language unlock prompt, never a dead end:

> "You're training on the foundational hitting plan. Add one device-captured reading (or a coach/facility test) to unlock your personalized diagnosis — we'll tell you exactly which driver to work on."

This turns the gate into the upgrade pull toward better data, keeps the "estimated velocity" credibility trap shut, and makes verification a *visible, earnable* trust signal rather than a binary.

> Note for the data model: `MetricEntry.verification_state` takes one of the five ladder values above. The diagnosis engine filters to `device_captured | coach_verified | facility_verified`. The recruiting layer (addendum, Phase 4) surfaces `facility_verified` (and optionally `coach_verified`).

### 8.2 Plan philosophy — rules the engine enforces

| Rule | Product meaning |
|---|---|
| Goals attach only to measurables / skill scores | Exit velo, bat speed, 60-yd, pop time, strike %, 9-box score |
| Game stats are log-only | AVG, RBI, ERA, errors never drive goals or plans |
| Plans must be age-banded | 10U and 16U cannot get the same prescription (§10) |
| Throwing plans are safety-gated | No aggressive velo plan without workload, age, and readiness checks (§11–§12) |
| Diagnosis requires a Level-3+ number | Levels 1–2 train on foundational plans only (§8.1) |
| Re-testing is scheduled | Every plan ends with a measurement checkpoint (§13) |
| Recommendations are vendor-neutral | Free drills, internal plans, partner content, or tools — ranked by data-fit (§14) |

> **Liability boundary:** the product must **not** author max-effort throwing prescriptions ("do 14 max-effort throws") for minors. It *diagnoses* and *routes to* programming authored or vetted by credentialed strength-and-conditioning / physical-therapy professionals, always under the guardrail ceiling (§12). Pitch Smart provides the age-based pitching/rest limits; overuse is the principal youth-throwing injury risk. Fatigue is a **hard stop**, not something to push through.

---

## 9. Driver Trees & Diagnosis Logic

Every metric has a **driver tree**: a bad number never auto-generates a generic plan. The engine first *diagnoses which driver is the bottleneck for this player*, then routes to a plan for that driver. **All diagnosis logic below requires verified numbers (§8.1); a Tier 0–1 player gets the foundational plan instead.**

### 9.1 Hitting — Tee Exit Velocity

| Input | Diagnosis | → Plan type |
|---|---|---|
| Low exit velo + low bat speed | Strength / rotational-power deficit | Bat-speed + rotational-power block |
| Low exit velo + **good bat speed** | **Contact-quality / barrel-accuracy deficit** (do NOT prescribe "swing harder") | Contact-quality / barrel-control block |
| High tee exit velo + poor live results | Timing / pitch-recognition deficit | Front-toss / machine / pitch-recognition block |
| Good exit velo + low hard-hit % | Approach / swing-decision deficit | Swing-decision / zone-control block |

**No-bat-speed fallback (radar but no sensor):** bat speed needs a sensor (premium). Without it, substitute the **tee-vs-live exit-velo gap** as the proxy — large gap → timing/contact bottleneck; small gap with low absolute → strength/power bottleneck. Mark the diagnosis `confidence: medium` and prefer more general plans until a sensor or facility test refines it.

### 9.2 Speed / Baserunning

Metrics: home-to-first, 60-yd, **10-yd split (required, §2.4)**, around-the-world.

| Input | Diagnosis | → Plan type |
|---|---|---|
| Slow 10-yd split + decent 60 | First-step explosiveness | Acceleration mechanics |
| Good 10-yd split + slow 60 | Top-speed mechanics / conditioning | Sprint mechanics |
| Good straight speed + poor around-the-world | Turns / angles / base-touch efficiency | Baserunning angles / footwork |
| Slow home-to-first only | Swing-finish / box-exit transition | Swing-to-sprint transition |

> The market consensus holds: for young athletes the first lever is usually relative strength + mechanics, not agility-ladder footwork.

### 9.3 Pitching — Baseball

Metrics: FB velo, strike %, first-pitch strike %, 9-box score, miss pattern, pitch count/workload, rest status.

| Input | Diagnosis | → Plan type |
|---|---|---|
| Good velo + poor strike % | Command / repeatability | 9-box command block |
| Low velo + good command | Strength / mechanics / maturity (age-appropriate) | General athleticism / mechanics block |
| Low first-pitch strike % | Competitive sequencing / intent | Sequencing / intent block |
| Misses mostly arm-side high | Mechanical pattern flag | Delivery-consistency block |
| Command drops as pitch count rises | Fatigue / conditioning / workload | Recovery / workload-reduction **flag** (not more throwing) |
| Pain / soreness / numbness reported | — | **STOP plan; recovery guidance; adult/medical evaluation prompt** |

> "Throw harder" is never the default answer. Youth pitching follows age-specific limits and rest rules; fatigue is a hard stop.

### 9.4 Pitching — Softball (fastpitch, windmill) — *gap filled*

Windmill mechanics make this a distinct tree (no "throw harder vs. command" split the same way; spin matters more).

| Input | Diagnosis | → Plan type |
|---|---|---|
| Good velo + poor strike % | Command / release consistency | Spot-location command block |
| Low velo + good command | Lower-half drive / leg-and-hip power / mechanics | Drive-mechanics + age-safe power block |
| Flat pitches / no movement (16U+) | Spin / spin-axis deficit (needs Rapsodo-class tool) | Spin / movement block (facility tier) |
| Command drops as workload rises | Fatigue / conditioning / workload | Recovery / workload-reduction flag |
| Pain / soreness reported | — | **STOP plan; recovery guidance; medical prompt** |

> Softball overuse is real but mechanically different from baseball; still treat fatigue and pain as hard stops and track total workload across teams.

### 9.5 Fielding / Throwing & Catching

Metrics: IF velo, OF velo, pop time, glove-to-release, throw accuracy %, footwork score.

| Input | Diagnosis | → Plan type |
|---|---|---|
| Strong arm + slow pop time | Transfer / footwork | Catcher exchange / footwork block |
| Weak arm + clean transfer | Arm strength / mechanics (age-safe) | Age-safe throwing-mechanics block |
| Fast release + poor accuracy | Direction / alignment | Target-throwing / alignment block |
| Good mechanics + low velo | Strength / maturity / workload context | General strength + context note |

---

## 10. Age-Band Plan Rules

Same goal, structurally different plan. Age band is the **outer gate** — selected before the diagnosed driver.

| Band | Priority | Allowed | Prohibited / floors | Product tone |
|---|---|---|---|---|
| **8U–10U** | Fun, movement, coordination | Skill challenges, tee work, catch play, sprint games, bodyweight movement, low-volume accuracy games | No velo programs, no weighted balls, no max-effort throwing, no heavy strength, no over-specialization | "Build athleticism and confidence." |
| **11U–12U** | Mechanics, repeatable skills, confidence | Structured tee/front-toss, basic speed work, 9-box command games, light supervised med-ball, accuracy work | No aggressive velo chasing, no high-volume bullpens, no advanced overload/underload, no showcase pressure | "Improve the skill, not just the number." |
| **13U–14U** | Structured dev, puberty-aware strength | Formal strength/mobility, bat-speed & exit-velo tracking, command plans, speed mechanics, pop-time work, position-specific plans | Monitor total throwing across teams; flag pitcher/catcher overlap; reduce workload during tournaments | "Train with structure, but protect the arm." |
| **15U–18U** | Performance, recruiting readiness | Formal strength programming, showcase-metric prep, velo development *if readiness gates pass*, advanced hitting, position benchmarks, video review | Required: workload tracking, recovery status, in-season/off-season distinction, pain/fatigue escalation | "Build toward verified performance." |

---

## 11. Readiness Gates

Aggressive plan blocks unlock only when prerequisites clear — protecting the kid who most wants to push.

**Throwing / pitching gates:**

| Gate | Required before |
|---|---|
| Age-band check | Any throwing plan |
| Current soreness = none | Any throwing plan |
| Pitch count / rest status clear | Bullpen or command plan |
| No recent pain report | Any high-intensity throwing |
| In-season workload known | Velo-related work |
| Parent/coach acknowledgement | Advanced throwing work |

If the player reports **pain, soreness, numbness, or sharp discomfort:** the system stops the plan, shows recovery guidance, and recommends adult/medical evaluation. The engine also flags **pitching in multiple leagues** or heavy **pitcher/catcher overlap**, since total workload becomes hard to monitor and catching adds throwing stress. No override for motivation.

---

## 12. Guardrail Ceiling

A ceiling the plan can **never** exceed, independent of goal, age, or readiness. Safety backbone *and* differentiator — the buyers (parents) are anxious about exactly this.

- **Pitch counts & required rest** — Pitch Smart-style limits by age (🟢 established). Hard cap.
- **Total throwing volume** — across games + bullpens + plan work, not per-session only.
- **In-season vs. off-season** — velo/strength building gated to off-season; in-season shifts to maintenance + recovery.
- **Recovery / days-rest** — ties to HealthKit/calendar if integrated.

> If a goal + plan would breach a guardrail, the engine **caps the plan and extends the timeline** rather than the volume, and says so: *"Healthy timeline for this goal: 10 weeks, not 4."*

---

## 13. Re-Test Cadence & the Adjust Branch

### 13.1 Cadence
| Metric | Re-test cadence |
|---|---|
| Tee exit velo | Every 3–4 weeks |
| Bat speed | Monthly |
| Home-to-first | Every 4–6 weeks |
| 60-yard dash + 10-yd split | Every 6–8 weeks |
| Around-the-world | Monthly |
| 9-box command | Weekly or biweekly |
| Pop time | Monthly |
| Throwing velocity | Monthly, workload-dependent |
| Game stats | Rolling; never goal-driving |

Do not over-test noisy metrics; the app protects users from chasing day-to-day variance.

### 13.2 The adjust branch (what happens at the checkpoint) — *gap filled*

Every plan ends in a re-test. The engine then evaluates against `success_condition` and branches:

| Re-test result | Engine action |
|---|---|
| **Primary metric improved (met target)** | Mark plan success; fire any milestone (§7.4); offer the next driver in the tree or a maintenance block |
| **Improved but short of target** | Continue same plan one more cycle; keep timeline honest |
| **No movement, plan completed as prescribed** | **Re-diagnose** — the bottleneck was likely mis-identified; move to the next-most-likely driver in the tree (e.g., exit velo flat after a contact block → re-check sequencing/strength) |
| **No movement, low plan adherence** | Not a diagnosis failure; surface adherence, adjust session length/frequency, re-commit |
| **Metric regressed + any pain/fatigue signal** | Stop; route to recovery/guardrail flow (§11–§12); do not escalate load |

> The re-diagnose path is what makes the loop *intelligent* rather than a fixed program — it learns the player wasn't who the first number suggested.

---

## 14. Neutral Recommendation Engine

The app does not pretend every solution is internal. Routing is **source-agnostic** — ranked by data-fit, not ownership.

| Recommendation type | Example |
|---|---|
| Internal plan | Built-in 21-day barrel-control block |
| Free content | Curated YouTube drill from a trusted coach |
| Partner program | BRX, CamWood, a speed or catching coach |
| Equipment | Pocket Radar, tee, net, med ball, training bat (always **optional**) |
| Coach referral | Local instructor or facility |
| Safety recommendation | Rest, reduce throwing, seek evaluation |

**Routing priority:** (1) best fit for diagnosed driver + age band, filtered by passed readiness and guardrail tags and by what equipment the player actually has (§17); (2) prefer credentialed content beyond general mechanics; (3) among equal-fit options, transparency over monetization — a well-fit free clip can outrank a paid one; (4) always surface *why* ("Recommended because your bat speed is high but exit velo lags → contact-quality drill").

**Product language:** *"Based on your data, this is the most likely bottleneck. Here are the safest ways to train it."* This is the honest-broker position the brand-funnels (CamWood, Trosky, BRX) structurally cannot occupy — because our revenue doesn't depend on selling any one tool. **Guard this neutrality; it is the moat.**

---

## 15. Game Transfer Engine (GameChanger import)

**The credibility feature.** Training progress is only half the story; the product must answer *"did the practice improvement show up in games?"* GameChanger becomes the **game-performance input**, while this app remains the **development interpretation layer.** Positioning line: *import the game, explain the development.*

> **Division of ownership.** GameChanger owns: games, scorekeeping, box scores, season stats, video/highlights. This app owns: baseline, training plan, drill completion, safety, re-test, interpretation, and transfer analysis. We do **not** try to out-GameChanger GameChanger, and we do **not** make the core product depend on it (per the market-defensibility rule: a player-owned record that survives even if GameChanger access disappears).

### 15.1 Import path — CSV first, never OCR
GameChanger supports season/filtered **CSV export from staff accounts** (follower accounts don't see the export option) and tracks 150+ baseball/softball stats. The supported, durable path is CSV; box-score PDFs are Apple-only for baseball/softball, so CSV is first-class. **Do not build on an unofficial API** — verify any official API independently before depending on it.

| Import type | Phase | Use |
|---|---|---|
| Manual game-improvement tags (§15.6) | **P1** | Seed transfer signal with zero dependency on any export |
| Manual stat entry | **P1** | Backup for non-staff parents |
| Season CSV export | **P1 (MVP)** | Main import path |
| Filtered CSV export | **P1** | Before/after & opponent-level comparisons |
| Per-game box-score PDF | Later | Single-game analysis (Apple-only constraint) |
| Official API | Later / only if official | Direct sync if a real one exists |
| Screenshot / OCR | **Avoid** | Too fragile |

> **MVP sequencing:** manual tags + manual entry land first (a text field, no external dependency), then CSV import in the same MVP phase. This starts the transfer dataset on day one without blocking on a competitor's export format.

### 15.2 Import flow
1. Staff exports season (or filtered) CSV from GameChanger. 2. Upload to app. 3. App detects players. 4. Parent maps GameChanger player → kid profile. 5. App imports batting/pitching/fielding/baserunning. 6. App asks: *"Is this data scored by a trusted team staff member?"* 7. App assigns a **data confidence score** (§15.3).

Filtered exports reflect any in-app stat filters, enabling comparisons: before / during / after a training block, tournament-only, league-only, or higher-level-opponents-only.

### 15.3 Data confidence (imported stats are noisy — never "proof")
Youth scoring quality varies (errors called hits, missed steals, staff post-game edits that update season stats but not play-by-play). Imported stats are **lagging indicators**, never definitive.

| Level | Meaning |
|---|---|
| Low | Manually entered or incomplete |
| Medium | GameChanger CSV from a staff account |
| High | GC CSV + consistent scorer + adequate sample |
| Verified | Coach/facility-reviewed charting or video-linked |

Display: *"Moderate confidence: based on imported GameChanger stats from 7 games"* — never *"definitive proof."* (This is a distinct axis from the §8.1 verification ladder, which governs *measurables*; §15.3 governs *imported game stats*.)

### 15.4 Practice-to-game metric mapping
The engine watches the right game stat for each training driver — and deliberately avoids noisy ones (e.g., **not** batting average at youth level).

**Hitting** — tee exit velo → SLG/XBH/hard-hit; barrel-control → QAB%/K%/hard-hit; zone-control → BB%/K%/pitches-per-PA; oppo drill → spray/direction; two-strike plan → K%/two-strike contact. *Best youth transfer signal: QAB%, K%, BB%, hard-contact, OBP trend.*

**Pitching** — 9-box command → strike%/BB/HBP/WHIP; first-pitch-strike challenge → first-pitch-strike%/BB; glove-side command → walks/miss pattern; fatigue → strike% by inning; recovery compliance → pitch count/rest/soreness. *Best signal: strike%, first-pitch-strike%, BB rate, WHIP, command fade after pitch 20/35/50.*

**Speed/baserunning** — home-to-first → ROE/infield hits; 60-yd → SB/runs/extra bases; around-the-world → extra bases/baserunning reads; first-step → SB%/CS. *Best signal: SB%, runs scored, extra bases taken, coach-tagged pressure plays.*

**Fielding/catching** — accuracy challenge → errors/assists; clean-rep → fielding%/chances; pop time → CS/SB-allowed; transfer drill → CS/throw quality; blocking → passed-ball/wild-pitch notes. *Best catching signal: SB allowed, CS, passed balls, coach-rated throw quality.* (Raw pop time is the measurable; game impact is whether runners stop stealing.)

### 15.5 Transfer Score, windows & confidence
Each training block defines a game-performance window and a confidence threshold so the app never draws conclusions from one game:

```json
{
  "training_block_id": "barrel_control_21_day_v1",
  "start_date": "2026-06-01",
  "end_date": "2026-06-21",
  "pre_window":  { "games": 5, "min_plate_appearances": 10 },
  "post_window": { "games": 6, "min_plate_appearances": 15 },
  "primary_game_metrics": ["QAB%", "K%", "OBP", "hard_hit_rate"],
  "transfer_confidence": "medium"
}
```

**Confidence thresholds** — *hitters:* low <3 games/8 PA · medium 3–5 games/8–15 PA · strong 6+/15+ · very strong 10+/25+. *Pitchers:* low <20 BF · medium 20–40 · strong 40+ · very strong 75+. *Fielders:* low <5 chances · medium 5–12 · strong 12+.

### 15.6 Game-improvement tags (the numbers-to-coaching bridge)
CSV stats miss the good stuff; lightweight manual tags fill the gap and are the P1 on-ramp:
- *Hitting:* hard contact, good take, QAB, barreled, productive out, two-strike battle, pulled off, late, chased high/outside.
- *Pitching:* got ahead, lost command, good miss, non-competitive miss, fatigue showing, glove-side miss, arm-side miss, rushed delivery.
- *Fielding:* clean field/throw, rushed throw, bad angle, good backup, missed cutoff, strong relay, slow transfer.
- *Baserunning:* great read, took extra base, poor turn, late jump, smart slide, missed sign, forced error.

### 15.7 Interpretation logic (interpret, don't just chart)
| Situation | Output |
|---|---|
| Practice ↑ + game ↑ (sufficient sample) | "Strong transfer detected" |
| Practice ↑ + game flat | "May be timing/pitch-recognition → next focus: front toss / live timing" |
| Game ↑ + practice flat | "May be confidence, opponent level, or small-sample noise — keep tracking" |
| Insufficient game data | "Need ~10–15 more PA before we can judge transfer" |

Worked example: barrel-control block → tee hard-contact 42%→57%, game QAB 38%→49%, K% 31%→22%, OBP .344→.412 over 6 games → *"Strong transfer: practice hard-contact +15, game QAB +11."*

### 15.8 Role-scaled transfer views
- **Coach dashboard:** per-player table — focus · practice progress · game transfer · confidence — answering "what are we working on, and is it showing up?"
- **Parent view:** plain-language, no stat dump — *"Hudson's command work is showing up: 9-box 18→27, walk rate down, strike % up. Confidence: medium, 3 outings."*
- **Kid view:** motivational, no scary percentages — *"Your Command Captain work is paying off — new PR and more strikes in games. Next mission: beat 30 points."*

### 15.9 MVP build for this module
Upload CSV → map player names → import batting/pitching/fielding → user selects training-block dates → compare pre/post → show confidence rating → generate **one** insight ("improving / not enough data / adjust plan"). Manual tags + entry ship alongside. Full automation comes later.

---

## 16. Plan & Drill Object Models

### 16.1 Plan object
```json
{
  "plan_id": "exit_velo_contact_quality_12u_v1",
  "sport": "baseball",
  "age_band": "11U-12U",
  "metric_target": "tee_exit_velocity",
  "diagnosis": "bat_speed_good_contact_quality_low",
  "plan_type": "skill_framework",
  "duration_days": 21,
  "sessions_per_week": 3,
  "max_session_minutes": 25,
  "equipment_required": ["tee", "net", "balls"],
  "optional_equipment": ["pocket_radar", "blast_sensor"],
  "risk_level": "low",
  "readiness_gates": ["no_pain", "age_allowed"],
  "retest_metric": "tee_exit_velocity",
  "retest_day": 21,
  "success_condition": {
    "primary": "improved_average_exit_velocity",
    "secondary": "improved_hard_contact_rate"
  }
}
```

### 16.2 Plan types (by liability)
| Plan type | Description | Liability |
|---|---|---|
| **Skill framework** | Drill categories + rep ranges + re-test | Low — **MVP uses these first** |
| Guided block | Specific weekly schedule | Medium |
| Partner program | External expert program | Medium |
| Velo program | Older players only, gates required | High |
| Medical / rehab | Only if licensed-provider-authored | **High / avoid** |

Avoid fully prescriptive "do exactly this many max-effort throws" plans until credentialed review exists.

### 16.3 Drill object (environment-aware — see §17)
```json
{
  "drill_id": "barrel_control_tee_middle_v1",
  "name": "Middle-Middle Barrel Challenge",
  "sport": ["baseball", "softball"],
  "skill_area": "hitting",
  "metric_driver": "contact_quality",
  "environment_tiers": ["tier_1_basic_home", "tier_3_facility"],
  "required_equipment": ["tee", "net", "balls", "bat"],
  "optional_equipment": ["pocket_radar", "blast_sensor"],
  "space_required": "garage_or_backyard",
  "session_minutes": 10,
  "age_bands": ["8U-10U", "11U-12U", "13U-14U", "15U-18U"],
  "risk_level": "low",
  "scoring_method": "hard_contact_points",
  "retest_connection": "tee_exit_velocity"
}
```

---

## 17. Drill Environment Tiers

Every drill carries an **environment tier** so the app generates realistic plans from what the player actually has. This is the accessibility wedge that pairs with the verification states in §8.1.

| Tier | Name | Example equipment | Product use |
|---|---|---|---|
| **0** | No-gear home | Wall, driveway, towel, tennis ball | Lowest-friction daily work |
| **1** | Basic home | Tee, net, balls, cones, bands | **Default MVP training tier** |
| **2** | Enhanced home | Pocket Radar, Blast, training bat, med ball | Better tracking + power; **first tier that unlocks diagnosis** |
| **3** | Facility | Cage, mound, machine, radar, HitTrax/Rapsodo | Higher-quality measurement + advanced reps |
| **4** | Coach/facility verified | Instructor, facility admin, verified measurement | Trust + recruiting layer (`facility_verified`) |

> Note the link to the §8.1 verification ladder: a player's environment tier shapes the *highest verification level they can reach at home*. Tiers 0–1 (no device) typically cap at `self_entered`/`video_attached` → training only, diagnosis locked. Tier 2+ (radar/sensor) reaches `device_captured` → diagnosis unlocks. Tier 4 reaches `coach_verified`/`facility_verified` → recruiting-eligible.

### 17.1 Same goal, different environment
**Goal: improve exit velocity** — top-level plan stays "improve barrel quality and bat speed"; drills change by access:

| Environment | Plan version |
|---|---|
| No-gear (T0) | Dry swings, mirror work, bat-path checkpoints, tennis-ball contact games |
| Basic (T1) | Tee + net barrel-control challenge, hard-contact scoring |
| Enhanced (T2) | Tee + net + Pocket Radar, track avg + peak EV (**diagnosis unlocks**) |
| Facility (T3) | Cage with tee, front toss, machine, HitTrax/Rapsodo if available |
| Verified (T4) | Facility-administered EV test with video proof |

**Goal: improve 9-box command** — younger players' home versions prioritize *accuracy/repeatability, not velocity*:

| Environment | Drill version |
|---|---|
| No-gear (T0) | Towel target drill into wall pad / net |
| Basic (T1) | Flat-ground 9-box target net |
| Enhanced (T2) | Pocket Radar + 9-box, velocity/location combo score |
| Facility (T3) | Mound bullpen with catcher, charted targets |
| Verified (T4) | Instructor-scored command test with video |

**Goal: improve home-to-first:**

| Environment | Drill version |
|---|---|
| No-gear (T0) | First-step starts, driveway sprint starts, reaction games |
| Basic (T1) | Cone-marked 10-yd acceleration lanes |
| Enhanced (T2) | Phone-timed 10-yd split + home-to-first sim |
| Facility (T3) | Full basepath timing |
| Verified (T4) | Verified 60-yd / home-to-first test |

### 17.2 Onboarding capture
Ask **where** the player can train (home/no gear · home + tee/net · home + radar/sensor · facility sometimes · facility regularly · private coach) and **what equipment** they have (tee, net, balls, cones, bands, Pocket Radar, Blast, training bat, med ball, cage, mound, machine, HitTrax/Rapsodo). **Only assign drills the player can actually perform.**

### 17.3 Substitution logic
If a plan needs something the player lacks, offer a substitution rather than blocking:
> "This drill is best with a tee and net. Since you have no net, use the dry-swing mirror version instead."
> "For more accurate progress tracking, add Pocket Radar — but it's not required."

Keeps the app accessible while creating a path toward better data.

### 17.4 Drill-library build order
Author each drill in this order so the gear-free on-ramp always exists: (1) Basic-home (T1) version first, (2) No-gear (T0) substitute, (3) Facility (T3) upgrade, (4) Verified/coach-scored (T4) version.

---

## 18. Worked Routing Examples

**12U hitter** — tee EV low for band, bat speed average/good, hard-hit % low, weak live contact → **diagnosis: contact-quality deficit** (not bat speed). Assign **21-day Barrel Control Block** (tee contact-location challenge, middle/oppo barrel work, front-toss line-drive challenge, hard-contact scoring, re-test tee EV + hard-hit %). Do **not** assign heavy strength, overload bat-speed work, or "swing harder" cues.

**13U pitcher** — FB velo solid, strike % low, first-pitch strike % low, 9-box poor glove-side-low, workload cleared → **diagnosis: command + glove-side miss pattern.** Assign **14-day 9-Box Command Block** (call target before pitch, track intended vs. actual box, score misses by direction, limit total throws, re-test heatmap). Do **not** assign a velocity plan, extra bullpen volume, or weighted balls.

**Catcher** — pop time slow, arm velo good, glove-to-release slow, accuracy average → **diagnosis: transfer problem, not arm strength.** Assign **Catcher Transfer Quickness Block** (glove-to-hand exchange, foot replacement, short-hop receive-to-throw, accuracy target, re-test pop time + release).

**Tier-0 newcomer, no gear** — onboards, selects "home, no equipment." Trains immediately on the **foundational hitting plan** (dry swings, mirror bat-path work, tennis-ball contact games). Diagnosis is **locked**, shown as an unlock: *"Add one radar reading or a facility test to unlock your personalized diagnosis."* No number is ever invented.

---

## 19. Data Model & Build Order

### 19.1 Data model additions (extends §7-era entities)
```
# core (from earlier sections): Player, Metric, MetricEntry, BaselineSet, Goal, NineBoxRound, Milestone

MetricEntry  (extended)
  ...prior fields..., verification_state(self_entered|video_attached|device_captured|coach_verified|facility_verified|event_verified)

Driver (catalog)
  key, label, parent_metric_key, parent_driver_key(nullable)

Diagnosis
  id, player_id, metric_key, bottleneck_driver_key, confidence(low|medium|high),
  evidence(json), age_band, created_at   // only created when a verified number exists

ReadinessCheck / PlayerReadiness
  key, label, type(screen|video|data|guardrail) ; player_id, status, verified_at

Drill (catalog — see §16.3)
  drill_id, name, sport[], skill_area, metric_driver, environment_tiers[],
  required_equipment[], optional_equipment[], space_required, session_minutes,
  age_bands[], risk_level, scoring_method, retest_connection

Plan (catalog — see §16.1) + plan_type, liability_level

PlanAssignment
  id, player_id, goal_id, diagnosis_id(nullable), plan_id, drill_ids[],
  reason_text, assigned_at, status, healthy_timeline_weeks, retest_due_at

PlayerEnvironment
  id, player_id, access_level, equipment[], updated_at

Guardrail / GuardrailState
  key, scope(pitch_count|throwing_volume|rest|season_phase), age_band, limit_value, window
  ; player_id, current_value, window_start, in_window, updated_at

# --- Game Transfer (§15) ---

GameStatImport
  id, player_id, source(gc_csv|gc_filtered_csv|manual|pdf), uploaded_at,
  scorer_is_staff(bool), data_confidence(low|medium|high|verified), raw_rows(json)

GameStat (normalized, per player per game/window)
  id, player_id, import_id, date, context(league|tournament|scrimmage),
  batting(json), pitching(json), fielding(json), baserunning(json)

GameTag (lightweight manual improvement tag — the P1 on-ramp)
  id, player_id, game_date, skill_area, tag, note, created_by

TransferAnalysis
  id, player_id, training_block_id, pre_window(json), post_window(json),
  primary_game_metrics[], result(strong|practice_only|game_only|insufficient),
  transfer_confidence(low|medium|strong|very_strong), insight_text, created_at
```

### 19.2 Build order (canonical — supersedes earlier ordering)

**Phase 1 — Best MVP (development first, not recruiting):**
1. Player profile
2. Baseline combine
3. Metric tracking (with verification ladder, §8.1)
4. Age-banded labels
5. Goal setting
6. Re-test reminders
7. 9-box command module
8. **Basic plan routing** + environment-tier onboarding (§17.2) + foundational (gear-free) plans
9. **Game Transfer on-ramp** (§15): manual game-improvement tags + manual stat entry first (zero external dependency), then GameChanger **season/filtered CSV import** + player-name mapping + pre/post block comparison + one interpretation insight. *Note: tags/manual entry precede CSV so the MVP isn't blocked on a competitor's export format.*

**Phase 2 — Training engine:**
1. Driver trees + diagnosis logic (§9)
2. Plan library (skill frameworks first) + drill environment tiers (§17)
3. Safety gates + guardrail ceiling (§11–§12)
4. Neutral recommendations (§14)
5. Adjust branch / re-diagnose (§13.2)
6. Parent/coach notes + plan-completion tracking
7. Full Transfer Score + confidence thresholds + role-scaled transfer views (§15.5–§15.8)

**Phase 3 — Trust layer:**
1. Verified measurement sessions (`facility_verified`)
2. Coach/facility validation
3. Video proof
4. Device integrations (Pocket Radar auto-capture, Blast/Rapsodo, calendar, HealthKit)
5. Badge/milestone history
6. Portable, player-owned profile

**Phase 4 — Recruiting layer (only after development data is strong):**
1. Shareable profile
2. Verified metrics surfaced
3. Academic info
4. Coach references
5. Video clips
6. Realistic fit guidance

> Do not start with recruiting. Start with development. The closed loop (Phase 2) is the differentiator — don't let it slip behind saturated stat-logging work. GameChanger import is an MVP *input*, not the core product: the player-owned record must remain valuable even with zero game data imported.

---

## 20. Competitive Positioning

| Competitor type | Their edge | Structural gap | How the loop wins |
|---|---|---|---|
| Hardware (Pocket Radar, Blast, HitTrax) | Accurate measurement | Vendor-locked; no "now what" | Adds diagnosis + plan + portable record |
| Brand program-in-app (CamWood) | Polished structured plans | Funnel to sell one product; no longitudinal/cross-skill record | Data-triggered + neutral + owns full athlete record |
| Coach content (Trosky 365) | Credibility, mindset, reels | Deliberately not metrics-first | Objective measurables drive the plan |
| Expert programs (BRX, Slash-Your-60) | Real S&C quality | Static; unaware of the kid's data | Baseline-aware selection + auto re-test + progress proof |
| Hub + AI (Pitch2Pitch / Diamond Allegiance) | Closest concept; metrics hub + recruiting | Tied to their academies; baseball-centric | True neutrality + softball parity + 9-box + guardrail-first safety |
| YouTube / Instagram | Free, infinite | No progression, filter, or personalization | Curation + "this drill, because your data says so" |

**The four pillars of "best":**
1. **Closed-loop, not open-loop** — the only product where the number selects and adjusts the plan.
2. **Vendor-neutral honest broker** — can recommend anything (incl. free or a competitor's tool); funnels structurally can't.
3. **Safety-first credibility** — guardrails + readiness gating as a visible parent-facing feature.
4. **Player-owned, portable, softball-equal** — record + plan history follow the kid across teams; softball is first-class.

**Positioning one-liner:** *A player-owned development tracker that turns verified baseball and softball measurements into safe, age-appropriate training plans.*

**Sharper:** *GameChanger tracks what happened. Showcase companies sell exposure. This tracks whether the player is actually getting better — and what to do next.*

**Wedge:** **Measure. Diagnose. Train. Re-test. Own the record.**

---

### Calibration disclaimer
🟡 thresholds throughout are synthesized from common showcase and coaching reference ranges — initial bands, not validated percentiles. They skew by region, competition level, and selection bias (showcase attendees aren't average players). Treat accumulated user data as the source of truth and recalibrate once you have a meaningful sample; that dataset is itself a defensible competitive advantage. Internally authored training blocks should be co-signed by credentialed S&C / PT professionals before release.
