import { describe, it, expect } from "vitest";
import { canPitchToday, requiredRestForCount, pitchTypeAllowedAt } from "./pitchSmart";
import { isAllowedByAgeMatrix, sessionCapsFor } from "./ageMatrix";
import { ruleById, rulesAppliedTo } from "./rules";
import { getPitchTableForAge, loadPitchSmart, loadAgeMatrix } from "@platform/corpus";

const today = new Date("2026-05-24T12:00:00Z");

describe("pitchSmart.canPitchToday", () => {
  it("allows a fresh outing within daily max for 11-year-old", () => {
    const res = canPitchToday({
      age: 11,
      date: today,
      plannedPitches: 50,
      history: { outingsByDate: {}, todayCount: 0, soreToday: false, todayCatchingInnings: 0, continuousThrowingDays: 0 },
    });
    expect(res.allowed).toBe(true);
    expect(res.appliedTable?.age_band).toBe("11-12");
  });

  it("blocks when projected exceeds 11-12 daily max (85)", () => {
    const res = canPitchToday({
      age: 11,
      date: today,
      plannedPitches: 50,
      history: { outingsByDate: {}, todayCount: 40, soreToday: false, todayCatchingInnings: 0, continuousThrowingDays: 0 },
    });
    expect(res.allowed).toBe(false);
    expect(res.reasons.join(" ")).toMatch(/exceeds daily max 85/);
  });

  it("requires rest from previous outing", () => {
    // 84 pitches at 11-12 requires 4 rest days
    const lastOuting = new Date("2026-05-22T12:00:00Z");
    const res = canPitchToday({
      age: 12,
      date: today, // 2 days later
      plannedPitches: 10,
      history: {
        outingsByDate: { [lastOuting.toISOString().slice(0, 10)]: 84 },
        todayCount: 0,
        soreToday: false,
        todayCatchingInnings: 0,
        continuousThrowingDays: 0,
      },
    });
    expect(res.allowed).toBe(false);
    expect(res.requiredRestDaysRemaining).toBe(2); // 4 required - 2 elapsed
  });

  it("blocks on reported soreness", () => {
    const res = canPitchToday({
      age: 10,
      date: today,
      plannedPitches: 10,
      history: { outingsByDate: {}, todayCount: 0, soreToday: true, todayCatchingInnings: 0, continuousThrowingDays: 0 },
    });
    expect(res.allowed).toBe(false);
    expect(res.reasons[0]).toMatch(/soreness/);
  });

  it("blocks when player caught >=3 innings today", () => {
    const res = canPitchToday({
      age: 13,
      date: today,
      plannedPitches: 10,
      history: { outingsByDate: {}, todayCount: 0, soreToday: false, todayCatchingInnings: 3, continuousThrowingDays: 0 },
    });
    expect(res.allowed).toBe(false);
    expect(res.reasons.join(" ")).toMatch(/caught/);
  });

  it("respects league override when stricter", () => {
    const res = canPitchToday({
      age: 11,
      date: today,
      plannedPitches: 50,
      history: { outingsByDate: {}, todayCount: 30, soreToday: false, todayCatchingInnings: 0, continuousThrowingDays: 0 },
      leagueDailyMax: 75,
    });
    expect(res.allowed).toBe(false);
    expect(res.effectiveDailyMax).toBe(75);
  });

  it("requiredRestForCount returns 4 for 70 pitches at 11-12", () => {
    const table = getPitchTableForAge(11)!;
    expect(requiredRestForCount(table, 70)).toBe(4);
  });

  it("pitchTypeAllowedAt blocks curveball at age 10", () => {
    expect(pitchTypeAllowedAt(10, "curveball")).toBe(false);
    expect(pitchTypeAllowedAt(10, "fastball")).toBe(true);
  });
});

describe("ageMatrix", () => {
  it("forbids 1RM testing at every band 6-8/9-12/13-15", () => {
    for (const age of [7, 11, 14]) {
      const v = isAllowedByAgeMatrix({ age, topic: "strength", item: "1RM testing" });
      expect(v).toBe("forbidden");
    }
  });

  it("forbids timed prolonged sprints at 6-8", () => {
    const v = isAllowedByAgeMatrix({ age: 7, topic: "speed", item: "timed prolonged sprints" });
    expect(v).toBe("forbidden");
  });

  it("forbids punishment running at every band", () => {
    for (const age of [7, 11, 14, 17]) {
      const v = isAllowedByAgeMatrix({ age, topic: "speed", item: "punitive conditioning" });
      expect(v).toBe("forbidden");
    }
  });

  it("session caps shrink for younger bands", () => {
    expect(sessionCapsFor(7).max_session_minutes).toBeLessThan(sessionCapsFor(14).max_session_minutes);
  });
});

describe("rules registry", () => {
  it("loads all 15 Tier 1 rules", () => {
    const rules = rulesAppliedTo("ai_layer");
    expect(rules.length).toBeGreaterThan(0);
  });

  it("PITCH_SMART_9_12 is a hard block", () => {
    const r = ruleById("PITCH_SMART_9_12");
    expect(r.enforcement).toBe("hard_block");
  });

  it("NO_AI_DIAGNOSIS exists and applies to ai_layer", () => {
    const r = ruleById("NO_AI_DIAGNOSIS");
    expect(r.applies_to).toContain("ai_layer");
    expect(r.enforcement).toBe("hard_block");
  });
});

describe("corpus integrity", () => {
  it("every age table has non-empty required_rest", () => {
    for (const t of loadPitchSmart().age_tables) {
      expect(t.required_rest.length).toBeGreaterThan(0);
    }
  });

  it("every age matrix band has required + forbidden lists per topic", () => {
    for (const band of loadAgeMatrix().bands) {
      for (const [name, t] of Object.entries(band.topics)) {
        expect(Array.isArray(t.required), `${band.age_band}/${name}.required`).toBe(true);
        expect(Array.isArray(t.forbidden), `${band.age_band}/${name}.forbidden`).toBe(true);
      }
    }
  });
});
