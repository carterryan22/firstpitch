// "Don't do this today" engine — E5.5.
// Unifies pitch-smart, age-matrix, soreness, injury, heat, and policy gates into one
// authoritative pre-flight check per athlete-day.

import { canPitchToday, type PitchHistory } from "./pitchSmart";
import { isAllowedByAgeMatrix, sessionCapsFor } from "./ageMatrix";
import { policy } from "./policy";

export interface DontDoTodayInput {
  age: number;
  date?: Date;
  /** Past 30 days of injury reports (subset of fields). */
  injuryHistory?: Array<{ date: Date; severity: "mild" | "moderate" | "severe"; resolvedAt?: Date }>;
  /** Today's environmental conditions. */
  conditions?: {
    heatIndexF?: number;
    airQualityIndex?: number;
    lightning?: boolean;
  };
  /** Self/coach-reported wellness for today. */
  wellness?: {
    soreness1to10?: number;
    hoursSleptLast24?: number;
    hydrationDeficitPct?: number;
  };
  /** Pitching history for the athlete; supplied if a pitching block is being considered. */
  pitchHistory?: PitchHistory;
  plannedPitches?: number;
  /** Items the coach intends to do today; each will be checked against the age matrix. */
  intendedItems?: Array<{ topic: string; item: string; conditionsMet?: string[] }>;
}

export interface DontDoTodayBlock {
  ruleId: string;
  severity: "block" | "warn";
  reason: string;
  saferAlternative?: string;
}

export interface DontDoTodayResult {
  blocks: DontDoTodayBlock[];
  warnings: DontDoTodayBlock[];
  okToProceed: boolean;
}

export function dontDoToday(input: DontDoTodayInput): DontDoTodayResult {
  const blocks: DontDoTodayBlock[] = [];
  const warnings: DontDoTodayBlock[] = [];
  const date = input.date ?? new Date();

  // 1. Environmental conditions
  const c = input.conditions ?? {};
  if (c.lightning) {
    blocks.push({
      ruleId: "ENV_LIGHTNING",
      severity: "block",
      reason: "Lightning in the area — clear the field per NFHS 30/30 rule.",
      saferAlternative: "Move to enclosed facility; resume 30 min after the last strike.",
    });
  }
  if (typeof c.heatIndexF === "number" && c.heatIndexF >= policy.heatIndexThresholdF) {
    warnings.push({
      ruleId: "ENV_HEAT",
      severity: "warn",
      reason: `Heat index ${c.heatIndexF}°F at or above ${policy.heatIndexThresholdF}°F threshold.`,
      saferAlternative: "Run HEAT_DAY_HYDRATION_CHECK; shorten skill blocks; mandatory water every 10 min.",
    });
  }
  if (typeof c.airQualityIndex === "number" && c.airQualityIndex >= 150) {
    warnings.push({
      ruleId: "ENV_AQI",
      severity: "warn",
      reason: `AQI ${c.airQualityIndex} (Unhealthy). Reduce intensity or move indoors.`,
    });
  }

  // 2. Wellness
  const w = input.wellness ?? {};
  if (typeof w.soreness1to10 === "number" && w.soreness1to10 >= 7) {
    blocks.push({
      ruleId: "WELLNESS_HIGH_SORENESS",
      severity: "block",
      reason: `Self-reported soreness ${w.soreness1to10}/10. Stop and reassess.`,
      saferAlternative: "Mobility + breathing reset only today; recheck tomorrow.",
    });
  } else if (typeof w.soreness1to10 === "number" && w.soreness1to10 >= 5) {
    warnings.push({
      ruleId: "WELLNESS_MOD_SORENESS",
      severity: "warn",
      reason: `Soreness ${w.soreness1to10}/10 — reduce intensity by ~30%.`,
    });
  }
  if (typeof w.hoursSleptLast24 === "number" && w.hoursSleptLast24 < 7) {
    warnings.push({
      ruleId: "WELLNESS_LOW_SLEEP",
      severity: "warn",
      reason: `Only ${w.hoursSleptLast24}h sleep. Drop max-effort throwing and sprinting.`,
    });
  }
  if (typeof w.hydrationDeficitPct === "number" && w.hydrationDeficitPct >= policy.hydrationDeficitWarnPct) {
    blocks.push({
      ruleId: "HYDRATION_DEFICIT_CAP",
      severity: "block",
      reason: `Hydration deficit ${w.hydrationDeficitPct}% ≥ ${policy.hydrationDeficitWarnPct}%.`,
      saferAlternative: "Rehydrate to baseline before any conditioning.",
    });
  }

  // 3. Recent injury still resolving
  const recent = (input.injuryHistory ?? []).filter((i) => {
    if (i.resolvedAt) return false;
    const days = (date.getTime() - i.date.getTime()) / 86_400_000;
    return days >= 0 && days <= 14;
  });
  for (const i of recent) {
    if (i.severity === "severe") {
      blocks.push({
        ruleId: "INJURY_UNRESOLVED_SEVERE",
        severity: "block",
        reason: "Severe injury within 14 days, not marked resolved.",
        saferAlternative: "Clinician clearance required before return to play.",
      });
    } else if (i.severity === "moderate") {
      warnings.push({
        ruleId: "INJURY_UNRESOLVED_MODERATE",
        severity: "warn",
        reason: "Moderate injury within 14 days, not marked resolved.",
      });
    }
  }

  // 4. Pitching pre-flight
  if (input.plannedPitches && input.plannedPitches > 0 && input.pitchHistory) {
    const r = canPitchToday({
      age: input.age,
      date,
      plannedPitches: input.plannedPitches,
      history: input.pitchHistory,
    });
    if (!r.allowed) {
      for (const reason of r.reasons) {
        blocks.push({
          ruleId: "PITCH_SMART_BLOCK",
          severity: "block",
          reason,
          saferAlternative: "Replace pitching block with non-throwing skill work (e.g., FIELDING_TRIANGLE_READ).",
        });
      }
    }
    for (const warn of r.warnings) {
      warnings.push({ ruleId: "PITCH_SMART_WARN", severity: "warn", reason: warn });
    }
  }

  // 5. Age-matrix intended items
  for (const item of input.intendedItems ?? []) {
    const verdict = isAllowedByAgeMatrix({
      age: input.age,
      topic: item.topic,
      item: item.item,
      conditionsMet: item.conditionsMet,
    });
    if (verdict === "forbidden") {
      blocks.push({
        ruleId: `MATRIX_FORBID_${item.topic.toUpperCase()}`,
        severity: "block",
        reason: `'${item.item}' is forbidden for age ${input.age} (${item.topic}).`,
        saferAlternative: "Pick an age-appropriate alternative from the drill library.",
      });
    }
  }

  // 6. Session-cap context (informational warning if session is over cap)
  void sessionCapsFor(input.age); // ensures matrix is loaded; placeholder for future caps

  return { blocks, warnings, okToProceed: blocks.length === 0 };
}
