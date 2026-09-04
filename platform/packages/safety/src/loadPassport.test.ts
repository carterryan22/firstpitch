import { describe, it, expect } from "vitest";
import { buildLoadPassport, type ThrowingEvent } from "./loadPassport";

const today = new Date("2026-06-08T12:00:00Z"); // Mon Jun 8

function passport(events: ThrowingEvent[], extra: Partial<Parameters<typeof buildLoadPassport>[0]> = {}) {
  return buildLoadPassport({ age: 12, today, events, ...extra });
}

describe("buildLoadPassport", () => {
  it("a fresh arm with no throwing is green and bullpen-ready", () => {
    const p = passport([], { playerName: "Hudson" });
    expect(p.status).toBe("green");
    expect(p.flags).toHaveLength(0);
    expect(p.bullpenOkToday).toBe(true);
    expect(p.nextEligibleInDays).toBe(0);
    expect(p.parentSummary).toMatch(/fresh/i);
  });

  it("owes rest after a heavy recent outing → red with rest_owed and a forward date", () => {
    // Rest June 7–10 after the June 6 outing; June 8 still owes three days.
    const p = passport([{ date: "2026-06-06", activity: "game", pitches: 70 }], {
      playerName: "Quinn",
    });
    expect(p.status).toBe("red");
    expect(p.flags.some((f) => f.code === "rest_owed")).toBe(true);
    expect(p.nextEligibleInDays).toBe(3);
    expect(p.nextEligiblePitchDate).toBe("2026-06-11");
    expect(p.bullpenOkToday).toBe(false);
    expect(p.lastOuting).toEqual({ date: "2026-06-06", pitches: 70 });
    expect(p.parentSummary).toMatch(/resting/i);
  });

  it("blocks on reported arm soreness", () => {
    const p = passport([{ date: "2026-06-07", activity: "long_toss", throws: 20 }], {
      soreness1to10: 8,
    });
    expect(p.status).toBe("red");
    expect(p.flags.some((f) => f.code === "sore_arm" && f.severity === "block")).toBe(true);
  });

  it("flags a planned catcher + pitcher conflict", () => {
    const p = passport([], { plannedToday: { pitch: true, catchInnings: 4 } });
    expect(p.status).toBe("red");
    expect(p.flags.some((f) => f.code === "catcher_pitcher_conflict")).toBe(true);
  });

  it("blocks same-day pitching when the player already caught 3+ innings today", () => {
    const p = passport([{ date: "2026-06-08", activity: "game", catcherInnings: 4 }]);
    expect(p.status).toBe("red");
    expect(p.flags.some((f) => f.code === "catcher_pitcher_conflict")).toBe(true);
  });

  it("warns (yellow) when the rolling weekly load is high but the arm is rested", () => {
    // Non-consecutive long-toss days so the continuous-day gate never trips.
    const p = passport([
      { date: "2026-06-02", activity: "long_toss", throws: 100, intensity: 10 },
      { date: "2026-06-04", activity: "long_toss", throws: 100, intensity: 10 },
      { date: "2026-06-06", activity: "long_toss", throws: 100, intensity: 10 },
    ]);
    expect(p.status).toBe("yellow");
    expect(p.rollingWeekLoad).toBe(300);
    expect(p.flags.some((f) => f.code === "rolling_week_high")).toBe(true);
    expect(p.bullpenOkToday).toBe(false);
  });

  it("surfaces a multi-team flag when load came from another team", () => {
    const p = passport([{ date: "2026-06-02", activity: "game", pitches: 30, external: true }]);
    expect(p.flags.some((f) => f.code === "multi_team")).toBe(true);
    expect(p.status).toBe("yellow");
  });

  it("forces a recovery day after 4 straight throwing days", () => {
    const p = passport([
      { date: "2026-06-04", activity: "practice", throws: 30 },
      { date: "2026-06-05", activity: "practice", throws: 30 },
      { date: "2026-06-06", activity: "practice", throws: 30 },
      { date: "2026-06-07", activity: "practice", throws: 30 },
    ]);
    expect(p.status).toBe("red");
    expect(p.flags.some((f) => f.code === "continuous_days")).toBe(true);
  });

  it("warns as it approaches the continuous-day limit (3 straight)", () => {
    const p = passport([
      { date: "2026-06-05", activity: "practice", throws: 30 },
      { date: "2026-06-06", activity: "practice", throws: 30 },
      { date: "2026-06-07", activity: "practice", throws: 30 },
    ]);
    expect(p.status).toBe("yellow");
    expect(p.flags.some((f) => f.code === "continuous_days" && f.severity === "warn")).toBe(true);
  });

  it("honors a stricter league daily max in the effective max", () => {
    const p = passport([], { leagueDailyMax: 60 });
    expect(p.dailyMaxPitches).toBe(60);
  });
});
