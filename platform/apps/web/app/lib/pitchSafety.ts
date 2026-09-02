import { canPitchToday } from "@platform/safety";
import type { GameRecord, PitchEntry, PlayerRecord, ThrowingLogRecord } from "@platform/storage";
import { ageFromDob } from "./players";
import { playerThrowingEvents } from "./throwingEvents";

const AGE_FROM_BAND: Record<PlayerRecord["ageBand"], number> = {
  "6-8": 7,
  "9-12": 11,
  "13-15": 14,
  "16+": 16,
};

export interface LivePitchSafety {
  playerId: string;
  allowed: boolean;
  remainingPitches: number;
  dailyMax: number;
  todayCount: number;
  requiredRestDaysRemaining: number;
  reasons: string[];
  warnings: string[];
}

function dayKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function continuousThrowingDaysBefore(events: ReturnType<typeof playerThrowingEvents>, date: Date): number {
  const activeDays = new Set(
    events
      .filter((event) => (event.pitches ?? 0) > 0 || (event.throws ?? 0) > 0 || (event.catcherInnings ?? 0) > 0)
      .map((event) => event.date),
  );
  let days = 0;
  const cursor = new Date(`${dayKey(date)}T00:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (activeDays.has(dayKey(cursor))) {
    days += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return days;
}

/** Build the live, player-level Pitch Smart state from every recorded throwing source. */
export function livePitchSafety(
  players: PlayerRecord[],
  games: GameRecord[],
  logs: ThrowingLogRecord[],
  date: Date,
): Record<string, LivePitchSafety> {
  const today = dayKey(date);
  const result: Record<string, LivePitchSafety> = {};

  for (const player of players) {
    const events = playerThrowingEvents(player.id, games, logs);
    const outingsByDate: Record<string, number> = {};
    let todayCount = 0;
    let todayCatchingInnings = 0;
    let soreToday = false;

    for (const event of events) {
      if (event.date === today) {
        if (event.activity === "game" || event.activity === "bullpen") todayCount += event.pitches ?? 0;
        todayCatchingInnings += event.catcherInnings ?? 0;
      } else if (event.date < today && (event.activity === "game" || event.activity === "bullpen")) {
        outingsByDate[event.date] = (outingsByDate[event.date] ?? 0) + (event.pitches ?? 0);
      }
    }
    soreToday = logs.some((log) => log.playerId === player.id && log.date === today && (log.soreness1to10 ?? 0) > 0);

    const age = player.dob ? ageFromDob(player.dob, date) : AGE_FROM_BAND[player.ageBand];
    const check = canPitchToday({
      age,
      date: new Date(`${today}T00:00:00Z`),
      plannedPitches: 1,
      history: {
        outingsByDate,
        todayCount,
        soreToday,
        todayCatchingInnings,
        continuousThrowingDays: continuousThrowingDaysBefore(events, date),
      },
    });
    const reasons = [...check.reasons];
    if (!player.canPitch) reasons.unshift("Player is not marked eligible to pitch.");
    if (player.injured) reasons.unshift("Player is marked injured and cannot pitch.");
    result[player.id] = {
      playerId: player.id,
      allowed: check.allowed && player.canPitch === true && !player.injured,
      remainingPitches: Math.max(0, check.effectiveDailyMax - todayCount),
      dailyMax: check.effectiveDailyMax,
      todayCount,
      requiredRestDaysRemaining: check.requiredRestDaysRemaining,
      reasons,
      warnings: check.warnings,
    };
  }
  return result;
}

export function validatePitchCountChange(
  existing: Record<string, PitchEntry>,
  requested: Record<string, PitchEntry>,
  safety: Record<string, LivePitchSafety>,
): string | null {
  for (const [playerId, entry] of Object.entries(requested)) {
    if (!safety[playerId]) return "Pitch counts may only be recorded for players on this team.";
    if (!Number.isInteger(entry?.pitches) || entry.pitches < 0 || entry.pitches > 250) {
      return "Pitch count must be a whole number between 0 and 250.";
    }
    if (!Number.isFinite(entry.innings) || entry.innings < 0 || entry.innings > 15) {
      return "Pitching innings must be between 0 and 15.";
    }
    const added = entry.pitches - (existing[playerId]?.pitches ?? 0);
    if (added > 0) {
      const state = safety[playerId];
      if (!state.allowed) return state.reasons[0] ?? "Pitch Smart blocks this player from pitching today.";
      if (added > state.remainingPitches) {
        return `Only ${state.remainingPitches} pitches remain before this player's daily max of ${state.dailyMax}.`;
      }
    }
  }
  return null;
}
