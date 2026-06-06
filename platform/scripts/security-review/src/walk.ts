import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { SourceFile } from "./types.ts";

const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  ".git",
  "coverage",
  "qa-report",
  "ux-report",
  "code-report",
  "reports",
  "triple-play", // vendored third-party game — not ours to audit
  ".turbo",
]);

const SCAN_EXT = /\.(ts|tsx|mjs|cjs|js|jsx)$/;

/** Roots (relative to platform root) the agent walks. */
export const SCAN_ROOTS = ["packages", "apps", "scripts"];

function toPosix(p: string): string {
  return p.split(sep).join("/");
}

function walkDir(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (IGNORE_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walkDir(full, out);
    } else if (SCAN_EXT.test(name) && !name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
}

const HANDLER_RE = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*[:=]/g;

function findHandlers(content: string): string[] {
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  HANDLER_RE.lastIndex = 0;
  while ((m = HANDLER_RE.exec(content))) {
    const verb = m[1] ?? m[2];
    if (verb) set.add(verb);
  }
  return [...set];
}

export function collectSources(root: string): SourceFile[] {
  const files: string[] = [];
  for (const r of SCAN_ROOTS) walkDir(join(root, r), files);

  const sources: SourceFile[] = [];
  for (const abs of files) {
    let content: string;
    try {
      content = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const rel = toPosix(relative(root, abs));
    // Don't audit the agent's own source — its rule definitions contain the
    // very patterns it searches for and would otherwise self-flag.
    if (rel.startsWith("scripts/security-review/")) continue;
    const head = content.slice(0, 400);
    sources.push({
      abs,
      rel,
      content,
      lines: content.split(/\r?\n/),
      isTest: /\.(test|spec)\.[cm]?[jt]sx?$/.test(rel),
      isScript: rel.startsWith("scripts/"),
      isApiRoute: rel.includes("apps/web/app/api/"),
      isClient: /^\s*["']use client["']/.test(head),
      handlers: findHandlers(content),
    });
  }
  return sources;
}
