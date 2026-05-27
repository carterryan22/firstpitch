/**
 * Tailored at-home training plan for a single player based on which defensive
 * positions they're being asked to play and which of those positions are still
 * a growth area for them (not yet rated "preferred"). Draws from the corpus
 * drill library, filtered by age band, low-equipment environment, and the six
 * skill categories the platform tracks: iq, speed, throw, catch, positioning,
 * awareness.
 */

import { loadDrills, getAgeBandKeyForAge, type Drill, type AgeBandKey } from "@platform/corpus";

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

/** Drill topics/tags → which skill categories the drill exercises. */
function drillCategories(d: Drill): Set<SkillCategory> {
  const cats = new Set<SkillCategory>();
  const topic = (d.topic ?? "").toLowerCase();
  const tags = (d.tags ?? []).map((t) => t.toLowerCase());
  const has = (needle: string) => tags.includes(needle) || topic === needle;

  if (topic === "speed" || topic === "baserunning") cats.add("speed");
  if (topic === "throwing" || tags.includes("throws")) cats.add("throw");
  if (topic === "fielding" || tags.includes("infield") || tags.includes("outfield")) {
    cats.add("catch");
    cats.add("positioning");
  }
  if (tags.includes("catcher")) cats.add("catch");
  if (topic === "reaction" || tags.includes("hand-eye")) {
    cats.add("awareness");
    cats.add("catch");
  }
  if (topic === "mental" || tags.includes("decision-making") || tags.includes("routine")) {
    cats.add("iq");
    cats.add("awareness");
  }
  if (topic === "baserunning") cats.add("iq");
  if (has("positioning")) cats.add("positioning");
  return cats;
}

export interface HomeworkDrill {
  drillId: string;
  name: string;
  shortDescription: string;
  durationMinutes: number;
  environmentTier: Drill["environment_tier"];
  categories: SkillCategory[];
  /** Which targeted categories this drill covers. */
  matchedCategories: SkillCategory[];
  rationale: string;
  /** Optional kid-friendly framing for the parent to read aloud. */
  kidFriendly?: {
    explain: string;
    goal: string;
    why: string;
  };
}

export interface HomeworkPlan {
  ageBand: AgeBandKey | null;
  targetCategories: SkillCategory[];
  /** Categories we couldn't find a drill for in the current corpus. */
  uncovered: SkillCategory[];
  totalMinutes: number;
  drills: HomeworkDrill[];
  parentBlurb: string;
}

export interface HomeworkInput {
  age: number;
  /** Skill categories to focus on (e.g. derived from positions assigned). */
  targetCategories: SkillCategory[];
  /** Optional cap on drills returned (default 4). */
  maxDrills?: number;
  /** Optional minutes budget (default 25 min). */
  minutesBudget?: number;
  /** Restrict to low-equipment environments (default true). */
  homeOnly?: boolean;
}

const HOME_TIERS: ReadonlySet<Drill["environment_tier"]> = new Set([
  "T3_backyard",
  "T4_living_room",
]);

function tierBonus(tier: Drill["environment_tier"]): number {
  if (tier === "T4_living_room") return 4;
  if (tier === "T3_backyard") return 3;
  if (tier === "T2_cage_gym") return 1;
  return 0;
}

/**
 * Build a small at-home plan that maximally covers the requested categories
 * while staying inside the player's age band and a few-minutes budget.
 */
export function tailoredHomework(input: HomeworkInput): HomeworkPlan {
  const ageBand = getAgeBandKeyForAge(input.age);
  const maxDrills = input.maxDrills ?? 4;
  const budget = input.minutesBudget ?? 25;
  const homeOnly = input.homeOnly ?? false;
  const targetCategories = dedup(input.targetCategories);
  if (targetCategories.length === 0) {
    return {
      ageBand: ageBand ?? null,
      targetCategories: [],
      uncovered: [],
      totalMinutes: 0,
      drills: [],
      parentBlurb: "No targeted skills — no homework prescribed.",
    };
  }

  const pool = loadDrills().filter((d) => {
    if (d.review_status === "retired") return false;
    if (ageBand && !d.age_band.includes(ageBand)) return false;
    if (homeOnly && !HOME_TIERS.has(d.environment_tier)) return false;
    if (d.player_count_min > 2) return false; // doable with one parent/sibling
    if (d.coaches_min > 0) return false; // doable without a coach
    if (!d.pitch_smart_compliant) return false;
    return true;
  });

  const scored = pool
    .map((d) => {
      const cats = drillCategories(d);
      const matched = targetCategories.filter((c) => cats.has(c));
      const score = matched.length * 10 + tierBonus(d.environment_tier);
      return { drill: d, cats, matched, score };
    })
    .filter((s) => s.matched.length > 0)
    .sort((a, b) => b.score - a.score);

  const picked: HomeworkDrill[] = [];
  const covered = new Set<SkillCategory>();
  let minutes = 0;
  for (const s of scored) {
    if (picked.length >= maxDrills) break;
    // Greedy: prefer drills that add at least one not-yet-covered category.
    const newCoverage = s.matched.filter((c) => !covered.has(c));
    if (newCoverage.length === 0 && covered.size >= targetCategories.length) break;
    if (newCoverage.length === 0) continue;
    if (minutes + s.drill.duration_minutes > budget && picked.length > 0) continue;
    minutes += s.drill.duration_minutes;
    for (const c of s.matched) covered.add(c);
    picked.push({
      drillId: s.drill.drill_id,
      name: s.drill.name,
      shortDescription: s.drill.short_description,
      durationMinutes: s.drill.duration_minutes,
      environmentTier: s.drill.environment_tier,
      categories: Array.from(s.cats),
      matchedCategories: s.matched,
      rationale: `Builds ${s.matched.join(", ")}.`,
      kidFriendly: s.drill.kid_friendly,
    });
  }

  const uncovered = targetCategories.filter((c) => !covered.has(c));
  const blurb = picked.length === 0
    ? "No home drills matched yet — coach will assign in person."
    : `${picked.length} quick drill${picked.length === 1 ? "" : "s"} (~${minutes} min) targeting ${
        targetCategories.length === 0 ? "general development" : targetCategories.join(", ")
      }.`;

  return {
    ageBand: ageBand ?? null,
    targetCategories,
    uncovered,
    totalMinutes: minutes,
    drills: picked,
    parentBlurb: blurb,
  };
}

function dedup<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const v of arr) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}
