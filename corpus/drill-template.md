# Drill Template — Coach-Authored Library Objects

Separate from the **source schema** (sources.seed.json) and **safety rules** (tier1-safety-rules.json). Source records describe **external knowledge**; drill records describe **runnable items the compiler can prescribe**. This template is the contract between coach-authored content and the Practice Compiler (`coach-platform-practice-compiler.md` §2, §11) and the core Drill object (`player-development-metric-schema.md` §16.3, §17).

---

## 1. Authoring rules

1. **One drill object = one runnable unit.** If it splits into stations, write each as its own drill and a parent `practice_block`.
2. **Every drill must declare a `primary_metric`** from the core schema (`player-development-metric-schema.md` §1–§5) or be flagged `non_metric: true`.
3. **Every drill must declare an `environment_tier`** (core §17) so the compiler can substitute when equipment is missing.
4. **Drills that touch throwing volume must carry `pitch_smart_compliant: true|false`** and, if true, a `throw_count_contribution` integer.
5. **Drills cannot self-declare safety overrides.** Safety state always reads from `tier1-safety-rules.json`.
6. **No copying source text.** Drill descriptions must be original; sources are linked via `evidence_links[]`.

---

## 2. Drill object schema

```json
{
  "drill_id": "",
  "name": "",
  "short_description": "",
  "long_description": "",

  "topic": "hitting | pitching | fielding | throwing | baserunning | speed | strength | reaction | mental | culture | recovery",
  "sport": "baseball | softball | both",
  "age_band": ["6-8", "9-12", "13-15", "16+"],
  "season_state": ["preseason", "in-season", "tournament", "offseason"],
  "intensity": "light | normal | hard | recovery",

  "primary_metric": {
    "metric_id": "EV_TEE | STRIKE_PCT | HOME_TO_FIRST | POP_TIME | 9BOX_SCORE | ...",
    "expected_movement": "increase | decrease | maintain"
  },
  "secondary_metrics": [],
  "non_metric": false,

  "environment_tier": "T1_field | T2_cage_gym | T3_backyard | T4_living_room",
  "equipment_required": ["tee", "net", "5_balls"],
  "equipment_substitutions": [
    { "missing": "net", "swap_to": "wall + tape target", "tier_change": "T3_backyard" }
  ],

  "space_required": "full_field | half_field | cage | 15x15ft | 10x10ft",
  "player_count_min": 1,
  "player_count_max": 12,
  "coaches_min": 0,
  "coaches_max": 2,

  "duration_minutes": 10,
  "reps_or_rounds": "3 sets x 8 reps | 1 round of 9 throws | 5 min AMRAP",
  "rest_seconds_between_sets": 60,

  "setup_steps": [],
  "execution_steps": [],
  "coaching_cues": [],
  "common_mistakes": [],
  "scoring": {
    "type": "count | percent | time | rubric | none",
    "unit": "",
    "success_threshold": null
  },

  "progressions": [
    { "level": "intro", "change": "stationary tee, 5 balls" },
    { "level": "intermediate", "change": "front toss" },
    { "level": "advanced", "change": "live pitching" }
  ],
  "regressions": [],
  "variations": [],

  "pitch_smart_compliant": true,
  "throw_count_contribution": 0,
  "loaded_strength_movement": false,
  "supervision_required": false,
  "safety_flags": [],
  "safety_rule_refs": ["PITCH_SMART_9_12", "STOP_ON_PAIN"],

  "verification_levels_supported": [
    "self_entered",
    "video_attached",
    "device_captured",
    "coach_verified",
    "facility_verified"
  ],

  "evidence_links": [
    { "source_id": "url-or-source-key", "relationship": "inspired_by | aligns_with | rule_source" }
  ],

  "tags": [],
  "author": "",
  "created_at": "",
  "last_reviewed_at": "",
  "review_status": "draft | reviewed | published | retired"
}
```

---

## 3. Worked example — `9BOX_COMMAND_INTRO`

