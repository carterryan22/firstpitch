/**
 * Monthly parent report builder — the system DRAFT behind the
 * review → edit → approve → share lifecycle (gap #5 of the product thesis).
 *
 * Pure + deterministic: takes already-fetched records for one player + the
 * month window, returns a parent-safe `ParentReportContent` DRAFT. The coach
 * reviews and may edit every field before approving/sharing; nothing here is
 * ever shown to a parent until a coach explicitly shares the record.
 *
 * Parent-safety rules baked in (same as the weekly digest):
 *   - Positive, plain-English narrative. No rankings, no comparisons to
 *     teammates, no raw stat dumps without context, no negative notes.
 *   - A measurable "improvement" line is included ONLY when there's a real
 *     delta (≥2 datapoints with a fresh retest this month) — never faked.
 *   - Safety/rest status leads when arm-care says monitor/rest.
 *
 * Tested under `apps/web/app/lib/monthlyReport.test.ts`.
 */

import type {
  GameRecord,
  MetricEntryRecord,
  MissionAssignmentRecord,
  MissionCompletionRecord,
  ParentReportContent,
  PlanRecord,
  PlayerGameStatsRecord,
  PlayerRecord,
} from "@platform/storage";
import { missionsForAge } from "@platform/missions";
import { buildDevProfile, type DevProfileInput } from "./devProfile";
import { metricByKey } from "./metrics";
import { ageFromDob } from "./players";

type ReportPlayer = Pick<
  PlayerRecord,
  | "id"
  | "firstName"
  | "lastName"
  | "ageBand"
  | "dob"
  | "canPitch"
  | "canCatch"
  | "injured"
  | "injuryNote"
  | "positions"
  | "positionRatings"
>;

export interface MonthlyReportInput {
  player: ReportPlayer;
  /** ISO yyyy-mm-dd, first day of the month. */
  periodStart: string;
  /** ISO yyyy-mm-dd, last day of the month. */
  periodEnd: string;
  /** Human label, e.g. "May 2026". */
  periodLabel: string;
  /** Team games (attendance + playing time + arm load). */
  games: GameRecord[];
  /** Scheduled practices (attendance). */
  plans?: PlanRecord[];
  /** All metric entries for the player (improvement delta). */
  metrics: MetricEntryRecord[];
  /** Per-game box-score stats for the player (Baseball IQ signals). */
  gameStats?: PlayerGameStatsRecord[];
  /** Coach-issued mission assignments (effort). */
  missionAssignments?: MissionAssignmentRecord[];
  /** Logged mission completions (effort fallback). */
  missionCompletions?: MissionCompletionRecord[];
  now?: Date;
}

const FIELD_SLOTS = new Set(["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "RV"]);

const AGE_FROM_BAND: Record<string, number> = {
  "6-8": 7,
  "9-12": 11,
  "13-15": 14,
  "16+": 16,
};

function dayKey(iso: string | undefined): string {
  return (iso ?? "").slice(0, 10);
}

function inWindow(iso: string | undefined, start: string, end: string): boolean {
  const d = dayKey(iso);
  return d !== "" && d >= start && d <= end;
}

function ageForPlayer(player: ReportPlayer, now: Date): number {
  if (player.dob) return ageFromDob(player.dob, now);
  return AGE_FROM_BAND[player.ageBand] ?? 11;
}

/** Round a measurable to a sensible number of decimals for display. */
function fmtValue(value: number, unit: string): string {
  const decimals = unit === "s" || unit === "sec" ? 2 : value < 20 ? 1 : 0;
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;
}

interface AttendanceTally {
  present: number;
  total: number;
}

function tallyAttendance(input: MonthlyReportInput): AttendanceTally {
  const { player, periodStart, periodEnd } = input;
  let present = 0;
  let total = 0;
  for (const g of input.games) {
    if (!inWindow(g.startsAt, periodStart, periodEnd)) continue;
    const mark = g.attendance?.[player.id];
    if (mark === "present") {
      present += 1;
      total += 1;
    } else if (mark === "absent") {
      total += 1;
    }
  }
  for (const p of input.plans ?? []) {
    if (!p.scheduledAt || !inWindow(p.scheduledAt, periodStart, periodEnd)) continue;
    const mark = p.attendance?.[player.id];
    if (mark === "present") {
      present += 1;
      total += 1;
    } else if (mark === "absent") {
      total += 1;
    }
  }
  return { present, total };
}

function attendanceLine(tally: AttendanceTally): string {
  if (tally.total === 0) return "Attendance isn't tracked yet this month. We'll show it here once it is.";
  if (tally.present === tally.total) {
    return `Perfect attendance, made all ${tally.total} team event${tally.total === 1 ? "" : "s"}.`;
  }
  return `Made ${tally.present} of ${tally.total} team events.`;
}

interface PlayingTime {
  innings: number;
  games: number;
  positions: string[];
}

function tallyPlayingTime(input: MonthlyReportInput): PlayingTime {
  const { player, periodStart, periodEnd } = input;
  let innings = 0;
  let games = 0;
  const positions = new Set<string>();
  for (const g of input.games) {
    if (!inWindow(g.startsAt, periodStart, periodEnd)) continue;
    if (!Array.isArray(g.lineup) || g.lineup.length === 0) continue;
    let played = false;
    for (const inning of g.lineup) {
      const slot = inning?.[player.id];
      if (slot && FIELD_SLOTS.has(slot)) {
        innings += 1;
        positions.add(slot === "RV" ? "RF" : slot);
        played = true;
      }
    }
    if (played) games += 1;
  }
  return { innings, games, positions: Array.from(positions) };
}

function playingTimeLine(pt: PlayingTime): string {
  if (pt.games === 0) return "Playing time will appear here once game lineups are saved.";
  const posPart =
    pt.positions.length > 0
      ? `, seeing time at ${pt.positions.slice(0, 4).join(", ")}`
      : "";
  return `Played about ${pt.innings} inning${pt.innings === 1 ? "" : "s"} across ${pt.games} game${pt.games === 1 ? "" : "s"}${posPart}.`;
}

/**
 * Best measurable improvement: a metric with ≥2 datapoints whose most recent
 * reading lands inside the window and improved vs the player's first reading.
 * Returns undefined when there's no honest improvement to report.
 */
function improvementLine(input: MonthlyReportInput): string | undefined {
  const { metrics, periodStart, periodEnd } = input;
  const byKey = new Map<string, MetricEntryRecord[]>();
  for (const e of metrics) {
    const list = byKey.get(e.metricKey) ?? [];
    list.push(e);
    byKey.set(e.metricKey, list);
  }
  let best: { label: string; from: number; to: number; unit: string; gain: number } | undefined;
  for (const [key, entries] of byKey) {
    if (entries.length < 2) continue;
    const sorted = [...entries].sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : 1));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last) continue;
    // Only count it as "this month's" progress when the latest retest is in-window.
    if (!inWindow(last.recordedAt, periodStart, periodEnd)) continue;
    const def = metricByKey(key);
    if (!def) continue;
    const lower = def.lowerIsBetter === true;
    const improved = lower ? last.value < first.value : last.value > first.value;
    if (!improved) continue;
    const denom = Math.abs(first.value) || 1;
    const gain = Math.abs(last.value - first.value) / denom;
    if (!best || gain > best.gain) {
      best = { label: def.label, from: first.value, to: last.value, unit: def.unit, gain };
    }
  }
  if (!best) return undefined;
  return `${best.label} improved from ${fmtValue(best.from, best.unit)} to ${fmtValue(best.to, best.unit)}.`;
}

