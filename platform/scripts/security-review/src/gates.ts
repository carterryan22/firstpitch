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

interface AcceptedAdvisory {
  ghsa: string;
  package: string;
  severity: string;
  url: string;
}

interface AuditResult {
  counts: AuditCounts;
  /** Advisories present in the tree that match the accepted-risk allowlist. */
  accepted: AcceptedAdvisory[];
}

/**
 * Accepted-risk allowlist for the dependency gate.
 *
 * Each key is a GHSA id that has been MANUALLY reviewed and judged
 * non-exploitable in this project's actual usage. The gate subtracts these from
 * the blocking counts but still SURFACES them (gate summary note + a P3
 * finding), so the accepted risk stays visible and auditable. ANY advisory NOT
 * listed here still blocks as normal — a brand-new critical fails the gate.
 *
 * Keep this list short and justify every entry. Remove an entry the moment a
 * compatible patched version is adopted.
 */
const ACCEPTED_ADVISORIES: Record<string, string> = {
  // vitest UI-server arbitrary file read/exec (CVE-2026-47429). Per the advisory
  // it is ONLY exploitable when the Vitest UI server is exposed to the network
  // (--api.host / api.host), or when running the Vitest UI / Browser Mode on
  // Windows. This repo runs headless `vitest run` ONLY — no UI, no browser mode,
  // no --api.host — and vitest is a devDependency that never ships to prod and is
  // never run as a server in CI. The only patched version (vitest >=4.1.0) is
  // incompatible with this monorepo (breaks the entire suite at describe()-time).
  // Accepted dev-only risk; revisit when vitest 4.x becomes usable here.
  "GHSA-5xrq-8626-4rwp":
    "vitest UI-server file read/exec — non-exploitable (headless `vitest run`, devDep, no UI/--api.host). Patched only in vitest>=4.1.0, which breaks this suite.",

  // next@15.5.x pins its OWN nested postcss@8.4.31 for its build-time CSS
  // pipeline; an npm `overrides` entry cannot move it (the app's own postcss —
  // via tailwindcss/autoprefixer — is already 8.5.25 and patched). That nested
  // copy only ever processes FIRST-PARTY CSS (globals.css + Tailwind output) at
  // build time. All three advisories require attacker-controlled CSS input:
  // stringifying hostile `</style>` content, or auto-loading a sourcemap from a
  // hostile `sourceMappingURL` comment. Neither is reachable — no user-supplied
  // CSS is ever compiled, and postcss never runs at request time. Remove these
  // when Next ships a release that bumps its pinned postcss.
  "GHSA-qx2v-qp2m-jg93":
    "postcss XSS via unescaped </style> — build-time only, first-party CSS only; Next pins nested postcss@8.4.31.",
  "GHSA-6g55-p6wh-862q":
    "postcss arbitrary file read via sourceMappingURL — build-time only, first-party CSS only; Next pins nested postcss@8.4.31.",
  "GHSA-r28c-9q8g-f849":
    "postcss path traversal via sourceMappingURL — build-time only, first-party CSS only; Next pins nested postcss@8.4.31.",

  // sharp is a transitive OPTIONAL dependency of next, used solely by the
  // built-in Image Optimization API. next.config.mjs declares NO
  // `images.remotePatterns`/`images.domains`, so the optimizer only ever
  // processes first-party images shipped in the bundle — there is no path for
  // an attacker to submit a hostile image to libvips. In production on Vercel
  // image optimization runs on Vercel's managed infrastructure, not this copy.
  // Next 15.5 declares sharp `^0.34`, so forcing >=0.35 risks breaking image
  // optimization outright. Revisit when Next widens the range.
  "GHSA-f88m-g3jw-g9cj":
    "sharp/libvips CVEs — transitive optional dep of next; no images.remotePatterns configured (first-party images only), and Vercel supplies its own optimizer. Next 15.5 pins sharp ^0.34.",
};

function acceptedGhsa(url: string | undefined): string | null {
  if (!url) return null;
  for (const ghsa of Object.keys(ACCEPTED_ADVISORIES)) {
    if (url.includes(ghsa)) return ghsa;
  }
  return null;
}

interface AuditViaObject {
  name?: string;
  title?: string;
  url?: string;
  severity?: string;
}

interface AuditVuln {
  severity?: string;
  via?: Array<string | AuditViaObject>;
}

/**
 * Parse `npm audit --json` and recompute the blocking counts PER PACKAGE,
 * dropping any package whose advisories are ALL on the accepted-risk allowlist.
 * Falls back to the metadata totals when the per-package map is unavailable.
 */
