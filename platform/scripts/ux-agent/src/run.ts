import { chromium, type Browser } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { auditPage } from "./heuristics.ts";
import { renderReport } from "./report.ts";
import { journeys } from "./journeys/index.ts";
import type { Finding, Journey, JourneyContext, JourneyResult, RunReport, StepMetric } from "./types.ts";

const BASE_URL = process.env.UX_BASE_URL ?? "http://localhost:3000";
const HEADED = process.env.UX_HEADED === "1";
const SLOWMO = Number.parseInt(process.env.UX_SLOWMO ?? "0", 10);
const OUT_DIR = resolve(process.cwd(), process.env.UX_OUT ?? "ux-report");
const FILTER = process.env.UX_ONLY?.toLowerCase();

async function preflight(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/session`).catch(() => null);
  if (!res) throw new Error(`Dev server not reachable at ${BASE_URL}. Start it with \`npm run dev\` from platform/ first.`);
  if (res.status !== 200 && res.status !== 401) throw new Error(`Preflight got HTTP ${res.status} from ${BASE_URL}`);
  const session = res.headers.get("content-type")?.includes("application/json")
    ? await res.json().catch(() => null) : null;
  if (!session || typeof session !== "object" || !("user" in session)) {
    throw new Error("Preflight did not reach the First Pitch session API. Deployment protection or a redirect may require authorized access; no journeys were run.");
  }
  // Warm Next.js dev-compile for the pages every journey hits, so the first
  // journey doesn't pay the 30s cold-compile tax (which our heuristics would
  // mis-classify as a workflow chokepoint).
  const warmTargets = ["/login", "/coach", "/parent", "/missions", "/drills", "/practice/new", "/favorites"];
  console.log(`[ux-agent] warming ${warmTargets.length} route(s)…`);
  await Promise.all(
    warmTargets.map((p) =>
      fetch(`${BASE_URL}${p}`, { redirect: "manual" }).catch(() => undefined),
    ),
  );
  // The coach-plan-practice journey compiles a plan as its first action. In dev,
  // the /api/compile route + the compiler package cold-compile on first hit,
  // which can exceed the journey's inline-render wait and get mis-flagged as a
  // workflow chokepoint. Prime it with a representative POST so the first real
  // journey measures the warm path a deployed coach would actually see.
  console.log(`[ux-agent] warming /api/compile…`);
  await fetch(`${BASE_URL}/api/compile`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      age: 11,
      durationMin: 60,
      environmentTier: "T1_field",
      coaches: 2,
      players: 12,
      focus: ["throwing"],
      selectedDrillIds: [],
      persist: false,
    }),
  }).catch(() => undefined);
}

