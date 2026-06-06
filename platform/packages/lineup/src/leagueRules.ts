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
  /**
   * WoS "Equal bench time": no player sits a second inning until every present
   * player has sat at least once (i.e. bench innings stay within 1 of each
   * other across the roster).
   */
  equalBenchTime?: boolean;
  /**
   * WoS "No consecutive position innings": a player may not play the same
   * defensive position more than this many innings in a row.
   */
  maxConsecutiveSamePosition?: number;
  /** WoS "Minimum infield innings per game": each present player needs ≥ this. */
  minInfieldInnings?: number;
  /** WoS "Minimum outfield innings per game": each present player needs ≥ this. */
  minOutfieldInnings?: number;
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

export type LineupRuleKey =
  | "minFieldInnings"
  | "infieldRequiredByInning"
  | "maxConsecutiveBench"
  | "maxConsecutiveOutfield"
  | "pitcherBenchInningBefore"
  | "pairedPositions"
  | "equalBenchTime"
  | "maxConsecutiveSamePosition"
  | "minInfieldInnings"
  | "minOutfieldInnings";

/**
 * Coach-voice label + origin for each rule, mirroring the Who's on Second
 * Settings UX (§8.2) where every rule shows a plain-English name and an origin
 * badge — `Little League` for governing-body defaults vs `Custom` for the ones
 * we added. Drives the rule-adherence panel so a coach can tell at a glance
 * whether a violation breaks a league mandate or a house preference.
 */
export const LINEUP_RULE_META: Record<
  LineupRuleKey,
  { label: string; description: string; origin: "Little League" | "Custom" }
> = {
  minFieldInnings: {
    label: "Minimum defensive innings",
    description: "Every player must take the field for at least this many innings.",
    origin: "Little League",
  },
  infieldRequiredByInning: {
    label: "Infield by inning",
    description: "Every player must get an infield inning before this inning.",
    origin: "Custom",
  },
  maxConsecutiveBench: {
    label: "No consecutive bench",
    description: "A player cannot sit out two innings in a row.",
    origin: "Custom",
  },
  maxConsecutiveOutfield: {
    label: "No consecutive outfield",
    description: "A player cannot play the outfield too many innings in a row.",
    origin: "Custom",
  },
  pitcherBenchInningBefore: {
    label: "Warm-up before pitching",
    description: "A pitcher sits the inning before they pitch so they can warm up.",
    origin: "Custom",
  },
  pairedPositions: {
    label: "Position pair lock",
    description: "Keep a tandem (e.g. battery) together while the rest shuffles.",
    origin: "Custom",
  },
  equalBenchTime: {
    label: "Equal bench time",
    description: "No player sits out a second inning until every player has sat once.",
    origin: "Custom",
  },
  maxConsecutiveSamePosition: {
    label: "No consecutive position innings",
    description:
      "A player cannot play the same defensive position two innings in a row — encourages rotation.",
    origin: "Custom",
  },
  minInfieldInnings: {
    label: "Minimum infield innings",
    description: "Every player needs at least this many infield innings per game.",
    origin: "Little League",
  },
  minOutfieldInnings: {
    label: "Minimum outfield innings",
    description: "Every player needs at least this many outfield innings per game.",
    origin: "Little League",
  },
};

/**
 * One-tap rule-set presets, mirroring Who's on Second's "Apply rule set" wizard
 * (§2.1, §8.2) where a coach picks a governing body + age band and gets the
 * mandated minimum-play rules in a single action instead of toggling each rule.
 * `rules` is a complete `LeagueRules` value (anything omitted = rule off).
 */
export type RuleSetPresetId =
  | "littleLeague_9_10"
  | "littleLeague_11_12"
  | "calRipken"
  | "recBalanced"
  | "tournament"
  | "none";

export interface RuleSetPreset {
  id: RuleSetPresetId;
  label: string;
  governingBody: string;
  blurb: string;
  rules: LeagueRules;
}

export const RULE_SET_PRESETS: RuleSetPreset[] = [
  {
    id: "littleLeague_9_10",
    label: "Little League — Minors (9-10)",
    governingBody: "Little League",
    blurb: "Mandatory play: every player bats and plays ≥6 defensive outs (2 innings).",
    rules: {
      minFieldInnings: 2,
      maxConsecutiveBench: 1,
      equalBenchTime: true,
      pitcherBenchInningBefore: true,
    },
  },
  {
    id: "littleLeague_11_12",
    label: "Little League — Majors (11-12)",
    governingBody: "Little League",
    blurb: "Minimum play plus infield rotation so every kid sees the dirt.",
    rules: {
      minFieldInnings: 2,
      infieldRequiredByInning: 4,
      minInfieldInnings: 1,
      maxConsecutiveBench: 1,
      equalBenchTime: true,
      pitcherBenchInningBefore: true,
    },
  },
  {
    id: "calRipken",
    label: "Cal Ripken / Babe Ruth",
    governingBody: "Babe Ruth",
    blurb: "Continuous batting order + every player a minimum of 6 defensive outs.",
    rules: {
      minFieldInnings: 2,
      minInfieldInnings: 1,
      maxConsecutiveBench: 1,
      maxConsecutiveOutfield: 2,
      pitcherBenchInningBefore: true,
    },
  },
  {
    id: "recBalanced",
    label: "Rec league — Balanced",
    governingBody: "House",
    blurb: "Maximum fairness: even bench time, infield + outfield reps, full rotation.",
    rules: {
      minFieldInnings: 2,
      minInfieldInnings: 1,
      minOutfieldInnings: 1,
      maxConsecutiveBench: 1,
      maxConsecutiveOutfield: 2,
      maxConsecutiveSamePosition: 2,
      equalBenchTime: true,
      pitcherBenchInningBefore: true,
    },
  },
  {
    id: "tournament",
    label: "Tournament — Competitive",
    governingBody: "House",
    blurb: "Lighter rotation rules for bracket play; keeps pitcher warm-up + arm care.",
    rules: {
      minFieldInnings: 1,
      maxConsecutiveOutfield: 3,
      pitcherBenchInningBefore: true,
    },
  },
  {
    id: "none",
    label: "No preset (custom)",
    governingBody: "Custom",
    blurb: "Start from a blank slate and toggle rules yourself.",
    rules: {},
  },
];

