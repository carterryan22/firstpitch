import { getRuleById, loadSafetyRules, type SafetyRule, type Enforcement } from "@platform/corpus";

export interface RuleEvaluation {
  rule: SafetyRule;
  triggered: boolean;
  enforcement: Enforcement;
  uiMessage?: string;
}

export function rulesAppliedTo(moduleName: string): SafetyRule[] {
  return loadSafetyRules().rules.filter((r) => r.applies_to.includes(moduleName));
}

export function ruleById(id: string): SafetyRule {
  const r = getRuleById(id);
  if (!r) throw new Error(`Unknown safety rule: ${id}`);
  return r;
}

/** Evaluate a set of rule_ids against a boolean predicate map. */
export function evaluate(rules: string[], triggers: Record<string, boolean>): RuleEvaluation[] {
  return rules.map((id) => {
    const rule = ruleById(id);
    return {
      rule,
      triggered: triggers[id] === true,
      enforcement: rule.enforcement,
      uiMessage: rule.ui_strings?.block_reason,
    };
  });
}

export function hardBlocks(evals: RuleEvaluation[]): RuleEvaluation[] {
  return evals.filter((e) => e.triggered && e.enforcement === "hard_block");
}

export function softWarnings(evals: RuleEvaluation[]): RuleEvaluation[] {
  return evals.filter((e) => e.triggered && e.enforcement === "warn_and_label");
}
