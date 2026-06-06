import { describe, it, expect } from "vitest";
import { buildSnackRotation, type SnackVolunteer, type SnackRotationGame } from "./snackRotation";

const vols: SnackVolunteer[] = [
  { id: "a", name: "Alvarez" },
  { id: "b", name: "Brooks" },
  { id: "c", name: "Chen" },
];

function games(n: number): SnackRotationGame[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `g${i + 1}`,
    startsAt: `2026-06-0${i + 1}T18:00:00.000Z`,
  }));
}

describe("buildSnackRotation", () => {
  it("returns nothing when there are no volunteers", () => {
    expect(buildSnackRotation({ games: games(3), volunteers: [] })).toEqual([]);
  });

  it("auto-balances duty evenly across the pool", () => {
    const out = buildSnackRotation({ games: games(6), volunteers: vols });
    const counts: Record<string, number> = {};
    for (const a of out) counts[a.volunteerId] = (counts[a.volunteerId] ?? 0) + 1;
    // 6 games / 3 families = exactly 2 each.
    expect(counts).toEqual({ a: 2, b: 2, c: 2 });
  });

  it("never assigns the same family two games in a row when alternatives exist", () => {
    const out = buildSnackRotation({ games: games(6), volunteers: vols });
    for (let i = 1; i < out.length; i++) {
      expect(out[i]!.volunteerId).not.toBe(out[i - 1]!.volunteerId);
    }
  });

  it("evens out the season using priorCounts", () => {
    // Alvarez has already served twice; the next single slot should skip them.
    const out = buildSnackRotation({
      games: games(1),
      volunteers: vols,
      priorCounts: { a: 2, b: 0, c: 0 },
    });
    expect(out[0]!.volunteerId).not.toBe("a");
  });

  it("keeps coach-pinned (locked) assignments in place", () => {
    const g = games(3);
    g[1]!.lockedVolunteerId = "c";
    const out = buildSnackRotation({ games: g, volunteers: vols });
    const second = out.find((a) => a.gameId === "g2");
    expect(second!.volunteerId).toBe("c");
  });

  it("is deterministic and order-independent on input games", () => {
    const forward = buildSnackRotation({ games: games(5), volunteers: vols });
    const shuffled = buildSnackRotation({ games: games(5).reverse(), volunteers: vols });
    expect(shuffled).toEqual(forward);
  });
});
