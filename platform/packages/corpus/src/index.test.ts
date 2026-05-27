import { describe, expect, it } from "vitest";
import {
  loadSafetyRules,
  loadPitchSmart,
  loadAgeMatrix,
  loadDrills,
  loadSources,
  getRuleById,
  getPitchTableForAge,
  getAgeBandKeyForAge,
  getMatrixBand,
  resetCache,
} from "./index";

describe("corpus loaders", () => {
  it("loads non-empty safety rules", () => {
    const r = loadSafetyRules();
    expect(r.rules.length).toBeGreaterThan(0);
    for (const rule of r.rules) {
      expect(rule.rule_id).toMatch(/.+/);
      expect(rule.enforcement).toMatch(/hard_block|warn_and_label|informational/);
    }
  });

  it("loads pitch smart tables for documented ages", () => {
    const p = loadPitchSmart();
    expect(p.age_tables.length).toBeGreaterThan(0);
    expect(getPitchTableForAge(10)).toBeDefined();
    expect(getPitchTableForAge(99)).toBeUndefined();
  });

  it("loads age matrix bands and resolves by age", () => {
    const m = loadAgeMatrix();
    expect(m.bands.length).toBeGreaterThanOrEqual(4);
    expect(getMatrixBand(7).age_band).toBe("6-8");
    expect(getMatrixBand(10).age_band).toBe("9-12");
    expect(getMatrixBand(14).age_band).toBe("13-15");
    expect(getMatrixBand(17).age_band).toBe("16+");
  });

  it("loads drills (≥30) and sources", () => {
    expect(loadDrills().length).toBeGreaterThanOrEqual(30);
    expect(loadSources().length).toBeGreaterThan(0);
  });

  it("returns the right age-band key for boundary ages", () => {
    expect(getAgeBandKeyForAge(6)).toBe("6-8");
    expect(getAgeBandKeyForAge(8)).toBe("6-8");
    expect(getAgeBandKeyForAge(9)).toBe("9-12");
    expect(getAgeBandKeyForAge(12)).toBe("9-12");
    expect(getAgeBandKeyForAge(13)).toBe("13-15");
    expect(getAgeBandKeyForAge(16)).toBe("16+");
  });

  it("getRuleById returns a known rule or undefined", () => {
    const id = loadSafetyRules().rules[0]!.rule_id;
    expect(getRuleById(id)?.rule_id).toBe(id);
    expect(getRuleById("nope_____")).toBeUndefined();
  });

  it("resetCache is callable without throwing", () => {
    resetCache();
    expect(loadSafetyRules().rules.length).toBeGreaterThan(0);
  });
});
