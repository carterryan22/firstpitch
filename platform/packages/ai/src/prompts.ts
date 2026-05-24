// Prompt templates — encode ai-system-prompts.md §1-§5.
// All call sites MUST pass a RetrievalEnvelope so the model sees the rules.

import { loadSafetyRules, type SafetyRule } from "@platform/corpus";

export type PromptId =
  | "GLOBAL_SYSTEM"
  | "PRACTICE_PLAN"
  | "COACH_QA"
  | "PLAYER_MESSAGE"
  | "PARENT_MESSAGE";

export interface RetrievalEnvelope {
  userRole: "parent" | "coach" | "player" | "facility_admin" | "org_admin";
  ageBand: string;
  sport: "baseball" | "softball" | "both";
  applicableRules: SafetyRule[];
  retrievedRecordIds: string[];
  retrievedSnippets: string[];
}

const SAFETY_PREAMBLE = `
You are an assistant inside a youth athlete development platform.
You are NEVER permitted to:
  - Diagnose injuries.
  - Recommend supplements, restrictive diets, or weight-cut plans for minors.
  - Recommend curveballs or sliders for athletes under 14.
  - Recommend 1RM testing or max-effort barbell lifts for athletes under 14.
  - Override any Tier 1 safety rule supplied in the RULES block.
  - Produce a plan that violates Pitch Smart daily-max or rest-day requirements.
You MUST:
  - Cite the source_name + URL for every prescriptive claim.
  - Refuse and route to the human escalation path when asked about pain or injury.
  - Keep tone supportive, age-appropriate, and effort-focused.
`.trim();

export function buildGlobalSystem(): string {
  return SAFETY_PREAMBLE;
}

function rulesBlock(env: RetrievalEnvelope): string {
  if (env.applicableRules.length === 0) return "RULES: (none retrieved)";
  return [
    "RULES:",
    ...env.applicableRules.map(
      (r) => `- [${r.rule_id}] (${r.enforcement}) ${r.rule_text} — source: ${r.source_name} ${r.source_url}`
    ),
  ].join("\n");
}

function contextBlock(env: RetrievalEnvelope): string {
  return [
    `USER_ROLE: ${env.userRole}`,
    `AGE_BAND: ${env.ageBand}`,
    `SPORT: ${env.sport}`,
    rulesBlock(env),
    env.retrievedSnippets.length > 0
      ? `RETRIEVED:\n${env.retrievedSnippets.map((s, i) => `(${i + 1}) ${s}`).join("\n")}`
      : "RETRIEVED: (none)",
  ].join("\n");
}

export interface BuildPromptInput {
  promptId: PromptId;
  env: RetrievalEnvelope;
  userMessage: string;
  extra?: Record<string, string>;
}

export function buildPrompt(input: BuildPromptInput): { system: string; user: string } {
  const system = buildGlobalSystem();
  const ctx = contextBlock(input.env);
  let task = "";
  switch (input.promptId) {
    case "GLOBAL_SYSTEM":
      task = "Answer the user's question within the constraints above.";
      break;
    case "PRACTICE_PLAN":
      task =
        "Draft a single practice plan. Output a JSON object with `blocks: [{name, durationMin, drillId, notes}]`. Every block must respect the RULES above.";
      break;
    case "COACH_QA":
      task =
        "Answer the coach's question. Cite RULES by rule_id and source_name. If the question concerns pain, injury, or scope outside this platform, refuse and recommend escalation.";
      break;
    case "PLAYER_MESSAGE":
      task =
        "Write a short, encouraging message to the player. Use age-appropriate language. Praise effort, not outcomes. Never mention weight, diet, or appearance.";
      break;
    case "PARENT_MESSAGE":
      task =
        "Write a clear, honest update for a parent. State what their child did, what they're working on, what's next. No metric thresholds presented as judgments.";
      break;
  }
  return { system, user: `${ctx}\n\nTASK: ${task}\n\nUSER_MESSAGE: ${input.userMessage}` };
}

/** Returns rules whose `applies_to` includes any of the supplied modules. */
export function applicableRulesFor(modules: string[]): SafetyRule[] {
  return loadSafetyRules().rules.filter((r) => r.applies_to.some((m) => modules.includes(m)));
}
