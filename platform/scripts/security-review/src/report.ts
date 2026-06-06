import type { Decision, GateResult, SecFinding, SecurityReviewReport, Severity } from "./types.ts";

const SEV_ORDER: Record<Severity, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const SEV_ICON: Record<Severity, string> = { P0: "⛔", P1: "🔴", P2: "🟠", P3: "🟡" };

function escapeMd(s: string): string {
  return s.replace(/\|/g, "\\|");
}

function sortFindings(a: SecFinding, b: SecFinding): number {
  return SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || a.file.localeCompare(b.file);
}

/**
 * Score: start at 100, subtract by severity. A single P0 forces the score to a
 * blocking band so the number can never look "passing" while a blocker stands.
 */
function score(findings: SecFinding[], gates: GateResult[]): number {
  let s = 100;
  for (const f of findings) {
    s -= f.severity === "P0" ? 40 : f.severity === "P1" ? 12 : f.severity === "P2" ? 4 : 1;
  }
  for (const g of gates) {
    if (!g.ok && !g.skipped) s -= g.failSeverity === "P0" ? 40 : g.failSeverity === "P1" ? 12 : 4;
  }
  if (findings.some((f) => f.severity === "P0") || gates.some((g) => !g.ok && !g.skipped && g.failSeverity === "P0")) {
    s = Math.min(s, 35);
  }
  return Math.max(0, Math.min(100, s));
}

function decide(findings: SecFinding[], gates: GateResult[]): Decision {
  const hasP0 =
    findings.some((f) => f.severity === "P0") ||
    gates.some((g) => !g.ok && !g.skipped && g.failSeverity === "P0");
  if (hasP0) return "blocked";
  const p1 = findings.filter((f) => f.severity === "P1").length + gates.filter((g) => !g.ok && !g.skipped && g.failSeverity === "P1").length;
  if (p1 > 0) return "risky";
  const p2 = findings.filter((f) => f.severity === "P2").length;
  return p2 > 0 ? "acceptable" : "ready";
}

const RECOMMENDATION: Record<Decision, string> = {
  blocked: "DO NOT LAUNCH. One or more P0 issues let the wrong person access, alter, leak, or destroy data. Fix every P0 and re-run before release.",
  risky: "Launch is risky. Resolve the P1 auth/data/privacy/billing risks (or formally accept each) before going public.",
  acceptable: "Acceptable to launch with follow-ups. No P0/P1 outstanding; schedule the P2 hardening items.",
  ready: "Ready from a security standpoint. Keep the gate in CI and re-run on every release.",
};

export function buildReport(args: {
  startedAt: string;
  finishedAt: string;
  root: string;
  filesScanned: number;
  gates: GateResult[];
  findings: SecFinding[];
}): SecurityReviewReport {
  const { findings, gates } = args;
  const inCat = (cats: string[]) => findings.filter((f) => cats.includes(f.category)).sort(sortFindings);

  const decision = decide(findings, gates);
  const recommended_fixes = [...new Set(findings.filter((f) => f.severity === "P0" || f.severity === "P1").map((f) => f.suggestion))];
  const required_tests_to_add = [...new Set(findings.map((f) => f.suggestedTest).filter((t): t is string => !!t))];

  return {
    startedAt: args.startedAt,
    finishedAt: args.finishedAt,
    root: args.root,
    filesScanned: args.filesScanned,
    gates,
    security_decision: decision,
    security_score: score(findings, gates),
    p0_blockers: findings.filter((f) => f.severity === "P0").sort(sortFindings),
    p1_high_risks: findings.filter((f) => f.severity === "P1").sort(sortFindings),
    role_permission_failures: inCat(["authz"]),
    api_security_findings: inCat(["authz", "injection", "rate-limit"]),
    auth_session_findings: inCat(["auth", "cookies"]),
    data_privacy_findings: inCat(["privacy"]),
    billing_findings: inCat(["billing"]),
    dependency_findings: inCat(["dependency"]),
    secret_findings: inCat(["secrets"]),
    infrastructure_findings: inCat(["headers", "config"]),
    recommended_fixes,
    required_tests_to_add,
    launch_recommendation: RECOMMENDATION[decision],
  };
}

