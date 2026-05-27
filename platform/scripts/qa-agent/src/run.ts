import { chromium, type Browser } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { attachRecorder } from "./recorder.ts";
import type { Bug, RunResult, Scenario, ScenarioContext } from "./types.ts";

const BASE_URL = process.env.QA_BASE_URL ?? "http://localhost:3000";
const HEADED = process.env.QA_HEADED === "1";
const SLOWMO = Number.parseInt(process.env.QA_SLOWMO ?? "0", 10);
const OUT_DIR = resolve(process.cwd(), process.env.QA_OUT ?? "qa-report");
const FILTER = process.env.QA_ONLY?.toLowerCase();

/** Lazy-imported so we can list scenarios in error messages. */
async function loadScenarios(): Promise<Scenario[]> {
  const mod = await import("./scenarios/index.ts");
  return mod.scenarios;
}

async function preflight(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/session`).catch(() => null);
  if (!res) {
    throw new Error(
      `Dev server not reachable at ${BASE_URL}. Start it with \`npm run dev\` from platform/ first.`,
    );
  }
  // 200 or 401 are both fine — both mean the route booted.
  if (res.status !== 200 && res.status !== 401) {
    throw new Error(`Preflight got HTTP ${res.status} from ${BASE_URL}/api/auth/session`);
  }
}

