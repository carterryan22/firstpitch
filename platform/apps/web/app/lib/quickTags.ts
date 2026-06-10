/**
 * Quick-tag taxonomy — the canonical vocabulary behind one-tap coach
 * observations. A coach taps a chip instead of typing a note, and that turns a
 * fleeting observation into structured data that powers two surfaces:
 *
 *  - **Coach Memory** — "what each player needs", synthesized per player.
 *  - **Fix-Last-Game** — team symptoms → top priorities → a practice plan.
 *
 * The storage layer stays dumb (`QuickTagRecord.code` is just a string); this
 * module owns all the meaning: labels, tone, where a tag can be used, and how a
 * game symptom maps to practice focus topics.
 *
 * Voice rule: every label is coach-facing and plain. Watch-tone tags describe a
 * *skill to work on*, never a judgment of the kid — and none of this is ever
 * shown to parents (Coach Memory is a coach-only surface).
 */

import type { IntentFocus } from "@platform/ai";

export type QuickTagCategory =
  | "fielding"
  | "throwing"
  | "hitting"
  | "baserunning"
  | "pitching"
  | "effort"
  | "confidence"
  | "positioning"
  | "attendance";

/** positive = strength worth remembering · watch = skill to develop · neutral = factual. */
export type QuickTagTone = "positive" | "watch" | "neutral";

/** Where a tag can be applied. */
export type QuickTagScope = "player" | "team" | "both";

export interface QuickTagDef {
  code: string;
  /** Short chip label, coach-facing. */
  label: string;
  category: QuickTagCategory;
  tone: QuickTagTone;
  scope: QuickTagScope;
  /**
   * Compiler/drill focus topics this symptom maps to. Present only on tags that
   * can drive a Fix-Last-Game practice recommendation.
   */
  focus?: IntentFocus[];
  /** Team-priority phrasing for Fix-Last-Game, e.g. "Force plays". */
  priority?: string;
  /** Coach-Memory phrasing of the need/strength, e.g. "Needs infield reps". */
  need?: string;
}

/**
 * The taxonomy. Ordering here is the order chips render in. Game symptoms (the
 * §8 list) carry `focus` + `priority`; player observations carry `need`.
 */
