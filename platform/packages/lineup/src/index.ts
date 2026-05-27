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
/** Extra position used in Standard 10 ("Rover" / 4th outfielder). */
export const EXTRA_POSITIONS = ["RV"] as const;
export type Position = (typeof POSITIONS)[number] | (typeof EXTRA_POSITIONS)[number];
export type Slot = Position | "BN";
export type Rating = "preferred" | "ok" | "avoid";

/** Defensive presets matching the Dugout Edge / common youth IA. */
export type DefensivePreset = "standard9" | "standard10" | "coachPitch";
export const PRESET_POSITIONS: Record<DefensivePreset, Position[]> = {
  // Standard 9 — full diamond.
  standard9: ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"],
  // Standard 10 — 4 outfielders ("rover"). Same engine, one extra slot.
  standard10: ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "RV"],
  // Coach pitch — no pitcher / catcher; pitcher position covered by coach.
  coachPitch: ["1B", "2B", "3B", "SS", "LF", "CF", "RF"],
};

export type LineupPlayer = {
  id: string;
  canPitch?: boolean;
  canCatch?: boolean;
  injured?: boolean;
  /** Batting / skill rating used by competitive weighting (1-5). Optional. */
  battingSkill?: number;
  positionRatings?: Partial<Record<Position, Rating>>;
};

export type Inning = Record<string, Slot>; // playerId -> slot

/** Map of inningIdx -> playerId -> slot for pinned cells that must not move. */
export type LockMap = Array<Record<string, Slot>>;

