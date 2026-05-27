import { describe, expect, it } from "vitest";
import { computeGameRating, aggregateSeason } from "./playerStats";
import type { PlayerGameStatsRecord } from "@platform/storage";

describe("computeGameRating", () => {
  it("kind by default for an empty slate", () => {
    const r = computeGameRating({});
    expect(r.score).toBe(3.5);
    expect(r.label).toMatch(/Showed up/);
  });

  it("gives an absent player the lowest gentle rating", () => {
    const r = computeGameRating({ attendance: "absent" });
    expect(r.score).toBe(2.0);
    expect(r.label).toMatch(/Missed/);
  });

  it("rewards a multi-hit RBI day", () => {
    const r = computeGameRating({
      batting: { pa: 4, ab: 4, h: 3, "2b": 1, rbi: 3, r: 2, bb: 0, so: 0 },
    });
    expect(r.score).toBeGreaterThanOrEqual(4.5);
    expect(r.highlights.join(" ")).toMatch(/3 RBI/);
  });

  it("rewards walks even with no hits (good eye)", () => {
    const r = computeGameRating({
      batting: { pa: 4, ab: 2, h: 0, bb: 2, so: 0 },
    });
    expect(r.score).toBeGreaterThanOrEqual(4.0);
    expect(r.highlights.join(" ")).toMatch(/walks|eye/);
  });

  it("never drops below 3.0 for a tough hitting day with participation", () => {
    const r = computeGameRating({
      batting: { pa: 3, ab: 3, h: 0, bb: 0, so: 3 },
    });
    expect(r.score).toBeGreaterThanOrEqual(3.0);
  });

  it("celebrates a clean pitching outing", () => {
    const r = computeGameRating({
      pitching: { ip: 3, bf: 10, pitches: 38, bb: 1, so: 5, er: 0, wp: 0, hbp: 0 },
    });
    expect(r.score).toBeGreaterThanOrEqual(4.6);
    expect(r.highlights.some((h) => /No earned/.test(h))).toBe(true);
  });

  it("flags strike-throwing > Ks (no walks > many Ks)", () => {
    const efficient = computeGameRating({
      pitching: { ip: 2, bf: 7, pitches: 24, bb: 0, so: 2, er: 0 },
    }).score;
    const wild = computeGameRating({
      pitching: { ip: 2, bf: 11, pitches: 50, bb: 4, so: 5, er: 2 },
    }).score;
    expect(efficient).toBeGreaterThan(wild);
  });

  it("rolls fielding contributions in (multi-position kid)", () => {
    const r = computeGameRating({
      fielding: [
        { position: "SS", innings: 2, po: 1, a: 2, e: 0 },
        { position: "CF", innings: 2, po: 2, a: 0, e: 0 },
        { position: "P", innings: 2, po: 0, a: 1, e: 0 },
      ],
    });
    expect(r.score).toBeGreaterThanOrEqual(4.2);
  });

  it("caps at 5.0", () => {
    const r = computeGameRating({
      batting: { pa: 5, ab: 4, h: 4, hr: 2, rbi: 6, r: 4, bb: 1 },
      pitching: { ip: 3, bf: 10, pitches: 32, bb: 0, so: 6, er: 0 },
      fielding: [{ position: "SS", innings: 6, po: 4, a: 6, e: 0, dp: 1 }],
    });
    expect(r.score).toBeLessThanOrEqual(5.0);
    expect(r.label).toMatch(/Star/);
  });
});

describe("aggregateSeason", () => {
  const sample: PlayerGameStatsRecord[] = [
    {
      id: "1", playerId: "p1", teamId: "t1", gameId: "g1",
      batting: { pa: 4, ab: 3, h: 2, "1b": 1, "2b": 1, bb: 1, so: 0, rbi: 2, r: 1 },
      rating: 4.5, ratingLabel: "Great game!", highlights: ["2 RBI"],
      source: "gamechanger", createdAt: "2026-05-01T00:00:00Z",
    },
    {
      id: "2", playerId: "p1", teamId: "t1", gameId: "g2",
      batting: { pa: 3, ab: 3, h: 1, "1b": 1, bb: 0, so: 1 },
      fielding: [{ position: "SS", innings: 6, po: 2, a: 5, e: 1 }],
      rating: 4.0, ratingLabel: "Solid effort", highlights: [],
      source: "manual", createdAt: "2026-05-08T00:00:00Z",
    },
  ];

  it("computes batting averages across games", () => {
    const s = aggregateSeason(sample);
    expect(s.gamesPlayed).toBe(2);
    expect(s.batting?.ab).toBe(6);
    expect(s.batting?.h).toBe(3);
    expect(s.batting?.avg).toBe(0.5);
    expect(s.batting?.bb).toBe(1);
    expect(s.averageRating).toBe(4.25);
  });

  it("tracks most-played position from fielding", () => {
    const s = aggregateSeason(sample);
    expect(s.mostPlayedPosition).toBe("SS");
    expect(s.fielding?.totalInnings).toBe(6);
  });

  it("returns empty summary for no records", () => {
    const s = aggregateSeason([]);
    expect(s.gamesPlayed).toBe(0);
    expect(s.batting).toBeUndefined();
    expect(s.pitching).toBeUndefined();
  });
});
