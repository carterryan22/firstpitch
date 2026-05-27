// @platform/missions — E14 age-scaled player missions.
// Younger = fun + streaks. Older = verified PRs + position ladders.

import { getAgeBandKeyForAge, type AgeBandKey } from "@platform/corpus";

export * from "./homework";

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
    description: "Do the dynamic warm-up 5 days in a row.",
    bands: ["6-8", "9-12"],
    cadenceDays: 5,
    drillId: "DYNAMIC_WARMUP_8MIN",
    minVerification: "self_entered",
  },
  {
    id: "M_DAILY_BREATH",
    kind: "fun_streak",
    title: "Daily mental reset",
    description: "Finish each practice with a breathing reset.",
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
    description: "Beat your best tee hard-hit count this week (video).",
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
    description: "Climb from 2.4s → 2.2s pop time across the month.",
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
    description: "Set a new 10-yard sprint PR. Coach- or device-verified only.",
    bands: ["13-15", "16+"],
    cadenceDays: 14,
    drillId: "ACC_SPRINT_10_20",
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
