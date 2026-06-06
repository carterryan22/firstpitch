import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { StageResult } from "./types.ts";

const TAIL_LINES = 30;

function tail(s: string, n = TAIL_LINES): string {
  return s.split(/\r?\n/).filter((l) => l.trim()).slice(-n).join("\n");
}

/**
 * Run a shell command from a working dir. On Windows the PowerShell execution
 * policy blocks `npm.ps1`, so everything goes through `cmd /c` (repo convention).
 */
export function runCmd(cwd: string, name: string, command: string): StageResult {
  const start = Date.now();
  const isWin = process.platform === "win32";
  const res = isWin
    ? spawnSync("cmd", ["/c", command], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    : spawnSync("sh", ["-c", command], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const durationMs = Date.now() - start;
  const out = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
  const ok = res.status === 0;
  return {
    name,
    ok,
    skipped: false,
    durationMs,
    summary: ok ? "passed" : `exit ${res.status ?? "?"}`,
    output: tail(out),
  };
}

function skipped(name: string, reason: string): StageResult {
  return { name, ok: true, skipped: true, durationMs: 0, summary: `skipped (${reason})`, output: "" };
}

/**
 * Layer A — deterministic code gates. The agent must never reason around a
 * failed build/typecheck/test, so these run first and a failure forces a
 * `block` decision.
 *
 * - `vitest` is the project's gate of record.
 * - `web typecheck` mirrors the repo verify recipe (nuke tsbuildinfo first).
 * - `build` is opt-in (`LR_BUILD=1`) — it's slow and not needed for most runs.
 *
 * Set `LR_GATES=0` to skip the whole layer (useful when iterating on the
 * aggregation logic against existing sub-agent artifacts).
 */
export function runGates(root: string): StageResult[] {
  if (process.env.LR_GATES === "0") {
    return [
      skipped("vitest", "LR_GATES=0"),
      skipped("web typecheck", "LR_GATES=0"),
      skipped("build", "LR_GATES=0"),
    ];
  }

  const gates: StageResult[] = [];

  gates.push(runCmd(root, "vitest", "npx vitest run"));

  // Web typecheck — clear the incremental cache first (per repo recipe).
  const tsbuild = join(root, "apps", "web", "tsconfig.tsbuildinfo");
  if (existsSync(tsbuild)) {
    try {
      spawnSync(
        process.platform === "win32" ? "cmd" : "sh",
        process.platform === "win32" ? ["/c", `del /q "${tsbuild}"`] : ["-c", `rm -f "${tsbuild}"`],
        { cwd: root },
      );
    } catch {
      /* best-effort */
    }
  }
  gates.push(runCmd(root, "web typecheck", "npx tsc --noEmit --project apps/web"));

  if (process.env.LR_BUILD === "1") {
    gates.push(runCmd(root, "build", "npm run build:web"));
  } else {
    gates.push(skipped("build", "set LR_BUILD=1 to run"));
  }

  return gates;
}
