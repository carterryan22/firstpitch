/**
 * Lineup explanation + improvement analysis.
 *
 * Produces a human-readable rationale for each (player, inning) assignment in
 * a generated lineup, and computes per-player "improvement areas" — positions
 * the player was actually assigned but which they are not yet rated
 * "preferred" at. Those areas drive the parent-facing homework planner
 * (`@platform/missions/homework`).
 */

import {
  POSITIONS,
  type Inning,
  type LineupPlayer,
  type Position,
  type Slot,
} from "./index";

const PREMIUM: ReadonlySet<Position> = new Set(["P", "C", "SS", "CF"]);

export interface CellRationale {
  inningIdx: number;
  playerId: string;
  slot: Slot;
  /** Short label suitable for a chip / tooltip ("Preferred · Premium"). */
  label: string;
  /** Longer sentence safe to show parents. */
  detail: string;
  premium: boolean;
  rating: "preferred" | "ok" | "unrated" | "avoid" | "bench";
  /** True if the slot is not yet a strength (drives homework focus). */
  improvementOpportunity: boolean;
}

export interface PlayerLineupSummary {
  playerId: string;
  fieldInnings: number;
  benchInnings: number;
  /** Distinct positions assigned, in order of first appearance. */
  positions: Position[];
  /** Positions where the player is not yet rated "preferred". */
  improvementAreas: Position[];
  /** Plain-English explanation for parents (1-3 sentences). */
  parentSummary: string;
}

function ratingFor(p: LineupPlayer, pos: Position): CellRationale["rating"] {
  const r = p.positionRatings?.[pos];
  if (r === "preferred") return "preferred";
  if (r === "ok") return "ok";
  if (r === "avoid") return "avoid";
  return "unrated";
}

export function explainCell(
  player: LineupPlayer,
  slot: Slot,
  inningIdx: number,
): CellRationale {
  if (slot === "BN") {
    return {
      inningIdx,
      playerId: player.id,
      slot,
      rating: "bench",
      premium: false,
      label: "Rest inning",
      detail:
        "Bench inning so playing time stays balanced across the roster.",
      improvementOpportunity: false,
    };
  }
  const pos = slot as Position;
  const rating = ratingFor(player, pos);
  const premium = PREMIUM.has(pos);
  const parts: string[] = [];
  if (rating === "preferred") parts.push("Preferred position");
  else if (rating === "ok") parts.push("Comfortable here");
  else if (rating === "unrated") parts.push("New look at this spot");
  else if (rating === "avoid") parts.push("Stretch assignment");
  if (premium) parts.push("Premium defensive spot");
  if (pos === "P") parts.push("Cleared to pitch today");
  if (pos === "C") parts.push("Cleared to catch");

  const label = parts.join(" · ");
  const detail =
    rating === "preferred"
      ? `${pos} is a strength — coach is putting them where they help the team most.`
      : rating === "ok"
        ? `${pos} is a developing position — they're comfortable but still building reps.`
        : rating === "avoid"
          ? `${pos} is outside their comfort zone — used sparingly when the roster needs it.`
          : `${pos} is a development opportunity — coach is giving them reps to grow.`;
  const improvementOpportunity = rating !== "preferred";

  return {
    inningIdx,
    playerId: player.id,
    slot,
    rating,
    premium,
    label,
    detail,
    improvementOpportunity,
  };
}

/** Build a per-(inning,player) rationale table. */
export function explainLineup(
  lineup: Inning[],
  players: LineupPlayer[],
): CellRationale[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  const out: CellRationale[] = [];
  lineup.forEach((inn, i) => {
    for (const [pid, slot] of Object.entries(inn)) {
      const p = byId.get(pid);
      if (!p) continue;
      out.push(explainCell(p, slot, i));
    }
  });
  return out;
}

/** Roll up the lineup into a parent-friendly per-player summary. */
export function summarizeForParents(
  lineup: Inning[],
  player: LineupPlayer,
): PlayerLineupSummary {
  const positions: Position[] = [];
  let fieldInnings = 0;
  let benchInnings = 0;
  for (const inn of lineup) {
    const slot = inn[player.id];
    if (!slot) continue;
    if (slot === "BN") {
      benchInnings += 1;
      continue;
    }
    fieldInnings += 1;
    const pos = slot as Position;
    if ((POSITIONS as readonly Position[]).includes(pos) && !positions.includes(pos)) {
      positions.push(pos);
    }
  }
  const improvementAreas = positions.filter(
    (pos) => player.positionRatings?.[pos] !== "preferred",
  );

  const posLabel = positions.length === 0 ? "the bench" : positions.join(", ");
  const sentences: string[] = [];
  sentences.push(
    fieldInnings === 0
      ? "All bench innings this game so playing time evens out across the roster."
      : `Playing ${positions.length === 1 ? "1 position" : `${positions.length} positions`} this game — ${posLabel}.`,
  );
  if (improvementAreas.length > 0) {
    sentences.push(
      `Growth focus: ${improvementAreas.join(", ")}. Reps here build toward a "preferred" rating.`,
    );
  } else if (fieldInnings > 0) {
    sentences.push("All assignments are preferred positions — pure strengths today.");
  }

  return {
    playerId: player.id,
    fieldInnings,
    benchInnings,
    positions,
    improvementAreas,
    parentSummary: sentences.join(" "),
  };
}

/** Skill categories used by the homework planner. */
export type SkillCategory =
  | "iq"
  | "speed"
  | "throw"
  | "catch"
  | "positioning"
  | "awareness";

export const ALL_SKILL_CATEGORIES: readonly SkillCategory[] = [
  "iq",
  "speed",
  "throw",
  "catch",
  "positioning",
  "awareness",
] as const;

/**
 * The skill categories that strongly support each defensive position. Used to
 * convert "this kid is playing SS but isn't preferred there" into "they need
 * catch + throw + positioning + awareness reps at home."
 */
export const POSITION_SKILLS: Record<Position, SkillCategory[]> = {
  P: ["throw", "iq", "positioning"],
  C: ["catch", "throw", "iq", "awareness"],
  "1B": ["catch", "positioning"],
  "2B": ["catch", "throw", "speed", "positioning", "awareness"],
  "3B": ["catch", "throw", "positioning", "awareness"],
  SS: ["catch", "throw", "speed", "positioning", "awareness"],
  LF: ["speed", "catch", "awareness"],
  CF: ["speed", "catch", "awareness", "positioning"],
  RF: ["speed", "catch", "throw", "awareness"],
  RV: ["speed", "catch", "awareness"],
};

/** Union the skills for a list of positions, dedup, stable order. */
export function skillsForPositions(positions: Position[]): SkillCategory[] {
  const set = new Set<SkillCategory>();
  for (const pos of positions) {
    for (const s of POSITION_SKILLS[pos] ?? []) set.add(s);
  }
  return ALL_SKILL_CATEGORIES.filter((s) => set.has(s));
}
