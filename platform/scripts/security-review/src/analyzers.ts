import type { Analyzer, SecFinding, SourceFile } from "./types.ts";

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

const snip = (raw: string) => raw.trim().slice(0, 160);

/** Known server-side auth/ownership gates in this repo. Their presence in a
 * route file means the handler is making an access-control decision. */
const AUTH_HELPER_RE =
  /\bgetSession\b|\buserCanManageTeam\b|\brequireRole\b|\brequireSession\b|\bgetSessionUser\b|\bverifyGameSig\b|\bsignGameId\b|x-cron-secret|CRON_SECRET|PLATFORM_ALLOW_DEV_LOGIN|consumeLoginToken|grantConsentByToken/;

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Derive a route label like `POST /api/teams/[id]/players` from a route file. */
function routeLabel(file: SourceFile, verbs: string[]): string {
  const m = file.rel.match(/apps\/web\/app\/(api\/.*)\/route\.[cm]?[jt]sx?$/);
  const path = m ? `/${m[1]}` : file.rel;
  return `${verbs.join("/")} ${path}`;
}

// ── 1. Secrets & client-side exposure ───────────────────────────────────────
const secrets: Analyzer = (file) => {
  const out: SecFinding[] = [];

  // Hardcoded credential literal.
  eachMatch(
    file,
    /(api[_-]?key|secret|password|passwd|token|client[_-]?secret|private[_-]?key|service[_-]?role)\s*[:=]\s*["'`][A-Za-z0-9._\-/+=]{12,}["'`]/i,
    (_m, line, raw) => {
      if (isCommentLine(raw)) return;
      if (/process\.env|example|placeholder|<your|xxxx|dummy|redacted|test|mock|sample/i.test(raw)) return;
      out.push({
        analyzer: "secrets", rule: "hardcoded-secret", severity: "P0", category: "secrets",
        owasp: "A02:Cryptographic-Failures",
        file: file.rel, line, snippet: snip(raw).replace(/(["'`])[A-Za-z0-9._\-/+=]{12,}\1/, "$1***REDACTED***$1"),
        message: "Possible hardcoded credential/secret committed to source.",
        suggestion: "Move the value to a server-only environment variable; rotate the leaked secret immediately.",
        acceptance: "No secret literal remains in source; the value is read from process.env and the old value is rotated.",
        suggestedTest: "Add a CI secret-scanning gate (GitHub secret scanning + push protection) on the repo.",
      });
    },
  );

  // Server-only secret read inside a browser ("use client") bundle.
  if (file.isClient) {
    eachMatch(
      file,
      /process\.env\.([A-Z0-9_]*(SECRET|PRIVATE|SERVICE_ROLE|AUTH_SECRET|API_KEY|SIGNING|WEBHOOK)[A-Z0-9_]*)/,
      (m, line, raw) => {
        const name = m[1] ?? "";
        if (name.startsWith("NEXT_PUBLIC_")) return; // intentionally public
        out.push({
          analyzer: "secrets", rule: "secret-in-client-bundle", severity: "P0", category: "secrets",
          owasp: "A02:Cryptographic-Failures",
          file: file.rel, line, snippet: snip(raw),
          message: `Server-only secret \`${name}\` is read inside a "use client" component — it ships in the browser bundle.`,
          suggestion: "Read secrets only in server components, route handlers, or server actions. Never reference them from client code.",
          acceptance: "The secret is only referenced server-side; the production JS bundle contains no occurrence of the value.",
        });
      },
    );
  }

  // A NEXT_PUBLIC_ var named like a secret — public by definition, so anything
  // sensitive assigned to it leaks to every visitor.
  eachMatch(
    file,
    /NEXT_PUBLIC_[A-Z0-9_]*(SECRET|PRIVATE|SERVICE_ROLE|PASSWORD|API_KEY|SIGNING|WEBHOOK)[A-Z0-9_]*/,
    (m, line, raw) => {
      if (isCommentLine(raw)) return;
      out.push({
        analyzer: "secrets", rule: "secret-named-public-var", severity: "P1", category: "secrets",
        owasp: "A05:Security-Misconfiguration",
        file: file.rel, line, snippet: snip(raw),
        message: `Env var \`${m[0]}\` is NEXT_PUBLIC_* (exposed to the browser) but is named like a secret.`,
        suggestion: "Drop the NEXT_PUBLIC_ prefix so it stays server-only, or confirm the value is genuinely publishable.",
        acceptance: "No NEXT_PUBLIC_ variable carries a privileged/secret value.",
      });
    },
  );

  return out;
};

// ── 2. Authorization / multi-tenant isolation (OWASP #1) ─────────────────────
const authorization: Analyzer = (file) => {
  if (!file.isApiRoute || !/route\.[cm]?[jt]sx?$/.test(file.rel)) return [];
  const out: SecFinding[] = [];
  const c = file.content;
  const touchesStorage = /getRepos|getReposForRequest|getFieldsRepos|\brepos\./.test(c);
  const hasAuth = AUTH_HELPER_RE.test(c);
  const isAdmin = /\/api\/admin\//.test(file.rel) || /\/admin\//.test(file.rel);
  const isBilling = /\/api\/billing\//.test(file.rel);
  const isCron = /\/api\/cron\//.test(file.rel);
  // The auth surface itself (login/logout/magic-link request/verify) is
  // intentionally callable by anonymous users — object-level authorization does
  // not apply. It is reviewed under "Authentication" and guarded by rate limits
  // + single-use token consumption, not an ownership check.
  const isAuthBootstrap = /\/api\/auth\//.test(file.rel);
  const mutating = file.handlers.filter((h) => MUTATING.has(h));

  // (a) Mutating, storage-touching handler with no server-side auth gate.
  if (touchesStorage && mutating.length > 0 && !hasAuth && !isAuthBootstrap) {
    const sev = isAdmin || isBilling ? "P0" : "P1";
    out.push({
      analyzer: "authz", rule: "missing-auth-gate", severity: sev, category: "authz",
      owasp: isAdmin ? "API5:Broken-Function-Level-Authorization" : "API1:Broken-Object-Level-Authorization",
      file: file.rel, line: 1, route: routeLabel(file, mutating),
      message: `${mutating.join("/")} handler mutates storage but references no server-side auth/ownership check.`,
      suggestion: "Resolve the session (getSession) and verify role + object ownership (userCanManageTeam / requireRole) before any write. Never trust a client-supplied id.",
      acceptance: "Unauthenticated → 401, wrong-team/wrong-role → 403; the write only happens after a server-side ownership check.",
      suggestedTest: "Add an authz test: seeded User B cannot mutate User A's resource via this endpoint (assert 403 + unchanged data).",
    });
  }

  // (b) Admin route with no role enforcement.
  if (isAdmin && !/requireRole|role\s*===?\s*["'`]admin["'`]|["'`]admin["'`]/.test(c)) {
    out.push({
      analyzer: "authz", rule: "admin-route-no-role-check", severity: "P0", category: "authz",
      owasp: "API5:Broken-Function-Level-Authorization",
      file: file.rel, line: 1, route: routeLabel(file, file.handlers),
      message: "Admin route does not enforce an admin role server-side.",
      suggestion: "Gate the handler with requireRole(session, ['admin']) (or equivalent) and return 403 for non-admins.",
      acceptance: "A non-admin session receives 403 from every method on this route.",
      suggestedTest: "Add a test: a coach/parent session is rejected with 403 on this admin endpoint.",
    });
  }

  // (c) Cron route with no shared-secret gate.
  if (isCron && !/CRON_SECRET|x-cron-secret/.test(c)) {
    out.push({
      analyzer: "authz", rule: "cron-route-unauthenticated", severity: "P1", category: "authz",
      owasp: "API5:Broken-Function-Level-Authorization",
      file: file.rel, line: 1, route: routeLabel(file, file.handlers),
      message: "Cron/automation route is not protected by a shared secret.",
      suggestion: "Require the `x-cron-secret` header to equal CRON_SECRET; reject otherwise with 401.",
      acceptance: "A request without the correct cron secret is rejected with 401.",
    });
  }

  // (d) Object-by-id read without an ownership check (potential IDOR/BOLA).
  if (
    /\[[^\]]+\]/.test(file.rel) &&
    /\brepos\.\w+\.byId\b/.test(c) &&
    /getSession/.test(c) &&
    !/userCanManageTeam|requireRole|parentUserId|assignedByUserId|ownerId|\.userId\b/.test(c)
  ) {
    out.push({
      analyzer: "authz", rule: "object-read-no-ownership", severity: "P1", category: "authz",
      owasp: "API1:Broken-Object-Level-Authorization",
      file: file.rel, line: 1, route: routeLabel(file, file.handlers),
      message: "Dynamic `[id]` route fetches an object by id but no ownership/tenant check is visible.",
      suggestion: "After loading the object, confirm the session user owns it (team membership, parentUserId, or matching userId) before returning or mutating it.",
      acceptance: "Requesting another tenant's object id returns 403/404, never that object's data.",
      suggestedTest: "Add a cross-tenant test: User B requests User A's object id and receives 403/404.",
    });
  }

  return out;
};

// ── 3. Injection (SQL / command / XSS / eval) ────────────────────────────────
const injection: Analyzer = (file) => {
  const out: SecFinding[] = [];
  // Dev tooling under scripts/ is not the app's XSS/eval attack surface and
  // legitimately handles trusted constants — skip it for these two rules.
  const appSurface = !file.isScript && !file.isTest;

  if (appSurface) {
    eachMatch(file, /\beval\s*\(|new\s+Function\s*\(/, (_m, line, raw) => {
      if (isCommentLine(raw)) return;
      out.push({
        analyzer: "injection", rule: "dynamic-eval", severity: "P1", category: "injection",
        owasp: "A03:Injection", file: file.rel, line, snippet: snip(raw),
        message: "Dynamic code evaluation (`eval`/`Function`).",
        suggestion: "Never evaluate strings as code. Parse data explicitly.",
        acceptance: "No `eval`/`new Function` on a code path that can see user input.",
      });
    });

    eachMatch(file, /dangerouslySetInnerHTML/, (_m, line, raw) => {
      out.push({
        analyzer: "injection", rule: "dangerous-html", severity: "P1", category: "injection",
        owasp: "A03:Injection", file: file.rel, line, snippet: snip(raw),
        message: "`dangerouslySetInnerHTML` can introduce stored/reflected XSS in user-visible content.",
        suggestion: "Render text as JSX, or sanitize the HTML with a vetted sanitizer (e.g. DOMPurify) before injecting.",
        acceptance: "User-controlled strings (notes, names, reports) cannot inject markup that executes in another user's browser.",
        suggestedTest: "Add a test that a note containing `<img onerror>` renders inert text, not active HTML.",
      });
    });
  }

  // Raw SQL built with template interpolation (applies everywhere).
  eachMatch(file, /\$(?:query|execute)Raw(?:Unsafe)?\s*[(`][^`]*\$\{/, (_m, line, raw) => {
    out.push({
      analyzer: "injection", rule: "sql-injection", severity: "P0", category: "injection",
      owasp: "A03:Injection", file: file.rel, line, snippet: snip(raw),
      message: "Raw SQL built from an interpolated string (SQL injection risk).",
      suggestion: "Use parameterized queries / Prisma tagged-template parameters; never interpolate untrusted input into SQL.",
      acceptance: "All SQL uses bound parameters; no string-built queries reach the database.",
    });
  });

  // Shell command from interpolation.
  eachMatch(file, /\b(execSync|exec|spawnSync|spawn)\s*\(\s*[`"'][^`"')]*\$\{/, (_m, line, raw) => {
    if (file.isScript) return; // dev tooling builds shell strings from trusted constants
    out.push({
      analyzer: "injection", rule: "command-injection", severity: "P1", category: "injection",
      owasp: "A03:Injection", file: file.rel, line, snippet: snip(raw),
      message: "Shell command built from an interpolated string (command injection risk).",
      suggestion: "Pass args as an array to spawn/execFile; never interpolate untrusted input into a shell string.",
      acceptance: "No shell command on a request path is built by string interpolation of user input.",
    });
  });

  return out;
};

// ── 4. Privacy / logging leakage (child + PII) ───────────────────────────────
const privacyLeakage: Analyzer = (file) => {
  if (file.isTest) return [];
  const out: SecFinding[] = [];

  eachMatch(
    file,
    /console\.\w+\s*\([^)]*\b(password|passwd|secret|token|authorization|cookie|req\.body|request\.body|\.dob\b|birthdate|parentEmail|ssn|creditcard|card[_-]?number)\b/i,
    (m, line, raw) => {
      if (isCommentLine(raw)) return;
      out.push({
        analyzer: "privacy", rule: "sensitive-in-logs", severity: "P1", category: "privacy",
        owasp: "A09:Logging-and-Monitoring-Failures",
        file: file.rel, line, snippet: snip(raw),
        message: `Logging what looks like sensitive data (\`${(m[1] ?? "").toLowerCase()}\`).`,
        suggestion: "Never log credentials, tokens, request bodies, or child PII (names/DOB). Log stable ids only.",
        acceptance: "Logs contain no secrets, tokens, full request bodies, or player birthdates.",
      });
    },
  );

  // Returning a raw stack trace / error message to the client.
  eachMatch(file, /(NextResponse\.json|Response\.json|res\.(json|send))\s*\([^)]*\b(err|error|e)\.(stack|message)\b/, (_m, line, raw) => {
    if (!file.isApiRoute) return;
    out.push({
      analyzer: "privacy", rule: "error-detail-to-client", severity: "P2", category: "privacy",
      owasp: "A09:Logging-and-Monitoring-Failures",
      file: file.rel, line, snippet: snip(raw),
      message: "Raw error/stack detail may be returned to the client.",
      suggestion: "Return a generic message + status; log the detail server-side via the monitoring helper.",
      acceptance: "Clients receive a generic error body; stack traces only appear in server logs.",
    });
  });

  return out;
};

// ── 5. Weak cryptography ─────────────────────────────────────────────────────
const crypto: Analyzer = (file) => {
  if (file.isTest) return [];
  const out: SecFinding[] = [];

  eachMatch(file, /Math\.random\s*\(\s*\)/, (_m, line, raw) => {
    if (!/token|secret|password|session|id\b|salt|nonce|key|otp|code|sig/i.test(raw)) return;
    out.push({
      analyzer: "crypto", rule: "weak-random", severity: "P1", category: "crypto",
      owasp: "A02:Cryptographic-Failures",
      file: file.rel, line, snippet: snip(raw),
      message: "`Math.random()` used for a security-sensitive value.",
      suggestion: "Use `crypto.randomBytes` / `crypto.randomUUID` for tokens, session ids, and secrets.",
      acceptance: "All tokens/ids/secrets come from a CSPRNG.",
    });
  });

  eachMatch(file, /createHash\s*\(\s*["'`](md5|sha1)["'`]/i, (m, line, raw) => {
    if (!/password|secret|token|credential/i.test(raw) && !/password|secret|token|credential/i.test(file.content)) return;
    out.push({
      analyzer: "crypto", rule: "weak-hash", severity: "P1", category: "crypto",
      owasp: "A02:Cryptographic-Failures",
      file: file.rel, line, snippet: snip(raw),
      message: `Weak hash (\`${(m[1] ?? "").toLowerCase()}\`) near credential material.`,
      suggestion: "Hash passwords with a slow KDF (scrypt/argon2/bcrypt); use SHA-256+ for token digests.",
      acceptance: "No password or credential is protected by MD5/SHA-1.",
    });
  });

  return out;
};

// ── 6. Security headers (next.config) ────────────────────────────────────────
const securityHeaders: Analyzer = (file) => {
  if (!/apps\/web\/next\.config\.[cm]?js$/.test(file.rel)) return [];
  const c = file.content;
  const out: SecFinding[] = [];

  if (!/async\s+headers\s*\(|headers\s*:\s*async/.test(c) && !/securityHeaders/.test(c)) {
    out.push({
      analyzer: "headers", rule: "no-security-headers", severity: "P1", category: "headers",
      owasp: "A05:Security-Misconfiguration", file: file.rel, line: 1,
      message: "No `async headers()` / security-header block found in next.config.",
      suggestion: "Add a security-header set (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) via `async headers()`.",
      acceptance: "Every response carries the baseline security headers.",
    });
    return out;
  }

  const required: Array<[RegExp, string, string]> = [
    [/Content-Security-Policy/i, "Content-Security-Policy", "Define a CSP that restricts script/style/connect sources."],
    [/Strict-Transport-Security/i, "Strict-Transport-Security", "Add HSTS so browsers refuse plain-HTTP for the domain."],
    [/X-Frame-Options|frame-ancestors/i, "X-Frame-Options / frame-ancestors", "Prevent clickjacking by disallowing framing."],
    [/X-Content-Type-Options/i, "X-Content-Type-Options", "Send `nosniff` to stop MIME confusion."],
    [/Referrer-Policy/i, "Referrer-Policy", "Constrain referrer leakage (e.g. strict-origin-when-cross-origin)."],
    [/Permissions-Policy/i, "Permissions-Policy", "Disable unused browser features (camera, geolocation, etc.)."],
  ];
  for (const [re, name, fix] of required) {
    if (!re.test(c)) {
      out.push({
        analyzer: "headers", rule: `missing-${name.split(" ")[0]?.toLowerCase()}`, severity: "P2", category: "headers",
        owasp: "A05:Security-Misconfiguration", file: file.rel, line: 1,
        message: `Security header missing: ${name}.`,
        suggestion: fix,
        acceptance: `Responses include a ${name} header.`,
      });
    }
  }
  return out;
};

// ── 7. Cookie flags ──────────────────────────────────────────────────────────
const cookies: Analyzer = (file) => {
  const c = file.content;
  // Only inspect files that actually set a session/auth cookie.
  const setsCookie = /cookies\(\)\.set\s*\(|["']Set-Cookie["']|response\.cookies\.set\s*\(/.test(c);
  const aboutSession = /session|token|auth/i.test(c);
  if (!setsCookie || !aboutSession) return [];
  const out: SecFinding[] = [];
  const missing: string[] = [];
  if (!/httpOnly/i.test(c)) missing.push("httpOnly");
  if (!/sameSite/i.test(c)) missing.push("sameSite");
  if (!/\bsecure\b/i.test(c)) missing.push("secure");
  if (missing.length > 0) {
    out.push({
      analyzer: "cookies", rule: "insecure-cookie-flags", severity: "P1", category: "cookies",
      owasp: "A05:Security-Misconfiguration", file: file.rel, line: 1,
      message: `Session/auth cookie is set without: ${missing.join(", ")}.`,
      suggestion: "Set httpOnly + sameSite='lax'|'strict' + secure (in production) on every auth/session cookie.",
      acceptance: "The session cookie is HttpOnly, SameSite, and Secure in production.",
      suggestedTest: "Assert the Set-Cookie response header includes HttpOnly; Secure; SameSite.",
    });
  }
  return out;
};

// ── 8. Billing / plan enforcement ────────────────────────────────────────────
const billing: Analyzer = (file) => {
  if (!file.isApiRoute || !/\/api\/billing\//.test(file.rel)) return [];
  const c = file.content;
  const out: SecFinding[] = [];
  // A webhook receiver that doesn't verify the signature can be spoofed to
  // grant plan access for free.
  if (/webhook/i.test(file.rel) && !/constructEvent|verify|signature|svix|stripe-signature/i.test(c)) {
    out.push({
      analyzer: "billing", rule: "unverified-webhook", severity: "P0", category: "billing",
      owasp: "A08:Software-and-Data-Integrity", file: file.rel, line: 1, route: routeLabel(file, file.handlers),
      message: "Billing webhook does not verify the provider signature.",
      suggestion: "Verify the `stripe-signature` header with the webhook signing secret before trusting any event.",
      acceptance: "Forged webhook payloads are rejected; only signature-verified events change plan state.",
      suggestedTest: "Add a test: an unsigned/forged webhook body is rejected with 400 and does not upgrade a plan.",
    });
  }
  return out;
};

export const ANALYZERS: Analyzer[] = [
  secrets,
  authorization,
  injection,
  privacyLeakage,
  crypto,
  securityHeaders,
  cookies,
  billing,
];