async function runJourney(browser: Browser, j: Journey): Promise<JourneyResult> {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: j.viewport,
    // Touch emulation makes `@media (pointer: coarse)` match, which is what real
    // iOS/Android users get. Without it the mobile journeys measure a
    // desktop-pointer layout and report tap-target sizes nobody actually sees.
    hasTouch: j.viewport.width < 600,
    userAgent: j.viewport.width < 600
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1 UX-Agent"
      : undefined,
  });
  // tsx/esbuild injects `__name(fn, "name")` calls into transformed sources.
  // When page.evaluate ships the function to the browser, that helper is not
  // defined. Shim it for the evaluation context.
  await context.addInitScript(() => {
    const g = globalThis as unknown as { __name?: <T>(fn: T) => T };
    if (!g.__name) g.__name = ((fn: unknown) => fn) as <T>(fn: T) => T;
  });
  const page = await context.newPage();
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const isMobile = j.viewport.width < 600;

  const steps: StepMetric[] = [];
  const findings: Finding[] = [];
  let currentStep: StepMetric | null = null;
  let stepStart = 0;
  let navCount = 0;

  // Count navigations
  page.on("framenavigated", (f) => {
    if (f === page.mainFrame()) navCount++;
  });

  const flag = (f: Omit<Finding, "persona" | "journey" | "capturedAt">) => {
    findings.push({
      ...f,
      persona: j.persona,
      journey: j.name,
      step: f.step ?? currentStep?.step,
      capturedAt: new Date().toISOString(),
    });
  };

  const ctx: JourneyContext = {
    baseUrl: BASE_URL,
    persona: j.persona,
    context,
    page,
    budgetMs: j.budgetMs,
    clickBudget: j.clickBudget,
    flag,
    startStep(name) {
      if (currentStep) ctx.endStep(true);
      currentStep = { step: name, ms: 0, clicks: 0, keystrokes: 0, navigations: 0, reachedGoal: false, urlAtEnd: page.url() };
      stepStart = Date.now();
      navCount = 0;
    },
    endStep(reachedGoal, note) {
      if (!currentStep) return;
      currentStep.ms = Date.now() - stepStart;
      currentStep.reachedGoal = reachedGoal;
      currentStep.navigations = navCount;
      currentStep.urlAtEnd = page.url();
      if (note) currentStep.notes = note;
      steps.push(currentStep);
      currentStep = null;
    },
    async click(selector, opts) {
      try {
        await page.locator(selector).first().click({ timeout: opts?.timeout ?? 8_000 });
        if (currentStep) currentStep.clicks++;
        return true;
      } catch {
        flag({
          kind: "broken-step",
          severity: "critical",
          url: page.url(),
          message: `Could not click \`${selector}\` — element never appeared or wasn't clickable.`,
          suggestion: "Make sure this control is reliably reachable; add a stable selector (data-testid) and avoid hidden-by-default panels for primary actions.",
        });
        return false;
      }
    },
    async type(selector, text) {
      try {
        const loc = page.locator(selector).first();
        await loc.waitFor({ timeout: 8_000 });
        // .fill() is atomic + dispatches React change correctly, avoiding the
        // flaky controlled-input-not-enabled-yet timing that pressSequentially hit.
        await loc.fill(text);
        if (currentStep) currentStep.keystrokes += text.length;
        return true;
      } catch {
        flag({
          kind: "broken-step",
          severity: "critical",
          url: page.url(),
          message: `Could not type into \`${selector}\`.`,
          suggestion: "Verify the input is enabled and visible without scrolling on this viewport.",
        });
        return false;
      }
    },
    async goto(path) {
      const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 }).catch(() => null);
      if (!res) {
        flag({ kind: "broken-step", severity: "critical", url, message: `goto ${path} threw or timed out`, suggestion: "Confirm route exists and renders without server error." });
        return false;
      }
      return res.status() < 400;
    },
    async audit() {
      const seeds = await auditPage({ page, persona: j.persona, journey: j.name, step: currentStep?.step, isMobile });
      for (const s of seeds) flag(s);
    },
  };

  try {
    await j.run(ctx);
    if (currentStep) ctx.endStep(true);
  } catch (e) {
    const err = e as Error;
    if (currentStep) ctx.endStep(false, `journey threw: ${err.message}`);
    flag({
      kind: "broken-step",
      severity: "critical",
      url: page.url(),
      message: `Journey crashed: ${err.message}`,
      suggestion: "Fix the broken step before evaluating UX — uncompleted journeys make all downstream findings unreliable.",
      detail: err.stack?.split("\n").slice(0, 6).join("\n"),
    });
  }

  const durationMs = Date.now() - startMs;
  const totals = steps.reduce(
    (acc, s) => ({ clicks: acc.clicks + s.clicks, keystrokes: acc.keystrokes + s.keystrokes, navigations: acc.navigations + s.navigations }),
    { clicks: 0, keystrokes: 0, navigations: 0 },
  );
  const completed = steps.length > 0 && steps.every((s) => s.reachedGoal);

  // Budget-based findings (whole-journey)
  if (totals.clicks > j.clickBudget) {
    findings.push({
      persona: j.persona, journey: j.name, kind: "click-heavy", severity: "major",
      message: `Completing this job took ${totals.clicks} clicks (budget: ${j.clickBudget}).`,
      suggestion: "Reduce navigation depth: add a one-tap shortcut from the persona's home page to the most common task, or collapse multi-page wizards.",
      capturedAt: new Date().toISOString(),
    });
  }
  if (durationMs > j.budgetMs) {
    findings.push({
      persona: j.persona, journey: j.name, kind: "long-task", severity: "major",
      message: `Completing the job took ${Math.round(durationMs / 1000)}s (budget: ${Math.round(j.budgetMs / 1000)}s).`,
      suggestion: "Profile slow steps; pre-fetch the next page, skeleton-load lists, or eliminate confirmation hops.",
      capturedAt: new Date().toISOString(),
    });
  }

  // Step-level long step warnings (>40% of budget on a single step)
  for (const s of steps) {
    if (s.ms > j.budgetMs * 0.4) {
      findings.push({
        persona: j.persona, journey: j.name, step: s.step, kind: "long-task", severity: "minor",
        message: `Step "${s.step}" consumed ${Math.round(s.ms / 1000)}s — over 40% of the persona budget.`,
        suggestion: "This step is a chokepoint. Consider defaults, autosave, or skipping confirmations.",
        capturedAt: new Date().toISOString(),
      });
    }
  }

  await context.close();
  return {
    name: j.name,
    persona: j.persona,
    goal: j.goal,
    startedAt,
    durationMs,
    completed,
    steps,
    findings,
    totals,
  };
}

async function main(): Promise<void> {
  console.log(`[ux-agent] target: ${BASE_URL}`);
  await preflight();

  const selected = FILTER
    ? journeys.filter((j) => j.name.toLowerCase().includes(FILTER) || j.persona.toLowerCase().includes(FILTER))
    : journeys;
  if (selected.length === 0) throw new Error(`No journeys matched filter '${FILTER}'. Available: ${journeys.map((j) => j.name).join(", ")}`);

  const browser = await chromium.launch({ headless: !HEADED, slowMo: SLOWMO });
  const startedAt = new Date().toISOString();
  const results: JourneyResult[] = [];

  for (const j of selected) {
    console.log(`[ux-agent] ▶ ${j.persona}: ${j.name}`);
    const r = await runJourney(browser, j);
    const critical = r.findings.filter((f) => f.severity === "critical").length;
    const major = r.findings.filter((f) => f.severity === "major").length;
    console.log(
      `[ux-agent]   ${r.completed ? "✅" : "⛔"} ${j.name} — ${r.findings.length} finding(s) (${critical} critical, ${major} major) in ${Math.round(r.durationMs / 1000)}s, ${r.totals.clicks} clicks`,
    );
    results.push(r);
  }
  await browser.close();

  const report: RunReport = {
    baseUrl: BASE_URL,
    startedAt,
    finishedAt: new Date().toISOString(),
    journeys: results,
    findings: results.flatMap((r) => r.findings),
    recommendations: { coach: [], parent: [], player: [] },
  };
  // recommendations populated by reporter (which renders markdown too)
  const md = renderReport(report);

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(resolve(OUT_DIR, "report.json"), JSON.stringify(report, null, 2), "utf8");
  await writeFile(resolve(OUT_DIR, "report.md"), md, "utf8");
  console.log(`[ux-agent] report written → ${OUT_DIR}`);

  const critical = report.findings.filter((f) => f.severity === "critical").length;
  if (critical > 0) {
    console.error(`[ux-agent] ${critical} critical UX finding(s) — failing exit.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("[ux-agent] fatal:", e);
  process.exit(2);
});
