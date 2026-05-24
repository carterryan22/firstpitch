import { describe, it, expect } from "vitest";
import { postFilter } from "./postFilter";
import { buildPrompt, applicableRulesFor } from "./prompts";

describe("postFilter", () => {
  it("strips curveball recommendation", () => {
    const r = postFilter("Throw 30 fastballs. Then practice your curveball grip.", {
      ageBand: "9-12",
      userRole: "coach",
    });
    expect(r.blocked).toBe(true);
    expect(r.text).not.toMatch(/curveball/i);
    expect(r.actions.some((a) => a.includes("CURVEBALL_UNDER_14"))).toBe(true);
  });

  it("flags 1RM mention", () => {
    const r = postFilter("Try a 1RM back squat to gauge max strength.", {
      ageBand: "9-12",
      userRole: "coach",
    });
    expect(r.blocked).toBe(true);
  });

  it("escalates on pain language", () => {
    const r = postFilter("My elbow hurts when I throw.", { ageBand: "9-12", userRole: "player" });
    expect(r.escalate).toBe(true);
  });

  it("flags pitch counts that exceed every age max", () => {
    const r = postFilter("Plan 200 pitches today.", { ageBand: "16+", userRole: "coach" });
    expect(r.blocked).toBe(true);
    expect(r.actions.some((a) => a.includes("PITCH_COUNT_OVER_MAX"))).toBe(true);
  });
});

describe("buildPrompt", () => {
  it("includes RULES block when rules are supplied", () => {
    const rules = applicableRulesFor(["ai_layer"]);
    expect(rules.length).toBeGreaterThan(0);
    const { user } = buildPrompt({
      promptId: "COACH_QA",
      env: {
        userRole: "coach",
        ageBand: "9-12",
        sport: "baseball",
        applicableRules: rules,
        retrievedRecordIds: [],
        retrievedSnippets: [],
      },
      userMessage: "Can my 10yo throw a curveball?",
    });
    expect(user).toMatch(/RULES:/);
  });
});
