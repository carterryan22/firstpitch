/**
 * Fix-Last-Game — the "most magical workflow." After a game, the coach taps the
 * symptoms they saw (missed cutoffs, force-play confusion, too many walks…) and
 * this turns them into the team's top priorities + a focused practice the
 * compiler can build.
 *
 * Symptoms are stored as game-scoped quick-tags (so they also roll up into Coach
 * Memory's "recurring team mistakes"). This engine is the pure mapping from a
 * bag of tapped symptom codes → ranked priorities → compiler focus + a deep
 * link into the practice builder.
 */

import type { IntentFocus } from "@platform/ai";
import { quickTagDef } from "./quickTags";

export interface FixPriority {
  code: string;
  /** Priority phrasing, e.g. "Force plays". */
  label: string;
  focus: IntentFocus[];
  /** One-line coach rationale. */
  why: string;
  /** How many times this symptom was tagged. */
  count: number;
}

export interface FixPlan {
  priorities: FixPriority[];
  /** Deduped focus union for the compiler (capped for a focused session). */
  focus: IntentFocus[];
  durationMin: number;
  /** Deep link into the practice builder, pre-loaded with focus + duration. */
  practiceHref: string;
}

const MAX_PRIORITIES = 3;
const MAX_FOCUS = 4;

/**
 * Build a practice recommendation from a bag of tapped symptom codes. Repeated
 * codes raise that symptom's rank (it bothered the coach more than once).
 */
export function symptomsToPlan(
  codes: string[],
  opts?: { teamId?: string; durationMin?: number },
): FixPlan {
  const durationMin = opts?.durationMin ?? 90;

  // Count occurrences of each mappable symptom.
  const counts: Record<string, number> = {};
  for (const code of codes) {
    const def = quickTagDef(code);
    if (!def || !def.focus) continue; // only symptoms that map to practice focus
    counts[code] = (counts[code] ?? 0) + 1;
  }

  const priorities: FixPriority[] = Object.entries(counts)
    .map(([code, count]) => {
      const def = quickTagDef(code)!;
      return {
        code,
        label: def.priority ?? def.label,
        focus: def.focus ?? [],
        why: def.need ?? def.priority ?? def.label,
        count,
      };
    })
    // Most-tagged first; stable by label for ties.
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, MAX_PRIORITIES);

  // Focus union, ordered by the priority ranking, deduped + capped.
  const focus: IntentFocus[] = [];
  for (const p of priorities) {
    for (const f of p.focus) {
      if (!focus.includes(f) && focus.length < MAX_FOCUS) focus.push(f);
    }
  }

  const params = new URLSearchParams();
  if (opts?.teamId) params.set("teamId", opts.teamId);
  if (focus.length > 0) params.set("focus", focus.join(","));
  params.set("duration", String(durationMin));

  return {
    priorities,
    focus,
    durationMin,
    practiceHref: `/practice/new?${params.toString()}`,
  };
}
