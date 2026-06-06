import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ANALYZERS } from "./analyzers.ts";
import { runGates } from "./gates.ts";
import { renderReport } from "./report.ts";
import { collectSources } from "./walk.ts";
import type { Finding, RunReport } from "./types.ts";

// Default root = platform/ (two levels up from scripts/code-agent).
const ROOT = resolve(process.env.CODE_ROOT ?? resolve(process.cwd(), "..", ".."));
const OUT_DIR = resolve(process.cwd(), process.env.CODE_OUT ?? "code-report");
const ONLY = process.env.CODE_ONLY?.toLowerCase();

function main(): void {
  const startedAt = new Date().toISOString();
  console.log(`[code-agent] scanning ${ROOT}…`);

  const sources = collectSources(ROOT);
  console.log(`[code-agent] ${sources.length} source files`);

  const findings: Finding[] = [];
  for (const file of sources) {
    for (const analyze of ANALYZERS) {
      for (const f of analyze(file)) {
        if (ONLY && f.analyzer.toLowerCase() !== ONLY) continue;
        findings.push(f);
      }
    }
  }

  const gates = ONLY ? [] : runGates(ROOT);

  const report: RunReport = {
    root: ROOT,
    startedAt,
    finishedAt: new Date().toISOString(),
    filesScanned: sources.length,
    findings,
    gates,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const md = renderReport(report);
  writeFileSync(resolve(OUT_DIR, "report.md"), md, "utf8");
  writeFileSync(resolve(OUT_DIR, "report.json"), JSON.stringify(report, null, 2), "utf8");

  const counts = findings.reduce<Record<string, number>>((a, f) => { a[f.severity] = (a[f.severity] ?? 0) + 1; return a; }, {});
  const gatesFailed = gates.filter((g) => !g.ok && !g.skipped);
  console.log(`[code-agent] ${findings.length} findings (${Object.entries(counts).map(([s, n]) => `${s}:${n}`).join(", ") || "none"})`);
  for (const g of gates) console.log(`[code-agent] gate ${g.name}: ${g.skipped ? "skipped" : g.ok ? "PASS" : "FAIL"} (${g.summary})`);
  console.log(`[code-agent] report → ${resolve(OUT_DIR, "report.md")}`);

  // Exit non-zero on a blocker (failed gate or any critical finding) so CI can gate on it.
  if (gatesFailed.length > 0 || (counts.critical ?? 0) > 0) process.exit(1);
}

main();
