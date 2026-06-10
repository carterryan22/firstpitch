// @platform/research CLI. Run from platform/: `npm run research -- <command>`.
// Commands: summary (default) | validate | matrix | report | all

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getCorpus, getPlatformsFile, getScoringConfig } from "./load";
import { opportunityStats } from "./score";
import { validateCorpus } from "./validate";
import { renderFeatureMatrix } from "./matrix";
import { buildReport } from "./report";

function findWorkspaceRoot(start: string = process.cwd()): string {
  let dir = path.resolve(start);
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(dir, "corpus", "competitor-research", "platforms.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(start, ".."); // fallback: cwd is platform/, root is its parent
}

function cmdSummary(): void {
  const items = getCorpus();
  const platforms = getPlatformsFile().platforms;
  const scoring = getScoringConfig();
  const stats = opportunityStats(items, 5, scoring);
  console.log("Competitor research corpus");
  console.log(`  items: ${items.length} | platforms: ${platforms.length} | MVP candidates (>= ${scoring.mvp_threshold}): ${stats.mvpCandidates}`);
  console.log(`  avg opportunity score: ${stats.averageScore}/${scoring.max_score}`);
  console.log("  top opportunities:");
  for (const o of stats.top) console.log(`    ${o.score}  ${o.platform} \u2014 ${o.implication ?? ""}`);
}

function cmdValidate(): number {
  const report = validateCorpus();
  for (const issue of report.issues) {
    console.log(`  [${issue.level}] ${issue.itemId}: ${issue.message}`);
  }
  console.log(`validate: ${report.errorCount} error(s), ${report.warningCount} warning(s) across corpus`);
  return report.ok ? 0 : 1;
}

function cmdMatrix(root: string): void {
  const out = path.join(root, "competitor-feature-matrix.md");
  writeFileSync(out, `${renderFeatureMatrix()}\n`, "utf8");
  console.log(`wrote ${out}`);
}

function cmdReport(root: string): void {
  const dir = path.join(root, "corpus", "competitor-research");
  mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "research-report.md");
  writeFileSync(out, `${buildReport()}\n`, "utf8");
  console.log(`wrote ${out}`);
}

const command = process.argv[2] ?? "summary";
const root = findWorkspaceRoot();

switch (command) {
  case "summary":
    cmdSummary();
    break;
  case "validate":
    process.exit(cmdValidate());
    break;
  case "matrix":
    cmdMatrix(root);
    break;
  case "report":
    cmdReport(root);
    break;
  case "all":
    cmdMatrix(root);
    cmdReport(root);
    cmdSummary();
    break;
  default:
    console.error(`unknown command "${command}". Use: summary | validate | matrix | report | all`);
    process.exit(2);
}
