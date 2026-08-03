import { describe, it, expect } from "vitest";
import { compile } from "./index";
import { homeMission, planToMarkdown, antiLineCheck, weightFocusBySeason, scoreBreakdown } from "./extensions";

const baseInput = {
  age: 11,
  durationMin: 60,
  environmentTier: "T2_cage_gym" as const,
  equipmentAvailable: ["mat", "ball", "cone", "tee", "bat"],
  coaches: 1,
  players: 8,
  focus: ["throwing", "hitting"],
};

describe("compiler extensions", () => {
  it("homeMission returns a T4_living_room drill", () => {
    const d = homeMission({ age: 10, focus: ["mental_recovery"] });
    if (d) expect(d.environment_tier).toBe("T4_living_room");
  });

  it("planToMarkdown renders blocks and headers", () => {
    const plan = compile(baseInput);
    const md = planToMarkdown(plan, { title: "Test" });
    expect(md).toContain("# Test");
    expect(md).toContain("## Blocks");
  });

  it("antiLineCheck flags too many players per station", () => {
    const fakePlan = {
      ageBand: "9-12" as const,
      blocks: [
        { blockId: "B2_SKILL_X", type: "skill" as const, durationMin: 10, drill: null, notes: [] },
      ],
      warnings: [], blocked: [], totalThrowingLoad: 0, qualityScore: 0,
      timeBudget: {
        targetMin: 60, warmupMin: 0, skillMin: 10, restMin: 0,
        transitionMin: 0, cooldownMin: 0, usedMin: 10, slackMin: 50,
      },
      theme: "Test theme",
      talkingPoints: [],
    };
    const r = antiLineCheck(fakePlan, { players: 16, coaches: 1 });
    expect(r.ok).toBe(false);
    expect(r.flaggedBlocks.length).toBeGreaterThan(0);
  });

  it("antiLineCheck OK when coaches sufficient", () => {
    const plan = compile({ ...baseInput, players: 8, coaches: 2 });
    const r = antiLineCheck(plan, { players: 8, coaches: 2 });
    expect(r.ok).toBe(true);
  });

  it("weightFocusBySeason reorders focus for tournament (recovery first)", () => {
    const r = weightFocusBySeason(["throwing", "recovery", "hitting"], "tournament");
    expect(r[0]).toBe("recovery");
  });

  it("scoreBreakdown sums to total", () => {
    const plan = compile(baseInput);
    const b = scoreBreakdown(plan, baseInput);
    expect(b.total).toBe(Math.min(100, b.warmup + b.cooldown + b.focusCoverage));
  });
});