```json
{
  "drill_id": "9BOX_COMMAND_INTRO",
  "name": "9-Box Command Call-Then-Throw (Intro)",
  "short_description": "Pitcher calls a target box, then throws. Score by called-vs-actual.",
  "long_description": "Set a 9-box grid on a net or strike zone. Pitcher announces target box (e.g., 'low arm-side'), then delivers from a flat ground or partial mound. Score 2 for in-called-box, 1 for adjacent, 0 for non-zone or wild. Tracks command, not luck.",

  "topic": "pitching",
  "sport": "baseball",
  "age_band": ["9-12", "13-15"],
  "season_state": ["preseason", "in-season"],
  "intensity": "normal",

  "primary_metric": { "metric_id": "9BOX_SCORE", "expected_movement": "increase" },
  "secondary_metrics": [
    { "metric_id": "STRIKE_PCT", "expected_movement": "increase" }
  ],
  "non_metric": false,

  "environment_tier": "T2_cage_gym",
  "equipment_required": ["net_with_9box_overlay", "5_baseballs"],
  "equipment_substitutions": [
    { "missing": "9box overlay", "swap_to": "tape grid on net", "tier_change": null },
    { "missing": "net", "swap_to": "fence with taped target", "tier_change": "T3_backyard" }
  ],

  "space_required": "cage",
  "player_count_min": 1,
  "player_count_max": 3,
  "coaches_min": 0,
  "coaches_max": 1,

  "duration_minutes": 12,
  "reps_or_rounds": "3 rounds of 9 throws",
  "rest_seconds_between_sets": 90,

  "setup_steps": [
    "Hang or tape a 3x3 grid on the strike zone.",
    "Mark distance per age band."
  ],
  "execution_steps": [
    "Pitcher calls a target box out loud.",
    "Pitcher delivers the pitch.",
    "Partner/coach logs called box and actual box."
  ],
  "coaching_cues": [
    "Call before grip change.",
    "Same intent every pitch.",
    "Reset breath between throws."
  ],
  "common_mistakes": [
    "Calling after seeing release.",
    "Aiming instead of executing intent."
  ],
  "scoring": {
    "type": "rubric",
    "unit": "points",
    "success_threshold": 12
  },

  "progressions": [
    { "level": "intro", "change": "flat ground, fastball only" },
    { "level": "intermediate", "change": "from mound, fastball + change-up" },
    { "level": "advanced", "change": "velocity-weighted scoring (core §6.5)" }
  ],
  "regressions": [
    { "level": "easier", "change": "3-zone grid instead of 9-zone" }
  ],
  "variations": [
    { "name": "Head-to-head", "change": "Two pitchers alternate; high score wins (core §6.6)" }
  ],

  "pitch_smart_compliant": true,
  "throw_count_contribution": 27,
  "loaded_strength_movement": false,
  "supervision_required": false,
  "safety_flags": ["counts_toward_pitch_smart"],
  "safety_rule_refs": ["PITCH_SMART_9_12", "PITCH_SMART_GENERAL"],

  "verification_levels_supported": [
    "self_entered",
    "video_attached",
    "coach_verified",
    "facility_verified"
  ],

  "evidence_links": [
    { "source_id": "https://www.mlb.com/pitch-smart/pitching-guidelines/ages-9-12", "relationship": "rule_source" }
  ],

  "tags": ["command", "9-box", "intro", "cage"],
  "author": "platform",
  "created_at": "2026-05-24",
  "last_reviewed_at": "2026-05-24",
  "review_status": "draft"
}
```

---

## 4. Review checklist (before `published`)

- [ ] `primary_metric.metric_id` exists in core schema §1–§5.
- [ ] `environment_tier` set and `equipment_substitutions` cover at least one lower tier.
- [ ] If drill includes throws, `pitch_smart_compliant` and `throw_count_contribution` are set.
- [ ] If drill involves loaded resistance, `loaded_strength_movement: true` and `supervision_required: true`, with `safety_rule_refs` including `YOUTH_STRENGTH_SUPERVISION` and `NO_ONE_REP_MAX_MINORS`.
- [ ] `coaching_cues` ≤ 3 (one cue rule for U10; max 3 for older).
- [ ] No copied source text; original wording only.
- [ ] At least one `evidence_links[]` entry when the drill is derived from a Tier 1 or Tier 2 source.
- [ ] No marketing language; no medical claims.