function homeMissionLine(input: MonthlyReportInput, now: Date): string {
  const age = ageForPlayer(input.player, now);
  const mission = missionsForAge(age)[0];
  if (!mission) {
    return "Home mission: 10 minutes of catch with a target, three times this week.";
  }
  return `Home mission: ${mission.title}. ${mission.description}`;
}

function effortLine(competeNote: string | undefined, tally: AttendanceTally): string {
  if (competeNote && competeNote.trim()) return competeNote;
  if (tally.total > 0 && tally.present / tally.total >= 0.8) {
    return "Brings consistent energy and competes.";
  }
  return "Effort shows up best in person. Every practice counts.";
}

/**
 * Build the system DRAFT of a monthly parent report. The result is parent-safe
 * but still subject to mandatory coach review/edit/approve before it can be
 * shared.
 */
export function buildMonthlyReport(input: MonthlyReportInput): ParentReportContent {
  const now = input.now ?? new Date();
  const first = input.player.firstName || "Your player";

  const devInput: DevProfileInput = {
    player: input.player,
    metrics: input.metrics,
    gameStats: input.gameStats,
    games: input.games,
    plans: input.plans,
    missionAssignments: input.missionAssignments,
    missionCompletions: input.missionCompletions,
    now,
  };
  const profile = buildDevProfile(devInput);
  const compete = profile.pillars.find((p) => p.pillar === "compete");
  const durability = profile.pillars.find((p) => p.pillar === "durability");

  const tally = tallyAttendance(input);
  const playing = tallyPlayingTime(input);

  // Focus = the single highest-leverage, position-aware action (already voiced).
  const focus =
    profile.recommendation.actions[0] ??
    profile.recommendation.headline ??
    "Keep the reps balanced, fun, and safe.";

  // Safety leads when arm-care flags it; the recommendation already phrases it.
  const safetyNote =
    durability?.readiness === "rest" || durability?.readiness === "monitor"
      ? profile.recommendation.safetyNote ?? durability.note
      : undefined;

  const improvement = improvementLine(input);
  const summary = improvement
    ? `${first} kept building this month. Real, visible progress.`
    : `${first} put in good work this month.`;

  return {
    summary,
    attendance: attendanceLine(tally),
    effort: effortLine(compete?.note, tally),
    improvement,
    focus,
    homeMission: homeMissionLine(input, now),
    playingTime: playingTimeLine(playing),
    coachNote: `${first} is a great teammate and is improving every week. Proud of the effort!`,
    safetyNote,
  };
}

/** A report can only be shared with a non-empty positive coach note. */
export function reportIsShareable(content: ParentReportContent): boolean {
  return typeof content.coachNote === "string" && content.coachNote.trim().length > 0;
}

/** Derived flag: an approved/shared report whose content changed after approval. */
export function isEditedSinceApproval(report: {
  editedAt?: string;
  approvedAt?: string;
}): boolean {
  return Boolean(report.editedAt && report.approvedAt && report.editedAt > report.approvedAt);
}

/** Month window helpers for a given Date (UTC-safe yyyy-mm-dd). */
export function monthWindow(d: Date): { periodStart: string; periodEnd: string; periodLabel: string } {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  const label = start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
    periodLabel: label,
  };
}

/** Previous calendar month relative to `now` — the default report period. */
export function previousMonthWindow(now: Date): { periodStart: string; periodEnd: string; periodLabel: string } {
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return monthWindow(prev);
}