function parseNpmAudit(json: string): AuditResult | null {
  let data: {
    metadata?: { vulnerabilities?: Partial<AuditCounts> };
    vulnerabilities?: Record<string, AuditVuln>;
  };
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }

  const accepted: AcceptedAdvisory[] = [];
  const vulns = data.vulnerabilities;

  // Per-package recompute (npm v7+ audit shape).
  if (vulns && typeof vulns === "object") {
    const counts: AuditCounts = { critical: 0, high: 0, moderate: 0, low: 0 };

    const rows = Object.entries(vulns).map(([pkg, v]) => {
      const via = Array.isArray(v.via) ? v.via : [];
      const objAdvisories = via.filter((x): x is AuditViaObject => typeof x === "object" && x !== null);
      // String `via` entries name the dependency that drags this package in.
      const viaPackages = via.filter((x): x is string => typeof x === "string");
      const nonAccepted = objAdvisories.filter((a) => !acceptedGhsa(a.url));
      return { pkg, v, objAdvisories, viaPackages, nonAccepted };
    });

    // A package is accepted when none of its OWN advisories block. Acceptance
    // then propagates: a package flagged only because it depends on packages
    // that are themselves fully accepted is also accepted (e.g. `next` is
    // flagged solely for its pinned postcss/sharp). Iterate to a fixed point so
    // multi-hop chains resolve. Any non-accepted advisory anywhere in the chain
    // keeps every package above it blocking, so the gate stays strict.
    const acceptedPkgs = new Set<string>();
    for (let changed = true; changed; ) {
      changed = false;
      for (const r of rows) {
        if (acceptedPkgs.has(r.pkg)) continue;
        if (r.nonAccepted.length > 0) continue;
        if (r.objAdvisories.length === 0 && r.viaPackages.length === 0) continue;
        if (!r.viaPackages.every((p) => acceptedPkgs.has(p))) continue;
        acceptedPkgs.add(r.pkg);
        changed = true;
      }
    }

    for (const r of rows) {
      if (acceptedPkgs.has(r.pkg)) {
        for (const a of r.objAdvisories) {
          accepted.push({
            ghsa: acceptedGhsa(a.url) ?? "unknown",
            package: r.pkg,
            severity: a.severity ?? r.v.severity ?? "unknown",
            url: a.url ?? "",
          });
        }
        continue;
      }

      const sev = (r.v.severity ?? "").toLowerCase();
      if (sev === "critical") counts.critical += 1;
      else if (sev === "high") counts.high += 1;
      else if (sev === "moderate") counts.moderate += 1;
      else if (sev === "low") counts.low += 1;
    }
    return { counts, accepted };
  }

  // Fallback: metadata totals only (no per-advisory detail → no allowlisting).
  const m = data.metadata?.vulnerabilities ?? {};
  return {
    counts: {
      critical: m.critical ?? 0,
      high: m.high ?? 0,
      moderate: m.moderate ?? 0,
      low: m.low ?? 0,
    },
    accepted: [],
  };
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
  const audit = parseNpmAudit(output);
  const durationMs = Date.now() - start;
  if (!audit) {
    gates.push({
      name: "dependency-audit", ok: false, skipped: false, durationMs,
      summary: "audit did not return parseable JSON", output: tail(output), failSeverity: "P2",
    });
  } else {
    const { counts, accepted } = audit;
    const blocking = counts.critical > 0;
    const high = counts.high > 0;
    const acceptedNote = accepted.length
      ? ` · accepted-risk:${accepted.length} (${[...new Set(accepted.map((a) => a.ghsa))].join(", ")})`
      : "";
    gates.push({
      name: "dependency-audit",
      ok: !blocking && !high,
      skipped: false,
      durationMs,
      summary: `critical:${counts.critical} high:${counts.high} moderate:${counts.moderate} low:${counts.low}${acceptedNote}`,
      output: blocking || high ? tail(output) : "",
      failSeverity: blocking ? "P0" : "P1",
    });
    // Document each accepted advisory as a visible, non-blocking P3 finding.
    for (const a of accepted) {
      dependencyFindings.push({
        analyzer: "dependency", rule: "accepted-advisory", severity: "P3", category: "dependency",
        owasp: "A06:Vulnerable-Components", file: "package-lock.json",
        message: `Accepted-risk advisory ${a.ghsa} on \`${a.package}\` (${a.severity}): ${ACCEPTED_ADVISORIES[a.ghsa] ?? "manually reviewed, non-exploitable in this project's usage."}`,
        suggestion: "Re-evaluate when a compatible patched version ships; remove from ACCEPTED_ADVISORIES in gates.ts once upgraded.",
        acceptance: "Advisory no longer present in `npm audit`, or a patched version is adopted.",
      });
    }
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
