// Compiler v2 extensions: home-mission picker, plan→markdown, anti-line, season weighting.

import { loadDrills, type Drill } from "@platform/corpus";
import type { CompileResult, CompiledBlock, CompileInput } from "./index";

export type SeasonState = "preseason" | "in_season" | "tournament" | "postseason" | "offseason";

export interface HomeMissionInput {
  age: number;
  focus: string[];
  durationMin?: number;
}

/** E6.8 — pick ONE living-room mission a player can do alone. */
export function homeMission(input: HomeMissionInput): Drill | null {
  const drills = loadDrills().filter(
    (d) => d.environment_tier === "T4_living_room" &&
      d.player_count_min <= 1 &&
      d.coaches_min === 0 &&
      d.review_status !== "retired"
  );
  const matchFocus = drills.filter((d) => input.focus.includes(d.topic));
  const pool = matchFocus.length > 0 ? matchFocus : drills;
  if (pool.length === 0) return null;
  if (input.durationMin) {
    const fit = pool.filter((d) => d.duration_minutes <= input.durationMin!);
    if (fit.length > 0) return fit[0]!;
  }
  return pool[0]!;
}

/** E12.1 — render a plan as printable markdown. */
export function planToMarkdown(plan: CompileResult, meta?: { title?: string; date?: Date }): string {
  const lines: string[] = [];
  const title = meta?.title ?? `Practice plan — ${plan.ageBand}`;
  const date = (meta?.date ?? new Date()).toISOString().slice(0, 10);
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`- Date: ${date}`);
  lines.push(`- Age band: ${plan.ageBand}`);
  lines.push(`- Quality score: ${plan.qualityScore}/100`);
  lines.push(`- Throwing load: ${plan.totalThrowingLoad} pitches`);
  lines.push("");
  if (plan.blocked.length) {
    lines.push("## ⛔ Blocked");
    for (const b of plan.blocked) lines.push(`- ${b}`);
    lines.push("");
  }
  if (plan.warnings.length) {
    lines.push("## ⚠️ Warnings");
    for (const w of plan.warnings) lines.push(`- ${w}`);
    lines.push("");
  }
  lines.push("## Blocks");
  for (const b of plan.blocks) {
    const name = b.drill?.name ?? b.type;
    lines.push(`### ${b.blockId} — ${name} (${b.durationMin}min)`);
    if (b.drill) {
      lines.push(`*${b.drill.short_description}*`);
      if (b.drill.coaching_cues?.length) {
        lines.push("");
        lines.push("**Coaching cues:**");
        for (const c of b.drill.coaching_cues) lines.push(`- ${c}`);
      }
    }
    for (const n of b.notes) lines.push(`> ${n}`);
    lines.push("");
  }
  return lines.join("\n");
}

/** E12.2 — flag blocks where the ratio of players to coach-supervised stations is too high. */
export interface AntiLineReport {
  ok: boolean;
  flaggedBlocks: Array<{ blockId: string; ratio: number; suggestedStations: number }>;
}
export function antiLineCheck(
  plan: CompileResult,
  ctx: { players: number; coaches: number; maxPlayersPerStation?: number }
): AntiLineReport {
  const cap = ctx.maxPlayersPerStation ?? 4;
  // Assume coaches each supervise 1 station unless a drill specifies stations/lines.
  const stations = Math.max(1, ctx.coaches);
  const ratio = ctx.players / stations;
  const flagged: AntiLineReport["flaggedBlocks"] = [];
  for (const b of plan.blocks) {
    if (b.type === "rest" || b.type === "cooldown" || b.type === "warmup") continue;
    if (ratio > cap) {
      flagged.push({
        blockId: b.blockId,
        ratio: Number(ratio.toFixed(2)),
        suggestedStations: Math.ceil(ctx.players / cap),
      });
    }
  }
  return { ok: flagged.length === 0, flaggedBlocks: flagged };
}

/** E13.1 — season-aware re-weighting of focus topics. Returns a re-ordered focus array. */
export function weightFocusBySeason(focus: string[], season: SeasonState): string[] {
  const priority: Record<SeasonState, string[]> = {
    preseason: ["throwing", "speed", "fielding", "hitting"],
    in_season: ["hitting", "throwing", "fielding", "speed"],
    tournament: ["recovery", "mental_recovery", "hitting", "fielding"],
    postseason: ["recovery", "mental_recovery"],
    offseason: ["speed", "strength", "throwing", "hitting"],
  };
  const order = priority[season];
  const ranked = [...focus].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return ranked;
}

/** E12.x — score breakdown for transparency. */
export interface ScoreBreakdown {
  warmup: number;
  cooldown: number;
  focusCoverage: number;
  blockCount: number;
  total: number;
}
export function scoreBreakdown(plan: CompileResult, input: CompileInput): ScoreBreakdown {
  const warmup = plan.blocks.some((b: CompiledBlock) => b.type === "warmup") ? 25 : 0;
  const cooldown = plan.blocks.some((b: CompiledBlock) => b.type === "cooldown") ? 10 : 0;
  const covered = new Set(plan.blocks.filter((b) => b.drill).map((b) => b.drill!.topic));
  const focusCovered = input.focus.filter((f) => covered.has(f)).length;
  const focusCoverage = Math.round((focusCovered / Math.max(1, input.focus.length)) * 50);
  return {
    warmup,
    cooldown,
    focusCoverage,
    blockCount: plan.blocks.length,
    total: Math.min(100, warmup + cooldown + focusCoverage),
  };
}
