/**
 * League-rule constraints for lineup generation.
 *
 * Distilled from the four highest-signal Dugout Edge feature requests still
 * unmet on their `/feature-requests` board (Coaches DJ, Phillip, Ryan, Josh),
 * generalised into a declarative rule shape we can both validate against and
 * feed into `autoLineup` as soft constraints.
 *
 * - DJ:      Minimum playing time + infield-by-inning N + no-consecutive-sits.
 * - Phillip: Position-pair locks (lock a tandem like P+C, shuffle the rest).
 * - Ryan:    No two innings in a row in the outfield.
 * - Josh:    Pair a pitcher's bench-inning with the inning before they pitch
 *            (so they can warm up).
 */

import type { Inning, Position, Slot } from "./index";

export const OUTFIELD_POSITIONS: ReadonlySet<Position> = new Set(["LF", "CF", "RF", "RV"]);
export const INFIELD_POSITIONS: ReadonlySet<Position> = new Set(["P", "C", "1B", "2B", "3B", "SS"]);

/** A tandem-lock: when one player is at `a`, another is at `b` for the same innings. */
export interface PositionPairLock {
  playerA: string;
  positionA: Position;
  playerB: string;
  positionB: Position;
  /** Innings (0-indexed) the lock applies to. Empty array = all innings. */
  innings?: number[];
}

export interface LeagueRules {
  /** DJ: each present player must get at least this many defensive innings. */
  minFieldInnings?: number;
  /** DJ: each player must have had ≥1 infield inning *by* this inning index (1-based count). */
  infieldRequiredByInning?: number;
  /** DJ: no player may sit on the bench more than this many innings in a row. */
  maxConsecutiveBench?: number;
  /** Ryan: no player may be in the outfield more than this many innings in a row. */
  maxConsecutiveOutfield?: number;
  /**
   * Josh: a player pitching in inning N should be on the bench in inning N-1
   * to warm up. (Generator tries; validator confirms.)
   */
  pitcherBenchInningBefore?: boolean;
  /** Phillip: tandem position locks. Honored by `autoLineup` if passed in. */
  pairedPositions?: PositionPairLock[];
}

/** A reasonable, league-rec default set. */
export function defaultLeagueRules(): LeagueRules {
  return {
    minFieldInnings: 2,
    infieldRequiredByInning: 4,
    maxConsecutiveBench: 1,
    maxConsecutiveOutfield: 2,
    pitcherBenchInningBefore: true,
    pairedPositions: [],
  };
}

export interface LineupViolation {
  rule:
    | "minFieldInnings"
    | "infieldRequiredByInning"
    | "maxConsecutiveBench"
    | "maxConsecutiveOutfield"
    | "pitcherBenchInningBefore"
    | "pairedPositions";
  playerId?: string;
  inning?: number; // 0-indexed
  message: string;
}

