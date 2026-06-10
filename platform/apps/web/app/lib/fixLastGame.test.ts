import { describe, it, expect } from "vitest";
import { symptomsToPlan } from "./fixLastGame";

describe("symptomsToPlan", () => {
  it("ranks symptoms by how often they were tapped and maps to focus", () => {
    const plan = symptomsToPlan(
      ["force_play_confusion", "force_play_confusion", "missed_cutoff", "too_many_walks", "great_effort"],
      { teamId: "t1" },
    );
    expect(plan.priorities).toHaveLength(3);
    expect(plan.priorities[0]?.code).toBe("force_play_confusion");
    expect(plan.priorities[0]?.count).toBe(2);
    expect(plan.priorities[0]?.label).toBe("Force plays");
    // ties (count 1) break by label
    expect(plan.priorities[1]?.label).toBe("Cutoff communication");
  });

  it("builds a deduped, capped focus union + a practice deep link", () => {
    const plan = symptomsToPlan(
      ["force_play_confusion", "missed_cutoff", "too_many_walks"],
      { teamId: "t1" },
    );
    // count ties break by label: Cutoff communication < First-pitch strikes < Force plays,
    // so focus is unioned in that priority order.
    expect(plan.focus).toEqual(["throwing", "fielding", "pitching", "baserunning"]);
    const decoded = decodeURIComponent(plan.practiceHref);
    expect(decoded).toContain("focus=throwing,fielding,pitching,baserunning");
    expect(decoded).toContain("duration=90");
    expect(decoded).toContain("teamId=t1");
  });

  it("ignores non-symptom tags and handles an empty set", () => {
    const plan = symptomsToPlan(["great_effort", "needs_confidence"], { teamId: "t1" });
    expect(plan.priorities).toHaveLength(0);
    expect(plan.focus).toHaveLength(0);
    expect(plan.practiceHref).toContain("duration=90");
  });

  it("respects a custom duration", () => {
    const plan = symptomsToPlan(["too_many_walks"], { durationMin: 60 });
    expect(plan.durationMin).toBe(60);
    expect(decodeURIComponent(plan.practiceHref)).toContain("duration=60");
  });
});
