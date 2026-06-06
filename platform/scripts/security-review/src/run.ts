import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ANALYZERS } from "./analyzers.ts";
import { runGates } from "./gates.ts";
import { buildReport, renderMarkdown } from "./report.ts";
import { collectSources } from "./walk.ts";
import type { SecFinding } from "./types.ts";

// Default root = platform/ (two levels up from scripts/security-review).
const ROOT = resolve(process.env.SR_ROOT ?? resolve(process.cwd(), "..", ".."));
// Reports land in platform/reports/ next to the launch-review artifacts.
const OUT_DIR = resolve(process.env.SR_OUT ?? resolve(ROOT, "reports"));
const ONLY = process.env.SR_ONLY?.toLowerCase();

function main(): void {
  const startedAt = new Date().toISOString();
  console.log(`[security-review] auditing ${ROOT}…`);

  const sources = collectSources(ROOT);
  console.log(`[security-review] ${sources.length} source files`);

  const findings: SecFinding[] = [];
  for (const file of sources) {
    for (const analyze of ANALYZERS) {
      for (const f of analyze(file)) {
        if (ONLY && f.analyzer.toLowerCase() !== ONLY && f.category.toLowerCase() !== ONLY) continue;
        findings.push(f);
      }
    }
  }

  const { gates, dependencyFindings } = ONLY
    ? { gates: [], dependencyFindings: [] }
    : runGates(ROOT);
  findings.push(...dependencyFindings);

  const report = buildReport({
    startedAt,
    finishedAt: new Date().toISOString(),
    root: ROOT,
    filesScanned: sources.length,
    gates,
    findings,
  });

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(resolve(OUT_DIR, "security-review.md"), renderMarkdown(report), "utf8");
  writeFileSync(resolve(OUT_DIR, "security-review.json"), JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log(`[security-review] decision: ${report.security_decision.toUpperCase()} · score: ${report.security_score}/100`);
  console.log(
    `[security-review] P0:${report.p0_blockers.length} P1:${report.p1_high_risks.length} ` +
      `secrets:${report.secret_findings.length} authz:${report.role_permission_failures.length} ` +
      `privacy:${report.data_privacy_findings.length} billing:${report.billing_findings.length} ` +
      `dep:${report.dependency_findings.length} infra:${report.infrastructure_findings.length}`,
  );
  for (const g of gates) console.log(`[security-review] gate ${g.name}: ${g.skipped ? "skipped" : g.ok ? "PASS" : "FAIL"} (${g.summary})`);
  console.log(`[security-review] report → ${resolve(OUT_DIR, "security-review.md")}`);

  // The security agent has authority to block launch: any P0 (finding or gate)
  // exits non-zero so CI / the combined launch gate fails hard.
  if (report.security_decision === "blocked") process.exit(1);
}

main();