/** Pure validator. Returns one entry per violation; empty array == compliant. */
export function validateLineup(
  innings: Inning[],
  rules: LeagueRules,
  presentPlayerIds: string[]
): LineupViolation[] {
  const out: LineupViolation[] = [];
  const playerIds = presentPlayerIds.filter((id) =>
    innings.some((inn) => inn[id] !== undefined)
  );

  // Pre-compute slot per inning per player.
  const slotAt: Record<string, Array<Slot | undefined>> = {};
  for (const id of playerIds) {
    slotAt[id] = innings.map((inn) => inn[id]);
  }

  for (const id of playerIds) {
    const slots = slotAt[id]!;

    // minFieldInnings (DJ)
    if (rules.minFieldInnings !== undefined) {
      const field = slots.filter((s) => s && s !== "BN").length;
      if (field < rules.minFieldInnings) {
        out.push({
          rule: "minFieldInnings",
          playerId: id,
          message: `${id} has ${field} defensive innings, league minimum is ${rules.minFieldInnings}.`,
        });
      }
    }

    // infieldRequiredByInning (DJ)
    if (rules.infieldRequiredByInning !== undefined) {
      const cutoff = Math.min(rules.infieldRequiredByInning, slots.length);
      const hasInfield = slots
        .slice(0, cutoff)
        .some((s) => s && s !== "BN" && INFIELD_POSITIONS.has(s as Position));
      if (!hasInfield && slots.slice(0, cutoff).some(Boolean)) {
        out.push({
          rule: "infieldRequiredByInning",
          playerId: id,
          inning: cutoff - 1,
          message: `${id} has no infield inning by inning ${cutoff}.`,
        });
      }
    }

    // maxConsecutiveBench (DJ)
    if (rules.maxConsecutiveBench !== undefined) {
      let run = 0;
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] === "BN") {
          run += 1;
          if (run > rules.maxConsecutiveBench) {
            out.push({
              rule: "maxConsecutiveBench",
              playerId: id,
              inning: i,
              message: `${id} benched ${run} innings in a row at inning ${i + 1} (max ${rules.maxConsecutiveBench}).`,
            });
            break; // one per player is enough
          }
        } else if (slots[i]) {
          run = 0;
        }
      }
    }

    // maxConsecutiveOutfield (Ryan)
    if (rules.maxConsecutiveOutfield !== undefined) {
      let run = 0;
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        if (s && s !== "BN" && OUTFIELD_POSITIONS.has(s as Position)) {
          run += 1;
          if (run > rules.maxConsecutiveOutfield) {
            out.push({
              rule: "maxConsecutiveOutfield",
              playerId: id,
              inning: i,
              message: `${id} in outfield ${run} innings in a row at inning ${i + 1} (max ${rules.maxConsecutiveOutfield}).`,
            });
            break;
          }
        } else if (s) {
          run = 0;
        }
      }
    }

    // pitcherBenchInningBefore (Josh)
    if (rules.pitcherBenchInningBefore) {
      for (let i = 1; i < slots.length; i++) {
        if (slots[i] === "P" && slots[i - 1] !== "BN" && slots[i - 1] !== undefined) {
          out.push({
            rule: "pitcherBenchInningBefore",
            playerId: id,
            inning: i,
            message: `${id} pitches inning ${i + 1} but wasn't benched in inning ${i} (no warmup window).`,
          });
        }
      }
    }
  }

  // pairedPositions (Phillip): both halves of the tandem are present on the
  // declared innings (or all innings if `innings` is omitted).
  if (rules.pairedPositions?.length) {
    for (const pair of rules.pairedPositions) {
      const target = pair.innings && pair.innings.length > 0
        ? pair.innings
        : innings.map((_, i) => i);
      for (const i of target) {
        const inn = innings[i];
        if (!inn) continue;
        const aOk = inn[pair.playerA] === pair.positionA;
        const bOk = inn[pair.playerB] === pair.positionB;
        if (!aOk || !bOk) {
          out.push({
            rule: "pairedPositions",
            inning: i,
            message: `Pair lock broken inning ${i + 1}: expected ${pair.playerA}@${pair.positionA} + ${pair.playerB}@${pair.positionB}, got ${pair.playerA}@${inn[pair.playerA] ?? "—"} + ${pair.playerB}@${inn[pair.playerB] ?? "—"}.`,
          });
        }
      }
    }
  }

  return out;
}

/**
 * Convert a `LeagueRules.pairedPositions` set into the `LockMap` shape that
 * `autoLineup` already consumes, so existing lock plumbing enforces tandems.
 */
export function pairLocksToLockMap(
  pairs: PositionPairLock[],
  innings: number
): Array<Record<string, Slot>> {
  const locks: Array<Record<string, Slot>> = Array.from({ length: innings }, () => ({}));
  for (const pair of pairs) {
    const target = pair.innings && pair.innings.length > 0
      ? pair.innings
      : Array.from({ length: innings }, (_, i) => i);
    for (const i of target) {
      if (i < 0 || i >= innings) continue;
      locks[i]![pair.playerA] = pair.positionA;
      locks[i]![pair.playerB] = pair.positionB;
    }
  }
  return locks;
}

/** Merge two LockMaps (later wins on conflict). */
export function mergeLockMaps(
  a: Array<Record<string, Slot>> | undefined,
  b: Array<Record<string, Slot>>
): Array<Record<string, Slot>> {
  if (!a) return b;
  const len = Math.max(a.length, b.length);
  const out: Array<Record<string, Slot>> = [];
  for (let i = 0; i < len; i++) {
    out.push({ ...(a[i] ?? {}), ...(b[i] ?? {}) });
  }
  return out;
}

