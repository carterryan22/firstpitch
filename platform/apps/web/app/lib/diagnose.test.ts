import { describe, expect, it } from "vitest";
import type { MetricEntryRecord } from "@platform/storage";
import { diagnosePlayer, diagnosableOutcomes } from "./diagnose";

const recordedAt = "2026-05-24T12:00:00.000Z";

function entry(
  metricKey: string,
  value: number,
  verification: MetricEntryRecord["verificationState"] = "coach_verified",
): MetricEntryRecord {
  return {
    id: `me_${metricKey}_${value}`,
    playerId: "p1",
    metricKey,
    value,
    recordedAt,
    verificationState: verification,
  };
}

describe("diagnosePlayer", () => {
  it("exposes the four outcome drivers", () => {
    const keys = diagnosableOutcomes().map((d) => d.driverKey);
    expect(keys).toEqual(["EV_TEE", "EV_FRONT_TOSS", "HOME_TO_FIRST", "POP_TIME"]);
  });

  it("returns no diagnoses when the player has no relevant entries", () => {
    const r = diagnosePlayer({
      outcomeDriverKey: "EV_TEE",
      ageBand: "9-12",
      entries: [],
    });
    expect(r.diagnoses).toEqual([]);
  });

  it("translates storage keys to engine keys (BAT_SPEED below on-track triggers deficit)", () => {
    const r = diagnosePlayer({
      outcomeDriverKey: "EV_TEE",
      ageBand: "9-12",
      entries: [entry("bat_speed", 1)],
    });
    expect(r.diagnoses.length).toBeGreaterThan(0);
    expect(r.diagnoses[0]?.driver.key).toBe("BAT_SPEED_DEFICIT");
  });

  it("ignores entries with insufficient verification", () => {
    const r = diagnosePlayer({
      outcomeDriverKey: "EV_TEE",
      ageBand: "9-12",
      entries: [entry("bat_speed", 1, "self_entered")],
      minVerification: "coach_verified",
    });
    expect(r.diagnoses).toEqual([]);
  });
});
