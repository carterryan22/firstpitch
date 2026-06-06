import { canPitchToday, type CanPitchResult, type PitchHistory } from "@platform/safety";

/**
 * Planning-aware pitching projections layered on top of the Pitch Smart engine.
 *
 * Who's on Second's pitching board is purely *reactive* — it tells a coach who
 * owes rest right now. Because we already carry the schedule, we can answer the
 * question a coach actually asks the night before a game: "who can I pitch on
 * Saturday, and for how many?" These helpers turn the same engine output into a
 * concrete next-available date and a per-game readiness verdict.
 */

export interface NextAvailable {
  /** ISO date (YYYY-MM-DD) the pitcher is next eligible, clamped to today-or-later. */
  date: string;
  /** Whole days from `today`. 0 means available today. */
  inDays: number;
}

/** UTC-midnight Date for an ISO `YYYY-MM-DD` day key. */
function dayStart(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

/**
 * The first day a pitcher clears their rest requirement. On the board the only
 * persisted blocker is rest from a prior outing (soreness / same-day catching
 * are live-game states we don't track here), so `requiredRestDaysRemaining`
 * fully determines the wait.
 */
export function nextAvailableDate(check: CanPitchResult, today: Date): NextAvailable {
  const rest = check.allowed ? 0 : Math.max(0, check.requiredRestDaysRemaining);
  return { date: isoDay(addDays(today, rest)), inDays: rest };
}

export interface GameReadiness {
  /** True if the pitcher will have cleared rest by the game date. */
  ready: boolean;
  /** Pitches they could throw that day under Pitch Smart (0 when not ready). */
  maxPitches: number;
  /** Rest days still owed on the game date (0 when ready). */
  restDaysRemaining: number;
}

/**
 * Projects a pitcher's Pitch Smart eligibility forward to a specific game date,
 * given their outing history. Outings on or after the game date are ignored so
 * the projection reflects what the coach knows today.
 */
export function projectReadinessForGame(input: {
  age: number;
  gameDate: Date;
  outingsByDate: Record<string, number>;
  leagueDailyMax?: number;
}): GameReadiness {
  const gameKey = isoDay(input.gameDate);
  const priorOutings: Record<string, number> = {};
  for (const [day, count] of Object.entries(input.outingsByDate)) {
    if (dayStart(day).getTime() < dayStart(gameKey).getTime()) priorOutings[day] = count;
  }
  const history: PitchHistory = {
    outingsByDate: priorOutings,
    todayCount: 0,
    soreToday: false,
    todayCatchingInnings: 0,
    continuousThrowingDays: 0,
  };
  const check = canPitchToday({
    age: input.age,
    date: dayStart(gameKey),
    plannedPitches: 1,
    history,
    leagueDailyMax: input.leagueDailyMax,
  });
  const ready = check.requiredRestDaysRemaining <= 0;
  return {
    ready,
    maxPitches: ready ? check.effectiveDailyMax : 0,
    restDaysRemaining: Math.max(0, check.requiredRestDaysRemaining),
  };
}
