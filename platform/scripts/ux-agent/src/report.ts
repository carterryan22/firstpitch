import type { Finding, Persona, RunReport } from "./types.ts";

const SEV_ORDER: Record<Finding["severity"], number> = { critical: 0, major: 1, minor: 2, info: 3 };
const SEV_ICON: Record<Finding["severity"], string> = { critical: "⛔", major: "⚠️", minor: "•", info: "ℹ" };

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Map<string, Finding>();
  for (const f of findings) {
    const key = `${f.persona}::${f.kind}::${f.message}`;
    if (!seen.has(key)) seen.set(key, f);
  }
  return [...seen.values()].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
}

function topRecommendations(findings: Finding[], persona: Persona): string[] {
  const mine = findings.filter((f) => f.persona === persona);
  const buckets = new Map<string, { count: number; severity: Finding["severity"]; suggestion: string; example: string }>();
  for (const f of mine) {
    const k = `${f.kind}::${f.suggestion}`;
    const cur = buckets.get(k);
    if (cur) {
      cur.count++;
      if (SEV_ORDER[f.severity] < SEV_ORDER[cur.severity]) cur.severity = f.severity;
    } else {
      buckets.set(k, { count: 1, severity: f.severity, suggestion: f.suggestion, example: f.message });
    }
  }
  return [...buckets.values()]
    .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || b.count - a.count)
    .slice(0, 7)
    .map((r) => `**[${r.severity}]** ${r.suggestion} _(seen ${r.count}×; e.g. ${truncate(r.example, 100)})_`);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

export function renderReport(report: RunReport): string {
  // Populate recommendations on the report object so JSON consumers also get it.
  for (const persona of ["coach", "parent", "player"] as Persona[]) {
    report.recommendations[persona] = topRecommendations(report.findings, persona);
  }

  const lines: string[] = [];
  lines.push(`# UX Agent Report`);
  lines.push("");
  lines.push(`- Base URL: \`${report.baseUrl}\``);
  lines.push(`- Started: ${report.startedAt}`);
  lines.push(`- Finished: ${report.finishedAt}`);
  lines.push(`- Journeys: ${report.journeys.length}`);
  const bySev = report.findings.reduce<Record<string, number>>((acc, f) => { acc[f.severity] = (acc[f.severity] ?? 0) + 1; return acc; }, {});
  lines.push(`- Findings: **${report.findings.length}** (${Object.entries(bySev).map(([s, n]) => `${s}: ${n}`).join(", ")})`);
  lines.push("");

  // ── Per-persona prioritized recommendations ──
  lines.push(`## Top workflow improvements per persona`);
  lines.push("");
  for (const persona of ["coach", "parent", "player"] as Persona[]) {
    const recs = report.recommendations[persona];
    lines.push(`### ${persona.toUpperCase()}`);
    if (recs.length === 0) {
      lines.push(`_No recommendations — every journey completed inside budget with no heuristic flags._`);
    } else {
      for (let i = 0; i < recs.length; i++) lines.push(`${i + 1}. ${recs[i]}`);
    }
    lines.push("");
  }

  // ── Per-journey scorecard ──
  lines.push(`## Journey scorecards`);
  lines.push("");
  for (const j of report.journeys) {
    const icon = j.completed ? (j.findings.some((f) => f.severity === "critical") ? "⛔" : j.findings.some((f) => f.severity === "major") ? "⚠️" : "✅") : "⛔";
    lines.push(`### ${icon} ${j.name} _(${j.persona})_`);
    lines.push(`- Goal: ${j.goal}`);
    lines.push(`- Completed: ${j.completed ? "yes" : "no"} | Duration: ${Math.round(j.durationMs / 1000)}s | Clicks: ${j.totals.clicks} | Keystrokes: ${j.totals.keystrokes} | Page-loads: ${j.totals.navigations}`);
    lines.push("");
    lines.push(`| Step | Time | Clicks | Keystrokes | Goal? |`);
    lines.push(`| --- | ---: | ---: | ---: | :---: |`);
    for (const s of j.steps) {
      lines.push(`| ${s.step} | ${Math.round(s.ms / 1000)}s | ${s.clicks} | ${s.keystrokes} | ${s.reachedGoal ? "✓" : "✗"} |`);
    }
    lines.push("");
    if (j.findings.length === 0) {
      lines.push(`_No findings._`);
    } else {
      const unique = dedupeFindings(j.findings);
      for (const f of unique.slice(0, 20)) {
        lines.push(`- ${SEV_ICON[f.severity]} **${f.kind}** — ${escapeMd(f.message)}`);
        lines.push(`    - 💡 ${escapeMd(f.suggestion)}`);
        if (f.url) lines.push(`    - url: \`${f.url}\``);
        if (f.detail) lines.push(`    - detail: ${escapeMd(truncate(f.detail, 200))}`);
      }
      if (unique.length > 20) lines.push(`_…and ${unique.length - 20} more (see report.json)._`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, "\\|");
}
