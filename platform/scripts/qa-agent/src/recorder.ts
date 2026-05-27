import type { Page } from "playwright";
import type { Bug } from "./types.ts";

/** Patterns that should NOT be reported as bugs (third-party noise, expected dev warnings). */
const CONSOLE_IGNORE: RegExp[] = [
  /\[Fast Refresh\]/i,
  /Download the React DevTools/i,
  /webpack-internal/i,
  // Next.js dev-only hydration warning prefixes from libs
  /HMR/i,
];

/** Network requests we don't care about (telemetry, analytics, browser noise). */
const URL_IGNORE: RegExp[] = [
  /\/_next\/webpack-hmr/i,
  /favicon\.ico$/,
  /\/__nextjs/i,
];

export interface RecorderHandle {
  drain: () => Bug[];
  /** Attach the current scenario+step context so future records get tagged. */
  setStep: (step: string | undefined) => void;
}

/**
 * Attach error/network listeners to a page. Returns a handle whose `drain()`
 * returns and clears the accumulated bugs (already partially-tagged; the
 * runner stamps scenario/timestamp).
 */
export function attachRecorder(page: Page): RecorderHandle {
  const buffer: Array<Omit<Bug, "scenario" | "capturedAt">> = [];
  let currentStep: string | undefined;

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (CONSOLE_IGNORE.some((r) => r.test(text))) return;
    buffer.push({
      step: currentStep,
      kind: "console.error",
      severity: "major",
      url: page.url(),
      message: text.slice(0, 500),
    });
  });

  page.on("pageerror", (err) => {
    buffer.push({
      step: currentStep,
      kind: "page.error",
      severity: "blocker",
      url: page.url(),
      message: err.message,
      detail: err.stack?.split("\n").slice(0, 6).join("\n"),
    });
  });

  page.on("requestfailed", (req) => {
    const url = req.url();
    if (URL_IGNORE.some((r) => r.test(url))) return;
    // Ignore aborted navigations triggered by client-side router replacements.
    const failure = req.failure()?.errorText ?? "request failed";
    if (failure === "net::ERR_ABORTED") return;
    buffer.push({
      step: currentStep,
      kind: "request.failed",
      severity: "major",
      url,
      message: `${req.method()} ${url} — ${failure}`,
    });
  });

  page.on("response", (res) => {
    const url = res.url();
    if (URL_IGNORE.some((r) => r.test(url))) return;
    const status = res.status();
    if (status < 400) return;
    // 401 on /api/auth/session before login is expected — let scenario decide.
    const severity: Bug["severity"] = status >= 500 ? "blocker" : "major";
    buffer.push({
      step: currentStep,
      kind: "response.error",
      severity,
      url,
      status,
      message: `${res.request().method()} ${url} → ${status}`,
    });
  });

  return {
    setStep(step) {
      currentStep = step;
    },
    drain() {
      const out = buffer.splice(0, buffer.length);
      return out.map((b) => ({ ...b, scenario: "", capturedAt: new Date().toISOString() }));
    },
  };
}
