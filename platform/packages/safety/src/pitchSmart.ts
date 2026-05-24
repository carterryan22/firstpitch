import {
  getPitchTableForAge,
  loadPitchSmart,
  type PitchSmartAgeTable,
} from "@platform/corpus";
import { policy } from "./policy";

export interface PitchHistory {
  /** Pitch counts of completed outings, keyed by ISO date (YYYY-MM-DD). */
  outingsByDate: Record<string, number>;
  /** Pitches already thrown today (before the new request). */
  todayCount: number;
  /** Player reports arm soreness today. */
  soreToday: boolean;
  /** Innings caught today (Pitch Smart catcher rule). */
  todayCatchingInnings: number;
  /** Continuous calendar days of overhead throwing leading into today. */
  continuousThrowingDays: number;
}

export interface CanPitchInput {
  age: number;
  date: Date;
  plannedPitches: number;
  history: PitchHistory;
  /** Optional stricter league rule (e.g., Little League) applied as MIN. */
  leagueDailyMax?: number;
}

export interface CanPitchResult {
  allowed: boolean;
  warnings: string[];
  reasons: string[];
  requiredRestDaysRemaining: number;
  appliedTable: PitchSmartAgeTable | null;
  effectiveDailyMax: number;
}

/** Required rest by pitch count → days. Returns 0 if input out of range. */
export function requiredRestForCount(table: PitchSmartAgeTable, pitches: number): number {
  for (const row of table.required_rest) {
    if (pitches >= row.pitches_min && pitches <= row.pitches_max) return row.rest_days;
  }
  return 0;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  const ms = 1000 * 60 * 60 * 24;
  return Math.floor((b.getTime() - a.getTime()) / ms);
}

function mostRecentOuting(history: PitchHistory, today: Date): { date: Date; count: number } | null {
  const entries = Object.entries(history.outingsByDate)
    .map(([date, count]) => ({ date: new Date(date + "T00:00:00Z"), count }))
    .filter((e) => e.date.getTime() < today.getTime())
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  return entries[0] ?? null;
}

function rollingWeekTotal(history: PitchHistory, today: Date): number {
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() - 7);
  let total = history.todayCount;
  for (const [d, count] of Object.entries(history.outingsByDate)) {
    const date = new Date(d + "T00:00:00Z");
    if (date >= cutoff && date <= today) total += count;
  }
  return total;
}

/**
 * Implements `canPitchToday()` from corpus/pitch-smart-tables.json `compiler_contract`.
 * Fails closed: if no age table matches, returns disallowed.
 */
export function canPitchToday(input: CanPitchInput): CanPitchResult {
  const table = getPitchTableForAge(input.age);
  const warnings: string[] = [];
  const reasons: string[] = [];

  if (!table) {
    return {
      allowed: false,
      warnings,
      reasons: [`No Pitch Smart age table for age ${input.age}.`],
      requiredRestDaysRemaining: 0,
      appliedTable: null,
      effectiveDailyMax: 0,
    };
  }

  const effectiveDailyMax = Math.min(
    table.daily_max_pitches,
    input.leagueDailyMax ?? Number.POSITIVE_INFINITY
  );

  // Hard checks
  if (input.history.soreToday) {
    reasons.push("Player reported arm soreness today; sore-arm rule applies.");
  }
  const projectedToday = input.history.todayCount + input.plannedPitches;
  if (projectedToday > effectiveDailyMax) {
    reasons.push(
      `Projected ${projectedToday} pitches exceeds daily max ${effectiveDailyMax} for age ${input.age}.`
    );
  }
  if (input.history.todayCatchingInnings >= policy.catcherInningsBlocksPitchingAt) {
    reasons.push(
      `Player caught ${input.history.todayCatchingInnings} innings today; Pitch Smart blocks same-day pitching after ${policy.catcherInningsBlocksPitchingAt}.`
    );
  }
  if (input.history.continuousThrowingDays >= policy.maxContinuousThrowingDays) {
    reasons.push(
      `${input.history.continuousThrowingDays} continuous throwing days exceeds policy max ${policy.maxContinuousThrowingDays}.`
    );
  }

  // Rest from last outing
  let requiredRestDaysRemaining = 0;
  const last = mostRecentOuting(input.history, input.date);
  if (last) {
    const requiredRest = requiredRestForCount(table, last.count);
    const daysSince = daysBetween(last.date, input.date);
    if (daysSince < requiredRest) {
      requiredRestDaysRemaining = requiredRest - daysSince;
      reasons.push(
        `Last outing of ${last.count} pitches requires ${requiredRest} rest days; only ${daysSince} elapsed.`
      );
    }
  }

  // Soft warnings
  if (projectedToday > policy.pitchDailySoftCapFraction * effectiveDailyMax && reasons.length === 0) {
    warnings.push(
      `Projected ${projectedToday} pitches is above ${Math.round(
        policy.pitchDailySoftCapFraction * 100
      )}% of daily max ${effectiveDailyMax}.`
    );
  }
  const weekTotal = rollingWeekTotal(input.history, input.date) + input.plannedPitches;
  if (weekTotal > policy.rollingWeekSoftCap) {
    warnings.push(`Rolling 7-day total ${weekTotal} pitches exceeds soft cap ${policy.rollingWeekSoftCap}.`);
  }

  return {
    allowed: reasons.length === 0,
    warnings,
    reasons,
    requiredRestDaysRemaining,
    appliedTable: table,
    effectiveDailyMax,
  };
}

/** Quick helper for AI post-filter: detect pitch counts in a string that exceed any age band. */
export function violatesAnyDailyMax(pitches: number): boolean {
  const max = Math.max(...loadPitchSmart().age_tables.map((t) => t.daily_max_pitches));
  return pitches > max;
}

export function pitchTypeAllowedAt(age: number, pitchType: string): boolean {
  const table = getPitchTableForAge(age);
  if (!table) return false;
  return table.allowed_pitch_types.some((p) => p.toLowerCase().startsWith(pitchType.toLowerCase()));
}
