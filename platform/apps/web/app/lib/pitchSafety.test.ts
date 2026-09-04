import { describe, expect, it } from "vitest";
import type { GameRecord, PlayerRecord } from "@platform/storage";
import { livePitchSafety, validatePitchCountChange } from "./pitchSafety";

const player: PlayerRecord = {
  id: "p1", teamId: "t1", firstName: "Ace", lastName: "Pitcher", dob: "2014-06-01",
  ageBand: "9-12", sport: "baseball", positions: ["P"], canPitch: true, createdAt: "2026-01-01T00:00:00Z",
};
function game(id: string, startsAt: string, pitches: number): GameRecord {
  return { id, teamId: "t1", opponent: "Owls", startsAt, homeAway: "home", innings: 6,
    status: "completed", pitchCounts: { p1: { pitches, innings: 3, recordedAt: startsAt } }, createdAt: startsAt };
}

describe("livePitchSafety", () => {
  it("blocks the full rest day after 21 pitches and allows the following day", () => {
    const history = [game("old", "2026-06-20T18:00:00Z", 21)];
    const resting = livePitchSafety([player], history, [], new Date("2026-06-21T18:00:00Z")).p1!;
    expect(resting.allowed).toBe(false);
    expect(resting.requiredRestDaysRemaining).toBe(1);
    expect(livePitchSafety([player], history, [], new Date("2026-06-22T00:00:00Z")).p1!.allowed).toBe(true);
  });

  it("keeps owed rest after a later catcher-only game", () => {
    const catching = { ...game("catching", "2026-06-21T18:00:00Z", 0), lineup: [{ p1: "C" }] };
    const state = livePitchSafety([player], [game("pitching", "2026-06-20T18:00:00Z", 70), catching], [], new Date("2026-06-22T18:00:00Z")).p1!;
    expect(state.allowed).toBe(false);
    expect(state.requiredRestDaysRemaining).toBe(3);
  });

  it("preserves an archived pitcher's unchanged entry while updating an active pitcher", () => {
    const old = { pitches: 10, innings: 1, recordedAt: "2026-06-20T18:00:00Z" };
    const state = livePitchSafety([player], [], [], new Date("2026-06-20T18:00:00Z"));
    expect(validatePitchCountChange({ archived: old }, {
      archived: { ...old }, p1: { pitches: 1, innings: 0, recordedAt: old.recordedAt },
    }, state)).toBeNull();
    expect(validatePitchCountChange({ archived: old }, { archived: { ...old, pitches: 11 } }, state)).toMatch(/players on this team/);
    expect(validatePitchCountChange({ archived: old }, { archived: { ...old, innings: 2 } }, state)).toMatch(/players on this team/);
  });
  it("blocks a pitcher who still owes rest from a prior outing", () => {
    const state = livePitchSafety([player], [game("old", "2026-06-08T18:00:00Z", 70)], [], new Date("2026-06-10T18:00:00Z")).p1!;
    expect(state.allowed).toBe(false);
    expect(state.requiredRestDaysRemaining).toBeGreaterThan(0);
  });

  it("counts same-day pitches and rejects an increment beyond the daily maximum", () => {
    const current = game("today", "2026-06-20T18:00:00Z", 84);
    const state = livePitchSafety([player], [current], [], new Date("2026-06-20T18:00:00Z"));
    expect(state.p1?.remainingPitches).toBe(1);
    expect(validatePitchCountChange(current.pitchCounts ?? {}, {
      p1: { pitches: 86, innings: 3, recordedAt: "2026-06-20T19:00:00Z" },
    }, state)).toMatch(/Only 1 pitches remain/);
  });

  it("rejects pitch counts for a player outside the team roster", () => {
    const state = livePitchSafety([player], [], [], new Date("2026-06-20T18:00:00Z"));
    expect(validatePitchCountChange({}, {
      stranger: { pitches: 1, innings: 0, recordedAt: "2026-06-20T19:00:00Z" },
    }, state)).toMatch(/players on this team/);
  });

  it("allows a downward correction without relaxing the next-pitch safety state", () => {
    const current = game("today", "2026-06-20T18:00:00Z", 20);
    const state = livePitchSafety([player], [current], [], new Date("2026-06-20T18:00:00Z"));
    expect(validatePitchCountChange(current.pitchCounts ?? {}, {
      p1: { pitches: 19, innings: 3, recordedAt: "2026-06-20T19:00:00Z" },
    }, state)).toBeNull();
  });
});
