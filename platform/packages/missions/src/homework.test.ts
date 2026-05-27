import { describe, it, expect } from "vitest";
import { tailoredHomework } from "./homework";

describe("tailoredHomework", () => {
  it("returns drills covering requested categories within budget", () => {
    const plan = tailoredHomework({
      age: 10,
      targetCategories: ["catch", "throw", "speed"],
      minutesBudget: 30,
      maxDrills: 4,
    });
    expect(plan.drills.length).toBeGreaterThan(0);
    expect(plan.totalMinutes).toBeLessThanOrEqual(30);
    // every picked drill must claim at least one matched target
    for (const d of plan.drills) {
      expect(d.matchedCategories.length).toBeGreaterThan(0);
    }
    expect(plan.parentBlurb).toMatch(/drill/i);
  });

  it("respects age band filtering", () => {
    const plan = tailoredHomework({ age: 7, targetCategories: ["speed"], homeOnly: true });
    for (const d of plan.drills) {
      // All picked drills should be doable at home (T3/T4).
      expect(["T3_backyard", "T4_living_room"]).toContain(d.environmentTier);
    }
  });

  it("returns empty plan when no categories requested but does not throw", () => {
    const plan = tailoredHomework({ age: 11, targetCategories: [] });
    expect(plan.drills).toEqual([]);
    expect(plan.uncovered).toEqual([]);
  });
});
