import { describe, it, expect } from "vitest";
import {
  autoLineup,
  lineupModeParams,
  LINEUP_MODES,
  LINEUP_MODE_ORDER,
  type Inning,
  type LineupPlayer,
} from "./index";

/** How many times a player stays at the same defensive position inning-over-inning. */
function positionRepeats(innings: Inning[]): number {
  let repeats = 0;
  for (let i = 1; i < innings.length; i++) {
    const prev = innings[i - 1] ?? {};
    const cur = innings[i] ?? {};
    for (const pid of Object.keys(cur)) {
      const c = cur[pid];
      if (c && c !== "BN" && c === prev[pid]) repeats += 1;
    }
  }
  return repeats;
}

describe("lineup game modes", () => {
  it("maps each mode to a fairness/variety tuning", () => {
    expect(lineupModeParams("recFair")).toEqual({ competitiveWeight: 0, varietyWeight: 1 });
    expect(lineupModeParams("competitive")).toEqual({ competitiveWeight: 0.7, varietyWeight: 0.6 });
    expect(LINEUP_MODE_ORDER).toEqual(Object.keys(LINEUP_MODES));
  });

  it("higher varietyWeight spreads players across more positions (fewer repeats)", () => {
    const players: LineupPlayer[] = Array.from({ length: 9 }, (_, i) => ({ id: `p${i}` }));
    players[1] = { id: "p1", canPitch: true };
    players[2] = { id: "p2", canCatch: true };
    const base = { innings: 5, players, preset: "standard9" as const, seed: 5, competitiveWeight: 0 };

    const low = autoLineup({ ...base, varietyWeight: 0 });
    const high = autoLineup({ ...base, varietyWeight: 3 });

    expect(positionRepeats(high.innings)).toBeLessThan(positionRepeats(low.innings));
  });

  it("default behavior (no varietyWeight) is unchanged", () => {
    const players: LineupPlayer[] = Array.from({ length: 9 }, (_, i) => ({ id: `p${i}` }));
    const a = autoLineup({ innings: 3, players, preset: "standard9", seed: 1 });
    const b = autoLineup({ innings: 3, players, preset: "standard9", seed: 1, varietyWeight: 1 });
    expect(a.innings).toEqual(b.innings);
  });
});
