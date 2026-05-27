import { describe, it, expect } from "vitest";
import { autoLineup, summarize, type LineupPlayer } from "./index";

function p(id: string, extras: Partial<LineupPlayer> = {}): LineupPlayer {
  return { id, canPitch: false, canCatch: false, ...extras };
}

describe("autoLineup", () => {
  it("never assigns an avoid position", () => {
    const players: LineupPlayer[] = [
      p("a", { positionRatings: { "1B": "preferred", SS: "avoid" } }),
      p("b", { canPitch: true, positionRatings: { P: "preferred" } }),
      p("b2", { canPitch: true, positionRatings: { P: "ok" } }),
      p("c", { canCatch: true, positionRatings: { C: "preferred" } }),
      ...["d", "e", "f", "g", "h", "i"].map((id) => p(id, { positionRatings: {} })),
    ];
    const { innings, warnings } = autoLineup({ innings: 6, players });
    expect(warnings).toEqual([]);
    for (const inn of innings) {
      expect(inn["a"]).not.toBe("SS");
    }
  });

  it("respects canPitch / canCatch flags", () => {
    const players: LineupPlayer[] = [
      p("pitcher1", { canPitch: true }),
      p("pitcher2", { canPitch: true }),
      p("catcher", { canCatch: true }),
      ...["d", "e", "f", "g", "h", "i"].map((id) => p(id)),
    ];
    const { innings, warnings } = autoLineup({ innings: 3, players });
    expect(warnings).toEqual([]);
    for (const inn of innings) {
      const pitcher = Object.entries(inn).find(([, s]) => s === "P")?.[0];
      const catcher = Object.entries(inn).find(([, s]) => s === "C")?.[0];
      expect(["pitcher1", "pitcher2"]).toContain(pitcher);
      expect(catcher).toBe("catcher");
    }
  });

  it("skips injured players entirely", () => {
    const players: LineupPlayer[] = [
      p("hurt", { injured: true, canPitch: true }),
      p("pitcher", { canPitch: true }),
      p("catcher", { canCatch: true }),
      ...["d", "e", "f", "g", "h", "i", "j"].map((id) => p(id)),
    ];
    const { innings } = autoLineup({ innings: 4, players });
    for (const inn of innings) {
      expect(inn["hurt"]).toBeUndefined();
    }
  });

  it("rotates bench across innings", () => {
    const players: LineupPlayer[] = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"].map((id) =>
      p(id, { canPitch: true, canCatch: true })
    );
    const { innings } = autoLineup({ innings: 6, players });
    const rows = summarize(innings, players.map((p) => p.id));
    // 11 players, 9 field slots → 2 benched per inning × 6 innings = 12 bench-innings spread across 11 players
    for (const row of rows) {
      expect(row.benchInnings).toBeLessThanOrEqual(2);
    }
  });

  it("does not pitch the same player back-to-back", () => {
    const players: LineupPlayer[] = ["pa", "pb", "pc"].map((id) =>
      p(id, { canPitch: true })
    );
    for (const id of ["c", "d", "e", "f", "g", "h"]) players.push(p(id, { canCatch: id === "c" }));
    const { innings } = autoLineup({ innings: 6, players });
    let prev: string | null = null;
    for (const inn of innings) {
      const pitcher = Object.entries(inn).find(([, s]) => s === "P")?.[0] ?? null;
      if (prev && pitcher) expect(pitcher).not.toBe(prev);
      prev = pitcher;
    }
  });
});
