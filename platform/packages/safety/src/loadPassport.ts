// Pitch Load Passport — a single rolling throwing-load status per player.
//
// Pitch count alone is not the whole story: kids throw in games, bullpens,
// long toss, private lessons, and behind the plate — sometimes for more than
// one team. This engine unifies every throwing source into ONE green/yellow/red
// status, layered on top of the Pitch Smart hard gate (`canPitchToday`) so the
// safe call is the easy call. It is pure and deterministic: pass `today` to get
// reproducible output (used by the test gate).

import { canPitchToday, type PitchHistory } from "./pitchSmart";
import { policy } from "./policy";
import type { SeasonState } from "./workload";

/** A single throwing exposure on one calendar day. */
export type ThrowingActivity = "game" | "bullpen" | "long_toss" | "lesson" | "practice";

export interface ThrowingEvent {
  /** ISO `YYYY-MM-DD`. */
  date: string;
  activity: ThrowingActivity;
  /** Pitches thrown (games / bullpens). Drives Pitch Smart rest tables. */
  pitches?: number;
  /** High-intent throws that are not mound pitches (long toss, lessons, PFP). */
  throws?: number;
  /** Innings caught that day. Catchers throw the ball back on most pitches. */
  catcherInnings?: number;
  /** Intent of `throws`, 1–10. Scales their load contribution. Default mid. */
  intensity?: number;
  /** Load that came from a *different* team / outside lesson (multi-team flag). */
  external?: boolean;
}

export type LoadStatus = "green" | "yellow" | "red";

export type LoadFlagCode =
  | "rest_owed"
  | "no_bullpen"
  | "catcher_pitcher_conflict"
  | "sore_arm"
  | "over_daily_max"
  | "rolling_week_high"
  | "acute_spike"
  | "continuous_days"
  | "multi_team";

export interface LoadFlag {
  code: LoadFlagCode;
  severity: "block" | "warn";
  /** Coach-facing message. */
  message: string;
}

export interface LoadPassportInput {
  age: number;
  /** Inject for determinism. Defaults to now. */
  today?: Date;
  events: ThrowingEvent[];
  /** What the coach intends to do with this player today. */
  plannedToday?: { pitch?: boolean; bullpen?: boolean; catchInnings?: number };
  /** Self / coach soreness report for today, 1–10. */
  soreness1to10?: number;
  /** Stricter league daily pitch max, applied as a MIN against the age table. */
  leagueDailyMax?: number;
  season?: SeasonState;
  /** Used only to personalize the parent-safe note. */
  playerName?: string;
}

export interface LoadPassport {
  status: LoadStatus;
  /** One-line coach headline. */
  headline: string;
  /** Calm, parent-safe explanation. No numbers-shaming, no comparisons. */
  parentSummary: string;
  flags: LoadFlag[];
  /** First day the player clears rest to pitch, clamped to today-or-later. */
  nextEligiblePitchDate: string;
  nextEligibleInDays: number;
  /** Whether a bullpen today is advisable. */
  bullpenOkToday: boolean;
  /** Rolling 7-day throwing load in pitch-equivalents (pitches + throws + catching). */
  rollingWeekLoad: number;
  /** Rolling 7-day actual mound pitches only. */
  rollingWeekPitches: number;
  /** Acute:chronic load ratio (7-day : 28-day average week). */
  acuteChronicRatio: number;
  /** Most recent mound outing. */
  lastOuting: { date: string; pitches: number } | null;
  /** Effective daily pitch max for the player's age (after league override). */
  dailyMaxPitches: number;
}