async function runScenario(browser: Browser, scenario: Scenario): Promise<RunResult["scenarios"][number]> {
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const recorder = attachRecorder(page);
  const collected: Bug[] = [];
  let currentStep: string | undefined;
  const startedAt = Date.now();

  const stepDir = resolve(OUT_DIR, "screens", slug(scenario.name));
  await mkdir(stepDir, { recursive: true });

  const ctx: ScenarioContext = {
    baseUrl: BASE_URL,
    context,
    page,
    bug(b) {
      collected.push({
        ...b,
        scenario: scenario.name,
        step: b.step ?? currentStep,
        capturedAt: new Date().toISOString(),
      });
    },
    expect(cond, message, severity = "major") {
      if (cond) return true;
      collected.push({
        scenario: scenario.name,
        step: currentStep,
        kind: "assertion",
        severity,
        url: page.url(),
        message,
        capturedAt: new Date().toISOString(),
      });
      return false;
    },
    async goto(path, opts) {
      const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch((e: Error) => {
        ctx.bug({ kind: "timeout", severity: "blocker", url, message: `goto ${path} threw: ${e.message}` });
        return null;
      });
      if (!res) return;
      const expected = opts?.expectStatus ?? 200;
      if (res.status() !== expected) {
        ctx.bug({
          kind: "response.error",
          severity: res.status() >= 500 ? "blocker" : "major",
          url,
          status: res.status(),
          message: `goto ${path} expected ${expected} got ${res.status()}`,
        });
      }
      if (opts?.expectPath) {
        const u = new URL(page.url());
        const ok = typeof opts.expectPath === "string" ? u.pathname === opts.expectPath : opts.expectPath.test(u.pathname);
        if (!ok) {
          ctx.bug({
            kind: "redirect",
            severity: "major",
            url: page.url(),
            message: `expected path ${opts.expectPath} after goto ${path}, got ${u.pathname}`,
          });
        }
      }
    },
    async api(path, init) {
      const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
      // Use the page's request context so cookies (session) are sent.
      const resp = await page.request.fetch(url, {
        method: (init?.method ?? "GET") as string,
        headers: (init?.headers as Record<string, string> | undefined) ?? undefined,
        data: init?.body as string | undefined,
      });
      const text = await resp.text();
      let json: unknown = null;
      try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
      return { ok: resp.ok(), status: resp.status(), json: json as never, text };
    },
    step(name) {
      currentStep = name;
      recorder.setStep(name);
    },
    async snap(label) {
      const file = resolve(stepDir, `${Date.now()}-${slug(label)}.png`);
      try {
        await page.screenshot({ path: file, fullPage: true });
        return file;
      } catch {
        return undefined;
      }
    },
  };

  try {
    await scenario.run(ctx);
  } catch (e) {
    const err = e as Error;
    collected.push({
      scenario: scenario.name,
      step: currentStep,
      kind: "scenario.crash",
      severity: "blocker",
      url: page.url(),
      message: err.message,
      detail: err.stack?.split("\n").slice(0, 8).join("\n"),
      capturedAt: new Date().toISOString(),
    });
    await ctx.snap("crash").catch(() => undefined);
  }

  // Pull anything the recorder buffered, stamp with scenario.
  for (const b of recorder.drain()) {
    collected.push({ ...b, scenario: scenario.name });
  }

  await context.close();
  return {
    name: scenario.name,
    persona: scenario.persona,
    description: scenario.description,
    durationMs: Date.now() - startedAt,
    passed: collected.every((b) => b.severity === "info"),
    bugs: collected,
  };
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function renderMarkdown(result: RunResult): string {
  const lines: string[] = [];
  lines.push(`# QA Agent Report`);
  lines.push("");
  lines.push(`- Base URL: \`${result.baseUrl}\``);
  lines.push(`- Started: ${result.startedAt}`);
  lines.push(`- Finished: ${result.finishedAt}`);
  lines.push(`- Scenarios: ${result.scenarios.length}`);
  lines.push(`- Total bugs: **${result.bugs.length}**`);
  const bySev = result.bugs.reduce<Record<string, number>>((acc, b) => {
    acc[b.severity] = (acc[b.severity] ?? 0) + 1;
    return acc;
  }, {});
  for (const [sev, n] of Object.entries(bySev)) lines.push(`  - ${sev}: ${n}`);
  lines.push("");

  for (const s of result.scenarios) {
    const icon = s.bugs.length === 0 ? "✅" : s.bugs.some((b) => b.severity === "blocker") ? "🛑" : "⚠️";
    lines.push(`## ${icon} ${s.name} _(${s.persona}, ${s.durationMs} ms)_`);
    lines.push(s.description);
    lines.push("");
    if (s.bugs.length === 0) {
      lines.push("_No issues recorded._");
      lines.push("");
      continue;
    }
    for (const b of s.bugs) {
      lines.push(`- **[${b.severity}] ${b.kind}** ${b.step ? `_(step: ${b.step})_` : ""}`);
      lines.push(`  - ${escapeMd(b.message)}`);
      if (b.url) lines.push(`  - url: \`${b.url}\``);
      if (b.status !== undefined) lines.push(`  - status: ${b.status}`);
      if (b.detail) lines.push(`  - detail: \n\n\`\`\`\n${b.detail}\n\`\`\``);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, "\\|");
}

async function main(): Promise<void> {
  console.log(`[qa-agent] target: ${BASE_URL}`);
  await preflight();

  const all = await loadScenarios();
  const scenarios = FILTER ? all.filter((s) => s.name.toLowerCase().includes(FILTER)) : all;
  if (scenarios.length === 0) {
    throw new Error(`No scenarios matched filter '${FILTER}'. Available: ${all.map((s) => s.name).join(", ")}`);
  }

  const browser = await chromium.launch({ headless: !HEADED, slowMo: SLOWMO });
  const startedAt = new Date().toISOString();
  const results: RunResult["scenarios"] = [];
  for (const sc of scenarios) {
    console.log(`[qa-agent] ▶ ${sc.name}`);
    const r = await runScenario(browser, sc);
    const blockers = r.bugs.filter((b) => b.severity === "blocker").length;
    const majors = r.bugs.filter((b) => b.severity === "major").length;
    console.log(
      `[qa-agent]   ${r.bugs.length === 0 ? "✅" : "⚠️"} ${sc.name} — ${r.bugs.length} bug(s) (${blockers} blocker, ${majors} major) in ${r.durationMs}ms`,
    );
    results.push(r);
  }
  await browser.close();

  const result: RunResult = {
    startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    scenarios: results,
    bugs: results.flatMap((r) => r.bugs),
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(resolve(OUT_DIR, "report.json"), JSON.stringify(result, null, 2), "utf8");
  await writeFile(resolve(OUT_DIR, "report.md"), renderMarkdown(result), "utf8");
  console.log(`[qa-agent] report written → ${OUT_DIR}`);

  const blockers = result.bugs.filter((b) => b.severity === "blocker").length;
  if (blockers > 0) {
    console.error(`[qa-agent] ${blockers} blocker bug(s) — failing exit.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("[qa-agent] fatal:", e);
  process.exit(2);
});
