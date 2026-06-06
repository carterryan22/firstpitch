import type { Decision, LaunchReviewReport, Priority, ReviewFinding } from "./types.ts";

const DECISION_ICON: Record<Decision, string> = {
  block: "🛑 BLOCK",
  risky: "⚠️ RISKY",
  acceptable: "🟡 ACCEPTABLE",
  ready: "✅ READY",
};
const PRIORITY_ICON: Record<Priority, string> = { P0: "🛑", P1: "⚠️", P2: "•", P3: "ℹ" };

function escapeMd(s: string): string {
  return s.replace(/\|/g, "\\|");
}

function findingBlock(f: ReviewFinding): string[] {
  const lines: string[] = [];
  lines.push(`- ${PRIORITY_ICON[f.priority]} **[${f.priority}] (${f.source})** ${escapeMd(f.issue)}`);
  lines.push(`    - Impact: ${escapeMd(f.userImpact)}`);
  lines.push(`    - Evidence: ${escapeMd(f.evidence)}`);
  lines.push(`    - Fix: ${escapeMd(f.recommendedFix)}`);
  if (f.suggestedTest) lines.push(`    - Suggested test: \`${escapeMd(f.suggestedTest)}\``);
  return lines;
}

function section(title: string, items: ReviewFinding[]): string[] {
  const lines: string[] = [`### ${title} (${items.length})`, ""];
  if (items.length === 0) {
    lines.push("_None._", "");
    return lines;
  }
  for (const f of items) lines.push(...findingBlock(f));
  lines.push("");
  return lines;
}

export function renderMarkdown(r: LaunchReviewReport): string {
  const lines: string[] = [];
  lines.push(`# Launch Review`);
  lines.push("");
  lines.push(`- Base URL: \`${r.baseUrl}\``);
  lines.push(`- Started: ${r.startedAt}`);
  lines.push(`- Finished: ${r.finishedAt}`);
  lines.push(`- Live app reached: ${r.serverReachable ? "yes" : "no (QA + UX layers skipped)"}`);
  lines.push("");
  lines.push(`## Decision: ${DECISION_ICON[r.decision]}`);
  lines.push("");
  lines.push(`**Launch readiness score: ${r.launch_readiness_score} / 100**`);
  lines.push("");
  if (!r.serverReachable) {
    lines.push(
      "> No live server was reachable, so the scripted E2E (QA) and exploratory (UX) layers did not run. " +
        "Boot the dev server and re-run for a full verdict — readiness cannot be certified as `ready` without them.",
    );
    lines.push("");
  }

  // ── Stages ──
  lines.push(`## Stages`);
  lines.push("");
  for (const s of r.stages) {
    const icon = s.skipped ? "⏭" : s.ok ? "✅" : "❌";
    lines.push(`- ${icon} **${s.name}** — ${s.summary} (${Math.round(s.durationMs / 1000)}s)`);
    if (!s.ok && !s.skipped && s.output) {
      lines.push("", "```", s.output, "```", "");
    }
  }
  lines.push("");

  // ── Top fixes ──
  lines.push(`## Top fixes before launch`);
  lines.push("");
  if (r.top_10_fixes_before_launch.length === 0) {
    lines.push("_No P0–P2 findings._", "");
  } else {
    r.top_10_fixes_before_launch.forEach((f, i) => {
      lines.push(`${i + 1}. ${PRIORITY_ICON[f.priority]} **[${f.priority}]** ${escapeMd(f.issue)}`);
    });
    lines.push("");
  }

  // ── Buckets ──
  lines.push(...section("Critical blockers", r.critical_blockers));
  lines.push(...section("High-priority issues", r.high_priority_issues));
  lines.push(...section("Security / privacy concerns", r.security_privacy_concerns));
  lines.push(...section("Accessibility issues", r.accessibility_issues));
  lines.push(...section("UX friction", r.ux_friction));
  lines.push(...section("Performance issues", r.performance_issues));
  lines.push(...section("Missing edge cases", r.missing_edge_cases));

  // ── Qualitative lists ──
  lines.push(`### Suggested test coverage to add (${r.suggested_test_coverage_to_add.length})`, "");
  if (r.suggested_test_coverage_to_add.length === 0) lines.push("_Coverage looks complete for the required flows._", "");
  else { for (const s of r.suggested_test_coverage_to_add) lines.push(`- ${escapeMd(s)}`); lines.push(""); }

  lines.push(`### Recommended product improvements (${r.recommended_product_improvements.length})`, "");
  if (r.recommended_product_improvements.length === 0) lines.push("_None surfaced by the automated layers — see REVIEW_AGENT.md for the qualitative pass._", "");
  else { for (const s of r.recommended_product_improvements) lines.push(`- ${escapeMd(s)}`); lines.push(""); }

  lines.push("---", "");
  lines.push(
    "_This is the deterministic harness output (Layers A–C + aggregation). For the qualitative reviewer pass " +
      "(missing features, edge cases, product judgment), feed `launch-review.json` to the prompt in `REVIEW_AGENT.md`._",
  );

  return lines.join("\n");
}
