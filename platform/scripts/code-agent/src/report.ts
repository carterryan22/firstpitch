import type { Finding, RunReport, Severity } from "./types.ts";

const SEV_ORDER: Record<Severity, number> = { critical: 0, major: 1, minor: 2, info: 3 };
const SEV_ICON: Record<Severity, string> = { critical: "⛔", major: "⚠️", minor: "•", info: "ℹ" };

function escapeMd(s: string): string {
  return s.replace(/\|/g, "\\|");
}

function bySeverity(findings: Finding[]): Record<Severity, number> {
  const acc: Record<Severity, number> = { critical: 0, major: 0, minor: 0, info: 0 };
  for (const f of findings) acc[f.severity]++;
  return acc;
}

export function renderReport(report: RunReport): string {
  const lines: string[] = [];
  const counts = bySeverity(report.findings);
  const gatesFailed = report.gates.filter((g) => !g.ok && !g.skipped);

  lines.push(`# Code Agent Report`);
  lines.push("");
  lines.push(`- Root: \`${report.root}\``);
  lines.push(`- Started: ${report.startedAt}`);
  lines.push(`- Finished: ${report.finishedAt}`);
  lines.push(`- Files scanned: ${report.filesScanned}`);
  lines.push(
    `- Findings: **${report.findings.length}** ` +
    `(⛔ ${counts.critical} · ⚠️ ${counts.major} · • ${counts.minor} · ℹ ${counts.info})`,
  );
  const gateLine = report.gates
    .map((g) => `${g.skipped ? "⏭" : g.ok ? "✅" : "❌"} ${g.name} (${g.summary})`)
    .join(" · ");
  lines.push(`- Gates: ${gateLine || "none"}`);
  lines.push("");

  const verdict = gatesFailed.length > 0 || counts.critical > 0 ? "⛔ NOT READY" : counts.major > 0 ? "⚠️ REVIEW" : "✅ CLEAN";
  lines.push(`**Verdict: ${verdict}**`);
  lines.push("");

  // ── Gate detail ──
  lines.push(`## Gates`);
  lines.push("");
  for (const g of report.gates) {
    const icon = g.skipped ? "⏭" : g.ok ? "✅" : "❌";
    lines.push(`### ${icon} ${g.name} — ${g.summary} (${Math.round(g.durationMs / 1000)}s)`);
    if (!g.ok && !g.skipped && g.output) {
      lines.push("");
      lines.push("```");
      lines.push(g.output);
      lines.push("```");
    }
    lines.push("");
  }

  // ── Findings by analyzer ──
  lines.push(`## Static findings`);
  lines.push("");
  if (report.findings.length === 0) {
    lines.push(`_No static findings._`);
    lines.push("");
  } else {
    const byAnalyzer = new Map<string, Finding[]>();
    for (const f of report.findings) {
      const arr = byAnalyzer.get(f.analyzer) ?? [];
      arr.push(f);
      byAnalyzer.set(f.analyzer, arr);
    }
    const sortedAnalyzers = [...byAnalyzer.entries()].sort((a, b) => {
      const sa = Math.min(...a[1].map((f) => SEV_ORDER[f.severity]));
      const sb = Math.min(...b[1].map((f) => SEV_ORDER[f.severity]));
      return sa - sb || b[1].length - a[1].length;
    });
    for (const [analyzer, items] of sortedAnalyzers) {
      const c = bySeverity(items);
      lines.push(`### ${analyzer} — ${items.length} (⛔ ${c.critical} · ⚠️ ${c.major} · • ${c.minor} · ℹ ${c.info})`);
      const sorted = items.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || a.file.localeCompare(b.file));
      for (const f of sorted.slice(0, 40)) {
        const loc = `${f.file}${f.line ? `:${f.line}` : ""}`;
        const owasp = f.owasp ? ` _(${f.owasp})_` : "";
        lines.push(`- ${SEV_ICON[f.severity]} \`${f.rule}\`${owasp} — ${escapeMd(f.message)}`);
        lines.push(`    - ${loc}`);
        lines.push(`    - 💡 ${escapeMd(f.suggestion)}`);
        if (f.snippet) lines.push(`    - \`${escapeMd(f.snippet)}\``);
      }
      if (sorted.length > 40) lines.push(`_…and ${sorted.length - 40} more (see report.json)._`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
