import type {
  CodeReport,
  Decision,
  LaunchReviewReport,
  Priority,
  QaReport,
  ReviewBucket,
  ReviewFinding,
  StageResult,
  UxReport,
} from "./types.ts";

// ─── Required launch flows (spec "Required Core Flows" + "Launch Test Matrix").
// Each flow maps to keywords we look for in QA scenario names. Flows with no
// matching scenario become `suggested_test_coverage_to_add` entries. ───
const REQUIRED_FLOWS: Array<{ label: string; keywords: string[] }> = [
  { label: "Signup → onboarding → first team", keywords: ["signup", "onboard", "coach"] },
  { label: "Add roster / edit player", keywords: ["roster", "player"] },
  { label: "Build + save + reopen lineup", keywords: ["lineup", "field", "e25"] },
  { label: "Adjust lineup after attendance change", keywords: ["attendance", "absent", "lineup"] },
  { label: "Create + share practice plan", keywords: ["practice", "compile", "coach"] },
  { label: "Import GameChanger stats / bad-file handling", keywords: ["import", "ingest", "stats", "csv"] },
  { label: "Parent-safe report (no coach-only notes leak)", keywords: ["parent", "press", "share"] },
  { label: "Free-plan limit / trial / upgrade / cancel", keywords: ["billing", "trial", "subscription", "upgrade"] },
  { label: "Billing failure handled gracefully", keywords: ["billing", "payment"] },
  { label: "Permission boundary: parent cannot see coach notes", keywords: ["permission", "parent", "safety"] },
  { label: "Permission boundary: assistant cannot access billing", keywords: ["permission", "assistant", "billing"] },
  { label: "Mobile game-day use", keywords: ["mobile", "game", "viewport"] },
  { label: "Account settings + logout", keywords: ["settings", "logout", "account"] },
];

// ─── Severity mapping per source ───

function qaPriority(sev: string): Priority | null {
  switch (sev) {
    case "blocker": return "P0";
    case "major": return "P1";
    case "minor": return "P2";
    default: return null; // info
  }
}
function codePriority(sev: string): Priority | null {
  switch (sev) {
    case "critical": return "P0";
    case "major": return "P1";
    case "minor": return "P2";
    case "info": return "P3";
    default: return null;
  }
}
function uxPriority(sev: string): Priority | null {
  switch (sev) {
    case "critical": return "P1"; // UX issues rarely hard-block; the worst is high-priority
    case "major": return "P2";
    case "minor": return "P2";
    default: return null; // info
  }
}

const SCORE_COST: Record<Priority, number> = { P0: 25, P1: 8, P2: 2, P3: 0.5 };
const PRIORITY_RANK: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

const UX_PERF_KINDS = new Set(["long-task", "navigation-cost", "click-heavy", "type-heavy"]);

function bucketFor(f: { source: string; kind?: string; owasp?: boolean; analyzer?: string; priority: Priority }): ReviewBucket {
  if (f.source === "a11y") return "accessibility_issues";
  if (f.source === "qa" && f.kind === "a11y") return "accessibility_issues";
  if (f.source === "code" && (f.owasp || f.analyzer === "security")) return "security_privacy_concerns";
  if (f.source === "ux") return f.kind && UX_PERF_KINDS.has(f.kind) ? "performance_issues" : "ux_friction";
  if (f.priority === "P0") return "critical_blockers";
  if (f.priority === "P1") return "high_priority_issues";
  return "missing_edge_cases";
}

// ─── Per-source mappers → ReviewFinding ───

function fromGates(gates: StageResult[]): ReviewFinding[] {
  return gates
    .filter((g) => !g.ok && !g.skipped)
    .map((g) => ({
      source: "gate" as const,
      priority: "P0" as const,
      bucket: "critical_blockers" as const,
      issue: `Deterministic gate failed: ${g.name} (${g.summary})`,
      userImpact: "A failing gate means the build/tests/types are broken — the app must not ship in this state.",
      evidence: g.output ? `${g.name} output:\n${g.output}` : `${g.name} exited non-zero`,
      recommendedFix: `Fix the ${g.name} failure and re-run the gate; the agent must not reason around it.`,
    }));
}

function fromQa(report: QaReport | null): ReviewFinding[] {
  if (!report) return [];
  const out: ReviewFinding[] = [];
  for (const b of report.bugs) {
    const priority = qaPriority(b.severity);
    if (!priority) continue;
    const bucket = bucketFor({ source: "qa", kind: b.kind, priority });
    out.push({
      source: "qa",
      priority,
      bucket,
      issue: `[${b.scenario}] ${b.kind}: ${b.message}`.slice(0, 240),
      userImpact: b.severity === "blocker"
        ? "Blocks a user from completing a core flow."
        : "Degrades a core flow or surfaces a defect to users.",
      evidence: [b.url && `url: ${b.url}`, b.status !== undefined && `status: ${b.status}`, b.step && `step: ${b.step}`]
        .filter(Boolean).join(" · ") || `scenario ${b.scenario}`,
      recommendedFix: "Reproduce via the QA scenario, fix the failing surface, and re-run the scenario green.",
      suggestedTest: `${b.scenario} (extend assertion for "${b.kind}")`,
    });
  }
  return out;
}

