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
  type: "warmup" | "skill" | "rest" | "game" | "cooldown";
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

  // 2) Skill blocks, capped by max_continuous_skill_block_minutes, in focus order.
  let usedMin = blocks.reduce((s, b) => s + b.durationMin, 0);
  const cooldownReserve = 5;
  let throwingLoad = 0;
  let blockCounter = 2;

  for (const topic of input.focus) {
    const topicDrills = candidates.filter((d) => d.topic === topic);
    // Sort by published-first, then shorter blocks first
    topicDrills.sort((a, b) => {
      if (a.review_status === "published" && b.review_status !== "published") return -1;
      if (b.review_status === "published" && a.review_status !== "published") return 1;
      return a.duration_minutes - b.duration_minutes;
    });

    let topicMinUsed = 0;
    for (const drill of topicDrills) {
      const remaining = targetDuration - usedMin - cooldownReserve;
      if (remaining <= 0) break;
      if (drill.duration_minutes > caps.max_continuous_skill_block_minutes) {
        warnings.push(
          `Drill ${drill.drill_id} (${drill.duration_minutes}min) exceeds continuous skill cap ${caps.max_continuous_skill_block_minutes}min; splitting not implemented — skipping.`
        );
        continue;
      }
      if (drill.duration_minutes > remaining) continue;

      // Pitch Smart pre-flight if this drill is a pitching outing for a known player.
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

      blocks.push({
        blockId: `B${blockCounter++}_SKILL_${topic.toUpperCase()}`,
        type: "skill",
        durationMin: drill.duration_minutes,
        drill,
        notes: [],
      });
      usedMin += drill.duration_minutes;
      topicMinUsed += drill.duration_minutes;
      throwingLoad += drill.throw_count_contribution;

      // Insert rest break per matrix cadence
      if (topicMinUsed >= caps.rest_or_water_break_every_minutes) {
        blocks.push({
          blockId: `B${blockCounter++}_REST`,
          type: "rest",
          durationMin: 2,
          drill: null,
          notes: [`Water/rest break every ${caps.rest_or_water_break_every_minutes}min (matrix).`],
        });
        usedMin += 2;
        topicMinUsed = 0;
      }
    }
  }

  // 3) Cooldown
  const cooldown = all.find((d) => d.drill_id === COOLDOWN_DRILL_ID);
  if (cooldown && usedMin + cooldown.duration_minutes <= targetDuration + 2) {
    blocks.push({
      blockId: `B${blockCounter++}_COOLDOWN`,
      type: "cooldown",
      durationMin: cooldown.duration_minutes,
      drill: cooldown,
      notes: ["Mental reset / recovery."],
    });
  }

  // 4) Throwing-load soft guard (≤ 50% of daily max for typical age)
  // Using 11-12 band as reference 85 → 42.5
  if (throwingLoad > 42) {
    warnings.push(
      `Cumulative throwing load ${throwingLoad} estimated pitches exceeds 50% of typical daily max (42).`
    );
  }

  const qualityScore = scorePlan(blocks, input, band.topics);

  return {
    ageBand: ageKey,
    blocks,
    warnings,
    blocked,
    totalThrowingLoad: throwingLoad,
    qualityScore,
  };
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
