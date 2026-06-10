// @platform/research — opportunity scoring (competitor-research-corpus-plan.md §7).
// opportunity_score = sum of eight 1-5 dimensions => 8-40. >= mvp_threshold => MVP candidate.

import { getScoringConfig } from "./load";
import type { CorpusItem, ScoringConfig } from "./types";

export interface OpportunityScore {
  total: number;
  max: number;
  threshold: number;
  isMvpCandidate: boolean;
  perDimension: Record<string, number>;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Score one insight from explicit per-dimension values. Missing/invalid dimensions
 * default to the scale minimum; every value is clamped into [min, max].
 */
export function scoreOpportunity(
  input: Record<string, number>,
  config: ScoringConfig = getScoringConfig(),
): OpportunityScore {
  const { min, max } = config.scale;
  const perDimension: Record<string, number> = {};
  let total = 0;
  for (const dim of config.dimensions) {
    const raw = input[dim.id];
    const value = clamp(typeof raw === "number" && Number.isFinite(raw) ? raw : min, min, max);
    perDimension[dim.id] = value;
    total += value;
  }
  return {
    total,
    max: config.max_score,
    threshold: config.mvp_threshold,
    isMvpCandidate: total >= config.mvp_threshold,
    perDimension,
  };
}

/** True when a stored opportunity_score clears the MVP threshold. */
export function isMvpCandidate(score: number, config: ScoringConfig = getScoringConfig()): boolean {
  return score >= config.mvp_threshold;
}

export interface RankedOpportunity {
  id: string;
  platform: string;
  score: number;
  implication: string | null;
}

export interface OpportunityStats {
  scored: number;
  unscored: number;
  mvpCandidates: number;
  averageScore: number;
  top: RankedOpportunity[];
}

/** Aggregate the stored opportunity_score across corpus items and rank the top N. */
export function opportunityStats(
  items: CorpusItem[],
  topN = 10,
  config: ScoringConfig = getScoringConfig(),
): OpportunityStats {
  const ranked: RankedOpportunity[] = [];
  let sum = 0;
  let unscored = 0;
  for (const item of items) {
    const score = item.opportunity_score;
    if (typeof score !== "number") {
      unscored += 1;
      continue;
    }
    sum += score;
    ranked.push({
      id: item.source_id,
      platform: item.platform_name,
      score,
      implication: item.product_implication ?? null,
    });
  }
  ranked.sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id));
  const scored = ranked.length;
  return {
    scored,
    unscored,
    mvpCandidates: ranked.filter((r) => r.score >= config.mvp_threshold).length,
    averageScore: scored === 0 ? 0 : Math.round((sum / scored) * 10) / 10,
    top: ranked.slice(0, topN),
  };
}
