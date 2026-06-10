import { describe, it, expect } from "vitest";
import { ingestRapsodoCsv } from "./rapsodo";
import { ingestBlastCsv } from "./blast";
import { ingestHitTraxCsv, deriveHardHitPct } from "./hitTrax";

describe("ingestRapsodoCsv", () => {
  it("extracts velocity, spin, exit velo, launch angle", () => {
    const csv = [
      "Date,Pitch Type,Velocity (mph),Total Spin,Exit Velocity,Launch Angle",
      "2026-05-01,Fastball,72.4,1850,,",
      "2026-05-01,Fastball,73.1,1900,,",
      "2026-05-02,Changeup,62.5,1500,,",
    ].join("\n");
    const r = ingestRapsodoCsv(csv);
    expect(r.parsedRowCount).toBe(3);
    expect(r.entries.filter((e) => e.metricKey === "FB_VELO")).toHaveLength(3);
    expect(r.entries.filter((e) => e.metricKey === "FB_SPIN")).toHaveLength(3);
    expect(r.source).toBe("rapsodo");
  });
  it("emits hitting metrics when exit velo column present", () => {
    const csv = [
      "Date,Exit Velocity,Launch Angle",
      "2026-05-01,88,15",
      "2026-05-01,92,18",
    ].join("\n");
    const r = ingestRapsodoCsv(csv);
    expect(r.entries.filter((e) => e.metricKey === "EV_LIVE")).toHaveLength(2);
    expect(r.entries.filter((e) => e.metricKey === "ATTACK_ANGLE")).toHaveLength(2);
  });
});

describe("ingestBlastCsv", () => {
  it("maps bat speed, attack angle, and derives REACTION_MS from time-to-contact", () => {
    const csv = [
      "Date,Bat Speed (mph),Attack Angle,Time to Contact (sec)",
      "2026-05-01,62.3,12.1,0.155",
      "2026-05-01,64.7,11.5,0.142",
    ].join("\n");
    const r = ingestBlastCsv(csv);
    expect(r.parsedRowCount).toBe(2);
    expect(r.entries.filter((e) => e.metricKey === "BAT_SPEED")).toHaveLength(2);
    const reaction = r.entries.find((e) => e.metricKey === "REACTION_MS");
    expect(reaction?.value).toBe(155);
  });
});

describe("ingestHitTraxCsv", () => {
  it("treats HitTrax velo as EV_LIVE and pulls launch angle", () => {
    const csv = [
      "Date,Velo,LA,Dist,Result",
      "2026-05-01,98,18,310,HR",
      "2026-05-01,72,8,140,Single",
      "2026-05-01,85,12,200,Out",
    ].join("\n");
    const r = ingestHitTraxCsv(csv);
    expect(r.parsedRowCount).toBe(3);
    const ev = r.entries.filter((e) => e.metricKey === "EV_LIVE");
    expect(ev).toHaveLength(3);
    expect(r.entries.filter((e) => e.metricKey === "ATTACK_ANGLE")).toHaveLength(3);
    const dist = r.entries.filter((e) => e.metricKey === "DISTANCE");
    expect(dist).toHaveLength(3);
    expect(dist.map((e) => e.value)).toEqual([310, 140, 200]);
  });
  it("derives hard-hit % using 95 mph threshold", () => {
    const entries = [
      { metricKey: "EV_LIVE", value: 98 },
      { metricKey: "EV_LIVE", value: 92 },
      { metricKey: "EV_LIVE", value: 96 },
      { metricKey: "EV_LIVE", value: 80 },
    ];
    expect(deriveHardHitPct(entries)).toBe(50);
  });
});
