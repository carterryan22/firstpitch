// @platform/compiler — turns a coach intent into a safe, drilled practice plan.
// Implements coach-platform-practice-compiler.md and respects all Tier 1 rules.

import {
  loadDrills,
  getAgeBandKeyForAge,
  getMatrixBand,
  type Drill,
  type AgeBandKey,
} from "@platform/corpus";
import { canPitchToday, sessionCapsFor } from "@platform/safety";

export interface CompileInput {
  age: number;
  durationMin: number;
  environmentTier: "T1_field" | "T2_cage_gym" | "T3_backyard" | "T4_living_room";
  equipmentAvailable: string[];
  coaches: number;
  players: number;
  focus: string[]; // e.g. ['throwing','speed','reaction']
  /**
   * Optional venue inventory — number of each kind of work area available.
   * Mirrors the Dugout Edge Practice Planner "Field Resources" input. Used
   * by `stationCount()` and the anti-line check to size parallel work.
   */
  fieldResources?: FieldResources;
  /** Player-level pitch history for any player who would pitch in this session. */
  pitchHistoryByPlayer?: Record<string, Parameters<typeof canPitchToday>[0]["history"]>;
  date?: Date;
  /** Allow override of forbidden topics for a specific (rare) league-approved case. */
  overrides?: string[];
  /**
   * Coach-curated drill order. When provided, the compiler uses these drills
   * (in this order) for the skill section instead of auto-picking from `focus`.
   * Safety, age, equipment, and pitch-smart checks still apply.
   */
  selectedDrillIds?: string[];
  /** Minutes reserved between content blocks for moving/resetting stations. Default 1. */
  transitionMinPerBlock?: number;
}

export interface FieldResources {
  fullField?: number;
  battingCage?: number;
  bullpen?: number;
  infieldOnly?: number;
  openSpace?: number;
}

/**
 * Effective station count: a coach can supervise at most one area, and each
 * physical area is one station. So we cap available areas by available coaches.
 * Falls back to coach count when no resources were declared.
 */
export function stationCount(input: Pick<CompileInput, "coaches" | "fieldResources">): number {
  const r = input.fieldResources;
  // Clamp each resource value to a sane non-negative integer so a bad input
  // (e.g. -1 or 99999) can't blow up downstream packing math.
  const clamp = (n: number | undefined): number =>
    Math.max(0, Math.min(99, Math.floor(Number(n) || 0)));
  const areas = r
    ? clamp(r.fullField) + clamp(r.battingCage) + clamp(r.bullpen) + clamp(r.infieldOnly) + clamp(r.openSpace)
    : 0;
  const fromAreas = areas > 0 ? Math.min(areas, Math.max(1, input.coaches)) : Math.max(1, input.coaches);
  return fromAreas;
}

export interface CompiledBlock {
  blockId: string;
  type: "warmup" | "skill" | "rest" | "game" | "cooldown" | "transition";
  durationMin: number;
  drill: Drill | null;
  notes: string[];
}

export interface CompileResult {
  ageBand: AgeBandKey;
  blocks: CompiledBlock[];
  warnings: string[];
  blocked: string[];
  totalThrowingLoad: number;
  qualityScore: number;
  /** Time accounting in minutes — exposes how the budget was spent. */
  timeBudget: {
    targetMin: number;
    warmupMin: number;
    skillMin: number;
    restMin: number;
    transitionMin: number;
    cooldownMin: number;
    usedMin: number;
    /** Slack the coach can use for huddles, water, transitions; positive = unfilled. */
    slackMin: number;
  };
  /** One-line theme derived from the dominant topics in the picked drills. */
  theme: string;
  /** Two-to-five sentences a coach can use as huddle talking points. */
  talkingPoints: string[];
}

const WARMUP_DRILL_ID = "DYNAMIC_WARMUP_8MIN";
const COOLDOWN_DRILL_ID = "MENTAL_RESET_BREATH";

