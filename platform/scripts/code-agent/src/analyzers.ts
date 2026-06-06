import type { Analyzer, Finding, SourceFile } from "./types.ts";

/** Walk lines once, calling `fn` for every match of `re` (per line). */
function eachMatch(
  file: SourceFile,
  re: RegExp,
  fn: (m: RegExpExecArray, lineNo: number, raw: string) => void,
): void {
  for (let i = 0; i < file.lines.length; i++) {
    const raw = file.lines[i] ?? "";
    const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    let m: RegExpExecArray | null;
    while ((m = rx.exec(raw))) {
      fn(m, i + 1, raw);
      if (m.index === rx.lastIndex) rx.lastIndex++;
    }
  }
}

function isCommentLine(raw: string): boolean {
  const t = raw.trimStart();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*");
}

const snip = (raw: string) => raw.trim().slice(0, 140);

// ── 1. Debugging leftovers ───────────────────────────────────────────────
const debuggingLeftovers: Analyzer = (file) => {
  if (file.isTest || file.isScript) return []; // scripts/CLIs legitimately log
  const out: Finding[] = [];
  eachMatch(file, /\bconsole\.(log|debug|trace)\s*\(/, (m, line, raw) => {
    if (isCommentLine(raw)) return;
    out.push({
      analyzer: "debugging", rule: "console-log", severity: "minor",
      file: file.rel, line, snippet: snip(raw),
      message: `Leftover \`console.${m[1]}\` in shipped code.`,
      suggestion: "Remove debug logging or route it through a guarded logger before prod.",
    });
  });
  eachMatch(file, /\bdebugger\b\s*;?/, (_m, line, raw) => {
    if (isCommentLine(raw)) return;
    out.push({
      analyzer: "debugging", rule: "debugger-statement", severity: "major",
      file: file.rel, line, snippet: snip(raw),
      message: "`debugger` statement left in source.",
      suggestion: "Remove the `debugger` statement — it halts execution when devtools are open.",
    });
  });
  return out;
};

// ── 2. TODO / FIXME markers ──────────────────────────────────────────────
const todoMarkers: Analyzer = (file) => {
  const out: Finding[] = [];
  eachMatch(file, /\b(TODO|FIXME|HACK|XXX)\b[:\s]/, (m, line, raw) => {
    const tag = m[1] ?? "TODO";
    const sev = tag === "FIXME" || tag === "HACK" ? "minor" : "info";
    out.push({
      analyzer: "todos", rule: tag.toLowerCase(), severity: sev,
      file: file.rel, line, snippet: snip(raw),
      message: `${tag} marker.`,
      suggestion: "Resolve or file a tracked issue; unactioned markers rot.",
    });
  });
  return out;
};

// ── 3. Type-safety escape hatches ────────────────────────────────────────
const typeSafety: Analyzer = (file) => {
  if (file.isTest) return [];
  const out: Finding[] = [];
  eachMatch(file, /@ts-(ignore|nocheck)\b/, (m, line, raw) => {
    out.push({
      analyzer: "type-safety", rule: `ts-${m[1]}`, severity: "major",
      file: file.rel, line, snippet: snip(raw),
      message: `\`@ts-${m[1]}\` suppresses the type-checker.`,
      suggestion: "Prefer `@ts-expect-error` with a reason, or fix the underlying type.",
    });
  });
  eachMatch(file, /(:\s*any\b|\bas\s+any\b|<any>)/, (_m, line, raw) => {
    if (isCommentLine(raw)) return;
    out.push({
      analyzer: "type-safety", rule: "explicit-any", severity: "minor",
      file: file.rel, line, snippet: snip(raw),
      message: "`any` defeats type-checking at this boundary.",
      suggestion: "Replace with a precise type, `unknown` + narrowing, or a generic.",
    });
  });
  return out;
};

// ── 4. Security (OWASP) ──────────────────────────────────────────────────
const security: Analyzer = (file) => {
  const out: Finding[] = [];

  // Hardcoded secrets / credentials.
  eachMatch(
    file,
    /(api[_-]?key|secret|password|passwd|token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["'`][A-Za-z0-9._\-/+=]{12,}["'`]/i,
    (_m, line, raw) => {
      if (isCommentLine(raw)) return;
      if (/process\.env|example|placeholder|<your|xxxx|dummy|test|mock/i.test(raw)) return;
      out.push({
        analyzer: "security", rule: "hardcoded-secret", severity: "critical",
        file: file.rel, line, snippet: snip(raw).replace(/(["'`])[A-Za-z0-9._\-/+=]{12,}\1/, "$1***REDACTED***$1"),
        owasp: "A02:Cryptographic-Failures",
        message: "Possible hardcoded credential/secret.",
        suggestion: "Move the secret to an environment variable; never commit credentials.",
      });
    },
  );

  // eval / Function constructor.
  eachMatch(file, /\beval\s*\(|new\s+Function\s*\(/, (_m, line, raw) => {
    if (isCommentLine(raw)) return;
    out.push({
      analyzer: "security", rule: "dynamic-eval", severity: "major",
      file: file.rel, line, snippet: snip(raw),
      owasp: "A03:Injection",
      message: "Dynamic code evaluation (`eval`/`Function`).",
      suggestion: "Avoid evaluating strings as code — it enables injection. Parse data explicitly.",
    });
  });

  // dangerouslySetInnerHTML.
  eachMatch(file, /dangerouslySetInnerHTML/, (_m, line, raw) => {
    out.push({
      analyzer: "security", rule: "dangerous-html", severity: "major",
      file: file.rel, line, snippet: snip(raw),
      owasp: "A03:Injection",
      message: "`dangerouslySetInnerHTML` can introduce XSS.",
      suggestion: "Render text as JSX, or sanitize the HTML with a vetted sanitizer first.",
    });
  });

  // Weak randomness for security material.
  eachMatch(file, /Math\.random\s*\(\s*\)/, (_m, line, raw) => {
    if (!/token|secret|password|id|salt|nonce|key|otp|code/i.test(raw)) return;
    out.push({
      analyzer: "security", rule: "weak-random", severity: "major",
      file: file.rel, line, snippet: snip(raw),
      owasp: "A02:Cryptographic-Failures",
      message: "`Math.random()` used for security-sensitive value.",
      suggestion: "Use `crypto.randomBytes`/`crypto.randomUUID` for tokens, ids, and secrets.",
    });
  });

  // Shell exec with interpolation (command injection).
  eachMatch(file, /\b(execSync|exec|spawnSync|spawn)\s*\(\s*[`"'][^`"')]*\$\{/, (_m, line, raw) => {
    out.push({
      analyzer: "security", rule: "command-injection", severity: "major",
      file: file.rel, line, snippet: snip(raw),
      owasp: "A03:Injection",
      message: "Shell command built from an interpolated string.",
      suggestion: "Pass args as an array to spawn/execFile; never interpolate untrusted input into a shell string.",
    });
  });

  return out;
};

// ── 5. Error handling smells ─────────────────────────────────────────────
const errorHandling: Analyzer = (file) => {
  if (file.isTest) return [];
  const out: Finding[] = [];
  // Empty catch block on one line.
  eachMatch(file, /\bcatch\s*(\([^)]*\))?\s*\{\s*\}/, (_m, line, raw) => {
    out.push({
      analyzer: "error-handling", rule: "empty-catch", severity: "minor",
      file: file.rel, line, snippet: snip(raw),
      message: "Empty catch block silently swallows errors.",
      suggestion: "Log, re-throw, or comment why the error is safe to ignore.",
    });
  });
  return out;
};

// ── 6. Test hygiene ──────────────────────────────────────────────────────
const testHygiene: Analyzer = (file) => {
  if (!file.isTest) return [];
  const out: Finding[] = [];
  eachMatch(file, /\b(describe|it|test)\.only\s*\(/, (m, line, raw) => {
    out.push({
      analyzer: "test-hygiene", rule: "focused-test", severity: "major",
      file: file.rel, line, snippet: snip(raw),
      message: `\`${m[1]}.only\` will silently skip the rest of the suite.`,
      suggestion: "Remove `.only` before committing — it disables every other test in the file.",
    });
  });
  eachMatch(file, /\b(describe|it|test)\.skip\s*\(/, (m, line, raw) => {
    out.push({
      analyzer: "test-hygiene", rule: "skipped-test", severity: "info",
      file: file.rel, line, snippet: snip(raw),
      message: `\`${m[1]}.skip\` — a disabled test.`,
      suggestion: "Re-enable or delete; permanently-skipped tests give false coverage confidence.",
    });
  });
  return out;
};

// ── 7. Next.js API route convention (repo-specific) ──────────────────────
// Per repo memory: storage-touching route handlers must opt out of caching.
const nextRouteHygiene: Analyzer = (file) => {
  if (!file.isApiRoute || !file.rel.endsWith("route.ts")) return [];
  const c = file.content;
  const touchesStorage = /getRepos|getReposForRequest|repos\.|getFieldsRepos|getRepos\(/.test(c);
  if (!touchesStorage) return [];
  const out: Finding[] = [];
  if (!/export\s+const\s+dynamic\s*=/.test(c)) {
    out.push({
      analyzer: "next-routes", rule: "missing-dynamic", severity: "minor",
      file: file.rel, line: 1,
      message: "Storage-touching API route is missing `export const dynamic = \"force-dynamic\"`.",
      suggestion: "Add `export const dynamic = \"force-dynamic\"` so Next.js never statically caches a data route.",
    });
  }
  if (!/export\s+const\s+runtime\s*=/.test(c)) {
    out.push({
      analyzer: "next-routes", rule: "missing-runtime", severity: "info",
      file: file.rel, line: 1,
      message: "Storage-touching API route is missing `export const runtime = \"nodejs\"`.",
      suggestion: "Add `export const runtime = \"nodejs\"` — the JSON file/KV store needs the Node runtime.",
    });
  }
  return out;
};

export const ANALYZERS: Analyzer[] = [
  debuggingLeftovers,
  todoMarkers,
  typeSafety,
  security,
  errorHandling,
  testHygiene,
  nextRouteHygiene,
];