/** Look up a preset by id. */
export function ruleSetPreset(id: RuleSetPresetId): RuleSetPreset | undefined {
  return RULE_SET_PRESETS.find((p) => p.id === id);
}

/**
 * Per-rule value provenance for the Settings surface (WoS §8.2 parity).
 *
 * Given the team's current rule values and the id of the rule-set preset last
 * applied, decide whether each rule's *value* still comes from that governing-body
 * rulebook ("League rule") or has been hand-tuned by the coach ("Custom"):
 *
 * - `preset`  — the rule is active and its value matches the applied preset.
 *               Carries the governing body (e.g. "Little League") for the badge.
 * - `custom`  — the rule is active but no preset is applied, the preset omits it,
 *               or the coach changed it away from the preset value.
 * - `off`     — the rule is not enabled, so provenance doesn't apply.
 */
export type RuleProvenance =
  | { source: "preset"; governingBody: string; presetLabel: string }
  | { source: "custom" }
  | { source: "off" };

/** Is a rule value "on" (enabled)? Mirrors the Settings on/off semantics. */
function ruleIsActive(value: unknown): boolean {
  return value !== undefined && value !== false && value !== 0;
}

export function ruleProvenance(
  key: LineupRuleKey,
  rules: LeagueRules,
  appliedPresetId?: string,
): RuleProvenance {
  const current = (rules as Record<string, unknown>)[key];
  if (!ruleIsActive(current)) return { source: "off" };

  const preset =
    appliedPresetId && appliedPresetId !== "none"
      ? ruleSetPreset(appliedPresetId as RuleSetPresetId)
      : undefined;
  if (!preset) return { source: "custom" };

  const presetValue = (preset.rules as Record<string, unknown>)[key];
  if (ruleIsActive(presetValue) && presetValue === current) {
    return { source: "preset", governingBody: preset.governingBody, presetLabel: preset.label };
  }
  return { source: "custom" };
}


export interface LineupViolation {
  rule: LineupRuleKey;
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

    // minInfieldInnings (WoS)
    if (rules.minInfieldInnings !== undefined) {
      const infield = slots.filter(
        (s) => s && s !== "BN" && INFIELD_POSITIONS.has(s as Position)
      ).length;
      if (infield < rules.minInfieldInnings) {
        out.push({
          rule: "minInfieldInnings",
          playerId: id,
          message: `${id} has ${infield} infield innings, league minimum is ${rules.minInfieldInnings}.`,
        });
      }
    }

    // minOutfieldInnings (WoS)
    if (rules.minOutfieldInnings !== undefined) {
      const outfield = slots.filter(
        (s) => s && s !== "BN" && OUTFIELD_POSITIONS.has(s as Position)
      ).length;
      if (outfield < rules.minOutfieldInnings) {
        out.push({
          rule: "minOutfieldInnings",
          playerId: id,
          message: `${id} has ${outfield} outfield innings, league minimum is ${rules.minOutfieldInnings}.`,
        });
      }
    }

    // maxConsecutiveSamePosition (WoS)
    if (rules.maxConsecutiveSamePosition !== undefined) {
      let prev: Slot | undefined;
      let run = 0;
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        if (s && s !== "BN" && s === prev) {
          run += 1;
          if (run > rules.maxConsecutiveSamePosition) {
            out.push({
              rule: "maxConsecutiveSamePosition",
              playerId: id,
              inning: i,
              message: `${id} plays ${s} ${run} innings in a row at inning ${i + 1} (max ${rules.maxConsecutiveSamePosition}).`,
            });
            break;
          }
        } else {
          run = s && s !== "BN" ? 1 : 0;
        }
        prev = s;
      }
    }
  }

  // equalBenchTime (WoS): bench innings stay within 1 across the roster — no
  // player sits a second time until everyone has sat once.
  if (rules.equalBenchTime && playerIds.length > 0) {
    const benchByPlayer = new Map<string, number>();
    for (const id of playerIds) {
      benchByPlayer.set(id, slotAt[id]!.filter((s) => s === "BN").length);
    }
    const counts = [...benchByPlayer.values()];
    const minBench = Math.min(...counts);
    const maxBench = Math.max(...counts);
    if (maxBench - minBench > 1) {
      for (const [id, n] of benchByPlayer) {
        if (n === maxBench) {
          out.push({
            rule: "equalBenchTime",
            playerId: id,
            message: `${id} sits ${n} innings while someone sits ${minBench} — bench time isn't even (max gap 1).`,
          });
        }
      }
    }
  }

  // pairedPositions (Phillip): both halves of the tandem are present on the
  // declared innings (or all innings if `innings` is omitted).
  if (rules.pairedPositions?.length) {    for (const pair of rules.pairedPositions) {
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

