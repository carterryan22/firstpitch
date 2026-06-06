import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CodeReport, QaReport, StageResult, UxReport } from "./types.ts";

const TAIL_LINES = 12;

function tail(s: string, n = TAIL_LINES): string {
  return s.split(/\r?\n/).filter((l) => l.trim()).slice(-n).join("\n");
}

/** Run a command in `cwd` with extra env, capturing output. Exit code is NOT
 * treated as failure here — the sub-agents exit 1 on findings by design; we
 * still want to read their report.json. */
function run(cwd: string, command: string, env: Record<string, string>): { status: number; output: string } {
  const isWin = process.platform === "win32";
  const res = isWin
    ? spawnSync("cmd", ["/c", command], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ...env } })
    : spawnSync("sh", ["-c", command], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ...env } });
  return { status: res.status ?? -1, output: `${res.stdout ?? ""}\n${res.stderr ?? ""}` };
}

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Is a live app reachable? Both 200 and 401 mean the route tree booted. */
export async function pingServer(baseUrl: string): Promise<boolean> {
  const res = await fetch(`${baseUrl}/api/auth/session`).catch(() => null);
  return !!res && (res.status === 200 || res.status === 401);
}

export interface CodeStage {
  stage: StageResult;
  report: CodeReport | null;
}
export interface QaStage {
  stage: StageResult;
  report: QaReport | null;
}
export interface UxStage {
  stage: StageResult;
  report: UxReport | null;
}

/**
 * Layer D input — static code review. No server needed. We pass `CODE_CHECKS=0`
 * so the code-agent skips its own vitest+tsc (Layer A already ran them).
 */
export function runCodeAgent(scriptsDir: string): CodeStage {
  const dir = resolve(scriptsDir, "code-agent");
  const start = Date.now();
  const { output } = run(dir, "npm run code", { CODE_CHECKS: "0" });
  const report = readJson<CodeReport>(resolve(dir, "code-report", "report.json"));
  return {
    stage: {
      name: "code-agent",
      ok: report !== null,
      skipped: false,
      durationMs: Date.now() - start,
      summary: report ? `${report.findings.length} finding(s), ${report.filesScanned} files` : "no report produced",
      output: report ? "" : tail(output),
    },
    report,
  };
}

/**
 * Layer B — scripted Playwright E2E. Requires a live dev server. Runs the QA
 * agent against `baseUrl` and reads its report.json.
 */
export function runQaAgent(scriptsDir: string, baseUrl: string): QaStage {
  const dir = resolve(scriptsDir, "qa-agent");
  const start = Date.now();
  const { output } = run(dir, "npm run qa", { QA_BASE_URL: baseUrl });
  const report = readJson<QaReport>(resolve(dir, "qa-report", "report.json"));
  return {
    stage: {
      name: "qa-agent",
      ok: report !== null,
      skipped: false,
      durationMs: Date.now() - start,
      summary: report ? `${report.scenarios.length} scenario(s), ${report.bugs.length} bug(s)` : "no report produced",
      output: report ? "" : tail(output),
    },
    report,
  };
}

/**
 * Layer C — exploratory persona journeys. Requires a live dev server. Runs the
 * UX agent against `baseUrl` and reads its report.json.
 */
export function runUxAgent(scriptsDir: string, baseUrl: string): UxStage {
  const dir = resolve(scriptsDir, "ux-agent");
  const start = Date.now();
  const { output } = run(dir, "npm run ux", { UX_BASE_URL: baseUrl });
  const report = readJson<UxReport>(resolve(dir, "ux-report", "report.json"));
  return {
    stage: {
      name: "ux-agent",
      ok: report !== null,
      skipped: false,
      durationMs: Date.now() - start,
      summary: report ? `${report.journeys.length} journey(s), ${report.findings.length} finding(s)` : "no report produced",
      output: report ? "" : tail(output),
    },
    report,
  };
}
