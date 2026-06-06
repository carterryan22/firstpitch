import type { BugSeverity, Scenario } from "../types.ts";

/**
 * Accessibility layer — runs axe-core against the app's key public routes and
 * records WCAG violations (contrast, missing labels, duplicate IDs, etc.).
 *
 * `@axe-core/playwright` is an optional dependency: if it isn't installed the
 * scan degrades to a single info bug telling you how to enable it, so the QA
 * run never hard-fails just because the dep is missing. Install it with
 * `npm install` inside `scripts/qa-agent` to activate the scan.
 */

// Public, no-auth routes worth scanning. Auth'd surfaces are covered by the
// flow scenarios; these are the pages every visitor hits first.
const ROUTES = ["/", "/login", "/drills", "/missions", "/safety", "/fields", "/gear", "/policy"];

// Map an axe impact level onto our bug severity ladder.
function severityFor(impact: string | null | undefined): BugSeverity {
  switch (impact) {
    case "critical":
    case "serious":
      return "major";
    case "moderate":
      return "minor";
    default:
      return "info";
  }
}

interface AxeNode {
  target?: string[];
  failureSummary?: string;
}
interface AxeViolation {
  id: string;
  impact?: string | null;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
}

export const a11yScenario: Scenario = {
  name: "a11y-scan",
  persona: "system",
  description: "Runs axe-core (@axe-core/playwright) against key public routes and reports WCAG violations.",
  async run(ctx) {
    // Non-literal specifier keeps tsc from hard-resolving an optional dep.
    const pkg = "@axe-core/playwright";
    const mod = (await import(pkg).catch(() => null)) as { default?: new (opts: { page: unknown }) => { analyze: () => Promise<{ violations: AxeViolation[] }> } } | null;
    const AxeBuilder = mod?.default;
    if (!AxeBuilder) {
      ctx.bug({
        kind: "a11y",
        severity: "info",
        message: "Accessibility scan skipped — install @axe-core/playwright in scripts/qa-agent to enable it.",
      });
      return;
    }

    for (const route of ROUTES) {
      ctx.step(`a11y ${route}`);
      await ctx.goto(route);
      let results: { violations: AxeViolation[] };
      try {
        results = await new AxeBuilder({ page: ctx.page }).analyze();
      } catch (e) {
        ctx.bug({ kind: "a11y", severity: "minor", url: route, message: `axe analyze failed: ${(e as Error).message}` });
        continue;
      }
      // Cap per page so one noisy route can't drown the report.
      for (const v of results.violations.slice(0, 15)) {
        const where = v.nodes.slice(0, 3).map((n) => n.target?.join(" ")).filter(Boolean).join(", ");
        ctx.bug({
          kind: "a11y",
          severity: severityFor(v.impact),
          url: route,
          message: `${v.id} (${v.impact ?? "n/a"}): ${v.help}${where ? ` — ${where}` : ""}`.slice(0, 400),
          detail: `${v.helpUrl}\n${v.nodes[0]?.failureSummary ?? ""}`.trim(),
        });
      }
    }
  },
};
