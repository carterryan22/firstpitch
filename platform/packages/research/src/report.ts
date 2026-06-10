// @platform/research — synthesize the corpus into a research report (markdown).
// Aggregates corpus stats, ranked opportunities, and top pains/requests/JTBD.

import { getCorpus, getPlatformsFile, getScoringConfig, getTaxonomy } from "./load";
import { opportunityStats } from "./score";
import type { CorpusItem, TaxonomyTerm } from "./types";

function incr(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function countScalar(items: CorpusItem[], field: keyof CorpusItem): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const value = item[field];
    if (typeof value === "string") incr(map, value);
  }
  return map;
}

function countArray(items: CorpusItem[], field: keyof CorpusItem): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const value = item[field];
    if (Array.isArray(value)) for (const tag of value) if (typeof tag === "string") incr(map, tag);
  }
  return map;
}

function sortedEntries(map: Map<string, number>, topN?: number): Array<[string, number]> {
  const entries = [...map.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
  return typeof topN === "number" ? entries.slice(0, topN) : entries;
}

function labelMap(terms: TaxonomyTerm[]): Map<string, string> {
  return new Map(terms.map((t) => [t.id, t.label]));
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

/** Build the full research report markdown. `generatedOn` is injectable for deterministic tests. */
export function buildReport(generatedOn: string = new Date().toISOString().slice(0, 10)): string {
  const items = getCorpus();
  const scoring = getScoringConfig();
  const taxonomy = getTaxonomy();
  const platformsFile = getPlatformsFile();
  const stats = opportunityStats(items, 10, scoring);

  const jobLabels = labelMap(taxonomy.jobs_to_be_done);
  const painLabels = labelMap(taxonomy.pain_points);
  const featureLabels = labelMap(taxonomy.feature_opportunities);

  const lines: string[] = [];
  lines.push("# Competitor Research Report");
  lines.push("");
  lines.push(`> Generated from \`corpus/competitor-research/corpus.json\` by \`npm run research -- report\` on ${generatedOn}. Do not hand-edit.`);
  lines.push("");

  // Overview
  lines.push("## Corpus overview");
  lines.push("");
  lines.push(`- Items: **${items.length}** (scored ${stats.scored}, unscored ${stats.unscored})`);
  lines.push(`- MVP-candidate insights (opportunity_score \u2265 ${scoring.mvp_threshold}): **${stats.mvpCandidates}**`);
  lines.push(`- Average opportunity score: **${stats.averageScore} / ${scoring.max_score}**`);
  lines.push("");
  const bySource = sortedEntries(countScalar(items, "source_type"));
  lines.push(`- By source type: ${bySource.map(([k, n]) => `${k} ${n}`).join(" \u00b7 ")}`);
  const bySentiment = sortedEntries(countScalar(items, "sentiment"));
  lines.push(`- By sentiment: ${bySentiment.map(([k, n]) => `${k} ${n}`).join(" \u00b7 ")}`);
  const byCategory = sortedEntries(countArray(items, "platform_category"));
  lines.push(`- By category: ${byCategory.map(([k, n]) => `${k} ${n}`).join(" \u00b7 ")}`);
  lines.push("");

  // Top opportunities
  lines.push("## Top opportunities");
  lines.push("");
  lines.push("| # | Score | MVP | Platform | Product implication |");
  lines.push("| --- | --- | --- | --- | --- |");
  stats.top.forEach((opp, i) => {
    const mvp = opp.score >= scoring.mvp_threshold ? "\u2605" : "";
    lines.push(`| ${i + 1} | ${opp.score} | ${mvp} | ${escapeCell(opp.platform)} | ${escapeCell(opp.implication ?? "")} |`);
  });
  lines.push("");

  // MVP candidates
  const mvp = items
    .filter((it) => typeof it.opportunity_score === "number" && it.opportunity_score >= scoring.mvp_threshold)
    .sort((a, b) => (b.opportunity_score ?? 0) - (a.opportunity_score ?? 0) || a.source_id.localeCompare(b.source_id));
  lines.push(`## MVP-candidate insights (\u2265 ${scoring.mvp_threshold})`);
  lines.push("");
  for (const item of mvp) {
    lines.push(`- **${item.opportunity_score}** \u2014 ${escapeCell(item.platform_name)} (\`${item.source_id}\`): ${item.product_implication ?? item.clean_text}`);
  }
  lines.push("");

  // Top pains
  const renderTagTable = (title: string, entries: Array<[string, number]>, labels: Map<string, string>) => {
    lines.push(`## ${title}`);
    lines.push("");
    lines.push("| Tag | Count |");
    lines.push("| --- | --- |");
    for (const [id, n] of entries) lines.push(`| ${escapeCell(labels.get(id) ?? id)} | ${n} |`);
    lines.push("");
  };
  renderTagTable("Top pain points", sortedEntries(countArray(items, "pain_points"), 12), painLabels);
  renderTagTable("Top feature requests", sortedEntries(countArray(items, "feature_requests"), 12), featureLabels);
  renderTagTable("Top jobs-to-be-done", sortedEntries(countArray(items, "job_to_be_done"), 10), jobLabels);

  // Backlog status
  const byWave = new Map<number, number>();
  for (const p of platformsFile.platforms) byWave.set(p.wave, (byWave.get(p.wave) ?? 0) + 1);
  lines.push("## Research backlog");
  lines.push("");
  lines.push(`- Platforms catalogued: **${platformsFile.platforms.length}**`);
  for (const wave of [1, 2, 3]) {
    lines.push(`  - Wave ${wave} (${platformsFile.waves[String(wave)] ?? ""}): ${byWave.get(wave) ?? 0}`);
  }
  lines.push("");

  return lines.join("\n");
}