export const QUICK_TAGS: readonly QuickTagDef[] = [
  // ---- Fielding / throwing symptoms (team + player) ----
  {
    code: "missed_cutoff",
    label: "Missed cutoffs",
    category: "throwing",
    tone: "watch",
    scope: "both",
    focus: ["throwing", "fielding"],
    priority: "Cutoff communication",
    need: "Cutoff reads & relays",
  },
  {
    code: "force_play_confusion",
    label: "Force-play confusion",
    category: "fielding",
    tone: "watch",
    scope: "both",
    focus: ["fielding", "baserunning"],
    priority: "Force plays",
    need: "Force-play decisions",
  },
  {
    code: "weak_throws",
    label: "Weak throws",
    category: "throwing",
    tone: "watch",
    scope: "both",
    focus: ["throwing"],
    priority: "Throwing strength & accuracy",
    need: "Stronger, on-line throws",
  },
  {
    code: "rushed_throw",
    label: "Rushed the throw",
    category: "fielding",
    tone: "watch",
    scope: "both",
    focus: ["fielding", "throwing"],
    priority: "Field clean, then throw",
    need: "Field first, feet second, throw third",
  },
  {
    code: "slow_transfer",
    label: "Slow transfer",
    category: "fielding",
    tone: "watch",
    scope: "both",
    focus: ["fielding"],
    priority: "Faster glove-to-hand transfer",
    need: "Quicker transfer",
  },
  // ---- Baserunning / hitting symptoms ----
  {
    code: "bad_baserunning",
    label: "Bad baserunning reads",
    category: "baserunning",
    tone: "watch",
    scope: "both",
    focus: ["baserunning"],
    priority: "Baserunning reads",
    need: "Baserunning reads",
  },
  {
    code: "slow_out_of_box",
    label: "Slow out of the box",
    category: "baserunning",
    tone: "watch",
    scope: "both",
    focus: ["speed", "baserunning"],
    priority: "Run hard out of the box",
    need: "Compete down the line",
  },
  {
    code: "watched_strike_three",
    label: "Watched strike three",
    category: "hitting",
    tone: "watch",
    scope: "both",
    focus: ["hitting"],
    priority: "Be on-time & aggressive in the zone",
    need: "Aggressive swing decisions",
  },
  // ---- Pitching ----
  {
    code: "too_many_walks",
    label: "Too many walks",
    category: "pitching",
    tone: "watch",
    scope: "both",
    focus: ["pitching"],
    priority: "First-pitch strikes",
    need: "First-pitch strikes",
  },
  {
    code: "good_command",
    label: "Pounded the zone",
    category: "pitching",
    tone: "positive",
    scope: "player",
    need: "Filling up the zone",
  },
  // ---- Positioning / development (player) ----
  {
    code: "needs_infield_reps",
    label: "Needs infield reps",
    category: "positioning",
    tone: "watch",
    scope: "player",
    focus: ["fielding"],
    need: "Infield reps",
  },
  {
    code: "needs_outfield_reps",
    label: "Needs outfield reps",
    category: "positioning",
    tone: "watch",
    scope: "player",
    focus: ["fielding"],
    need: "Outfield reps & reads",
  },
  {
    code: "tried_new_position",
    label: "Tried a new spot",
    category: "positioning",
    tone: "positive",
    scope: "player",
    need: "Stretching to a new position",
  },
  // ---- Effort / confidence / attitude (player) ----
  {
    code: "great_effort",
    label: "Great effort",
    category: "effort",
    tone: "positive",
    scope: "player",
    need: "Bringing the effort",
  },
  {
    code: "working_hard",
    label: "Putting in work",
    category: "effort",
    tone: "positive",
    scope: "player",
    need: "Putting in the work",
  },
  {
    code: "great_attitude",
    label: "Great attitude",
    category: "effort",
    tone: "positive",
    scope: "player",
    need: "Great dugout energy",
  },
  {
    code: "needs_confidence",
    label: "Needs confidence",
    category: "confidence",
    tone: "watch",
    scope: "player",
    need: "A confidence win",
  },
  {
    code: "low_energy",
    label: "Low energy",
    category: "effort",
    tone: "watch",
    scope: "both",
    focus: ["mental"],
    priority: "Energy & focus",
    need: "Re-engaging",
  },
  // ---- Attendance (player) ----
  {
    code: "missed_practice",
    label: "Missed practice",
    category: "attendance",
    tone: "neutral",
    scope: "player",
    need: "Catching up on missed reps",
  },
  {
    code: "showed_up_late",
    label: "Showed up late",
    category: "attendance",
    tone: "neutral",
    scope: "player",
    need: "On-time for warm-ups",
  },
] as const;

export const QUICK_TAG_BY_CODE: Record<string, QuickTagDef> = Object.fromEntries(
  QUICK_TAGS.map((t) => [t.code, t]),
);

export function quickTagDef(code: string): QuickTagDef | undefined {
  return QUICK_TAG_BY_CODE[code];
}

export function isValidQuickTagCode(code: string): boolean {
  return code in QUICK_TAG_BY_CODE;
}

/** Tags offered when capturing per-player observations (Coach Memory). */
export function playerObservationTags(): QuickTagDef[] {
  return QUICK_TAGS.filter((t) => t.scope === "player" || t.scope === "both");
}

/** Tags offered as team game-symptoms (Fix-Last-Game) — only ones that map to focus. */
export function gameSymptomTags(): QuickTagDef[] {
  return QUICK_TAGS.filter((t) => (t.scope === "team" || t.scope === "both") && !!t.focus);
}

/** Badge class for a tag tone, matching globals.css. */
export function quickTagToneClass(tone: QuickTagTone): string {
  if (tone === "positive") return "badge-ok";
  if (tone === "watch") return "badge-warn";
  return "badge";
}

export const QUICK_TAG_CATEGORY_LABEL: Record<QuickTagCategory, string> = {
  fielding: "Fielding",
  throwing: "Throwing",
  hitting: "Hitting",
  baserunning: "Baserunning",
  pitching: "Pitching",
  effort: "Effort",
  confidence: "Confidence",
  positioning: "Positioning",
  attendance: "Attendance",
};
