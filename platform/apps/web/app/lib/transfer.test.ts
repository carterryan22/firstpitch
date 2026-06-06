import { describe, expect, it } from "vitest";
import { analyzeTransfer, type TransferGame } from "./transfer";

function batGame(date: string, b: Record<string, number>): TransferGame {
  return { date, batting: b };
}

function pitchGame(date: string, p: Record<string, number>): TransferGame {
  return { date, pitching: p };
}

function fieldGame(date: string, f: Record<string, number>): TransferGame {
  return { date, fielding: [{ position: "SS", ...f }] };
}

function d(month: number, day: number): string {
  return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

describe("analyzeTransfer — hitting", () => {
  it("splits games into pre/post windows by block dates", () => {
    const games = [
      batGame("2026-05-15", { pa: 4, ab: 4, h: 1, so: 2 }), // pre
      batGame("2026-06-05", { pa: 4, ab: 4, h: 2, so: 0 }), // post (within block)
      batGame("2026-07-01", { pa: 4, ab: 4, h: 3, so: 0 }), // after block — ignored
    ];
    const r = analyzeTransfer({
      role: "hitting",
      blockStart: "2026-06-01",
      blockEnd: "2026-06-21",
      games,
    });
    expect(r.pre.games).toBe(1);
    expect(r.post.games).toBe(1);
  });

  it("reports strong transfer when game QAB%/K%/OBP improve with a sufficient post sample", () => {
    // 6 pre games, 6 post games. Post: more QAB, fewer K, higher OBP.
    const pre: TransferGame[] = Array.from({ length: 6 }, (_, i) =>
      batGame(d(5, 10 + i), { pa: 4, ab: 4, h: 1, so: 2, qab: 1 }),
    );
    const post: TransferGame[] = Array.from({ length: 6 }, (_, i) =>
      batGame(d(6, 2 + i), { pa: 4, ab: 3, h: 2, bb: 1, so: 0, qab: 3 }),
    );
    const r = analyzeTransfer({
      role: "hitting",
      blockStart: "2026-06-01",
      blockEnd: "2026-06-21",
      games: [...pre, ...post],
      practiceImproved: true,
    });
    expect(r.post.sample).toBe(24);
    expect(["strong", "very_strong"]).toContain(r.confidence);
    expect(r.result).toBe("strong");
    const qab = r.metrics.find((m) => m.key === "qab")!;
    expect(qab.improved).toBe(true);
    const k = r.metrics.find((m) => m.key === "k")!;
    expect(k.improved).toBe(true); // K% went down — improvement
  });

  it("flags insufficient sample with a concrete 'need more PA' message", () => {
    const games = [
      batGame("2026-05-10", { pa: 4, ab: 4, h: 1 }),
      batGame("2026-06-05", { pa: 3, ab: 3, h: 1 }), // only 3 PA post
    ];
    const r = analyzeTransfer({
      role: "hitting",
      blockStart: "2026-06-01",
      blockEnd: "2026-06-21",
      games,
    });
    expect(r.confidence).toBe("low");
    expect(r.result).toBe("insufficient");
    expect(r.insight).toMatch(/more PA/);
  });

  it("reports game_only when games improve but practice trend is unknown", () => {
    const pre: TransferGame[] = Array.from({ length: 6 }, (_, i) =>
      batGame(d(5, 10 + i), { pa: 4, ab: 4, h: 1, so: 2 }),
    );
    const post: TransferGame[] = Array.from({ length: 6 }, (_, i) =>
      batGame(d(6, 2 + i), { pa: 4, ab: 3, h: 2, bb: 1, so: 0, qab: 3 }),
    );
    const r = analyzeTransfer({
      role: "hitting",
      blockStart: "2026-06-01",
      blockEnd: "2026-06-21",
      games: [...pre, ...post],
    });
    expect(r.result).toBe("game_only");
  });
});

describe("analyzeTransfer — pitching", () => {
  it("uses batters-faced for confidence tiers", () => {
    const pre: TransferGame[] = Array.from({ length: 3 }, (_, i) =>
      pitchGame(d(5, 10 + i), { ip: 3, bf: 14, pitches: 50, strikes: 28, bb: 4, h: 5 }),
    );
    const post: TransferGame[] = Array.from({ length: 3 }, (_, i) =>
      pitchGame(d(6, 2 + i), { ip: 3, bf: 14, pitches: 50, strikes: 38, bb: 1, h: 3 }),
    );
    const r = analyzeTransfer({
      role: "pitching",
      blockStart: "2026-06-01",
      blockEnd: "2026-06-30",
      games: [...pre, ...post],
    });
    expect(r.post.sample).toBe(42); // 3 × 14 BF
    expect(r.confidence).toBe("strong"); // 40+ BF
    const strike = r.metrics.find((m) => m.key === "strike")!;
    expect(strike.improved).toBe(true);
    const bb = r.metrics.find((m) => m.key === "bb")!;
    expect(bb.improved).toBe(true); // BB rate down — improvement
    expect(r.result).toBe("game_only");
  });
});

describe("analyzeTransfer — fielding", () => {
  it("uses chances for confidence and only shows CS% when there were attempts", () => {
    const pre = [fieldGame("2026-05-10", { tc: 6, po: 3, a: 2, e: 1 })];
    const post = [
      fieldGame("2026-06-05", { tc: 7, po: 4, a: 3, e: 0 }),
      fieldGame("2026-06-08", { tc: 6, po: 3, a: 3, e: 0 }),
    ];
    const r = analyzeTransfer({
      role: "fielding",
      blockStart: "2026-06-01",
      blockEnd: "2026-06-30",
      games: [...pre, ...post],
    });
    expect(r.post.sample).toBe(13); // 7 + 6 chances
    expect(r.confidence).toBe("strong"); // 12+ chances
    const fpct = r.metrics.find((m) => m.key === "fpct")!;
    expect(fpct.improved).toBe(true);
    expect(r.metrics.find((m) => m.key === "cs")).toBeUndefined(); // no SB attempts
  });
});
