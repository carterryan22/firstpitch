import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { GateResult } from "./types.ts";

const TAIL_LINES = 25;

function tail(s: string, n = TAIL_LINES): string {
  return s.split(/\r?\n/).filter((l) => l.trim()).slice(-n).join("\n");
}

/**
 * Run a verification command from the platform root. On Windows the PowerShell
 * execution policy blocks `npm.ps1`, so everything goes through `cmd /c`.
 */
function runCmd(root: string, label: string, command: string): GateResult {
  const start = Date.now();
  const isWin = process.platform === "win32";
  const res = isWin
    ? spawnSync("cmd", ["/c", command], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    : spawnSync("sh", ["-c", command], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const durationMs = Date.now() - start;
  const out = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
  const ok = res.status === 0;
  return {
    name: label,
    ok,
    durationMs,
    summary: ok ? "passed" : `exit ${res.status ?? "?"}`,
    output: tail(out),
  };
}

export function runGates(root: string): GateResult[] {
  if (process.env.CODE_CHECKS === "0") {
    return [
      { name: "vitest", ok: true, skipped: true, durationMs: 0, summary: "skipped (CODE_CHECKS=0)", output: "" },
      { name: "web typecheck", ok: true, skipped: true, durationMs: 0, summary: "skipped (CODE_CHECKS=0)", output: "" },
    ];
  }
  const gates: GateResult[] = [];

  // The test suite is the project's gate of record.
  gates.push(runCmd(root, "vitest", 'npx vitest run'));

  // Web typecheck — nuke the incremental cache first (per repo recipe).
  const tsbuild = join(root, "apps", "web", "tsconfig.tsbuildinfo");
  if (existsSync(tsbuild)) {
    try {
      // best-effort removal; ignore failures
      spawnSync(process.platform === "win32" ? "cmd" : "sh",
        process.platform === "win32" ? ["/c", `del /q "${tsbuild}"`] : ["-c", `rm -f "${tsbuild}"`],
        { cwd: root });
    } catch { /* ignore */ }
  }
  gates.push(runCmd(root, "web typecheck", 'npx tsc --noEmit --project apps/web'));

  return gates;
}
