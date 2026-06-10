import { describe, it, expect } from "vitest";
import {
  autoLineup,
  buildLocks,
  shuffleNonLocked,
  type LineupPlayer,
  type Inning,
  type Slot,
} from "./index";
import {
  defaultLeagueRules,
  validateLineup,
  pairLocksToLockMap,
  mergeLockMaps,
  OUTFIELD_POSITIONS,
  ruleProvenance,
} from "./leagueRules";

function p(id: string, extras: Partial<LineupPlayer> = {}): LineupPlayer {
  return { id, canPitch: false, canCatch: false, ...extras };
}

describe("validateLineup — coaching-tools-competitor feature-request rules", () => {
  it("flags minFieldInnings violations (coach-requested)", () => {
    const innings: Inning[] = [
      { a: "1B", b: "BN", c: "BN" },
      { a: "1B", b: "BN", c: "2B" },
    ];
    const v = validateLineup(innings, { minFieldInnings: 2 }, ["a", "b", "c"]);
    const ids = v.filter((x) => x.rule === "minFieldInnings").map((x) => x.playerId);
    expect(ids).toContain("b"); // 0 field
    expect(ids).toContain("c"); // 1 field
    expect(ids).not.toContain("a"); // 2 field
  });

  it("flags infieldRequiredByInning violations (coach-requested)", () => {
    const innings: Inning[] = [
      { a: "LF", b: "1B" },
      { a: "RF", b: "BN" },
      { a: "CF", b: "BN" },
      { a: "LF", b: "BN" }, // player a is all-outfield through inning 4
    ];
    const v = validateLineup(innings, { infieldRequiredByInning: 4 }, ["a", "b"]);
    expect(v.find((x) => x.rule === "infieldRequiredByInning" && x.playerId === "a")).toBeTruthy();
    expect(v.find((x) => x.rule === "infieldRequiredByInning" && x.playerId === "b")).toBeFalsy();
  });

  it("flags maxConsecutiveBench (coach-requested)", () => {
    const innings: Inning[] = [
      { a: "BN" },
      { a: "BN" },
      { a: "1B" },
    ];
    const v = validateLineup(innings, { maxConsecutiveBench: 1 }, ["a"]);
    expect(v.find((x) => x.rule === "maxConsecutiveBench")).toBeTruthy();
  });

  it("flags maxConsecutiveOutfield (coach-requested)", () => {
    const innings: Inning[] = [
      { a: "LF" },
      { a: "CF" },
      { a: "RF" }, // 3 OF in a row
    ];
    const v = validateLineup(innings, { maxConsecutiveOutfield: 2 }, ["a"]);
    expect(v.find((x) => x.rule === "maxConsecutiveOutfield" && x.inning === 2)).toBeTruthy();
  });

  it("flags pitcherBenchInningBefore (coach-requested)", () => {
    const innings: Inning[] = [
      { a: "SS" }, // not benched
      { a: "P" }, // pitches without warmup window
    ];
    const v = validateLineup(innings, { pitcherBenchInningBefore: true }, ["a"]);
    expect(v.find((x) => x.rule === "pitcherBenchInningBefore" && x.inning === 1)).toBeTruthy();

    const ok: Inning[] = [{ a: "BN" }, { a: "P" }];
    expect(validateLineup(ok, { pitcherBenchInningBefore: true }, ["a"])).toEqual([]);
  });

  it("flags pairedPositions violations (coach-requested)", () => {
    const innings: Inning[] = [{ a: "P", b: "1B" }];
    const v = validateLineup(
      innings,
      { pairedPositions: [{ playerA: "a", positionA: "P", playerB: "b", positionB: "C" }] },
      ["a", "b"]
    );
    expect(v.find((x) => x.rule === "pairedPositions")).toBeTruthy();
  });
});

