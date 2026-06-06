import { spawnSync } from "node:child_process";
import type { GateResult, SecFinding } from "./types.ts";

const TAIL_LINES = 24;

function tail(s: string, n = TAIL_LINES): string {
  return s.split(/\r?\n/).filter((l) => l.trim()).slice(-n).join("\n");
}

function runCmd(cwd: string, command: string): { status: number; output: string } {
  const isWin = process.platform === "win32";
  const res = isWin
    ? spawnSync("cmd", ["/c", command], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    : spawnSync("sh", ["-c", command], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { status: res.status ?? -1, output: `${res.stdout ?? ""}\n${res.stderr ?? ""}` };
}

interface AuditCounts {
  critical: number;
  high: number;
  moderate: number;
  low: number;
}

function parseNpmAudit(json: string): AuditCounts | null {
  try {
    const data = JSON.parse(json) as { metadata?: { vulnerabilities?: Partial<AuditCounts> } };
    const v = data.metadata?.vulnerabilities ?? {};
    return {
      critical: v.critical ?? 0,
      high: v.high ?? 0,
      moderate: v.moderate ?? 0,
      low: v.low ?? 0,
    };
  } catch {
    return null;
  }
}

export interface GatesResult {
  gates: GateResult[];
  /** Dependency findings derived from the audit, in the SecFinding shape. */
  dependencyFindings: SecFinding[];
}

/**
 * Deterministic security gates. The dependency audit is the gate of record;
 * a CRITICAL advisory is a launch blocker (P0), HIGH is P1.
 *
 * Set `SR_GATES=0` to skip (useful when iterating on analyzers).
 * Set `SR_TEST=1` to also run the project's vitest suite as a gate.
 */
export function runGates(root: string): GatesResult {
  if (process.env.SR_GATES === "0") {
    return {
      gates: [{ name: "dependency-audit", ok: true, skipped: true, durationMs: 0, summary: "skipped (SR_GATES=0)", output: "" }],
      dependencyFindings: [],
    };
  }

  const gates: GateResult[] = [];
  const dependencyFindings: SecFinding[] = [];

  // ── Dependency audit ──
  const start = Date.now();
  const { output } = runCmd(root, "npm audit --json --audit-level=high");
  const counts = parseNpmAudit(output);
  const durationMs = Date.now() - start;
  if (!counts) {
    gates.push({
      name: "dependency-audit", ok: false, skipped: false, durationMs,
      summary: "audit did not return parseable JSON", output: tail(output), failSeverity: "P2",
    });
  } else {
    const blocking = counts.critical > 0;
    const high = counts.high > 0;
    gates.push({
      name: "dependency-audit",
      ok: !blocking && !high,
      skipped: false,
      durationMs,
      summary: `critical:${counts.critical} high:${counts.high} moderate:${counts.moderate} low:${counts.low}`,
      output: blocking || high ? tail(output) : "",
      failSeverity: blocking ? "P0" : "P1",
    });
    if (counts.critical > 0) {
      dependencyFindings.push({
        analyzer: "dependency", rule: "critical-advisory", severity: "P0", category: "dependency",
        owasp: "A06:Vulnerable-Components", file: "package-lock.json",
        message: `${counts.critical} CRITICAL dependency advisory(ies) reported by npm audit.`,
        suggestion: "Run `npm audit fix` / upgrade the affected package(s); re-audit until 0 critical.",
        acceptance: "`npm audit --audit-level=critical` reports 0 vulnerabilities.",
      });
    }
    if (counts.high > 0) {
      dependencyFindings.push({
        analyzer: "dependency", rule: "high-advisory", severity: "P1", category: "dependency",
        owasp: "A06:Vulnerable-Components", file: "package-lock.json",
        message: `${counts.high} HIGH dependency advisory(ies) reported by npm audit.`,
        suggestion: "Triage and upgrade the affected package(s); document any accepted risk.",
        acceptance: "`npm audit --audit-level=high` reports 0 high/critical vulnerabilities.",
      });
    }
  }

  // ── Optional: test suite ──
  if (process.env.SR_TEST === "1") {
    const t0 = Date.now();
    const r = runCmd(root, "npx vitest run");
    gates.push({
      name: "tests", ok: r.status === 0, skipped: false, durationMs: Date.now() - t0,
      summary: r.status === 0 ? "passed" : `exit ${r.status}`,
      output: r.status === 0 ? "" : tail(r.output), failSeverity: "P1",
    });
  } else {
    gates.push({ name: "tests", ok: true, skipped: true, durationMs: 0, summary: "skipped (set SR_TEST=1)", output: "" });
  }

  return { gates, dependencyFindings };
}
