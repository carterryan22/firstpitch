import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pingServer, runCodeAgent, runQaAgent, runUxAgent } from "./agents.ts";
import { aggregate } from "./aggregate.ts";
import { runGates } from "./gates.ts";
import { renderMarkdown } from "./report.ts";
import type { CodeReport, QaReport, StageResult, UxReport } from "./types.ts";

// Default root = platform/ (two levels up from scripts/launch-review).
const ROOT = resolve(process.env.LR_ROOT ?? resolve(process.cwd(), "..", ".."));
const SCRIPTS = resolve(ROOT, "scripts");
const OUT_DIR = resolve(process.env.LR_OUT ?? resolve(ROOT, "reports"));
const BASE_URL = process.env.LR_BASE_URL ?? "http://localhost:3000";

function skip(name: string, reason: string): StageResult {
  return { name, ok: true, skipped: true, durationMs: 0, summary: `skipped (${reason})`, output: "" };
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  console.log(`[launch-review] root: ${ROOT}`);
  console.log(`[launch-review] target: ${BASE_URL}`);

  const stages: StageResult[] = [];

  // ── Layer A — deterministic gates ──
  console.log(`[launch-review] ▶ Layer A: deterministic gates`);
  const gates = runGates(ROOT);
  for (const g of gates) console.log(`[launch-review]   ${g.skipped ? "⏭" : g.ok ? "✅" : "❌"} ${g.name} (${g.summary})`);

  // ── Layer D input (static) — code agent. No server needed. ──
  let code: CodeReport | null = null;
  if (process.env.LR_SKIP_CODE === "1") {
    stages.push(skip("code-agent", "LR_SKIP_CODE=1"));
  } else {
    console.log(`[launch-review] ▶ code-agent (static analysis)`);
    const r = runCodeAgent(SCRIPTS);
    stages.push(r.stage);
    code = r.report;
    console.log(`[launch-review]   ${r.stage.ok ? "✅" : "❌"} ${r.stage.summary}`);
  }

  // ── Layers B/C — require a live server; run SEQUENTIALLY (never concurrent). ──
  const serverReachable = await pingServer(BASE_URL);
  let qa: QaReport | null = null;
  let ux: UxReport | null = null;

  if (!serverReachable) {
    console.log(`[launch-review] ⚠ no live app at ${BASE_URL} — skipping QA + UX layers`);
    stages.push(skip("qa-agent", "no live server"));
    stages.push(skip("ux-agent", "no live server"));
  } else {
    if (process.env.LR_SKIP_QA === "1") {
      stages.push(skip("qa-agent", "LR_SKIP_QA=1"));
    } else {
      console.log(`[launch-review] ▶ Layer B: QA agent (scripted E2E)`);
      const r = runQaAgent(SCRIPTS, BASE_URL);
      stages.push(r.stage);
      qa = r.report;
      console.log(`[launch-review]   ${r.stage.ok ? "✅" : "❌"} ${r.stage.summary}`);
    }
    if (process.env.LR_SKIP_UX === "1") {
      stages.push(skip("ux-agent", "LR_SKIP_UX=1"));
    } else {
      console.log(`[launch-review] ▶ Layer C: UX agent (exploratory journeys)`);
      const r = runUxAgent(SCRIPTS, BASE_URL);
      stages.push(r.stage);
      ux = r.report;
      console.log(`[launch-review]   ${r.stage.ok ? "✅" : "❌"} ${r.stage.summary}`);
    }
  }

  // ── Layer D — aggregate ──
  const report = aggregate({
    startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    serverReachable,
    gates,
    stages,
    qa,
    ux,
    code,
  });

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(resolve(OUT_DIR, "launch-review.json"), JSON.stringify(report, null, 2), "utf8");
  writeFileSync(resolve(OUT_DIR, "launch-review.md"), renderMarkdown(report), "utf8");

  console.log("");
  console.log(`[launch-review] decision: ${report.decision.toUpperCase()} · score: ${report.launch_readiness_score}/100`);
  console.log(
    `[launch-review] blockers:${report.critical_blockers.length} high:${report.high_priority_issues.length} ` +
      `sec:${report.security_privacy_concerns.length} a11y:${report.accessibility_issues.length} ` +
      `ux:${report.ux_friction.length} perf:${report.performance_issues.length}`,
  );
  console.log(`[launch-review] report → ${resolve(OUT_DIR, "launch-review.md")}`);

  // Gate CI on a blocking decision.
  if (report.decision === "block") process.exit(1);
}

main().catch((e) => {
  console.error(`[launch-review] fatal: ${(e as Error).stack ?? (e as Error).message}`);
  process.exit(1);
});
