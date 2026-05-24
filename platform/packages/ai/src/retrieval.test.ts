import { describe, it, expect, beforeEach } from "vitest";
import { retrieve, resetRetrievalCache } from "./retrieval";

beforeEach(() => resetRetrievalCache());

describe("retrieve", () => {
  it("returns nothing for empty query", () => {
    expect(retrieve("")).toEqual([]);
  });

  it("ranks pitch smart query toward Pitch Smart sources", () => {
    const r = retrieve("pitch smart rest days", { k: 5, kinds: ["source"] });
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]?.kind).toBe("source");
  });

  it("tierMax filters out lower tiers", () => {
    const all = retrieve("pitching", { k: 20, kinds: ["source"] });
    const t1 = retrieve("pitching", { k: 20, kinds: ["source"], tierMax: 1 });
    expect(t1.length).toBeLessThanOrEqual(all.length);
    expect(t1.every((r) => (r.citation.tier ?? 99) <= 1)).toBe(true);
  });

  it("drill kind returns drill ids", () => {
    const r = retrieve("warmup", { k: 5, kinds: ["drill"] });
    expect(r.every((x) => x.kind === "drill")).toBe(true);
  });
});
