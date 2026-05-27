import { describe, it, expect } from "vitest";
import {
  autoLineup,
  summarize,
  shuffleNonLocked,
  buildLocks,
  toCsv,
  PRESET_POSITIONS,
  type LineupPlayer,
} from "./index";

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

  it("preserves locked cells across regeneration", () => {
    const players: LineupPlayer[] = ["a", "b", "c", "d", "e", "f", "g", "h", "i"].map((id) =>
      p(id, { canPitch: true, canCatch: true }),
    );
    const first = autoLineup({ innings: 4, players });
    // Lock player "a" at SS in inning 0 explicitly.
    const locked = new Set(["0:a"]);
    const priorWithPin = first.innings.map((inn, i) => (i === 0 ? { ...inn, a: "SS" as const } : inn));
    const locks = buildLocks(priorWithPin, locked);
    expect(locks[0]?.a).toBe("SS");
    const second = shuffleNonLocked(priorWithPin, locked, { innings: 4, players });
    expect(second.innings[0]?.a).toBe("SS");
  });

  it("respects coachPitch preset (no P / C in slots)", () => {
    const players: LineupPlayer[] = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => p(id));
    const { innings } = autoLineup({ innings: 3, players, preset: "coachPitch" });
    for (const inn of innings) {
      expect(Object.values(inn)).not.toContain("P");
      expect(Object.values(inn)).not.toContain("C");
    }
    expect(PRESET_POSITIONS.coachPitch).not.toContain("P");
  });

  it("standard10 preset fills the rover slot", () => {
    const players: LineupPlayer[] = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((id) =>
      p(id, { canPitch: true, canCatch: true }),
    );
    const { innings } = autoLineup({ innings: 2, players, preset: "standard10" });
    for (const inn of innings) {
      expect(Object.values(inn)).toContain("RV");
    }
  });

  it("competitiveWeight=1 favors high-skill at premium positions", () => {
    const players: LineupPlayer[] = [
      p("star", { canPitch: true, canCatch: true, battingSkill: 5, positionRatings: { P: "preferred", SS: "preferred", CF: "preferred", C: "preferred" } }),
      p("avg", { canPitch: true, canCatch: true, battingSkill: 3 }),
      ...["c", "d", "e", "f", "g", "h"].map((id) => p(id, { battingSkill: 2 })),
    ];
    const { innings } = autoLineup({ innings: 1, players, competitiveWeight: 1 });
    const starSlot = innings[0]?.star;
    expect(["P", "C", "SS", "CF"]).toContain(starSlot);
  });

  it("pitcherUnavailable blocks players from being assigned to P", () => {
    const players: LineupPlayer[] = [
      p("rested", { canPitch: true }),
      p("tired1", { canPitch: true }),
      p("tired2", { canPitch: true }),
      ...["d", "e", "f", "g", "h", "i"].map((id) => p(id, { canCatch: id === "d" })),
    ];
    const { innings, warnings } = autoLineup({
      innings: 3,
      players,
      pitcherUnavailable: ["tired1", "tired2"],
    });
    expect(warnings).toEqual([]);
    for (const inn of innings) {
      const pitcher = Object.entries(inn).find(([, s]) => s === "P")?.[0];
      expect(pitcher).toBe("rested");
    }
  });

  it("toCsv emits header + one row per player", () => {
    const players: LineupPlayer[] = ["a", "b", "c", "d", "e", "f", "g", "h", "i"].map((id) =>
      p(id, { canPitch: true, canCatch: true }),
    );
    const { innings } = autoLineup({ innings: 2, players });
    const csv = toCsv(innings, players.map((pl) => ({ id: pl.id, name: pl.id })));
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Player,Jersey,Inn 1,Inn 2");
    expect(lines.length).toBe(players.length + 1);
  });
});
