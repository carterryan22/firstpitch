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
    name: "Pro Velocity — All Star Blueprint 60",
    blurb: "The full Blueprint session: bat speed, swing mechanics, and hand-eye in one cage night.",
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
    name: "Pro Velocity — Bat Speed 45",
    blurb: "Blueprint power day: on-plane path grooming into overload/underload bat-speed contrast.",
    durationMin: 45,
    ageBands: ["13-15", "16+"],
    environmentTier: "T2_cage_gym",
    focus: ["hitting"],
    drillIds: ["BLUEPRINT_SWING_PLANE_PATH_CHECK", "BLUEPRINT_OVERLOAD_UNDERLOAD_BATSPEED"],
  },
  {
    id: "blueprint_45_handeye",
    name: "Pro Velocity — Hand-Eye 45",
    blurb: "Blueprint vision day: numbered-ball tracking into on-plane path checks.",
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

/** Resolve a template's drill IDs to full Drill objects (filtering missing). */
export function templateDrills(template: PlanTemplate): Drill[] {
  const all = loadDrills();
  return template.drillIds
    .map((id) => all.find((d) => d.drill_id === id))
    .filter((d): d is Drill => Boolean(d));
}
