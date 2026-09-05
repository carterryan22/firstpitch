import { describe, it, expect } from "vitest";
import { compile } from "./index";

describe("compile()", () => {
  it("produces a warmup + skill + cooldown plan for an 11-year-old throwing+speed session", () => {
    const res = compile({
      age: 11,
      durationMin: 60,
      environmentTier: "T1_field",
      equipmentAvailable: ["tee", "5 baseballs", "cone", "stopwatch", "open space", "partner", "reaction ball"],
      coaches: 1,
      players: 8,
      focus: ["throwing", "speed", "reaction"],
    });
    expect(res.blocks[0]?.type).toBe("warmup");
    expect(res.blocks.at(-1)?.type === "cooldown" || res.blocks.at(-1)?.type === "skill").toBe(true);
    expect(res.ageBand).toBe("9-12");
    expect(res.qualityScore).toBeGreaterThan(0);
  });

  it("caps session minutes for 6-8 band", () => {
    const res = compile({
      age: 7,
      durationMin: 120, // exceeds 60min cap
      environmentTier: "T1_field",
      equipmentAvailable: ["tee", "5 baseballs", "open space"],
      coaches: 1,
      players: 6,
      focus: ["throwing"],
    });
    expect(res.warnings.join(" ")).toMatch(/exceeds 6-8 session cap 60/);
  });

  it("never presents a warmup-only fallback as a filled session", () => {
    const res = compile({
      age: 11,
      durationMin: 60,
      environmentTier: "T1_field",
      equipmentAvailable: [],
      coaches: 1,
      players: 8,
      focus: ["throwing"],
    });
    expect(res.timeBudget.usedMin).toBeLessThan(res.timeBudget.targetMin);
    expect(res.timeBudget.skillMin).toBe(0);
    expect(res.blocked.join(" ")).toMatch(/No eligible skill block/);
    expect(res.warnings.join(" ")).toMatch(/uses .* requested minutes/);
  });

  it("builds a real skill section with the field starter inventory", () => {
    const res = compile({
      age: 11,
      durationMin: 60,
      environmentTier: "T1_field",
      equipmentAvailable: ["glove", "5_baseballs"],
      coaches: 1,
      players: 8,
      focus: ["throwing"],
    });
    expect(res.timeBudget.skillMin).toBeGreaterThan(0);
    expect(res.blocked).not.toContain(expect.stringMatching(/No eligible skill block/));
  });
});
