import { describe, it, expect } from "vitest";
import {
  explainCell,
  explainLineup,
  summarizeForParents,
  skillsForPositions,
  POSITION_SKILLS,
} from "./explain";
import { autoLineup, type Inning, type LineupPlayer } from "./index";

describe("explainCell", () => {
  it("labels preferred premium positions as a strength", () => {
    const p: LineupPlayer = {
      id: "x",
      canPitch: true,
      positionRatings: { P: "preferred" },
    };
    const r = explainCell(p, "P", 0);
    expect(r.rating).toBe("preferred");
    expect(r.premium).toBe(true);
    expect(r.improvementOpportunity).toBe(false);
    expect(r.label).toMatch(/Preferred/);
    expect(r.label).toMatch(/Premium/);
  });

  it("marks bench as a rest inning, never an improvement opportunity", () => {
    const r = explainCell({ id: "x" }, "BN", 2);
    expect(r.rating).toBe("bench");
    expect(r.improvementOpportunity).toBe(false);
    expect(r.detail).toMatch(/balanced/i);
  });

  it("flags unrated assignments as improvement opportunities", () => {
    const r = explainCell({ id: "x" }, "SS", 0);
    expect(r.rating).toBe("unrated");
    expect(r.improvementOpportunity).toBe(true);
  });
});

describe("explainLineup + summarizeForParents", () => {
  it("rolls up positions and improvement areas for a parent", () => {
    const players: LineupPlayer[] = [
      {
        id: "kid",
        canPitch: false,
        canCatch: false,
        positionRatings: { "1B": "preferred", "2B": "ok" },
      },
      ...["b", "c", "d", "e", "f", "g", "h", "i"].map<LineupPlayer>((id) => ({
        id,
        canPitch: id === "b",
        canCatch: id === "c",
      })),
    ];
    const lineup: Inning[] = [
      { kid: "1B", b: "P", c: "C", d: "2B", e: "3B", f: "SS", g: "LF", h: "CF", i: "RF" },
      { kid: "2B", b: "P", c: "C", d: "1B", e: "3B", f: "SS", g: "LF", h: "CF", i: "RF" },
    ];
    const rationales = explainLineup(lineup, players);
    expect(rationales.length).toBe(2 * 9);
    const sum = summarizeForParents(lineup, players[0]!);
    expect(sum.positions).toEqual(["1B", "2B"]);
    // 1B is preferred, 2B is "ok" → improvement area
    expect(sum.improvementAreas).toEqual(["2B"]);
    expect(sum.parentSummary).toMatch(/Growth focus.*2B/);
  });
});

describe("skillsForPositions", () => {
  it("returns deduped union in canonical order", () => {
    const skills = skillsForPositions(["SS", "CF"]);
    expect(skills).toEqual(["speed", "throw", "catch", "positioning", "awareness"]);
  });
  it("covers every position", () => {
    for (const pos of Object.keys(POSITION_SKILLS) as Array<keyof typeof POSITION_SKILLS>) {
      expect(POSITION_SKILLS[pos].length).toBeGreaterThan(0);
    }
  });
});

describe("end-to-end with autoLineup", () => {
  it("produces a rationale entry per filled cell", () => {
    const players: LineupPlayer[] = ["a", "b", "c", "d", "e", "f", "g", "h", "i"].map((id) => ({
      id,
      canPitch: true,
      canCatch: true,
    }));
    const { innings } = autoLineup({ innings: 2, players });
    const rationales = explainLineup(innings, players);
    expect(rationales.length).toBe(2 * players.length);
  });
});
