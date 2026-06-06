import { describe, expect, it } from "vitest";
import { canPitchToday } from "@platform/safety";
import { nextAvailableDate, projectReadinessForGame } from "./pitchingBoard";

const today = new Date("2026-06-05T12:00:00Z");

function checkToday(outingsByDate: Record<string, number>, age = 11) {
  return canPitchToday({
    age,
    date: today,
    plannedPitches: 1,
    history: {
      outingsByDate,
      todayCount: 0,
      soreToday: false,
      todayCatchingInnings: 0,
      continuousThrowingDays: 0,
    },
  });
}

describe("nextAvailableDate", () => {
  it("returns today when the pitcher is already available", () => {
    const r = nextAvailableDate(checkToday({}), today);
    expect(r).toEqual({ date: "2026-06-05", inDays: 0 });
  });

  it("adds the remaining rest days when resting", () => {
    // A heavy outing yesterday forces multiple rest days for an 11-year-old.
    const check = checkToday({ "2026-06-04": 70 });
    expect(check.requiredRestDaysRemaining).toBeGreaterThan(0);
    const r = nextAvailableDate(check, today);
    expect(r.inDays).toBe(check.requiredRestDaysRemaining);
    expect(r.date).toBe(
      new Date(Date.UTC(2026, 5, 5 + check.requiredRestDaysRemaining)).toISOString().slice(0, 10),
    );
  });
});

describe("projectReadinessForGame", () => {
  it("reports a daily-max ceiling when the pitcher will be rested by game day", () => {
    const gameDate = new Date("2026-06-12T18:00:00Z"); // a week out
    const r = projectReadinessForGame({
      age: 11,
      gameDate,
      outingsByDate: { "2026-06-04": 70 },
    });
    expect(r.ready).toBe(true);
    expect(r.maxPitches).toBeGreaterThan(0);
    expect(r.restDaysRemaining).toBe(0);
  });

  it("reports not-ready with owed rest when the game is too soon", () => {
    const gameDate = new Date("2026-06-05T18:00:00Z"); // day after a heavy outing
    const r = projectReadinessForGame({
      age: 11,
      gameDate,
      outingsByDate: { "2026-06-04": 70 },
    });
    expect(r.ready).toBe(false);
    expect(r.maxPitches).toBe(0);
    expect(r.restDaysRemaining).toBeGreaterThan(0);
  });

  it("ignores outings on or after the game date", () => {
    const gameDate = new Date("2026-06-08T18:00:00Z");
    const r = projectReadinessForGame({
      age: 11,
      gameDate,
      // Outing the day before the game owes rest; an outing on game day is ignored.
      outingsByDate: { "2026-06-08": 60, "2026-06-01": 10 },
    });
    expect(r.ready).toBe(true);
  });
});
