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
  /**
   * Multiplier on the position-variety reward — how strongly the allocator
   * avoids repeating a player at the same position. Default 1. Game modes tune
   * this: Development/Tryout raise it (spread reps around the diamond),
   * Competitive lowers it (keep strong players at their best spots). See
   * `LineupMode` / `lineupModeParams`.
   */
  varietyWeight?: number;
};

export type AutoLineupResult = {
  innings: Inning[];
  warnings: string[];
};

/**
 * Named lineup game modes (the §5 "what kind of game is this?" selector). Each
 * mode is a tuning of the same allocator — a `competitiveWeight` (fairness↔skill)
 * plus a `varietyWeight` (how aggressively to rotate positions). Modes never
 * weaken safety: arm-care still flows through `pitcherUnavailable` + league
 * rules regardless of mode.
 */
export type LineupMode = "recFair" | "development" | "competitive" | "tournament" | "tryout";

export interface LineupModeSpec {
  id: LineupMode;
  label: string;
  blurb: string;
  /** 0 = pure fairness … 1 = pure skill. */
  competitiveWeight: number;
  /** Position-variety multiplier (1 = default). */
  varietyWeight: number;
  /** One-line coaching note for the UI. */
  note: string;
}

export const LINEUP_MODES: Record<LineupMode, LineupModeSpec> = {
  recFair: {
    id: "recFair",
    label: "Rec / Fair Play",
    blurb: "Equal reps, no parent drama.",
    competitiveWeight: 0,
    varietyWeight: 1,
    note: "Everyone plays close to equal innings and rotates positions.",
  },
  development: {
    id: "development",
    label: "Development",
    blurb: "Get kids reps at new positions.",
    competitiveWeight: 0.15,
    varietyWeight: 2.5,
    note: "Spreads players around the diamond so everyone gets infield + outfield reps.",
  },
  competitive: {
    id: "competitive",
    label: "Competitive",
    blurb: "Stronger lineup, still fair.",
    competitiveWeight: 0.7,
    varietyWeight: 0.6,
    note: "Leans on preferred positions + skill while honoring minimum-play rules.",
  },
  tournament: {
    id: "tournament",
    label: "Tournament",
    blurb: "Manage arms + catcher fatigue.",
    competitiveWeight: 0.6,
    varietyWeight: 0.6,
    note: "Skill-leaning — pair with pitch-rest so tired arms sit (Pitch Smart).",
  },
  tryout: {
    id: "tryout",
    label: "Tryout / Eval",
    blurb: "Maximize evaluation touches.",
    competitiveWeight: 0,
    varietyWeight: 3,
    note: "Rotates every player through as many positions as possible to evaluate them.",
  },
};

export const LINEUP_MODE_ORDER: LineupMode[] = [
  "recFair",
  "development",
  "competitive",
  "tournament",
  "tryout",
];

/** The autoLineup tuning for a mode (spread into an `AutoLineupInput`). */
export function lineupModeParams(
  mode: LineupMode,
): Pick<AutoLineupInput, "competitiveWeight" | "varietyWeight"> {
  const m = LINEUP_MODES[mode];
  return { competitiveWeight: m.competitiveWeight, varietyWeight: m.varietyWeight };
}

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
  const varietyWeight = Math.max(0, input.varietyWeight ?? 1);
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
          // position so far. `varietyWeight` (game modes) scales the variety
          // term: higher spreads players across positions more aggressively.
          const fairField = -((fieldCount[p.id] ?? 0) * 6);
          const fairVariety = -(((posCount[p.id] ?? {})[pos] ?? 0) * 4 * varietyWeight);
          const fair = fairField + fairVariety;
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
