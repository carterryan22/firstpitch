import { describe, it, expect } from "vitest";
import { missionsForAge, streakFor, MISSIONS } from "./index";

describe("missionsForAge", () => {
  it("returns fun streaks for U8", () => {
    const ms = missionsForAge(8);
    expect(ms.some((m) => m.kind === "fun_streak")).toBe(true);
  });
  it("returns verified-only for U16", () => {
    const ms = missionsForAge(16);
    expect(ms.every((m) => m.minVerification === "coach_verified")).toBe(true);
  });
  it("U10 sees PR challenges too", () => {
    const ms = missionsForAge(10);
    expect(ms.some((m) => m.kind === "pr_challenge")).toBe(true);
  });
});

describe("streakFor", () => {
  const mission = MISSIONS.find((m) => m.id === "M_DAILY_BREATH")!;
  it("computes 3-day current streak", () => {
    const today = new Date();
    const days = [2, 1, 0].map((d) => ({
      date: new Date(today.getTime() - d * 86_400_000),
      verification: "self_entered" as const,
    }));
    const r = streakFor(mission, days);
    expect(r.current).toBeGreaterThanOrEqual(3);
  });
  it("ignores under-verified completions", () => {
    const mission2 = MISSIONS.find((m) => m.id === "M_SPRINT_10_VERIFIED")!;
    const today = new Date();
    const r = streakFor(mission2, [{ date: today, verification: "self_entered" }]);
    expect(r.qualifies).toBe(false);
  });
});