export type AutoLineupInput = {
  innings: number;
  players: LineupPlayer[];
  /** Player ids marked present. If omitted, all non-injured players are used. */
  present?: string[];
  /** Defensive preset (default standard9). */
  preset?: DefensivePreset;
  /** Override of positions to fill; takes precedence over preset. */
  positions?: Position[];
  /** Cells the generator must preserve. */
  locks?: LockMap;
  /**
   * 0 = pure fairness (equal innings + variety), 1 = pure skill (preferred
   * positions + high battingSkill weighted toward premium spots). Default 0.3.
   */
  competitiveWeight?: number;
  /**
   * Player ids that must NOT be assigned to pitcher this game (e.g. because
   * they're on Pitch Smart required rest from a prior outing). The caller
   * computes this from recent pitch history + age band.
   */
  pitcherUnavailable?: string[];
  /**
   * Optional league rules applied as soft constraints during generation and
   * available as a validator after. See `leagueRules.ts`.
   */
  leagueRules?: import("./leagueRules").LeagueRules;
  /**
   * Optional deterministic seed. When set, repeated `autoLineup` calls with
   * the same input produce the same lineup — useful for "Shuffle" UX so
   * unrelated cells don't churn between runs. Default omitted (mild jitter
   * derived from player ids only).
   */
  seed?: number;
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

/** Positions considered "premium" for skill-weighted assignment. */
const PREMIUM_POSITIONS: ReadonlySet<Position> = new Set(["P", "C", "SS", "CF"]);
const OUTFIELD: ReadonlySet<Position> = new Set(["LF", "CF", "RF", "RV"]);

export function autoLineup(input: AutoLineupInput): AutoLineupResult {
  const warnings: string[] = [];
  const positions: Position[] =
    input.positions ?? PRESET_POSITIONS[input.preset ?? "standard9"];
  const competitiveWeight = Math.max(0, Math.min(1, input.competitiveWeight ?? 0.3));
  const fairnessWeight = 1 - competitiveWeight;
  const pitcherBlocked = new Set(input.pitcherUnavailable ?? []);
  // Deterministic tie-breaker. Defaults to 0 when no seed provided, which
  // (combined with the player-id hash) is stable across runs.
  const rng = mulberry32((input.seed ?? 0) >>> 0);
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
  // Per-player run-length state for league-rule soft constraints.
  const ofRun: Record<string, number> = {};
  const benchRun: Record<string, number> = {};
  for (const p of active) {
    fieldCount[p.id] = 0;
    benchCount[p.id] = 0;
    posCount[p.id] = {};
    ofRun[p.id] = 0;
    benchRun[p.id] = 0;
  }
  let prevPitcher: string | null = null;
  const rules = input.leagueRules;

  const innings: Inning[] = [];
  for (let i = 0; i < input.innings; i++) {
    const inning: Inning = {};
    const used = new Set<string>();

    // First, honor locks for this inning. Pinned cells stick exactly.
    const lockedThisInning = input.locks?.[i] ?? {};
    for (const [pid, slot] of Object.entries(lockedThisInning)) {
      if (!active.some((p) => p.id === pid)) continue; // skip absent / injured
      inning[pid] = slot;
      used.add(pid);
      if (slot !== "BN") {
        fieldCount[pid] = (fieldCount[pid] ?? 0) + 1;
        if (slot !== "RV") {
          const pc = posCount[pid] ?? {};
          pc[slot] = (pc[slot] ?? 0) + 1;
          posCount[pid] = pc;
        }
        if (slot === "P") prevPitcher = pid;
      } else {
        benchCount[pid] = (benchCount[pid] ?? 0) + 1;
      }
    }

    for (const pos of positions) {
      // Skip if a locked cell already filled this position for this inning.
      const alreadyFilled = Object.values(inning).some((s) => s === pos);
      if (alreadyFilled) continue;

      const baseEligible = active
        .filter((p) => !used.has(p.id) && eligible(p, pos))
        .filter((p) => !(pos === "P" && pitcherBlocked.has(p.id)));
      // Prefer to honor the no-back-to-back-pitcher rule, but fall back to
      // allowing the same pitcher again rather than leaving the slot empty.
      let pool = baseEligible.filter((p) => !(pos === "P" && prevPitcher === p.id));
      if (pool.length === 0) pool = baseEligible;

      // League-rule hard filters (with fallback to the unfiltered pool so we
      // never leave a slot empty just to honor a soft rule).
      if (rules?.maxConsecutiveOutfield !== undefined && OUTFIELD.has(pos)) {
        const cap = rules.maxConsecutiveOutfield;
        const strict = pool.filter((p) => (ofRun[p.id] ?? 0) < cap);
        if (strict.length > 0) pool = strict;
      }

      const candidates = pool
        .map((p) => {
          const rating = ratingScore(p, pos); // -1..3
          const skill = (p.battingSkill ?? 3) - 3; // -2..+2
          const premium = PREMIUM_POSITIONS.has(pos) ? 1 : 0;
          // Skill score rewards: preferred positions, higher batting skill at
          // premium spots.
          const skillScore = rating * 10 + skill * premium * 4;
          // Fairness score rewards low past field count + variety at this
          // position so far.
          const fair = -((fieldCount[p.id] ?? 0) * 6) - ((posCount[p.id] ?? {})[pos] ?? 0) * 4;
          // League-rule soft penalty: Ryan — don't exceed maxConsecutiveOutfield.
          let rulePenalty = 0;
          if (rules?.maxConsecutiveOutfield !== undefined && OUTFIELD.has(pos)) {
            if ((ofRun[p.id] ?? 0) >= rules.maxConsecutiveOutfield) rulePenalty -= 50;
          }
          return {
            p,
            score:
              skillScore * competitiveWeight +
              fair * fairnessWeight +
              rulePenalty +
              (hash(p.id) % 7) * 0.01 +
              rng() * 0.001,
          };
        })
        .sort((a, b) => b.score - a.score);

      if (candidates.length === 0) {
        warnings.push(`Inning ${i + 1}: no eligible player for ${pos}`);
        continue;
      }
      const pick = candidates[0]!.p;
      inning[pick.id] = pos;
      used.add(pick.id);
      fieldCount[pick.id] = (fieldCount[pick.id] ?? 0) + 1;
      if (pos !== "RV") {
        const pc = posCount[pick.id] ?? {};
        pc[pos] = (pc[pos] ?? 0) + 1;
        posCount[pick.id] = pc;
      }
      if (pos === "P") prevPitcher = pick.id;
    }

    // Bench remaining active players that aren't already locked into a slot.
    for (const p of active) {
      if (!used.has(p.id)) {
        inning[p.id] = "BN";
        benchCount[p.id] = (benchCount[p.id] ?? 0) + 1;
      }
    }

    // Update run-length counters for league-rule soft constraints.
    for (const p of active) {
      const slot = inning[p.id];
      if (slot && slot !== "BN" && OUTFIELD.has(slot as Position)) {
        ofRun[p.id] = (ofRun[p.id] ?? 0) + 1;
      } else {
        ofRun[p.id] = 0;
      }
      if (slot === "BN") benchRun[p.id] = (benchRun[p.id] ?? 0) + 1;
      else benchRun[p.id] = 0;
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

/** Mulberry32 — tiny deterministic PRNG used as a stable tie-breaker. */
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

/**
 * Convenience: derive a `LockMap` from an existing lineup and a Set of
 * `"<inningIdx>:<playerId>"` keys representing the locked cells.
 */
export function buildLocks(lineup: Inning[], lockedKeys: Set<string>): LockMap {
  return lineup.map((inn, i) => {
    const out: Record<string, Slot> = {};
    for (const [pid, slot] of Object.entries(inn)) {
      if (lockedKeys.has(`${i}:${pid}`)) out[pid] = slot;
    }
    return out;
  });
}

/**
 * Re-run `autoLineup` while preserving locked cells. Locked cells are derived
 * from the provided `(inningIdx,playerId)` key set on the prior lineup.
 */
export function shuffleNonLocked(
  prior: Inning[],
  lockedKeys: Set<string>,
  base: Omit<AutoLineupInput, "locks">,
): AutoLineupResult {
  return autoLineup({ ...base, locks: buildLocks(prior, lockedKeys) });
}

/** CSV export of a lineup (one row per player, one column per inning). */
export function toCsv(
  lineup: Inning[],
  roster: Array<{ id: string; name: string; jerseyNumber?: string }>,
): string {
  const header = ["Player", "Jersey", ...lineup.map((_, i) => `Inn ${i + 1}`)];
  const rows = roster.map((p) => {
    const cells = lineup.map((inn) => inn[p.id] ?? "");
    return [escape(p.name), escape(p.jerseyNumber ?? ""), ...cells.map(escape)];
  });
  return [header, ...rows].map((r) => r.join(",")).join("\n");
}

function escape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export * from "./leagueRules";
export * from "./explain";