function fromUx(report: UxReport | null): ReviewFinding[] {
  if (!report) return [];
  const out: ReviewFinding[] = [];
  for (const f of report.findings) {
    const priority = uxPriority(f.severity);
    if (!priority) continue;
    const bucket = bucketFor({ source: "ux", kind: f.kind, priority });
    out.push({
      source: "ux",
      priority,
      bucket,
      issue: `[${f.persona}/${f.journey}] ${f.kind}: ${f.message}`.slice(0, 240),
      userImpact: "Adds friction that can confuse or slow a tired coach/parent on a phone at the field.",
      evidence: [f.url && `url: ${f.url}`, f.step && `step: ${f.step}`].filter(Boolean).join(" · ") || f.journey,
      recommendedFix: f.suggestion || "Improve the flow per the UX rubric.",
    });
  }
  return out;
}

function fromCode(report: CodeReport | null): ReviewFinding[] {
  if (!report) return [];
  const out: ReviewFinding[] = [];
  for (const f of report.findings) {
    const priority = codePriority(f.severity);
    if (!priority || priority === "P3") continue; // P3 code noise stays out of buckets
    const owasp = !!f.owasp;
    const bucket = bucketFor({ source: "code", owasp, analyzer: f.analyzer, priority });
    out.push({
      source: "code",
      priority,
      bucket,
      issue: `${f.analyzer}/${f.rule}: ${f.message}`.slice(0, 240),
      userImpact: owasp
        ? `Security exposure (${f.owasp}) — risks user data or access control.`
        : "Reliability / maintainability risk that can surface as a user-facing defect.",
      evidence: `${f.file}${f.line ? `:${f.line}` : ""}`,
      recommendedFix: f.suggestion,
    });
  }
  return out;
}

// ─── Derived qualitative lists ───

function suggestedCoverage(qa: QaReport | null, code: CodeReport | null): string[] {
  const out: string[] = [];
  const scenarioNames = (qa?.scenarios ?? []).map((s) => s.name.toLowerCase());
  for (const flow of REQUIRED_FLOWS) {
    const covered = scenarioNames.some((n) => flow.keywords.some((k) => n.includes(k)));
    if (!covered) out.push(`Add E2E coverage: ${flow.label}`);
  }
  // Code-agent test-hygiene findings → concrete test suggestions.
  for (const f of code?.findings ?? []) {
    if (f.analyzer === "testHygiene") out.push(`Add tests: ${f.message} (${f.file}${f.line ? `:${f.line}` : ""})`);
  }
  return [...new Set(out)];
}

function productImprovements(ux: UxReport | null): string[] {
  const out: string[] = [];
  for (const f of ux?.findings ?? []) {
    if (["empty-state", "deadend", "navigation-cost"].includes(f.kind) && f.suggestion) {
      out.push(`${f.journey}: ${f.suggestion}`);
    }
  }
  return [...new Set(out)].slice(0, 12);
}

// ─── Scoring + decision ───

function scoreFor(findings: ReviewFinding[]): number {
  const penalty = findings.reduce((acc, f) => acc + SCORE_COST[f.priority], 0);
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

function decisionFor(findings: ReviewFinding[], score: number, gatesFailed: boolean, serverReachable: boolean): Decision {
  if (gatesFailed || findings.some((f) => f.priority === "P0")) return "block";
  if (score < 60) return "risky";
  // E2E layers skipped (no live server) → cannot certify "ready".
  if (!serverReachable) return score < 85 ? "risky" : "acceptable";
  if (score < 85) return "acceptable";
  return "ready";
}

export interface AggregateInput {
  startedAt: string;
  finishedAt: string;
  baseUrl: string;
  serverReachable: boolean;
  gates: StageResult[];
  stages: StageResult[];
  qa: QaReport | null;
  ux: UxReport | null;
  code: CodeReport | null;
}

export function aggregate(input: AggregateInput): LaunchReviewReport {
  const findings: ReviewFinding[] = [
    ...fromGates(input.gates),
    ...fromQa(input.qa),
    ...fromUx(input.ux),
    ...fromCode(input.code),
  ];

  const byBucket = (b: ReviewBucket) => findings.filter((f) => f.bucket === b);
  const gatesFailed = input.gates.some((g) => !g.ok && !g.skipped);
  const score = scoreFor(findings);
  const decision = decisionFor(findings, score, gatesFailed, input.serverReachable);

  const top10 = [...findings]
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
    .slice(0, 10);

  return {
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    baseUrl: input.baseUrl,
    serverReachable: input.serverReachable,
    stages: [...input.gates, ...input.stages],
    launch_readiness_score: score,
    decision,
    critical_blockers: byBucket("critical_blockers"),
    high_priority_issues: byBucket("high_priority_issues"),
    ux_friction: byBucket("ux_friction"),
    missing_edge_cases: byBucket("missing_edge_cases"),
    security_privacy_concerns: byBucket("security_privacy_concerns"),
    accessibility_issues: byBucket("accessibility_issues"),
    performance_issues: byBucket("performance_issues"),
    recommended_product_improvements: productImprovements(input.ux),
    suggested_test_coverage_to_add: suggestedCoverage(input.qa, input.code),
    top_10_fixes_before_launch: top10,
  };
}
