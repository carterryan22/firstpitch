import { describe, it, expect } from "vitest";
import { dontDoToday } from "./dontDoToday";
import { decideEscalation } from "./escalation";
import { evaluateWorkload } from "./workload";

describe("dontDoToday", () => {
  it("blocks on lightning", () => {
    const r = dontDoToday({ age: 11, conditions: { lightning: true } });
    expect(r.okToProceed).toBe(false);
    expect(r.blocks[0]?.ruleId).toBe("ENV_LIGHTNING");
  });

  it("warns on heat index threshold but does not block", () => {
    const r = dontDoToday({ age: 11, conditions: { heatIndexF: 92 } });
    expect(r.okToProceed).toBe(true);
    expect(r.warnings.some((w) => w.ruleId === "ENV_HEAT")).toBe(true);
  });

  it("blocks on hydration deficit", () => {
    const r = dontDoToday({ age: 11, wellness: { hydrationDeficitPct: 3 } });
    expect(r.okToProceed).toBe(false);
  });

  it("blocks high soreness", () => {
    const r = dontDoToday({ age: 11, wellness: { soreness1to10: 8 } });
    expect(r.okToProceed).toBe(false);
  });

  it("blocks forbidden age-matrix items", () => {
    const r = dontDoToday({
      age: 10,
      intendedItems: [{ topic: "strength", item: "1RM testing" }],
    });
    expect(r.okToProceed).toBe(false);
    expect(r.blocks.some((b) => b.ruleId.startsWith("MATRIX_FORBID"))).toBe(true);
  });

  it("blocks pitch plan that violates Pitch Smart", () => {
    const r = dontDoToday({
      age: 11,
      plannedPitches: 100, // > 85 daily max
      pitchHistory: {
        outingsByDate: {},
        todayCount: 0,
        soreToday: false,
        todayCatchingInnings: 0,
        continuousThrowingDays: 0,
      },
    });
    expect(r.okToProceed).toBe(false);
    expect(r.blocks.some((b) => b.ruleId === "PITCH_SMART_BLOCK")).toBe(true);
  });

  it("blocks unresolved severe injury within 14 days", () => {
    const r = dontDoToday({
      age: 13,
      injuryHistory: [{ date: new Date(Date.now() - 5 * 86_400_000), severity: "severe" }],
    });
    expect(r.okToProceed).toBe(false);
  });
});

describe("escalation", () => {
  it("escalates head injury to parent + coach within 1 min", () => {
    const d = decideEscalation({
      playerId: "p1",
      reportedAt: new Date(),
      symptom: "dizzy after collision",
      severity: "mild",
      reportedBy: "coach",
    });
    expect(d.escalateTo).toContain("parent");
    expect(d.escalateTo).toContain("coach");
    expect(d.withinMinutes).toBe(1);
    expect(d.blocksReturnToPlay).toBe(true);
  });

  it("escalates throwing-arm pain", () => {
    const d = decideEscalation({
      playerId: "p1",
      reportedAt: new Date(),
      symptom: "elbow pain after pitching",
      severity: "moderate",
      reportedBy: "player",
    });
    expect(d.blocksReturnToPlay).toBe(true);
    expect(d.escalateTo).toContain("parent");
  });

  it("mild non-arm discomfort is monitor-only", () => {
    const d = decideEscalation({
      playerId: "p1",
      reportedAt: new Date(),
      symptom: "tight quad",
      severity: "mild",
      reportedBy: "player",
    });
    expect(d.blocksReturnToPlay).toBe(false);
  });
});

describe("workload", () => {
  it("flags acute:chronic spike", () => {
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    // Chronic baseline: weeks 2-4 of the 28d window had ~50/week
    const chronicWeeks = Array.from({ length: 3 }, (_, i) => ({
      date: iso(new Date(today.getTime() - (8 + i * 7) * 86_400_000)),
      pitches: 50,
      catcherInnings: 0,
      highIntensityThrows: 0,
    }));
    // Acute spike: 4 outings in the last 7 days
    const recent = Array.from({ length: 4 }, (_, i) => ({
      date: iso(new Date(today.getTime() - (i + 1) * 86_400_000)),
      pitches: 70,
      catcherInnings: 0,
      highIntensityThrows: 0,
    }));
    const r = evaluateWorkload({
      age: 14,
      history: [...chronicWeeks, ...recent],
      planned: { pitches: 0, catcherInnings: 0 },
      season: "in_season",
    });
    expect(r.acuteChronicRatio).toBeGreaterThan(1.5);
    expect(r.withinBudget).toBe(false);
  });

  it("blocks combined catcher + pitcher day", () => {
    const r = evaluateWorkload({
      age: 12,
      history: [],
      planned: { pitches: 30, catcherInnings: 3 },
      season: "in_season",
    });
    expect(r.withinBudget).toBe(false);
  });

  it("flags planned pitches > age daily max", () => {
    const r = evaluateWorkload({
      age: 11,
      history: [],
      planned: { pitches: 100, catcherInnings: 0 },
      season: "in_season",
    });
    expect(r.withinBudget).toBe(false);
  });
});
