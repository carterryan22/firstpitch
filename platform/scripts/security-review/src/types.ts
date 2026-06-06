/**
 * Security Review Agent — shared types.
 *
 * This agent is intentionally stricter than the QA/UX/launch reviewers. Where
 * those ask "does the product work well?", this one asks "can the wrong person
 * access, alter, leak, or destroy data?". It is grounded in:
 *   - OWASP ASVS 5.0  (technical security control checklist)
 *   - OWASP WSTG      (auth / authz / session / data-validation test areas)
 *   - OWASP Top 10 2025 (Broken Access Control is still #1)
 *   - OWASP API Security Top 10 2023 (BOLA / BFLA / resource consumption)
 *
 * Severity uses the spec's P0–P3 ladder. ANY unresolved P0 blocks launch.
 */

/** Launch-blocker severity ladder. P0 = launch blocked, no exceptions. */
export type Severity = "P0" | "P1" | "P2" | "P3";

/** Which security domain a finding belongs to (drives report bucketing). */
export type Category =
  | "auth"
  | "authz"
  | "secrets"
  | "injection"
  | "privacy"
  | "crypto"
  | "headers"
  | "cookies"
  | "billing"
  | "rate-limit"
  | "config"
  | "dependency";

/**
 * OWASP reference tag. Mixes Top-10 2025/2021 categories with the API Security
 * Top 10 (API#) so each finding points back to an authoritative control.
 */
export type OwaspTag =
  | "A01:Broken-Access-Control"
  | "A02:Cryptographic-Failures"
  | "A03:Injection"
  | "A04:Insecure-Design"
  | "A05:Security-Misconfiguration"
  | "A06:Vulnerable-Components"
  | "A07:Identification-and-Auth-Failures"
  | "A08:Software-and-Data-Integrity"
  | "A09:Logging-and-Monitoring-Failures"
  | "API1:Broken-Object-Level-Authorization"
  | "API2:Broken-Authentication"
  | "API3:Broken-Object-Property-Level-Authorization"
  | "API5:Broken-Function-Level-Authorization"
  | "API4:Unrestricted-Resource-Consumption";

/** A normalized static security finding. */
export interface SecFinding {
  analyzer: string;
  /** Stable rule id within the analyzer (e.g. "missing-auth-gate"). */
  rule: string;
  severity: Severity;
  category: Category;
  owasp: OwaspTag;
  /** Repo-root-relative POSIX path. */
  file: string;
  line?: number;
  /** Affected route, when the finding is route-scoped (e.g. POST /api/...). */
  route?: string;
  message: string;
  /** Concrete remediation. */
  suggestion: string;
  /** Acceptance criteria — how to know the fix is complete. */
  acceptance?: string;
  /** Suggested automated test that would lock the fix in. */
  suggestedTest?: string;
  /** The offending source line, trimmed/redacted. */
  snippet?: string;
}

export interface SourceFile {
  abs: string;
  /** Repo-root-relative POSIX path. */
  rel: string;
  content: string;
  lines: string[];
  isTest: boolean;
  isScript: boolean;
  /** Under apps/web/app/api (a Next.js route handler tree). */
  isApiRoute: boolean;
  /** Carries a "use client" directive (ships to the browser bundle). */
  isClient: boolean;
  /** Exported HTTP method handlers found in the file (GET/POST/...). */
  handlers: string[];
}

export type Analyzer = (file: SourceFile) => SecFinding[];

/** A deterministic gate (dependency audit, optional test run). */
export interface GateResult {
  name: string;
  ok: boolean;
  durationMs: number;
  summary: string;
  output: string;
  skipped?: boolean;
  /** Severity to attribute to a gate failure (audit high/critical → P1/P0). */
  failSeverity?: Severity;
}

export type Decision = "blocked" | "risky" | "acceptable" | "ready";

/**
 * The Security Review report. Field names mirror the spec's JSON contract so a
 * downstream AI reviewer or the combined launch gate can consume it verbatim.
 */
export interface SecurityReviewReport {
  startedAt: string;
  finishedAt: string;
  root: string;
  filesScanned: number;
  gates: GateResult[];

  security_decision: Decision;
  security_score: number;

  p0_blockers: SecFinding[];
  p1_high_risks: SecFinding[];
  role_permission_failures: SecFinding[];
  api_security_findings: SecFinding[];
  auth_session_findings: SecFinding[];
  data_privacy_findings: SecFinding[];
  billing_findings: SecFinding[];
  dependency_findings: SecFinding[];
  secret_findings: SecFinding[];
  infrastructure_findings: SecFinding[];

  recommended_fixes: string[];
  required_tests_to_add: string[];
  launch_recommendation: string;
}
