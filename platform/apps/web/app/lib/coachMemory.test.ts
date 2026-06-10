import { describe, it, expect } from "vitest";
import { buildCoachMemory, type MemoryGame, type MemoryPlayer, type MemoryTag } from "./coachMemory";

const players: MemoryPlayer[] = [
  { id: "a", firstName: "Ava", lastName: "A" },
  { id: "b", firstName: "Ben", lastName: "B", canPitch: true },
  { id: "c", firstName: "Cy", lastName: "C", canCatch: true },
  { id: "d", firstName: "Dan", lastName: "D" },
];

// One played game. Ava sits most of it, Ben pitches, Cy catches, Dan plays only OF.
const lastGame: MemoryGame = {
  id: "g2",
  startsAt: "2026-06-01T18:00:00.000Z",
  opponent: "Sharks",
  lineup: [
    { a: "BN", b: "P", c: "C", d: "LF" },
    { a: "BN", b: "1B", c: "C", d: "CF" },
    { a: "BN", b: "1B", c: "C", d: "RF" },
    { a: "2B", b: "1B", c: "1B", d: "LF" },
  ],
  pitchCounts: { b: { pitches: 42 } },
};

const tags: MemoryTag[] = [
  { code: "great_effort", playerId: "a", createdAt: "2026-06-01T20:00:00.000Z" },
  { code: "force_play_confusion", playerId: "c", createdAt: "2026-06-01T20:00:00.000Z" },
  { code: "force_play_confusion", createdAt: "2026-06-01T20:01:00.000Z" }, // team-wide symptom
];

describe("buildCoachMemory", () => {
  const mem = buildCoachMemory({ players, games: [lastGame], tags });

  it("uses the played window", () => {
    expect(mem.playedGames).toBe(1);
  });

  it("flags a player who sat most of the last game and surfaces a strength", () => {
    const ava = mem.players.find((p) => p.playerId === "a")!;
    expect(ava.topNeed?.kind).toBe("sat_last_game");
    expect(ava.strengths.map((s) => s.label)).toContain("Great effort");
  });

  it("flags arm-care for a pitcher who threw last game", () => {
    const ben = mem.players.find((p) => p.playerId === "b")!;
    expect(ben.topNeed?.kind).toBe("arm_care");
    expect(ben.topNeed?.detail).toContain("42");
  });

  it("carries skill quick-tags into a player's needs", () => {
    const cy = mem.players.find((p) => p.playerId === "c")!;
    expect(cy.needs.some((n) => n.kind === "skill_watch" && n.label === "Force-play confusion")).toBe(true);
  });

  it("flags an outfield-only player for infield development", () => {
    const dan = mem.players.find((p) => p.playerId === "d")!;
    expect(dan.topNeed?.kind).toBe("only_outfield");
  });

  it("rolls up recurring team mistakes, most-tagged first", () => {
    expect(mem.team[0]?.code).toBe("force_play_confusion");
    expect(mem.team[0]?.count).toBe(2);
    expect(mem.team[0]?.label).toBe("Force plays");
  });
});
