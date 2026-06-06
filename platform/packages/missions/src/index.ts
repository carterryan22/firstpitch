// @platform/missions — E14 age-scaled player missions.
// Younger = fun + streaks. Older = verified PRs + position ladders.

import { getAgeBandKeyForAge, type AgeBandKey } from "@platform/corpus";

export * from "./homework";
export * from "./points";

export type MissionKind = "fun_streak" | "pr_challenge" | "position_ladder" | "verified_pr_only";

export interface Mission {
  id: string;
  kind: MissionKind;
  title: string;
  description: string;
  bands: AgeBandKey[];
  /** Days required to clear the mission. */
  cadenceDays: number;
  /** Mission ties to a specific corpus drill if applicable. */
  drillId?: string;
  /** Verification floor to count completion (older players require higher). */
  minVerification: "self_entered" | "video_attached" | "device_captured" | "coach_verified";
}

export const MISSIONS: Mission[] = [
  // Fun / streak (U8-10)
  {
    id: "M_DYNAMIC_WARMUP_STREAK",
    kind: "fun_streak",
    title: "Warm-up streak",
    description: "Lock in the dynamic warm-up 5 days straight. Loose body, ready to go — that's the standard.",
    bands: ["6-8", "9-12"],
    cadenceDays: 5,
    drillId: "DYNAMIC_WARMUP_8MIN",
    minVerification: "self_entered",
  },
  {
    id: "M_DAILY_BREATH",
    kind: "fun_streak",
    title: "Daily mental reset",
    description: "End every practice with one calm breathing reset. Lock in, reset, next play.",
    bands: ["6-8", "9-12"],
    cadenceDays: 7,
    drillId: "MENTAL_RESET_BREATH",
    minVerification: "self_entered",
  },
  // PR challenge (U11-12, U13-14)
  {
    id: "M_TEE_HARD_HIT_PR",
    kind: "pr_challenge",
    title: "Tee hard-hit PR",
    description: "Beat your best tee hard-hit count this week. Win the rep, film it, let's go.",
    bands: ["9-12", "13-15"],
    cadenceDays: 7,
    drillId: "TEE_5BALL_PROGRESSION",
    minVerification: "video_attached",
  },
  // Position ladder (U13-14)
  {
    id: "M_C_POP_TIME_LADDER",
    kind: "position_ladder",
    title: "Catcher pop-time ladder",
    description: "Climb your pop time from 2.4s toward 2.2s this month. Clean transfer, quick feet — one rung at a time.",
    bands: ["13-15"],
    cadenceDays: 30,
    drillId: "C_POP_TIME_BLOCKS",
    minVerification: "coach_verified",
  },
  // Verified-only (U15+)
  {
    id: "M_SPRINT_10_VERIFIED",
    kind: "verified_pr_only",
    title: "Verified 10-yd sprint PR",
    description: "Set a new 10-yard sprint PR. Get after it — coach- or device-verified.",
    bands: ["13-15", "16+"],
    cadenceDays: 14,
    drillId: "ACC_SPRINT_10_20",
    minVerification: "coach_verified",
  },

  // --- Expanded library: aiming for 5-8 missions per age band ---

  // 6-8 (Fun first)
  {
    id: "M_LIVINGROOM_DRY_SWINGS",
    kind: "fun_streak",
    title: "Living-room dry swings",
    description: "10 clean dry swings, 4 days this week. Wiffle or no bat — balanced finish every rep.",
    bands: ["6-8", "9-12"],
    cadenceDays: 4,
    drillId: "LIVING_ROOM_DRY_SWINGS",
    minVerification: "self_entered",
  },
  {
    id: "M_VISION_TRACK_STREAK",
    kind: "fun_streak",
    title: "Eye-tracking streak",
    description: "Play the vision-tracking game 3 days this week. Track the ball all the way — keep it fun.",
    bands: ["6-8"],
    cadenceDays: 3,
    drillId: "LIVING_ROOM_VISION_TRACK",
    minVerification: "self_entered",
  },
  {
    id: "M_REACTION_BALL_FUN",
    kind: "fun_streak",
    title: "Reaction-ball game",
    description: "Catch 10 crazy reaction-ball bounces with a partner, 3 days. Quick hands, stay loose.",
    bands: ["6-8", "9-12"],
    cadenceDays: 3,
    drillId: "REACTION_BALL_PARTNER",
    minVerification: "self_entered",
  },

  // 9-12 (PRs starting)
  {
    id: "M_HOME_TO_FIRST_PR",
    kind: "pr_challenge",
    title: "Home-to-first PR",
    description: "Beat your best home-to-first time this week. Run through the bag — grab a stopwatch and go.",
    bands: ["9-12", "13-15"],
    cadenceDays: 7,
    drillId: "HOME_TO_FIRST_TIMED",
    minVerification: "video_attached",
  },
  {
    id: "M_FRONT_TOSS_HARD_HIT",
    kind: "pr_challenge",
    title: "Front-toss hard-hit",
    description: "Stack 5 hard-hit balls in one front-toss round. Win every rep — film it.",
    bands: ["9-12", "13-15"],
    cadenceDays: 7,
    drillId: "FRONT_TOSS_DECISION_5",
    minVerification: "video_attached",
  },
  {
    id: "M_GRIP_STRENGTH_STREAK",
    kind: "fun_streak",
    title: "Grip-strength reps",
    description: "Bodyweight grip routine 4 days. No bands, no weights — just strong, healthy hands.",
    bands: ["9-12"],
    cadenceDays: 4,
    drillId: "LIVING_ROOM_GRIP_STRENGTH",
    minVerification: "self_entered",
  },

  // 13-15 (position ladders)
  {
    id: "M_OF_DROP_STEP_LADDER",
    kind: "position_ladder",
    title: "OF drop-step ladder",
    description: "Climb the outfield drop-step rungs this month. Open up, first step back, go get it.",
    bands: ["13-15"],
    cadenceDays: 30,
    drillId: "OF_DROP_STEP_LADDER",
    minVerification: "coach_verified",
  },
  {
    id: "M_IF_DP_TURN_LADDER",
    kind: "position_ladder",
    title: "Double-play turn ladder",
    description: "Turn the 4-6-3 under 2.4s on 7 of 10 reps. Quick feet, clean feed — that's the standard.",
    bands: ["13-15", "16+"],
    cadenceDays: 21,
    drillId: "IF_DP_TURN_4_6_3",
    minVerification: "coach_verified",
  },
  {
    id: "M_BUNT_SACRIFICE_PR",
    kind: "pr_challenge",
    title: "Sac-bunt placement",
    description: "Drop 5 sac bunts in your target zone. Deaden it, place it — film it.",
    bands: ["13-15"],
    cadenceDays: 14,
    drillId: "BUNT_SACRIFICE_5BALL",
    minVerification: "video_attached",
  },

  // 16+ (verified PRs only)
  {
    id: "M_PFP_COVER_FIRST_VERIFIED",
    kind: "verified_pr_only",
    title: "PFP cover-first reps",
    description: "Clean cover-first reps at live tempo. Bust off the mound, beat the runner — coach-verified.",
    bands: ["16+"],
    cadenceDays: 14,
    drillId: "PITCHING_PFP_COVER_1ST",
    minVerification: "coach_verified",
  },
  {
    id: "M_BULLPEN_15_VERIFIED",
    kind: "verified_pr_only",
    title: "Bullpen control (15)",
    description: "15-pitch bullpen, 11+ strikes. Compete with every pitch — coach-verified.",
    bands: ["16+"],
    cadenceDays: 7,
    drillId: "PITCHING_BULLPEN_15PITCH",
    minVerification: "coach_verified",
  },
  {
    id: "M_OF_LINE_DRIVE_READS_PR",
    kind: "verified_pr_only",
    title: "OF line-drive reads",
    description: "Nail 9 of 12 first-step reads. Read it off the bat, break clean — coach-verified.",
    bands: ["16+"],
    cadenceDays: 14,
    drillId: "OF_LINE_DRIVE_READS",
    minVerification: "coach_verified",
  },
  {
    id: "M_FIELDING_TRIANGLE_VERIFIED",
    kind: "verified_pr_only",
    title: "Fielding triangle reads",
    description: "Work the triangle read across positions at game tempo. See it early, beat it there — coach-verified.",
    bands: ["13-15", "16+"],
    cadenceDays: 21,
    drillId: "FIELDING_TRIANGLE_READ",
    minVerification: "coach_verified",
  },
];

