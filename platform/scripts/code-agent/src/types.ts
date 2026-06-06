export type Severity = "critical" | "major" | "minor" | "info";

/** OWASP Top-10 (2021) category tags used by the security analyzer. */
export type OwaspTag =
  | "A01:Broken-Access-Control"
  | "A02:Cryptographic-Failures"
  | "A03:Injection"
  | "A05:Security-Misconfiguration"
  | "A07:Identification-and-Auth-Failures"
  | "A08:Software-and-Data-Integrity";

export interface Finding {
  /** Analyzer that produced the finding (e.g. "security", "type-safety"). */
  analyzer: string;
  /** Stable rule id within the analyzer (e.g. "hardcoded-secret"). */
  rule: string;
  severity: Severity;
  /** Repo-root-relative path (POSIX separators). */
  file: string;
  line?: number;
  message: string;
  /** Concrete remediation. */
  suggestion: string;
  /** The offending source line, trimmed. */
  snippet?: string;
  owasp?: OwaspTag;
}

export interface SourceFile {
  /** Absolute path. */
  abs: string;
  /** Repo-root-relative POSIX path. */
  rel: string;
  content: string;
  lines: string[];
  isTest: boolean;
  isScript: boolean;
  /** Under apps/web/app/api (a Next.js route handler tree). */
  isApiRoute: boolean;
}

export type Analyzer = (file: SourceFile) => Finding[];

export interface GateResult {
  name: string;
  ok: boolean;
  durationMs: number;
  summary: string;
  /** Tail of the command output, for the report. */
  output: string;
  skipped?: boolean;
}

export interface RunReport {
  root: string;
  startedAt: string;
  finishedAt: string;
  filesScanned: number;
  findings: Finding[];
  gates: GateResult[];
}
