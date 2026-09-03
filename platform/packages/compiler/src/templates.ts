// Packaged practice plans — a few balanced presets per duration tier.
// These are "smart defaults" the coach can drop into the builder and edit.
// They reference drill IDs from corpus/drills/starter-library.json. Any drill
// that fails the eligibility filters at compile time is skipped with a warning,
// so a missing drill never breaks the preset.

import { loadDrills, getAgeBandKeyForAge, type Drill, type AgeBandKey } from "@platform/corpus";

export type EnvTier = "T1_field" | "T2_cage_gym" | "T3_backyard" | "T4_living_room";

export interface PlanTemplate {
  id: string;
  name: string;
  blurb: string;
  durationMin: number;
  ageBands: AgeBandKey[];
  environmentTier: EnvTier;
  focus: string[];
  /** Ordered drill IDs the compiler should slot into the skill section. */
  drillIds: string[];
}

/**
 * Static templates. Drill IDs are validated lazily by the compiler — listing a
 * drill here doesn't guarantee it lands in a plan (age / equipment / etc.).
 */
export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: "field_60_throw_hit",
    name: "Tuesday throw + hit",
    blurb: "Balanced 60-minute team practice: tee work, decision swings, fielding triangle.",
    durationMin: 60,
    ageBands: ["9-12", "13-15"],
    environmentTier: "T1_field",
    focus: ["hitting", "fielding"],
    drillIds: ["TEE_5BALL_PROGRESSION", "FRONT_TOSS_DECISION_5", "FIELDING_TRIANGLE_READ"],
  },
  {
    id: "field_60_speed_react",
    name: "Speed + reaction 60",
    blurb: "Game-speed day — acceleration sprints, reaction work, home-to-first timing.",
    durationMin: 60,
    ageBands: ["9-12", "13-15", "16+"],
    environmentTier: "T1_field",
    focus: ["speed", "reaction", "baserunning"],
    drillIds: ["ACC_SPRINT_10_20", "REACTION_BALL_PARTNER", "HOME_TO_FIRST_TIMED"],
  },
  {
    id: "field_75_full_team",
    name: "Full-team 75",
    blurb: "Hit, defend, run reads. A complete in-season practice.",
    durationMin: 75,
    ageBands: ["9-12", "13-15"],
    environmentTier: "T1_field",
    focus: ["hitting", "fielding", "baserunning"],
    drillIds: [
      "TEE_5BALL_PROGRESSION",
      "FRONT_TOSS_DECISION_5",
      "FIELDING_TRIANGLE_READ",
      "BASE_READS_3_STATIONS",
    ],
  },
  {
    id: "field_90_preseason",
    name: "Preseason 90",
    blurb: "Tee → live decisions, fielding, sprints. Builds volume early in the season.",
    durationMin: 90,
    ageBands: ["13-15", "16+"],
    environmentTier: "T1_field",
    focus: ["hitting", "fielding", "speed"],
    drillIds: [
      "TEE_5BALL_PROGRESSION",
      "FRONT_TOSS_DECISION_5",
      "FIELDING_TRIANGLE_READ",
      "ACC_SPRINT_10_20",
    ],
  },
  {
    id: "field_45_pitching",
    name: "Pitcher's day 45",
    blurb: "Controlled bullpen plus PFP. Pitch counts tracked by Pitch Smart.",
    durationMin: 45,
    ageBands: ["9-12", "13-15"],
    environmentTier: "T1_field",
    focus: ["pitching"],
    drillIds: ["PITCHING_BULLPEN_15PITCH", "PITCHING_PFP_COVER_1ST"],
  },
  {
    id: "cage_45_hitting",
    name: "Cage night — hitting",
    blurb: "Quick 45 in the cage: tee, front-toss decisions.",
    durationMin: 45,
    ageBands: ["9-12", "13-15", "16+"],
    environmentTier: "T2_cage_gym",
    focus: ["hitting"],
    drillIds: ["TEE_5BALL_PROGRESSION", "FRONT_TOSS_DECISION_5"],
  },
  {
    id: "cage_60_hit_react",
    name: "Cage 60 — hit + react",
    blurb: "Two cage stations: contact reps and reaction-ball partner work.",
    durationMin: 60,
    ageBands: ["9-12", "13-15", "16+"],
    environmentTier: "T2_cage_gym",
    focus: ["hitting", "reaction"],
    drillIds: ["TEE_5BALL_PROGRESSION", "FRONT_TOSS_DECISION_5", "REACTION_BALL_PARTNER"],
  },
  {
    id: "blueprint_60_full",
    name: "Bat Speed + Vision 60",
    blurb: "Bat speed, swing mechanics, and hand-eye in one cage night.",
    durationMin: 60,
    ageBands: ["13-15", "16+"],
    environmentTier: "T2_cage_gym",
    focus: ["hitting"],
    drillIds: [
      "BLUEPRINT_SWING_PLANE_PATH_CHECK",
      "BLUEPRINT_OVERLOAD_UNDERLOAD_BATSPEED",
      "BLUEPRINT_HAND_EYE_NUMBERED_TRACK",
    ],
  },
  {
    id: "blueprint_45_batspeed",
    name: "Bat Speed Contrast 45",
    blurb: "On-plane path work into supervised overload/underload bat-speed contrast.",
    durationMin: 45,
    ageBands: ["13-15", "16+"],
    environmentTier: "T2_cage_gym",
    focus: ["hitting"],
    drillIds: ["BLUEPRINT_SWING_PLANE_PATH_CHECK", "BLUEPRINT_OVERLOAD_UNDERLOAD_BATSPEED"],
  },
  {
    id: "blueprint_45_handeye",
    name: "Hand-Eye + Path 45",
    blurb: "Numbered-ball tracking into on-plane path checks.",
    durationMin: 45,
    ageBands: ["9-12", "13-15", "16+"],
    environmentTier: "T2_cage_gym",
    focus: ["hitting"],
    drillIds: ["BLUEPRINT_HAND_EYE_NUMBERED_TRACK", "BLUEPRINT_SWING_PLANE_PATH_CHECK"],
  },
  {
    id: "backyard_30_solo",
    name: "Backyard 30",
    blurb: "Small-group tee work with quality reps.",
    durationMin: 30,
    ageBands: ["6-8", "9-12"],
    environmentTier: "T3_backyard",
    focus: ["hitting"],
    drillIds: ["TEE_5BALL_PROGRESSION"],
  },
  {
    id: "living_room_20",
    name: "Living-room 20",
    blurb: "Tiny-space tune-up: dry swings, grip, vision tracking.",
    durationMin: 20,
    ageBands: ["6-8", "9-12", "13-15"],
    environmentTier: "T4_living_room",
    focus: ["hitting", "mental_recovery"],
    drillIds: ["LIVING_ROOM_DRY_SWINGS", "LIVING_ROOM_GRIP_STRENGTH", "LIVING_ROOM_VISION_TRACK"],
  },
  {
    id: "field_45_teeball",
    name: "Tee Ball 45 (opening weeks)",
    blurb: "First-timer plan: a fun tag warm-up, the three throwing words, tee swings, and run-through-first.",
    durationMin: 45,
    ageBands: ["6-8"],
    environmentTier: "T1_field",
    focus: ["throwing", "hitting", "baserunning"],
    drillIds: [
      "FREEZE_TAG_POSITIONS",
      "READY_AIM_THROW_6U",
      "TEE_SET_AND_SWING_6U",
      "RUN_THROUGH_FIRST_6U",
    ],
  },
  {
    id: "field_60_6u_allskills",
    name: "6U All-Skills 60",
    blurb: "Throw, catch, hit, and run for first-year players — heavy fun, parent-helper friendly.",
    durationMin: 60,
    ageBands: ["6-8"],
    environmentTier: "T1_field",
    focus: ["throwing", "catching", "hitting"],
    drillIds: [
      "FREEZE_TAG_POSITIONS",
      "READY_AIM_THROW_6U",
      "CRADLE_CATCH_BEANBAG",
      "SOFT_TOSS_LINE_DRIVE",
      "RUN_THROUGH_FIRST_6U",
    ],
  },
  {
    id: "field_60_7u8u_stations",
    name: "7U/8U Station Day 60",
    blurb: "Four-station grassroots plan: arm action, alligator grounders, tee swings, and a relay race.",
    durationMin: 60,
    ageBands: ["6-8"],
    environmentTier: "T1_field",
    focus: ["throwing", "fielding", "hitting", "baserunning"],
    drillIds: [
      "SHOW_THE_DOG_THROW",
      "ALLIGATOR_GROUNDBALLS",
      "TEE_SET_AND_SWING_6U",
      "RUN_THROUGH_FIRST_6U",
      "RELAY_THROW_RACE",
    ],
  },
  {
    id: "field_90_fenway_fundamentals",
    name: "Fenway Fundamentals 90",
    blurb: "Red Sox-style intermediate block: warm up, soft toss, infield reads, relays, baserunning.",
    durationMin: 90,
    ageBands: ["9-12", "13-15"],
    environmentTier: "T1_field",
    focus: ["hitting", "fielding", "baserunning"],
    drillIds: [
      "DYNAMIC_WARMUP_8MIN",
      "SOFT_TOSS_LINE_DRIVE",
      "FIELDING_TRIANGLE_READ",
      "CUTOFF_RELAY_3MAN",
      "BASE_READS_3_STATIONS",
    ],
  },
  {
    id: "field_90_mlb_fourcategory",
    name: "MLB Four-Category 90",
    blurb: "The MLB manual's four fundamentals in one practice: throw, field, hit, run.",
    durationMin: 90,
    ageBands: ["9-12", "13-15"],
    environmentTier: "T1_field",
    focus: ["throwing", "fielding", "hitting", "baserunning"],
    drillIds: [
      "DYNAMIC_WARMUP_8MIN",
      "THROWING_LONG_TOSS_PROGRESS",
      "FIELDING_TRIANGLE_READ",
      "TEE_5BALL_PROGRESSION",
      "BASE_READS_3_STATIONS",
    ],
  },
  {
    id: "field_90_u10_baserunning",
    name: "U10 Baserunning + Defense 90",
    blurb: "Elkhorn-style U10 day: arm action, alligator grounders, banana-route reads, fly-ball calls.",
    durationMin: 90,
    ageBands: ["9-12"],
    environmentTier: "T1_field",
    focus: ["fielding", "baserunning", "throwing"],
    drillIds: [
      "SHOW_THE_DOG_THROW",
      "ALLIGATOR_GROUNDBALLS",
      "ROUNDING_FIRST_BANANA",
      "FLY_BALL_COMMUNICATION",
    ],
  },
  // Position-specific and at-home presets. Each pairs already-published drills
  // with newer ones still in review, so the preset compiles to a usable plan
  // today and fills out further as drills are promoted.
  {
    id: "field_45_corner_infield",
    name: "Corner Infield 45",
    blurb: "First and third base day: receiving throws, slow rollers, sweep tags, bunt coverage.",
    durationMin: 45,
    ageBands: ["13-15", "16+"],
    environmentTier: "T1_field",
    focus: ["fielding", "throwing"],
    drillIds: [
      "ALLIGATOR_GROUNDBALLS",
      "IF_FIRST_BASE_RECEIVING",
      "IF_SLOW_ROLLER_DO_OR_DIE",
      "IF_TAG_PLAY_SWEEP",
      "PITCHING_PFP_COVER_1ST",
    ],
  },
  {
    id: "field_60_middle_infield",
    name: "Middle Infield 60",
    blurb: "Up-the-middle day: ready hop, range both ways, flips and feeds, double-play turns.",
    durationMin: 60,
    ageBands: ["9-12", "13-15", "16+"],
    environmentTier: "T1_field",
    focus: ["fielding", "throwing"],
    drillIds: [
      "IF_READY_HOP_FIRST_STEP",
      "SOFT_HANDS_SHORT_HOP",
      "IF_BACKHAND_FOREHAND_RANGE",
      "IF_FLIP_FEED_FOOTWORK",
      "IF_DP_TURN_4_6_3",
    ],
  },
  {
    id: "field_75_team_defense",
    name: "Team Defense Situations 75",
    blurb: "Whole-defense day: pop-up calls, rundowns, relays, and first-and-third reads.",
    durationMin: 75,
    ageBands: ["9-12", "13-15", "16+"],
    environmentTier: "T1_field",
    focus: ["fielding", "baserunning", "throwing"],
    drillIds: [
      "IF_POPUP_PRIORITY",
      "CUTOFF_RELAY_3MAN",
      "DEF_RUNDOWN_PICKLE",
      "BR_FIRST_THIRD_READS",
      "CBG_TEAM_FIRST_RELAY_RACE",
      "DEF_BASES_LOADED_LIVE",
    ],
  },
  {
    id: "field_60_outfield",
    name: "Outfield Arm + Reads 60",
    blurb: "Outfield day: fly-ball technique, drop steps, do-or-die grounders through the cutoff.",
    durationMin: 60,
    ageBands: ["9-12", "13-15", "16+"],
    environmentTier: "T1_field",
    focus: ["fielding", "throwing"],
    drillIds: [
      "OF_FLY_BALL_CATCH_TECHNIQUE",
      "OF_DROP_STEP_OVER_SHOULDER",
      "OF_LINE_DRIVE_READS",
      "OF_DO_OR_DIE_GROUNDER",
      "CUTOFF_RELAY_3MAN",
    ],
  },
  {
    id: "field_45_throwing_transfers",
    name: "Throwing & Transfers 45",
    blurb: "Arm-care first, then four-seam catch, four corners, and quick-transfer work.",
    durationMin: 45,
    ageBands: ["9-12", "13-15", "16+"],
    environmentTier: "T1_field",
    focus: ["throwing"],
    drillIds: [
      "THROW_ARM_CARE_WARMUP",
      "SHOW_THE_DOG_THROW",
      "PARTNER_CATCH_FOUR_SEAM",
      "THROWING_QUICK_TRANSFER",
      "FOUR_CORNERS_THROWING",
      "RELAY_THROW_RACE",
    ],
  },
  {
    id: "field_45_command",
    name: "Command Day 45",
    blurb: "Pitchers: arm care, 9-box command, first-pitch strikes, changeup feel. No breaking balls.",
    durationMin: 45,
    ageBands: ["13-15", "16+"],
    environmentTier: "T1_field",
    focus: ["pitching", "throwing"],
    drillIds: [
      "THROW_ARM_CARE_WARMUP",
      "PITCHING_9BOX_COMMAND",
      "PITCHING_FIRST_PITCH_STRIKE",
      "PITCHING_CHANGEUP_FEEL",
      "PITCHING_BULLPEN_15PITCH",
      "PITCHING_PFP_COVER_1ST",
    ],
  },
  {
    id: "field_45_catcher",
    name: "Catcher Day 45",
    blurb: "Behind the plate: framing, blocking, block-recover-throw, and the dirt-ball save game.",
    durationMin: 45,
    ageBands: ["9-12", "13-15", "16+"],
    environmentTier: "T1_field",
    focus: ["catching", "throwing"],
    drillIds: [
      "C_FRAMING_LOW_STRIKE",
      "C_BLOCKING_3BALL",
      "C_BLOCK_RECOVER_THROW",
      "C_DIRT_BALL_SAVE_GAME",
      "C_RECEIVE_TRANSFER_FOOTWORK",
    ],
  },
  {
    id: "home_20_solo",
    name: "At-Home Solo 20",
    blurb: "Twenty minutes alone in a driveway: wall hands, grounder circuit, dry swings, reset.",
    durationMin: 20,
    ageBands: ["9-12", "13-15", "16+"],
    environmentTier: "T3_backyard",
    focus: ["fielding", "hitting", "mental"],
    drillIds: [
      "YGP_SHORT_HOP_WALL_HANDS",
      "YGP_AT_HOME_GROUNDER_CIRCUIT",
      "SOFT_HANDS_SHORT_HOP",
      "LIVING_ROOM_DRY_SWINGS",
      "MENTAL_PREPITCH_ROUTINE",
    ],
  },
];

/**
 * Suggest templates that match the coach's constraints. Bucketed by duration
 * with a ±15 minute tolerance so a "60 min" request still surfaces 45- and 75-min
 * presets the coach can stretch or trim.
 */
export function suggestTemplates(args: {
  age: number;
  durationMin: number;
  environmentTier: EnvTier;
}): PlanTemplate[] {
  const ageKey = getAgeBandKeyForAge(args.age);
  return PLAN_TEMPLATES.filter((t) => {
    if (!t.ageBands.includes(ageKey)) return false;
    if (t.environmentTier !== args.environmentTier) return false;
    return Math.abs(t.durationMin - args.durationMin) <= 15;
  }).sort((a, b) => Math.abs(a.durationMin - args.durationMin) - Math.abs(b.durationMin - args.durationMin));
}

/** Resolve a template's drill IDs to currently reviewable Drill objects. */
export function templateDrills(template: PlanTemplate): Drill[] {
  const all = loadDrills();
  return template.drillIds
    .map((id) => all.find((d) => d.drill_id === id))
    .filter(
      (d): d is Drill =>
        Boolean(d) && d!.review_status !== "draft" && d!.review_status !== "retired",
    );
}
