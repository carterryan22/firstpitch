// Points + locker math. Pure functions, no I/O. Used by API routes and the locker UI.
//
// Design: points are derived from drill *intensity* and *duration*, not stored
// per-drill in the corpus. This lets the system rebalance without DB writes.
// A small bonus rewards verified completions and at-home (T4) effort.

import type { Drill } from "@platform/corpus";

const INTENSITY_POINTS: Record<string, number> = {
  light: 5,
  recovery: 5,
  normal: 10,
  hard: 20,
};

const VERIFICATION_BONUS: Record<string, number> = {
  self_entered: 0,
  video_attached: 5,
  device_captured: 10,
  coach_verified: 10,
  facility_verified: 15,
  event_verified: 15,
};

export function drillPoints(drill: Pick<Drill, "intensity" | "duration_minutes" | "environment_tier">): number {
  const base = INTENSITY_POINTS[drill.intensity] ?? 10;
  const buckets = Math.max(1, Math.ceil(drill.duration_minutes / 10));
  const homeBonus = drill.environment_tier === "T4_living_room" ? 5 : 0;
  return base * buckets + homeBonus;
}

export function missionPoints(opts: {
  drill?: Pick<Drill, "intensity" | "duration_minutes" | "environment_tier">;
  verification?: string;
}): number {
  const drillPts = opts.drill ? drillPoints(opts.drill) : 15;
  const bonus = opts.verification ? VERIFICATION_BONUS[opts.verification] ?? 0 : 0;
  return drillPts + bonus;
}

export interface LockerTier {
  key: "rookie" | "starter" | "allstar" | "mvp";
  label: string;
  min: number;
  next?: number;
}

const TIERS: LockerTier[] = [
  { key: "rookie", label: "Rookie", min: 0, next: 100 },
  { key: "starter", label: "Starter", min: 100, next: 500 },
  { key: "allstar", label: "All-Star", min: 500, next: 2000 },
  { key: "mvp", label: "MVP", min: 2000 },
];

export function tierForPoints(points: number): LockerTier {
  let current = TIERS[0]!;
  for (const t of TIERS) {
    if (points >= t.min) current = t;
  }
  return current;
}

/** Count consecutive days (UTC) ending today with at least one completion. */
export function currentStreak(completionDates: string[], today: Date = new Date()): number {
  if (completionDates.length === 0) return 0;
  const days = new Set(completionDates.map((d) => d.slice(0, 10)));
  let streak = 0;
  const cursor = new Date(today);
  cursor.setUTCHours(0, 0, 0, 0);
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else {
      // Allow one-day grace if today hasn't been logged yet.
      if (streak === 0) {
        cursor.setUTCDate(cursor.getUTCDate() - 1);
        const key2 = cursor.toISOString().slice(0, 10);
        if (days.has(key2)) {
          streak += 1;
          cursor.setUTCDate(cursor.getUTCDate() - 1);
          continue;
        }
      }
      break;
    }
  }
  return streak;
}
