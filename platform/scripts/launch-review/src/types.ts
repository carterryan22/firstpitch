/**
 * Launch Review Agent — shared types.
 *
 * The orchestrator runs four layers (deterministic gates → scripted E2E → UX
 * exploration → static code review + a11y), normalizes every artifact into a
 * single `ReviewFinding` model, then buckets those findings into the
 * structured `LaunchReviewReport` the spec calls for.
 */

/** Launch-blocker severity ladder (spec "Agent Severity Rules"). */
export type Priority = "P0" | "P1" | "P2" | "P3";

/** Which layer / agent produced a finding. */
export type FindingSource = "gate" | "qa" | "ux" | "code" | "a11y";

/**
 * Which section of the launch report a finding lands in. Drives bucketing in
 * aggregate.ts; mirrors the keys of the structured report.
 */
export type ReviewBucket =
  | "critical_blockers"
  | "high_priority_issues"
  | "ux_friction"
  | "missing_edge_cases"
  | "security_privacy_concerns"
  | "accessibility_issues"
  | "performance_issues";

/**
 * Normalized finding in the spec's "Auto-Suggest Improvements" shape. Every
 * sub-agent artifact is mapped onto this so the report is uniform.
 */
export interface ReviewFinding {
  source: FindingSource;
  priority: Priority;
  bucket: ReviewBucket;
  /** One-line problem statement. */
  issue: string;
  /** Why a real user / the business is hurt by it. */
  userImpact: string;
  /** Where it was observed (scenario, file:line, route, gate name). */
  evidence: string;
  /** Concrete remediation — file path when known. */
  recommendedFix: string;
  /** Optional follow-up test that would lock the fix in. */
  suggestedTest?: string;
}

/** Result of a single deterministic gate (Layer A) or a sub-agent run. */
export interface StageResult {
  name: string;
  ok: boolean;
  skipped: boolean;
  durationMs: number;
  summary: string;
  /** Tail of command output / a short note, for the markdown report. */
  output: string;
}

/** Final go/no-go verdict. */
export type Decision = "block" | "risky" | "acceptable" | "ready";

/**
 * The structured Launch Review report (Layer D). Field names match the JSON
 * contract in the spec so downstream tooling / the AI reviewer can consume it.
 */
export interface LaunchReviewReport {
  startedAt: string;
  finishedAt: string;
  baseUrl: string;
  /** Whether a live app was reachable (controls whether QA/UX ran). */
  serverReachable: boolean;
  /** Deterministic gates + sub-agent stage outcomes. */
  stages: StageResult[];
  launch_readiness_score: number;
  decision: Decision;
  critical_blockers: ReviewFinding[];
  high_priority_issues: ReviewFinding[];
  ux_friction: ReviewFinding[];
  missing_edge_cases: ReviewFinding[];
  security_privacy_concerns: ReviewFinding[];
  accessibility_issues: ReviewFinding[];
  performance_issues: ReviewFinding[];
  recommended_product_improvements: string[];
  suggested_test_coverage_to_add: string[];
  top_10_fixes_before_launch: ReviewFinding[];
}

// ─── Sub-agent artifact shapes (subset we read from each report.json) ───

export interface QaBug {
  scenario: string;
  step?: string;
  kind: string;
  severity: "blocker" | "major" | "minor" | "info";
  url?: string;
  status?: number;
  message: string;
}
export interface QaReport {
  scenarios: Array<{ name: string; persona: string }>;
  bugs: QaBug[];
}

export interface UxFinding {
  persona: string;
  journey: string;
  step?: string;
  kind: string;
  severity: "critical" | "major" | "minor" | "info";
  url?: string;
  message: string;
  suggestion: string;
}
export interface UxReport {
  journeys: Array<{ name: string; persona: string; completed: boolean }>;
  findings: UxFinding[];
}

export interface CodeFinding {
  analyzer: string;
  rule: string;
  severity: "critical" | "major" | "minor" | "info";
  file: string;
  line?: number;
  message: string;
  suggestion: string;
  owasp?: string;
}
export interface CodeReport {
  filesScanned: number;
  findings: CodeFinding[];
  gates: Array<{ name: string; ok: boolean; skipped?: boolean; summary: string }>;
}