export function missionsForAge(age: number): Mission[] {
  const band = getAgeBandKeyForAge(age);
  if (!band) return [];
  return MISSIONS.filter((m) => m.bands.includes(band));
}

export interface Completion {
  date: Date;
  verification: Mission["minVerification"];
}

const LEVEL_RANK = { self_entered: 0, video_attached: 1, device_captured: 2, coach_verified: 3 };

export function streakFor(
  mission: Mission,
  completions: Completion[],
  now: Date = new Date(),
): {
  current: number;
  longest: number;
  qualifies: boolean;
} {
  const minRank = LEVEL_RANK[mission.minVerification];
  const valid = completions
    .filter((c) => LEVEL_RANK[c.verification] >= minRank)
    .map((c) => new Date(c.date.toISOString().slice(0, 10)).getTime())
    .sort((a, b) => a - b);
  if (valid.length === 0) return { current: 0, longest: 0, qualifies: false };

  let longest = 1;
  let cur = 1;
  for (let i = 1; i < valid.length; i++) {
    const prev = valid[i - 1]!;
    const next = valid[i]!;
    const gap = (next - prev) / 86_400_000;
    if (gap === 1) {
      cur++;
      longest = Math.max(longest, cur);
    } else if (gap > 1) {
      cur = 1;
    }
  }

  // Current streak ends today (or yesterday)
  const today = new Date(now.getTime());
  today.setUTCHours(0, 0, 0, 0);
  const last = valid[valid.length - 1]!;
  const gapFromToday = (today.getTime() - last) / 86_400_000;
  const current = gapFromToday <= 1 ? cur : 0;

  return { current, longest, qualifies: longest >= mission.cadenceDays };
}