/** A catcher inning's throwing-back load expressed in pitch-equivalents. */
const CATCH_INNING_LOAD = 6;
/** Default intent factor for non-mound throws when intensity is unknown. */
const DEFAULT_THROW_FACTOR = 0.6;
/** A representative bullpen session size, used to test "can he bullpen today?". */
const TYPICAL_BULLPEN_PITCHES = 25;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayStart(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

/** Pitch-equivalent load for one event. */
function eventLoad(e: ThrowingEvent): number {
  const pitches = e.pitches ?? 0;
  const factor = e.intensity != null ? clamp(e.intensity / 10, 0, 1) : DEFAULT_THROW_FACTOR;
  const throwsLoad = (e.throws ?? 0) * factor;
  const catchLoad = (e.catcherInnings ?? 0) * CATCH_INNING_LOAD;
  return pitches + throwsLoad + catchLoad;
}

/**
 * Build a unified Pitch Load Passport for one player from every throwing source.
 * Reuses `canPitchToday` for the Pitch Smart hard gate, then layers rolling
 * workload and multi-team awareness into a single status the dugout can read at
 * a glance.
 */
export function buildLoadPassport(input: LoadPassportInput): LoadPassport {
  const today = input.today ?? new Date();
  const todayKey = isoDay(today);
  const events = [...input.events].sort((a, b) => a.date.localeCompare(b.date));

  // Pitching outings (rest tables only care about mound pitches).
  const outingsByDate: Record<string, number> = {};
  let lastOuting: { date: string; pitches: number } | null = null;
  for (const e of events) {
    if ((e.activity === "game" || e.activity === "bullpen") && e.pitches) {
      outingsByDate[e.date] = (outingsByDate[e.date] ?? 0) + e.pitches;
      if (e.date < todayKey && (!lastOuting || e.date >= lastOuting.date)) {
        lastOuting = { date: e.date, pitches: outingsByDate[e.date]! };
      }
    }
  }

  const todayCount = outingsByDate[todayKey] ?? 0;
  const todayCatchingInnings = events
    .filter((e) => e.date === todayKey)
    .reduce((s, e) => s + (e.catcherInnings ?? 0), 0);

  // Continuous throwing days *leading into* today (today-exclusive run).
  const daysWithThrowing = new Set(events.map((e) => e.date));
  let continuousThrowingDays = 0;
  for (let d = addDays(today, -1); daysWithThrowing.has(isoDay(d)); d = addDays(d, -1)) {
    continuousThrowingDays += 1;
    if (continuousThrowingDays > 30) break; // safety bound
  }

  const soreness = input.soreness1to10;
  const history: PitchHistory = {
    outingsByDate,
    todayCount,
    soreToday: soreness != null && soreness >= 7,
    todayCatchingInnings,
    continuousThrowingDays,
  };

  const eligibility = canPitchToday({
    age: input.age,
    date: today,
    plannedPitches: 1,
    history,
    leagueDailyMax: input.leagueDailyMax,
  });

  // Rolling windows (deterministic with injected today).
  // Rolling windows, compared by calendar day-key so the result is independent
  // of `today`'s time component (deterministic for the test gate).
  const todayMidnight = dayStart(todayKey);
  const sevenAgoKey = isoDay(addDays(todayMidnight, -6)); // inclusive 7-day window
  const twentyEightAgoKey = isoDay(addDays(todayMidnight, -27));
  let rollingWeekLoad = 0;
  let rollingWeekPitches = 0;
  let monthLoad = 0;
  let externalInWeek = false;
  for (const e of events) {
    if (e.date > todayKey) continue; // ignore future-dated entries
    const load = eventLoad(e);
    if (e.date >= twentyEightAgoKey) monthLoad += load;
    if (e.date >= sevenAgoKey) {
      rollingWeekLoad += load;
      rollingWeekPitches += e.pitches ?? 0;
      if (e.external) externalInWeek = true;
    }
  }
  const chronicAvgWeek = monthLoad / 4;
  const acuteChronicRatio = chronicAvgWeek > 0 ? rollingWeekLoad / chronicAvgWeek : 0;

  const flags: LoadFlag[] = [];

  // --- Hard blocks (RED) sourced from the Pitch Smart gate ---
  for (const reason of eligibility.reasons) {
    if (/rest day/i.test(reason)) {
      flags.push({ code: "rest_owed", severity: "block", message: reason });
    } else if (/soreness/i.test(reason)) {
      flags.push({ code: "sore_arm", severity: "block", message: reason });
    } else if (/caught/i.test(reason)) {
      flags.push({ code: "catcher_pitcher_conflict", severity: "block", message: reason });
    } else if (/continuous throwing/i.test(reason)) {
      flags.push({ code: "continuous_days", severity: "block", message: reason });
    } else {
      flags.push({ code: "over_daily_max", severity: "block", message: reason });
    }
  }

  // Planned-today catcher + pitcher conflict (forward-looking, not yet in history).
  const planned = input.plannedToday;
  if (
    planned?.pitch &&
    (planned.catchInnings ?? 0) >= policy.catcherInningsBlocksPitchingAt &&
    !flags.some((f) => f.code === "catcher_pitcher_conflict")
  ) {
    flags.push({
      code: "catcher_pitcher_conflict",
      severity: "block",
      message: `Planned to catch ${planned.catchInnings} innings and pitch — pick one role today.`,
    });
  }

  const hasBlock = flags.some((f) => f.severity === "block");

  // --- Soft warnings (YELLOW) when not already blocked ---
  if (!hasBlock) {
    for (const w of eligibility.warnings) {
      const code: LoadFlagCode = /7-day|rolling/i.test(w) ? "rolling_week_high" : "over_daily_max";
      flags.push({ code, severity: "warn", message: w });
    }
    if (soreness != null && soreness >= 5 && soreness < 7) {
      flags.push({
        code: "sore_arm",
        severity: "warn",
        message: `Reported soreness ${soreness}/10 — keep volume light and recheck tomorrow.`,
      });
    }
    if (
      acuteChronicRatio > 1.5 &&
      chronicAvgWeek > 50 &&
      !flags.some((f) => f.code === "acute_spike")
    ) {
      flags.push({
        code: "acute_spike",
        severity: "warn",
        message: `Workload is spiking (7-day load ${Math.round(
          acuteChronicRatio * 100,
        )}% of the recent weekly average) — ramp down.`,
      });
    }
    if (
      rollingWeekLoad > policy.rollingWeekSoftCap &&
      !flags.some((f) => f.code === "rolling_week_high")
    ) {
      flags.push({
        code: "rolling_week_high",
        severity: "warn",
        message: `Rolling 7-day load ${Math.round(rollingWeekLoad)} pitch-equivalents is above the ${
          policy.rollingWeekSoftCap
        } soft cap.`,
      });
    }
    if (continuousThrowingDays === policy.maxContinuousThrowingDays - 1) {
      flags.push({
        code: "continuous_days",
        severity: "warn",
        message: `${continuousThrowingDays} straight throwing days — build in a recovery day soon.`,
      });
    }
  }

  // Multi-team awareness (informational; nudges to yellow if load is already up).
  if (externalInWeek) {
    flags.push({
      code: "multi_team",
      severity: "warn",
      message:
        "Some throwing this week came from another team or lesson — confirm the combined load before adding more.",
    });
  }

  const status: LoadStatus = hasBlock
    ? "red"
    : flags.length > 0
      ? "yellow"
      : "green";

  // Next eligible pitch day (rest is the only persisted forward blocker).
  const restDays = eligibility.allowed ? 0 : Math.max(0, eligibility.requiredRestDaysRemaining);
  const nextEligiblePitchDate = isoDay(addDays(today, restDays));

  // Can he throw a bullpen today?
  const bullpenCheck = canPitchToday({
    age: input.age,
    date: today,
    plannedPitches: TYPICAL_BULLPEN_PITCHES,
    history,
    leagueDailyMax: input.leagueDailyMax,
  });
  const bullpenOkToday =
    status !== "red" && bullpenCheck.allowed && rollingWeekLoad <= policy.rollingWeekSoftCap;
  if (!bullpenOkToday && !flags.some((f) => f.code === "no_bullpen")) {
    flags.push({
      code: "no_bullpen",
      severity: hasBlock ? "block" : "warn",
      message: hasBlock
        ? "No bullpen today — the arm owes rest."
        : "Hold the bullpen today — keep the week's throwing volume in check.",
    });
  }

  const name = input.playerName?.trim() || "Your player";

  return {
    status,
    headline: buildHeadline(status, flags, restDays, lastOuting),
    parentSummary: buildParentSummary(status, flags, name, nextEligiblePitchDate, today),
    flags,
    nextEligiblePitchDate,
    nextEligibleInDays: restDays,
    bullpenOkToday,
    rollingWeekLoad: Math.round(rollingWeekLoad),
    rollingWeekPitches,
    acuteChronicRatio: Number(acuteChronicRatio.toFixed(2)),
    lastOuting,
    dailyMaxPitches: eligibility.effectiveDailyMax,
  };
}

function buildHeadline(
  status: LoadStatus,
  flags: LoadFlag[],
  restDays: number,
  lastOuting: { date: string; pitches: number } | null,
): string {
  if (status === "green") return "Fresh — good to go";
  const block = flags.find((f) => f.severity === "block");
  if (status === "red") {
    if (block?.code === "rest_owed") {
      const tail = lastOuting ? ` (last outing ${lastOuting.pitches}p)` : "";
      return `Rest ${restDays}d${tail}`;
    }
    if (block?.code === "sore_arm") return "Resting — arm soreness reported";
    if (block?.code === "catcher_pitcher_conflict") return "Catcher/pitcher conflict today";
    if (block?.code === "continuous_days") return "Recovery day needed";
    return block ? block.message : "Hold from throwing today";
  }
  const warn = flags.find((f) => f.severity === "warn");
  return warn ? `Manage volume — ${warn.message}` : "Manage volume today";
}

function buildParentSummary(
  status: LoadStatus,
  flags: LoadFlag[],
  name: string,
  nextDate: string,
  today: Date,
): string {
  if (status === "green") {
    return `${name}'s arm is fresh and ready. No rest needed right now — we'll keep an eye on the weekly throwing load.`;
  }
  if (status === "red") {
    const block = flags.find((f) => f.severity === "block");
    if (block?.code === "sore_arm") {
      return `${name} reported some arm soreness, so we're resting from throwing today. Protecting young arms always comes first.`;
    }
    if (block?.code === "catcher_pitcher_conflict") {
      return `${name} is set to catch a lot today, so we won't also pitch — combining both in one day is too much throwing for a young arm.`;
    }
    const restNote =
      daysBetween(today, dayStart(nextDate)) > 0
        ? ` Back to pitching on ${friendlyDate(nextDate)}.`
        : "";
    return `${name} is resting the throwing arm today — that planned rest is exactly what keeps young pitchers healthy.${restNote}`;
  }
  return `${name} can throw today, but we're keeping the volume light to stay ahead of the weekly throwing load. Smart and steady.`;
}

function friendlyDate(iso: string): string {
  return dayStart(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Human label for a flag code (badge / summary use). */
export const LOAD_FLAG_LABEL: Record<LoadFlagCode, string> = {
  rest_owed: "Rest owed",
  no_bullpen: "No bullpen",
  catcher_pitcher_conflict: "Catcher/pitcher conflict",
  sore_arm: "Arm soreness",
  over_daily_max: "Over daily max",
  rolling_week_high: "High weekly load",
  acute_spike: "Workload spike",
  continuous_days: "Continuous throwing",
  multi_team: "Multi-team load",
};

/** Tailwind badge class for a status (matches the app's badge system). */
export function loadStatusBadgeClass(status: LoadStatus): string {
  return status === "green" ? "badge-ok" : status === "yellow" ? "badge-warn" : "badge-danger";
}

export const LOAD_STATUS_LABEL: Record<LoadStatus, string> = {
  green: "Fresh",
  yellow: "Manage",
  red: "Rest",
};
