// @platform/research — render the competitor feature matrix to markdown and
// compute capability "white space" (features few competitors fully offer).

import { getFeatureMatrix, getPlatforms } from "./load";
import type { FeatureMatrixFile, Platform } from "./types";

const SYMBOL: Record<string, string> = { yes: "\u2713", partial: "~", no: "\u2717", unknown: "?" };
const OUR_ID = "firstpitch";

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function nameMap(platforms: Platform[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of platforms) map.set(p.id, p.name);
  map.set(OUR_ID, "First Pitch (target)");
  return map;
}

export interface WhiteSpaceCapability {
  featureId: string;
  label: string;
  yesCount: number;
}

/** Capabilities that few competitors fully offer (excludes our own target row). */
export function whiteSpaceCapabilities(
  matrix: FeatureMatrixFile = getFeatureMatrix(),
  maxYes = 3,
): WhiteSpaceCapability[] {
  const competitors = matrix.platforms.filter((p) => p.platformId !== OUR_ID);
  const out: WhiteSpaceCapability[] = [];
  for (const feature of matrix.capability_features) {
    let yesCount = 0;
    for (const row of competitors) {
      if ((row.cells[feature.id] ?? "unknown") === "yes") yesCount += 1;
    }
    if (yesCount <= maxYes) out.push({ featureId: feature.id, label: feature.label, yesCount });
  }
  out.sort((a, b) => (a.yesCount - b.yesCount) || a.label.localeCompare(b.label));
  return out;
}

/** Render the full matrix doc (capability grid + positioning + white space). */
export function renderFeatureMatrix(
  matrix: FeatureMatrixFile = getFeatureMatrix(),
  platforms: Platform[] = getPlatforms(),
): string {
  const names = nameMap(platforms);
  const nameFor = (id: string): string => names.get(id) ?? id;
  const lines: string[] = [];

  lines.push("# Competitor Feature Matrix");
  lines.push("");
  lines.push("> Generated from `corpus/competitor-research/feature-matrix.json` by `npm run research -- matrix`. Do not hand-edit. See `competitor-research-corpus-plan.md` \u00a710.");
  lines.push("");
  lines.push(`Legend: \u2713 full \u00b7 ~ partial/limited \u00b7 \u2717 absent \u00b7 ? not yet verified. "First Pitch (target)" is our intended state, not a competitor.`);
  lines.push("");

  // Capability grid
  const capHeader = ["Platform", ...matrix.capability_features.map((f) => f.label)];
  lines.push(`| ${capHeader.join(" | ")} |`);
  lines.push(`| ${capHeader.map(() => "---").join(" | ")} |`);
  for (const row of matrix.platforms) {
    const cells = matrix.capability_features.map((f) => {
      const raw = row.cells[f.id] ?? "unknown";
      return SYMBOL[raw] ?? escapeCell(raw);
    });
    lines.push(`| ${escapeCell(nameFor(row.platformId))} | ${cells.join(" | ")} |`);
  }
  lines.push("");

  // Positioning table
  lines.push("## Positioning");
  lines.push("");
  const textHeader = ["Platform", ...matrix.text_features.map((f) => f.label)];
  lines.push(`| ${textHeader.join(" | ")} |`);
  lines.push(`| ${textHeader.map(() => "---").join(" | ")} |`);
  for (const row of matrix.platforms) {
    const cells = matrix.text_features.map((f) => escapeCell(row.cells[f.id] ?? ""));
    lines.push(`| ${escapeCell(nameFor(row.platformId))} | ${cells.join(" | ")} |`);
  }
  lines.push("");

  // White space
  const gaps = whiteSpaceCapabilities(matrix);
  lines.push("## White space \u2014 capabilities few competitors fully offer");
  lines.push("");
  lines.push("Count = competitors (excluding First Pitch) marked \u2713 full for that capability.");
  lines.push("");
  lines.push("| Capability | Competitors with \u2713 |");
  lines.push("| --- | --- |");
  for (const gap of gaps) {
    lines.push(`| ${escapeCell(gap.label)} | ${gap.yesCount} |`);
  }
  lines.push("");

  return lines.join("\n");
}