describe("validateLineup — game-day-competitor minimum-play rules", () => {
  it("flags equalBenchTime when bench gap exceeds 1", () => {
    const innings: Inning[] = [
      { a: "BN", b: "1B", c: "2B" },
      { a: "BN", b: "1B", c: "2B" },
      { a: "BN", b: "1B", c: "2B" }, // a sits 3, b/c sit 0
    ];
    const v = validateLineup(innings, { equalBenchTime: true }, ["a", "b", "c"]);
    expect(v.find((x) => x.rule === "equalBenchTime" && x.playerId === "a")).toBeTruthy();

    const even: Inning[] = [
      { a: "BN", b: "1B", c: "2B" },
      { a: "1B", b: "BN", c: "2B" },
      { a: "2B", b: "1B", c: "BN" }, // everyone sits exactly once
    ];
    expect(validateLineup(even, { equalBenchTime: true }, ["a", "b", "c"])).toEqual([]);
  });

  it("flags maxConsecutiveSamePosition", () => {
    const innings: Inning[] = [
      { a: "SS" },
      { a: "SS" }, // 2 in a row at SS
      { a: "1B" },
    ];
    const v = validateLineup(innings, { maxConsecutiveSamePosition: 1 }, ["a"]);
    expect(v.find((x) => x.rule === "maxConsecutiveSamePosition" && x.inning === 1)).toBeTruthy();

    const rotated: Inning[] = [{ a: "SS" }, { a: "2B" }, { a: "SS" }];
    expect(validateLineup(rotated, { maxConsecutiveSamePosition: 1 }, ["a"])).toEqual([]);
  });

  it("flags minInfieldInnings and minOutfieldInnings", () => {
    const innings: Inning[] = [
      { a: "LF", b: "1B" },
      { a: "CF", b: "2B" },
      { a: "RF", b: "SS" }, // a: all outfield, b: all infield
    ];
    const vIn = validateLineup(innings, { minInfieldInnings: 1 }, ["a", "b"]);
    expect(vIn.find((x) => x.rule === "minInfieldInnings" && x.playerId === "a")).toBeTruthy();
    expect(vIn.find((x) => x.rule === "minInfieldInnings" && x.playerId === "b")).toBeFalsy();

    const vOut = validateLineup(innings, { minOutfieldInnings: 1 }, ["a", "b"]);
    expect(vOut.find((x) => x.rule === "minOutfieldInnings" && x.playerId === "b")).toBeTruthy();
    expect(vOut.find((x) => x.rule === "minOutfieldInnings" && x.playerId === "a")).toBeFalsy();
  });

  it("exposes coach-voice labels + origin badges for every rule (game-day ref §8.2 parity)", async () => {
    const { LINEUP_RULE_META } = await import("./leagueRules");
    expect(LINEUP_RULE_META.equalBenchTime.label).toBe("Equal bench time");
    expect(LINEUP_RULE_META.minInfieldInnings.origin).toBe("Little League");
    expect(LINEUP_RULE_META.maxConsecutiveBench.origin).toBe("Custom");
    // every validator rule key has metadata
    for (const key of Object.keys(LINEUP_RULE_META)) {
      expect(LINEUP_RULE_META[key as keyof typeof LINEUP_RULE_META].description.length).toBeGreaterThan(0);
    }
  });

  it("provides applyable rule-set presets (game-day ref apply-rule-set wizard)", async () => {
    const { RULE_SET_PRESETS, ruleSetPreset } = await import("./leagueRules");
    expect(RULE_SET_PRESETS.length).toBeGreaterThanOrEqual(5);
    const ll = ruleSetPreset("littleLeague_11_12");
    expect(ll?.rules.minFieldInnings).toBe(2);
    expect(ll?.rules.infieldRequiredByInning).toBe(4);
    // the "none" preset is an empty rule set
    expect(ruleSetPreset("none")?.rules).toEqual({});
    // every preset's rules validate cleanly as a LeagueRules object (smoke):
    for (const preset of RULE_SET_PRESETS) {
      const v = validateLineup([{ a: "1B" }, { a: "BN" }], preset.rules, ["a"]);
      expect(Array.isArray(v)).toBe(true);
    }
  });
});

