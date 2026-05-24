import { describe, it, expect } from "vitest";
import { diagnose, knownOutcomeMetrics } from "./engine";

const today = new Date("2026-05-24T12:00:00Z");

describe("diagnose", () => {
  it("returns empty when no verified entries exist (never invents)", () => {
    const r = diagnose({
      outcomeMetric: "EV_TEE",
      entries: [{ metricKey: "BAT_SPEED", value: 50, recordedAt: today, verification: "self_entered" }],
      expectedRanges: [{ metricKey: "BAT_SPEED", min: 55, max: 70 }],
    });
    expect(r.diagnoses).toEqual([]);
    expect(r.insufficientData.length).toBeGreaterThan(0);
  });

  it("triggers BAT_SPEED_DEFICIT when verified bat speed is below band", () => {
    const r = diagnose({
      outcomeMetric: "EV_TEE",
      entries: [{ metricKey: "BAT_SPEED", value: 50, recordedAt: today, verification: "coach_verified" }],
      expectedRanges: [{ metricKey: "BAT_SPEED", min: 55, max: 70 }],
    });
    expect(r.diagnoses).toHaveLength(1);
    expect(r.diagnoses[0]?.driver.key).toBe("BAT_SPEED_DEFICIT");
    expect(r.diagnoses[0]?.confidence).toBe("high");
  });

  it("ranks high before medium", () => {
    const r = diagnose({
      outcomeMetric: "HOME_TO_FIRST",
      entries: [
        { metricKey: "SPRINT_10", value: 2.5, recordedAt: today, verification: "coach_verified" }, // above max
        { metricKey: "REACTION_MS", value: 400, recordedAt: today, verification: "coach_verified" }, // above max
      ],
      expectedRanges: [
        { metricKey: "SPRINT_10", min: 1.8, max: 2.2 },
        { metricKey: "REACTION_MS", min: 200, max: 350 },
      ],
    });
    expect(r.diagnoses[0]?.confidence).toBe("high");
  });

  it("does not trigger when value is inside expected band", () => {
    const r = diagnose({
      outcomeMetric: "EV_TEE",
      entries: [{ metricKey: "BAT_SPEED", value: 60, recordedAt: today, verification: "facility_verified" }],
      expectedRanges: [{ metricKey: "BAT_SPEED", min: 55, max: 70 }],
    });
    expect(r.diagnoses).toEqual([]);
  });

  it("returns recommended drill ids from corpus", () => {
    const r = diagnose({
      outcomeMetric: "POP_TIME",
      entries: [{ metricKey: "POP_TIME", value: 2.5, recordedAt: today, verification: "facility_verified" }],
      expectedRanges: [{ metricKey: "POP_TIME", min: 1.8, max: 2.3 }],
    });
    expect(r.diagnoses[0]?.recommendedDrillIds).toContain("C_POP_TIME_BLOCKS");
  });

  it("knownOutcomeMetrics covers seeded drivers", () => {
    const ms = knownOutcomeMetrics();
    expect(ms).toContain("EV_TEE");
    expect(ms).toContain("POP_TIME");
  });
});