function findingBlock(lines: string[], f: SecFinding): void {
  const loc = `${f.file}${f.line ? `:${f.line}` : ""}`;
  const route = f.route ? ` · \`${f.route}\`` : "";
  lines.push(`- ${SEV_ICON[f.severity]} **${f.severity}** \`${f.rule}\` _(${f.owasp})_${route}`);
  lines.push(`    - ${escapeMd(f.message)}`);
  lines.push(`    - 📍 ${loc}`);
  lines.push(`    - 💡 ${escapeMd(f.suggestion)}`);
  if (f.acceptance) lines.push(`    - ✅ Acceptance: ${escapeMd(f.acceptance)}`);
  if (f.suggestedTest) lines.push(`    - 🧪 Test: ${escapeMd(f.suggestedTest)}`);
  if (f.snippet) lines.push(`    - \`${escapeMd(f.snippet)}\``);
}

export function renderMarkdown(r: SecurityReviewReport): string {
  const lines: string[] = [];
  const VERDICT: Record<Decision, string> = {
    blocked: "⛔ LAUNCH BLOCKED", risky: "🔴 RISKY", acceptable: "🟠 ACCEPTABLE", ready: "✅ READY",
  };

  lines.push(`# Security Review Agent Report`);
  lines.push("");
  lines.push(`**Decision: ${VERDICT[r.security_decision]} · Score: ${r.security_score}/100**`);
  lines.push("");
  lines.push(`> ${r.launch_recommendation}`);
  lines.push("");
  lines.push(`- Root: \`${r.root}\``);
  lines.push(`- Started: ${r.startedAt} · Finished: ${r.finishedAt}`);
  lines.push(`- Files scanned: ${r.filesScanned}`);
  lines.push(
    `- Totals: ⛔ ${r.p0_blockers.length} P0 · 🔴 ${r.p1_high_risks.length} P1 · ` +
      `🔒 ${r.secret_findings.length} secret · 🛂 ${r.role_permission_failures.length} authz · ` +
      `🕵️ ${r.data_privacy_findings.length} privacy · 📦 ${r.dependency_findings.length} dep`,
  );
  const gateLine = r.gates.map((g) => `${g.skipped ? "⏭" : g.ok ? "✅" : "❌"} ${g.name} (${g.summary})`).join(" · ");
  lines.push(`- Gates: ${gateLine || "none"}`);
  lines.push("");

  const section = (title: string, items: SecFinding[]) => {
    if (items.length === 0) return;
    lines.push(`## ${title} (${items.length})`);
    lines.push("");
    for (const f of items.sort(sortFindings)) findingBlock(lines, f);
    lines.push("");
  };

  if (r.p0_blockers.length > 0) {
    lines.push(`## ⛔ P0 — LAUNCH BLOCKERS (${r.p0_blockers.length})`);
    lines.push("");
    lines.push(`_Every item here must be fixed before public launch._`);
    lines.push("");
    for (const f of r.p0_blockers) findingBlock(lines, f);
    lines.push("");
  } else {
    lines.push(`## ⛔ P0 — LAUNCH BLOCKERS`);
    lines.push("");
    lines.push(`_None. ✅_`);
    lines.push("");
  }

  section("🔴 P1 — High risks", r.p1_high_risks);
  section("🛂 Role / permission & API authorization", r.role_permission_failures);
  section("🔒 Secrets", r.secret_findings);
  section("🕵️ Data privacy", r.data_privacy_findings);
  section("💳 Billing", r.billing_findings);
  section("📦 Dependencies", r.dependency_findings);
  section("🧱 Infrastructure / headers", r.infrastructure_findings);

  if (r.required_tests_to_add.length > 0) {
    lines.push(`## 🧪 Required tests to add`);
    lines.push("");
    for (const t of r.required_tests_to_add) lines.push(`- ${escapeMd(t)}`);
    lines.push("");
  }

  // Failed-gate output for triage.
  const failed = r.gates.filter((g) => !g.ok && !g.skipped && g.output);
  if (failed.length > 0) {
    lines.push(`## Gate output`);
    lines.push("");
    for (const g of failed) {
      lines.push(`### ❌ ${g.name} — ${g.summary}`);
      lines.push("```");
      lines.push(g.output);
      lines.push("```");
      lines.push("");
    }
  }

  return lines.join("\n");
}