describe("autoLineup with leagueRules", () => {
  it("avoids 3-in-a-row outfield when maxConsecutiveOutfield=2", () => {
    const players: LineupPlayer[] = [
      p("p1", { canPitch: true }),
      p("c1", { canCatch: true }),
      ...["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((id) => p(id)),
    ];
    const { innings, warnings } = autoLineup({
      innings: 6,
      players,
      leagueRules: { maxConsecutiveOutfield: 2 },
    });
    expect(warnings).toEqual([]);
    const v = validateLineup(
      innings,
      { maxConsecutiveOutfield: 2 },
      players.map((pl) => pl.id)
    );
    expect(v.filter((x) => x.rule === "maxConsecutiveOutfield")).toEqual([]);
  });

  it("pairLocksToLockMap → mergeLockMaps enforces tandem locks through shuffleNonLocked", () => {
    const players: LineupPlayer[] = [
      p("ace", { canPitch: true, positionRatings: { P: "preferred" } }),
      p("mitt", { canCatch: true, positionRatings: { C: "preferred" } }),
      ...["a", "b", "c", "d", "e", "f", "g"].map((id) => p(id)),
    ];
    const first = autoLineup({ innings: 3, players });
    const pairLocks = pairLocksToLockMap(
      [
        { playerA: "ace", positionA: "P", playerB: "mitt", positionB: "C", innings: [0, 1] },
      ],
      3
    );
    const merged = mergeLockMaps(buildLocks(first.innings, new Set()), pairLocks);
    const second = autoLineup({ innings: 3, players, locks: merged });
    expect(second.innings[0]?.ace).toBe("P");
    expect(second.innings[0]?.mitt).toBe("C");
    expect(second.innings[1]?.ace).toBe("P");
    expect(second.innings[1]?.mitt).toBe("C");
  });

  it("default rules and helpers are exported", () => {
    const r = defaultLeagueRules();
    expect(r.maxConsecutiveOutfield).toBeGreaterThan(0);
    expect(OUTFIELD_POSITIONS.has("CF" as never)).toBe(true);
    // shuffleNonLocked retains a leagueRules-aware base. With slack on the
    // roster (>9 players) the OF rotation rule should be satisfiable.
    const players: LineupPlayer[] = [
      "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l",
    ].map((id) => p(id, { canPitch: true, canCatch: true }));
    const first = autoLineup({ innings: 3, players, leagueRules: { maxConsecutiveOutfield: 1 } });
    const out = shuffleNonLocked(first.innings, new Set(), {
      innings: 3,
      players,
      leagueRules: { maxConsecutiveOutfield: 1 },
    });
    // No player should be OF twice in a row.
    const ofViol = validateLineup(out.innings, { maxConsecutiveOutfield: 1 }, players.map((x) => x.id));
    expect(ofViol.filter((x) => x.rule === "maxConsecutiveOutfield")).toEqual([]);
  });
});

describe("ruleProvenance — Settings value provenance (game-day ref §8.2)", () => {
  it("reports 'off' for a rule that isn't enabled", () => {
    expect(ruleProvenance("minFieldInnings", {}, "littleLeague_11_12")).toEqual({ source: "off" });
  });

  it("reports 'custom' when no preset is applied", () => {
    const prov = ruleProvenance("minFieldInnings", { minFieldInnings: 2 });
    expect(prov).toEqual({ source: "custom" });
  });

  it("reports 'custom' when the applied preset is 'none'", () => {
    const prov = ruleProvenance("minFieldInnings", { minFieldInnings: 2 }, "none");
    expect(prov).toEqual({ source: "custom" });
  });

  it("reports 'preset' with governing body when the value matches the applied preset", () => {
    // littleLeague_11_12 sets minFieldInnings: 2.
    const prov = ruleProvenance("minFieldInnings", { minFieldInnings: 2 }, "littleLeague_11_12");
    expect(prov).toEqual({
      source: "preset",
      governingBody: "Little League",
      presetLabel: "Little League — Majors (11-12)",
    });
  });

  it("reports 'custom' when the coach overrode the preset value", () => {
    // Preset says minFieldInnings: 2; coach bumped it to 3.
    const prov = ruleProvenance("minFieldInnings", { minFieldInnings: 3 }, "littleLeague_11_12");
    expect(prov).toEqual({ source: "custom" });
  });

  it("reports 'custom' for an active rule the preset omits", () => {
    // littleLeague_9_10 has no minOutfieldInnings; turning it on is custom.
    const prov = ruleProvenance("minOutfieldInnings", { minOutfieldInnings: 1 }, "littleLeague_9_10");
    expect(prov).toEqual({ source: "custom" });
  });
});