function pickDrills(input: CompileInput, drills: Drill[]): Drill[] {
  const ageKey = getAgeBandKeyForAge(input.age);
  return drills.filter((d) => {
    if (!d.age_band.includes(ageKey)) return false;
    if (d.environment_tier !== input.environmentTier && d.environment_tier !== "T4_living_room") {
      // allow lower-tier drills as fallback
      const tierOrder = ["T4_living_room", "T3_backyard", "T2_cage_gym", "T1_field"];
      if (tierOrder.indexOf(d.environment_tier) > tierOrder.indexOf(input.environmentTier)) return false;
    }
    if (d.coaches_min > input.coaches) return false;
    if (d.player_count_min > input.players || d.player_count_max < input.players) return false;
    const missing = d.equipment_required.filter((e) => !input.equipmentAvailable.includes(e));
    if (missing.length > 0) return false;
    if (!input.focus.includes(d.topic) && d.topic !== "warmup" && d.topic !== "mental_recovery") return false;
    if (d.review_status === "retired" || d.review_status === "draft") return false;
    return true;
  });
}

export function compile(input: CompileInput): CompileResult {
  const ageKey = getAgeBandKeyForAge(input.age);
  const band = getMatrixBand(input.age);
  const caps = sessionCapsFor(input.age);
  const warnings: string[] = [];
  const blocked: string[] = [];
  const blocks: CompiledBlock[] = [];
  const transitionMin = Math.max(0, input.transitionMinPerBlock ?? 1);

  if (input.durationMin > caps.max_session_minutes) {
    warnings.push(
      `Requested ${input.durationMin}min exceeds ${ageKey} session cap ${caps.max_session_minutes}min; capping.`
    );
  }
  const targetDuration = Math.min(input.durationMin, caps.max_session_minutes);

  const all = loadDrills();
  const candidates = pickDrills(input, all);

  // 1) Warmup is REQUIRED before throwing/speed for every band per age matrix.
  const warmup = all.find((d) => d.drill_id === WARMUP_DRILL_ID);
  if (warmup) {
    blocks.push({
      blockId: "B1_WARMUP",
      type: "warmup",
      durationMin: warmup.duration_minutes,
      drill: warmup,
      notes: ["Required dynamic warmup per age-band matrix."],
    });
  } else {
    blocked.push("Missing required dynamic warmup drill (DYNAMIC_WARMUP_8MIN).");
  }

  // 2) Skill blocks — either coach-curated order or auto-pick from focus.
  let usedMin = blocks.reduce((s, b) => s + b.durationMin, 0);
  const cooldownReserve = 5;
  let throwingLoad = 0;
  let blockCounter = 2;
  let skillsPlaced = 0;

  function placeDrill(drill: Drill, topic: string): "placed" | "no_room" | "too_long" | "blocked" {
    const remaining = targetDuration - usedMin - cooldownReserve - transitionMin;
    if (remaining <= 0) return "no_room";
    if (drill.duration_minutes > caps.max_continuous_skill_block_minutes) {
      warnings.push(
        `${drill.name} (${drill.duration_minutes}min) exceeds continuous skill cap ${caps.max_continuous_skill_block_minutes}min; splitting not implemented — skipping.`
      );
      return "too_long";
    }
    if (drill.duration_minutes > remaining) return "no_room";

    // Pitch Smart pre-flight.
    if (drill.throw_count_contribution >= 1 && drill.topic === "throwing" && input.pitchHistoryByPlayer) {
      for (const [playerId, history] of Object.entries(input.pitchHistoryByPlayer)) {
        const res = canPitchToday({
          age: input.age,
          date: input.date ?? new Date(),
          plannedPitches: drill.throw_count_contribution,
          history,
        });
        if (!res.allowed) {
          blocked.push(`Player ${playerId} cannot pitch today: ${res.reasons.join(" ")}`);
        }
        warnings.push(...res.warnings);
      }
    }

    // Insert a short transition between content blocks (not before the first skill).
    if (skillsPlaced > 0 && transitionMin > 0) {
      blocks.push({
        blockId: `B${blockCounter++}_TRANSITION`,
        type: "transition",
        durationMin: transitionMin,
        drill: null,
        notes: ["Move stations / reset."],
      });
      usedMin += transitionMin;
    }

    blocks.push({
      blockId: `B${blockCounter++}_SKILL_${topic.toUpperCase()}`,
      type: "skill",
      durationMin: drill.duration_minutes,
      drill,
      notes: [],
    });
    usedMin += drill.duration_minutes;
    throwingLoad += drill.throw_count_contribution;
    skillsPlaced += 1;
    return "placed";
  }

  // Periodic water/rest break per age matrix. Tracks minutes of skill since last break.
  let sinceLastBreak = 0;
  function maybeWaterBreak(prevSkillMin: number) {
    sinceLastBreak += prevSkillMin;
    if (sinceLastBreak >= caps.rest_or_water_break_every_minutes) {
      const remaining = targetDuration - usedMin - cooldownReserve;
      if (remaining < 2) return;
      blocks.push({
        blockId: `B${blockCounter++}_REST`,
        type: "rest",
        durationMin: 2,
        drill: null,
        notes: [`Water/rest break every ${caps.rest_or_water_break_every_minutes}min (matrix).`],
      });
      usedMin += 2;
      sinceLastBreak = 0;
    }
  }

  if (input.selectedDrillIds && input.selectedDrillIds.length > 0) {
    // Coach-curated: walk the list, validating each drill against safety/age/equipment.
    for (const drillId of input.selectedDrillIds) {
      const drill = all.find((d) => d.drill_id === drillId);
      if (!drill) {
        warnings.push(`Drill '${drillId}' not found in library — skipped.`);
        continue;
      }
      if (!candidates.includes(drill)) {
        // Re-run individual reasons so the coach knows WHY it was dropped.
        const reasons: string[] = [];
        if (!drill.age_band.includes(ageKey)) reasons.push(`age band ${ageKey} not supported`);
        if (drill.coaches_min > input.coaches) reasons.push(`needs ${drill.coaches_min}+ coaches`);
        if (drill.player_count_min > input.players || drill.player_count_max < input.players) {
          reasons.push(`needs ${drill.player_count_min}–${drill.player_count_max} players`);
        }
        const missingEq = drill.equipment_required.filter((e) => !input.equipmentAvailable.includes(e));
        if (missingEq.length) reasons.push(`missing equipment: ${missingEq.join(", ")}`);
        if (drill.review_status === "retired" || drill.review_status === "draft") {
          reasons.push(`drill is ${drill.review_status}`);
        }
        warnings.push(`${drill.name} skipped — ${reasons.join("; ") || "not eligible for this practice"}.`);
        continue;
      }
      const before = blocks.length;
      const r = placeDrill(drill, drill.topic);
      if (r === "no_room") {
        warnings.push(`${drill.name} dropped — not enough time left in the session.`);
        continue;
      }
      if (blocks.length > before) {
        const last = blocks[blocks.length - 1]!;
        maybeWaterBreak(last.durationMin);
      }
    }
  } else {
    // Auto-pick from focus order, shortest published first.
    for (const topic of input.focus) {
      const topicDrills = candidates.filter((d) => d.topic === topic);
      topicDrills.sort((a, b) => {
        if (a.review_status === "published" && b.review_status !== "published") return -1;
        if (b.review_status === "published" && a.review_status !== "published") return 1;
        return a.duration_minutes - b.duration_minutes;
      });

      for (const drill of topicDrills) {
        const before = blocks.length;
        const r = placeDrill(drill, topic);
        if (r === "no_room") break;
        if (blocks.length > before) {
          const last = blocks[blocks.length - 1]!;
          maybeWaterBreak(last.durationMin);
        }
      }
    }
  }

  // 2b) Top-up pass — if meaningful slack remains, place one more eligible drill
  // so the practice plan actually fills the requested time slot.
  {
    const slack = targetDuration - usedMin - cooldownReserve;
    if (slack >= 8) {
      const usedDrillIds = new Set(blocks.map((b) => b.drill?.drill_id).filter(Boolean) as string[]);
      const focusSet = new Set(input.focus);
      const topUp = candidates
        .filter((d) => !usedDrillIds.has(d.drill_id))
        .filter((d) => focusSet.has(d.topic) || d.topic === "mental_recovery")
        .filter((d) => d.duration_minutes + transitionMin <= slack)
        .sort((a, b) => b.duration_minutes - a.duration_minutes);
      if (topUp[0]) {
        const before = blocks.length;
        placeDrill(topUp[0], topUp[0].topic);
        if (blocks.length > before) {
          const last = blocks[blocks.length - 1]!;
          maybeWaterBreak(last.durationMin);
        }
      }
    }
  }

  // 3) Cooldown
  const cooldown = all.find((d) => d.drill_id === COOLDOWN_DRILL_ID);
  if (cooldown && usedMin + cooldown.duration_minutes <= targetDuration + 2) {
    if (transitionMin > 0 && skillsPlaced > 0) {
      blocks.push({
        blockId: `B${blockCounter++}_TRANSITION`,
        type: "transition",
        durationMin: transitionMin,
        drill: null,
        notes: ["Bring everyone in to close out."],
      });
      usedMin += transitionMin;
    }
    blocks.push({
      blockId: `B${blockCounter++}_COOLDOWN`,
      type: "cooldown",
      durationMin: cooldown.duration_minutes,
      drill: cooldown,
      notes: ["Mental reset / recovery."],
    });
    usedMin += cooldown.duration_minutes;
  }

  // 4) Throwing-load soft guard (≤ 50% of daily max for typical age)
  if (throwingLoad > 42) {
    warnings.push(
      `Cumulative throwing load ${throwingLoad} estimated pitches exceeds 50% of typical daily max (42).`
    );
  }

  const qualityScore = scorePlan(blocks, input, band.topics);
  const warmupMin = blocks.filter((b) => b.type === "warmup").reduce((s, b) => s + b.durationMin, 0);
  const skillMin = blocks.filter((b) => b.type === "skill").reduce((s, b) => s + b.durationMin, 0);
  const restMin = blocks.filter((b) => b.type === "rest").reduce((s, b) => s + b.durationMin, 0);
  const transitionMinTotal = blocks.filter((b) => b.type === "transition").reduce((s, b) => s + b.durationMin, 0);
  const cooldownMin = blocks.filter((b) => b.type === "cooldown").reduce((s, b) => s + b.durationMin, 0);

  return {
    ageBand: ageKey,
    blocks,
    warnings,
    blocked,
    totalThrowingLoad: throwingLoad,
    qualityScore,
    timeBudget: {
      targetMin: targetDuration,
      warmupMin,
      skillMin,
      restMin,
      transitionMin: transitionMinTotal,
      cooldownMin,
      usedMin,
      slackMin: Math.max(0, targetDuration - usedMin),
    },
    theme: deriveTheme(blocks, input.focus),
    talkingPoints: deriveTalkingPoints(blocks),
  };
}

