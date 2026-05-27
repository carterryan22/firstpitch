/**
 * Lineup auto-generation.
 *
 * Greedy, fairness-aware allocator. For each inning we fill the 9 field
 * positions then put remaining players on the bench ("BN"). We try to:
 *
 * - Skip injured players and absent players entirely.
 * - Never assign someone to a position they have rated as "avoid".
 * - Honor `canPitch` and `canCatch` flags (no one pitches/catches without
 *   the flag).
 * - Prefer "preferred" then "ok" then unrated positions.
 * - Balance field innings across the roster (bench rotation).
 * - Avoid back-to-back pitching innings for the same player.
 *
 * Returns the lineup array (one entry per inning) plus warnings the UI can
 * surface (e.g. "no eligible pitcher for inning 3").
 */

export const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"] as const;
export type Position = (typeof POSITIONS)[number];
export type Slot = Position | "BN";
export type Rating = "preferred" | "ok" | "avoid";

export type LineupPlayer = {
  id: string;
  canPitch?: boolean;
  canCatch?: boolean;
  injured?: boolean;
  positionRatings?: Partial<Record<Position, Rating>>;
};

export type Inning = Record<string, Slot>; // playerId -> slot

export type AutoLineupInput = {
  innings: number;
  players: LineupPlayer[];
  /** Player ids marked present. If omitted, all non-injured players are used. */
  present?: string[];
};

export type AutoLineupResult = {
  innings: Inning[];
  warnings: string[];
};

function ratingScore(p: LineupPlayer, pos: Position): number {
  const r = p.positionRatings?.[pos];
  if (r === "preferred") return 3;
  if (r === "ok") return 2;
  if (r === undefined) return 1;
  return -1; // avoid
}

function eligible(p: LineupPlayer, pos: Position): boolean {
  if (pos === "P" && !p.canPitch) return false;
  if (pos === "C" && !p.canCatch) return false;
  return ratingScore(p, pos) >= 0;
}

export function autoLineup(input: AutoLineupInput): AutoLineupResult {
  const warnings: string[] = [];
  const active = input.players.filter((p) => {
    if (p.injured) return false;
    if (input.present && !input.present.includes(p.id)) return false;
    return true;
  });
  if (active.length === 0) {
    return { innings: Array.from({ length: input.innings }, () => ({})), warnings: ["No active players."] };
  }

  // Fairness state: how many field innings has each player gotten, how many bench
  // innings, who pitched the previous inning.
  const fieldCount: Record<string, number> = {};
  const benchCount: Record<string, number> = {};
  const posCount: Record<string, Partial<Record<Position, number>>> = {};
  for (const p of active) {
    fieldCount[p.id] = 0;
    benchCount[p.id] = 0;
    posCount[p.id] = {};
  }
  let prevPitcher: string | null = null;

  const innings: Inning[] = [];
  for (let i = 0; i < input.innings; i++) {
    const inning: Inning = {};
    const used = new Set<string>();

    for (const pos of POSITIONS) {
      const candidates = active
        .filter((p) => !used.has(p.id) && eligible(p, pos))
        .filter((p) => !(pos === "P" && prevPitcher === p.id))
        .map((p) => ({
          p,
          // Higher = better. We want preferred + low past field count + low
          // count at this specific position (variety).
          score:
            ratingScore(p, pos) * 10 -
            (fieldCount[p.id] ?? 0) * 2 -
            ((posCount[p.id] ?? {})[pos] ?? 0) * 3 +
            // tiebreak by deterministic id hash
            (hash(p.id) % 7) * 0.01,
        }))
        .sort((a, b) => b.score - a.score);

      if (candidates.length === 0) {
        warnings.push(`Inning ${i + 1}: no eligible player for ${pos}`);
        continue;
      }
      const pick = candidates[0]!.p;
      inning[pick.id] = pos;
      used.add(pick.id);
      fieldCount[pick.id] = (fieldCount[pick.id] ?? 0) + 1;
      const pc = posCount[pick.id] ?? {};
      pc[pos] = (pc[pos] ?? 0) + 1;
      posCount[pick.id] = pc;
      if (pos === "P") prevPitcher = pick.id;
    }

    // Bench remaining active players, sorted so those with fewest bench
    // innings so far get the bench next time too only if everyone else has
    // had at least as many — i.e. just record it.
    for (const p of active) {
      if (!used.has(p.id)) {
        inning[p.id] = "BN";
        benchCount[p.id] = (benchCount[p.id] ?? 0) + 1;
      }
    }
    innings.push(inning);
  }

  return { innings, warnings };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Summary stats for the fairness page. */
export type FairnessRow = {
  playerId: string;
  fieldInnings: number;
  benchInnings: number;
  pitchInnings: number;
  catchInnings: number;
  positions: Partial<Record<Position, number>>;
};

export function summarize(innings: Inning[], playerIds: string[]): FairnessRow[] {
  return playerIds.map((id) => {
    const row: FairnessRow = {
      playerId: id,
      fieldInnings: 0,
      benchInnings: 0,
      pitchInnings: 0,
      catchInnings: 0,
      positions: {},
    };
    for (const inn of innings) {
      const slot = inn[id];
      if (!slot) continue;
      if (slot === "BN") {
        row.benchInnings += 1;
      } else {
        row.fieldInnings += 1;
        row.positions[slot] = (row.positions[slot] ?? 0) + 1;
        if (slot === "P") row.pitchInnings += 1;
        if (slot === "C") row.catchInnings += 1;
      }
    }
    return row;
  });
}
