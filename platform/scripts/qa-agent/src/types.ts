import type { BrowserContext, Page } from "playwright";

export type BugSeverity = "blocker" | "major" | "minor" | "info";

export type BugKind =
  | "console.error"
  | "page.error"
  | "request.failed"
  | "response.error"
  | "assertion"
  | "timeout"
  | "redirect"
  | "scenario.crash";

export interface Bug {
  scenario: string;
  step?: string;
  kind: BugKind;
  severity: BugSeverity;
  url?: string;
  status?: number;
  message: string;
  detail?: string;
  screenshot?: string;
  capturedAt: string;
}

export interface ScenarioContext {
  baseUrl: string;
  context: BrowserContext;
  page: Page;
  /** Record a bug from inside a scenario. */
  bug: (b: Omit<Bug, "scenario" | "capturedAt">) => void;
  /** Soft assertion — records a bug instead of throwing. */
  expect: (cond: unknown, message: string, severity?: BugSeverity) => boolean;
  /** Navigate + assert 2xx; records redirect/error bug on failure. */
  goto: (path: string, opts?: { expectStatus?: number; expectPath?: RegExp | string }) => Promise<void>;
  /** Make a fetch using the page's session cookies. */
  api: <T = unknown>(path: string, init?: RequestInit) => Promise<{ ok: boolean; status: number; json: T | null; text: string }>;
  /** Mark a logical step (for bug tagging + report grouping). */
  step: (name: string) => void;
  /** Take a screenshot tagged with the current step. */
  snap: (label: string) => Promise<string | undefined>;
}

export interface Scenario {
  name: string;
  description: string;
  /** Roles: anonymous | coach | parent | admin etc. – informational. */
  persona: string;
  run: (ctx: ScenarioContext) => Promise<void>;
}

export interface RunResult {
  startedAt: string;
  finishedAt: string;
  baseUrl: string;
  scenarios: Array<{
    name: string;
    persona: string;
    description: string;
    durationMs: number;
    passed: boolean;
    bugs: Bug[];
  }>;
  bugs: Bug[];
}