// --- Theme + talking points ------------------------------------------------

const THEME_BY_TOPIC_MIX: Array<{ match: (topics: Set<string>) => boolean; theme: string }> = [
  { match: (t) => t.has("pitching"), theme: "Arm-care priority — quality over quantity." },
  { match: (t) => t.has("hitting") && (t.has("fielding") || t.has("throwing")), theme: "Two-way reps day." },
  { match: (t) => t.has("speed") && t.has("reaction"), theme: "Game-speed day." },
  { match: (t) => t.has("baserunning"), theme: "Smart on the bases." },
  { match: (t) => t.has("hitting"), theme: "Quality at-bats." },
  { match: (t) => t.has("fielding"), theme: "First-step quickness." },
  { match: (t) => t.has("throwing"), theme: "Accurate, repeatable throws." },
];

function deriveTheme(blocks: CompiledBlock[], focus: string[]): string {
  const topics = new Set<string>();
  for (const b of blocks) {
    if (b.drill && b.type === "skill") topics.add(b.drill.topic);
  }
  for (const f of focus) topics.add(f);
  for (const rule of THEME_BY_TOPIC_MIX) {
    if (rule.match(topics)) return rule.theme;
  }
  return "Focused, age-appropriate reps.";
}

function deriveTalkingPoints(blocks: CompiledBlock[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const b of blocks) {
    if (!b.drill || b.type !== "skill") continue;
    const drill = b.drill;
    const why = drill.kid_friendly?.why?.trim();
    const cue = drill.coaching_cues?.[0]?.trim();
    const line = why || cue;
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(`${drill.name}: ${line.replace(/\.$/, "")}.`);
    if (out.length >= 5) break;
  }
  return out;
}

function scorePlan(
  blocks: CompiledBlock[],
  input: CompileInput,
  topics: ReturnType<typeof getMatrixBand>["topics"]
): number {
  let score = 0;
  if (blocks.some((b) => b.type === "warmup")) score += 25;
  if (blocks.some((b) => b.type === "cooldown")) score += 10;
  const coveredTopics = new Set(blocks.filter((b) => b.drill).map((b) => b.drill!.topic));
  const focusCovered = input.focus.filter((f) => coveredTopics.has(f)).length;
  score += Math.round((focusCovered / Math.max(1, input.focus.length)) * 50);
  // Bonus for covering required items from matrix
  for (const t of input.focus) {
    if (topics[t]?.required.length && coveredTopics.has(t)) score += 5;
  }
  return Math.min(100, score);
}

export * from "./extensions";
export * from "./templates";
