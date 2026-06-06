import { describe, expect, it } from "vitest";
import { groupPlayers, type GroupingPlayer } from "./grouping";

function p(id: string, over: Partial<GroupingPlayer> = {}): GroupingPlayer {
  return { id, name: id, ...over };
}

const eight: GroupingPlayer[] = [
  p("A", { skill: 5 }),
  p("B", { skill: 5 }),
  p("C", { skill: 4 }),
  p("D", { skill: 4 }),
  p("E", { skill: 3 }),
  p("F", { skill: 3 }),
  p("G", { skill: 2 }),
  p("H", { skill: 1 }),
];

describe("groupPlayers — balanced", () => {
  it("evens out total skill across groups (serpentine draft)", () => {
    const r = groupPlayers({ players: eight, groupCount: 2, mode: "balanced" });
    expect(r.groups).toHaveLength(2);
    const totals = r.groups.map((g) => g.players.reduce((s, x) => s + (x.skill ?? 3), 0));
    // 5+4+3+2=14 vs 5+4+3+1=13 — within 1 of each other.
    expect(Math.abs(totals[0]! - totals[1]!)).toBeLessThanOrEqual(1);
    expect(r.groups[0]!.players.length).toBe(4);
    expect(r.groups[1]!.players.length).toBe(4);
  });

  it("clamps groupCount to the number of players", () => {
    const r = groupPlayers({ players: [p("A"), p("B")], groupCount: 5, mode: "balanced" });
    expect(r.groups).toHaveLength(2);
  });
});

describe("groupPlayers — skill tiers", () => {
  it("keeps strongest players together for differentiated instruction", () => {
    const r = groupPlayers({ players: eight, groupCount: 2, mode: "skill" });
    const top = r.groups[0]!.players.map((x) => x.id);
    expect(top).toEqual(["A", "B", "C", "D"]);
    expect(r.groups[0]!.averageSkill).toBeGreaterThan(r.groups[1]!.averageSkill);
  });
});

describe("groupPlayers — position", () => {
  it("buckets into battery / infield / outfield with named labels", () => {
    const players = [
      p("Pitcher", { positionBucket: "battery", canPitch: true }),
      p("Catcher", { positionBucket: "battery", canCatch: true }),
      p("SS", { positionBucket: "infield" }),
      p("2B", { positionBucket: "infield" }),
      p("CF", { positionBucket: "outfield" }),
    ];
    const r = groupPlayers({ players, groupCount: 3, mode: "position" });
    const labels = r.groups.map((g) => g.label);
    expect(labels).toContain("Pitchers & catchers");
    expect(labels).toContain("Infield");
    expect(labels).toContain("Outfield");
    const battery = r.groups.find((g) => g.label === "Pitchers & catchers")!;
    expect(battery.notes.join(" ")).toMatch(/Pitch Smart/i);
  });
});

describe("groupPlayers — safety / workload awareness", () => {
  it("pulls high-throwing-load players into a dedicated arm-care group", () => {
    const players = [
      p("Ace", { canPitch: true, highThrowingLoad: true }),
      p("Backstop", { canCatch: true, highThrowingLoad: true }),
      p("Fielder1", { skill: 3 }),
      p("Fielder2", { skill: 3 }),
      p("Fielder3", { skill: 2 }),
    ];
    const r = groupPlayers({ players, groupCount: 2, mode: "safety" });
    const armCare = r.groups.find((g) => g.label === "Arm-care group")!;
    expect(armCare).toBeTruthy();
    expect(armCare.players.map((x) => x.id).sort()).toEqual(["Ace", "Backstop"]);
    expect(armCare.notes.join(" ")).toMatch(/low-volume|recovery/i);
    expect(r.notes.join(" ")).toMatch(/high throwing load/i);
  });
});

describe("groupPlayers — injured handling", () => {
  it("excludes injured players from station groups and notes it", () => {
    const players = [p("A", { skill: 4 }), p("B", { skill: 3 }), p("Hurt", { injured: true })];
    const r = groupPlayers({ players, groupCount: 1, mode: "balanced" });
    const allIds = r.groups.flatMap((g) => g.players.map((x) => x.id));
    expect(allIds).not.toContain("Hurt");
    expect(r.notes.join(" ")).toMatch(/injured/i);
  });
});
