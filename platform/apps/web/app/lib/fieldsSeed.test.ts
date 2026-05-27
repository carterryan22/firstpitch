import { describe, expect, it } from "vitest";
import { milesBetween, FIELD_SEEDS } from "./fieldsSeed";

describe("milesBetween", () => {
  it("returns 0 for identical coordinates", () => {
    expect(milesBetween({ lat: 47.61, lng: -122.2 }, { lat: 47.61, lng: -122.2 })).toBe(0);
  });

  it("returns Infinity when coords missing", () => {
    expect(milesBetween({}, { lat: 47.61, lng: -122.2 })).toBe(Infinity);
    expect(milesBetween({ lat: 47.61, lng: -122.2 }, {})).toBe(Infinity);
  });

  it("computes a sane positive distance between two Bellevue seeds", () => {
    const seeds = FIELD_SEEDS.filter((f) => f.city === "Bellevue" && f.lat && f.lng);
    expect(seeds.length).toBeGreaterThanOrEqual(2);
    const d = milesBetween(seeds[0]!, seeds[1]!);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(20);
  });

  it("approximates 1 degree latitude ≈ 69 mi", () => {
    const d = milesBetween({ lat: 47, lng: -122 }, { lat: 48, lng: -122 });
    expect(d).toBeGreaterThan(68);
    expect(d).toBeLessThan(70);
  });

  it("is symmetric", () => {
    const a = { lat: 47.6, lng: -122.2 };
    const b = { lat: 47.55, lng: -122.05 };
    expect(milesBetween(a, b)).toBeCloseTo(milesBetween(b, a), 6);
  });
});
