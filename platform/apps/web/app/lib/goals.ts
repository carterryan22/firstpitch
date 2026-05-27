import type { GoalRecord, MetricEntryRecord } from "@platform/storage";
import { metricByKey } from "./metrics";

export type GoalProgress = {
  goal: GoalRecord;
  currentValue: number | null;
  /** Target value as an absolute number (computed from baseline + delta if needed). */
  targetValue: number;
  /** 0..1 progress fraction, clamped. */
  fraction: number;
  /** Display status, computed from fraction + cadence. */
  status: "achieved" | "on-pace" | "behind" | "regression" | "no-data";
  /** Direction the metric should move ("up" = bigger value is better). */
  direction: "up" | "down";
};

export function computeGoalProgress(
  goal: GoalRecord,
  entries: MetricEntryRecord[],
  now: Date = new Date(),
): GoalProgress {
  const def = metricByKey(goal.metricKey);
  const direction: "up" | "down" = def?.lowerIsBetter ? "down" : "up";
  const series = entries
    .filter((e) => e.metricKey === goal.metricKey)
    .slice()
    .sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : 1));
  const last = series[series.length - 1] ?? null;
  const currentValue = last?.value ?? null;
  const targetValue =
    goal.type === "absolute" ? goal.target : goal.baseline + goal.target;

  let fraction = 0;
  if (currentValue !== null) {
    const denom = targetValue - goal.baseline;
    if (denom === 0) {
      fraction = currentValue === targetValue ? 1 : 0;
    } else {
      fraction = (currentValue - goal.baseline) / denom;
    }
    if (!Number.isFinite(fraction)) fraction = 0;
  }
  fraction = Math.max(-0.5, Math.min(1.5, fraction));

  let status: GoalProgress["status"];
  if (currentValue === null) {
    status = "no-data";
  } else if (fraction >= 1) {
    status = "achieved";
  } else if (fraction < 0) {
    status = "regression";
  } else if (goal.targetDate) {
    const startMs = new Date(goal.createdAt).getTime();
    const endMs = new Date(goal.targetDate).getTime();
    const total = endMs - startMs;
    const elapsed = Math.max(0, now.getTime() - startMs);
    const expectedFraction = total > 0 ? Math.min(1, elapsed / total) : 1;
    status = fraction + 0.05 >= expectedFraction ? "on-pace" : "behind";
  } else {
    status = fraction >= 0.5 ? "on-pace" : "behind";
  }

  return { goal, currentValue, targetValue, fraction, status, direction };
}

export const GOAL_STATUS_BADGE: Record<GoalProgress["status"], { label: string; cls: string }> = {
  achieved: { label: "Achieved", cls: "badge-ok" },
  "on-pace": { label: "On pace", cls: "badge-ok" },
  behind: { label: "Behind", cls: "badge-warn" },
  regression: { label: "Regression", cls: "badge-danger" },
  "no-data": { label: "No data yet", cls: "badge-info" },
};
