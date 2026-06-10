import type { GameRecord, ThrowingLogRecord } from "@platform/storage";
import type { ThrowingEvent } from "@platform/safety";

/**
 * Merge every throwing source for one player into the Pitch Load Passport's
 * event shape: game pitch counts, catcher innings derived from the defensive
 * grid, and any logged non-game throwing (bullpens, long toss, lessons,
 * practice). Game pitches and catcher innings are emitted as separate events so
 * the engine can weight them independently.
 */
export function playerThrowingEvents(
  playerId: string,
  games: GameRecord[],
  logs: ThrowingLogRecord[],
): ThrowingEvent[] {
  const events: ThrowingEvent[] = [];

  for (const g of games) {
    const day = (g.startsAt ?? "").slice(0, 10);
    if (!day) continue;

    const entry = g.pitchCounts?.[playerId];
    if (entry?.pitches) {
      events.push({ date: day, activity: "game", pitches: entry.pitches });
    }

    if (Array.isArray(g.lineup)) {
      let catcherInnings = 0;
      for (const inning of g.lineup) {
        if (inning && inning[playerId] === "C") catcherInnings += 1;
      }
      if (catcherInnings > 0) {
        events.push({ date: day, activity: "game", catcherInnings });
      }
    }
  }

  for (const l of logs) {
    if (l.playerId !== playerId) continue;
    events.push({
      date: l.date,
      activity: l.activity,
      pitches: l.pitches,
      throws: l.throws,
      catcherInnings: l.catcherInnings,
      intensity: l.intensity,
      external: l.external,
    });
  }

  return events;
}

/** Mound-pitch outings keyed by day (games + bullpens) for the Pitch Smart rest tables. */
export function outingsFromEvents(events: ThrowingEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) {
    if ((e.activity === "game" || e.activity === "bullpen") && e.pitches) {
      out[e.date] = (out[e.date] ?? 0) + e.pitches;
    }
  }
  return out;
}
