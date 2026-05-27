import type { BrowserContext, Page } from "playwright";

export type Persona = "coach" | "parent" | "player";

export type FindingSeverity = "critical" | "major" | "minor" | "info";

export type FindingKind =
  | "deadend"           // no obvious next action / no link or button
  | "missing-label"     // input without accessible label
  | "tap-target"        // <40x40 interactive element on mobile journey
  | "low-contrast"      // button/text fg/bg pair below ~3:1
  | "reading-level"     // body copy too dense for youth persona
  | "long-task"         // step took > target ms
  | "click-heavy"       // step required > target clicks
  | "type-heavy"        // step required > target keystrokes
  | "empty-state"       // page has no primary action and no content
  | "broken-step"       // expected element never appeared, journey stuck
  | "navigation-cost"   // task required > target hops from home
  | "icon-only-button"; // button has no text and no aria-label

export interface Finding {
  persona: Persona;
  journey: string;
  step?: string;
  kind: FindingKind;
  severity: FindingSeverity;
  url?: string;
  message: string;
  detail?: string;
  /** Concrete suggested improvement (workflow-oriented, not just bug). */
  suggestion: string;
  capturedAt: string;
}

export interface StepMetric {
  step: string;
  ms: number;
  clicks: number;
  keystrokes: number;
  navigations: number;
  reachedGoal: boolean;
  urlAtEnd: string;
  notes?: string;
}

export interface JourneyResult {
  name: string;
  persona: Persona;
  goal: string;
  startedAt: string;
  durationMs: number;
  completed: boolean;
  steps: StepMetric[];
  findings: Finding[];
  /** Aggregate totals across the whole journey. */
  totals: { clicks: number; keystrokes: number; navigations: number };
}

export interface JourneyContext {
  baseUrl: string;
  persona: Persona;
  context: BrowserContext;
  page: Page;
  /** Begin a logical step. End it with `endStep(reachedGoal)`. */
  startStep: (name: string) => void;
  endStep: (reachedGoal: boolean, note?: string) => void;
  /** Wrap an interaction so click/keystroke counters stay accurate. */
  click: (selector: string, opts?: { timeout?: number }) => Promise<boolean>;
  type: (selector: string, text: string) => Promise<boolean>;
  goto: (path: string) => Promise<boolean>;
  /** Run heuristics against the *current* page, tagged with current step. */
  audit: () => Promise<void>;
  /** Record a finding manually (used by journeys for goal-specific issues). */
  flag: (f: Omit<Finding, "persona" | "journey" | "capturedAt">) => void;
  /** Total runtime budget (ms) the persona should plausibly spend on the goal. */
  budgetMs: number;
  /** Max clicks the persona should reasonably expend on the goal. */
  clickBudget: number;
}

export interface Journey {
  name: string;
  persona: Persona;
  goal: string;
  /** Reasonable wall-clock budget for the whole job. */
  budgetMs: number;
  clickBudget: number;
  /** Viewport per persona — phones for parent/player, desktop for coach. */
  viewport: { width: number; height: number };
  run: (ctx: JourneyContext) => Promise<void>;
}

export interface RunReport {
  baseUrl: string;
  startedAt: string;
  finishedAt: string;
  journeys: JourneyResult[];
  findings: Finding[];
  /** Per-persona prioritized improvement list (computed by reporter). */
  recommendations: Record<Persona, string[]>;
}
