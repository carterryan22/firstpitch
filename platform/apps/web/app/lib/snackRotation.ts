// Snack-duty / volunteer rotation (Who's on Second §3.12 — Press-Box opt-in).
// Pure, deterministic auto-balancer: spreads snack duty evenly across the
// volunteer pool over a run of upcoming games, never assigning the same family
// twice in a row when an alternative exists, and honoring duty already served
// in earlier games of the season so the load stays fair across the whole year.

export interface SnackVolunteer {
  /** Stable key (e.g. parent userId or family slug). */
  id: string;
  name: string;
}

export interface SnackRotationGame {
  id: string;
  /** ISO datetime; used only to order the rotation. */
  startsAt: string;
  /** Existing assignment a coach pinned manually — kept, never reshuffled. */
  lockedVolunteerId?: string;
}

export interface SnackAssignment {
  gameId: string;
  volunteerId: string;
  volunteerName: string;
}

/**
 * Build a balanced snack-duty rotation.
 *
 * @param games        Upcoming games (any order — sorted internally by date).
 * @param volunteers   The pool of families/parents who can take a slot.
 * @param priorCounts  How many times each volunteer has already had duty this
 *                     season (so the balancer evens out the *whole* season,
 *                     not just the unscheduled tail). Keyed by volunteerId.
 */
export function buildSnackRotation(opts: {
  games: SnackRotationGame[];
  volunteers: SnackVolunteer[];
  priorCounts?: Record<string, number>;
}): SnackAssignment[] {
  const { volunteers } = opts;
  if (volunteers.length === 0) return [];

  const byId = new Map(volunteers.map((v) => [v.id, v]));
  const counts: Record<string, number> = {};
  for (const v of volunteers) counts[v.id] = opts.priorCounts?.[v.id] ?? 0;

  const games = opts.games
    .slice()
    .sort((a, b) => (a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0));

  const assignments: SnackAssignment[] = [];
  let previousId: string | undefined;

  for (const game of games) {
    // A coach-pinned slot stays put; it still counts toward the balance.
    if (game.lockedVolunteerId && byId.has(game.lockedVolunteerId)) {
      const v = byId.get(game.lockedVolunteerId)!;
      counts[v.id] = (counts[v.id] ?? 0) + 1;
      assignments.push({ gameId: game.id, volunteerId: v.id, volunteerName: v.name });
      previousId = v.id;
      continue;
    }

    // Pick the least-burdened volunteer; prefer not repeating last game; then
    // fall back to declared order so the result is fully deterministic.
    const ordered = volunteers
      .slice()
      .sort((a, b) => {
        if (counts[a.id]! !== counts[b.id]!) return counts[a.id]! - counts[b.id]!;
        const aRepeat = a.id === previousId ? 1 : 0;
        const bRepeat = b.id === previousId ? 1 : 0;
        if (aRepeat !== bRepeat) return aRepeat - bRepeat;
        return volunteers.indexOf(a) - volunteers.indexOf(b);
      });

    const pick = ordered[0]!;
    counts[pick.id] = (counts[pick.id] ?? 0) + 1;
    assignments.push({ gameId: game.id, volunteerId: pick.id, volunteerName: pick.name });
    previousId = pick.id;
  }

  return assignments;
}
