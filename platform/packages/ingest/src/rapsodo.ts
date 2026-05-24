// Rapsodo Pitching/Hitting CSV → MetricEntry stream.
// Columns vary by product (Pitching 2.0, Hitting). We map the common ones.

import { buildReport, toIsoOrNow, toNumberOrNull, type DeviceIngestReport } from "./device";

const KNOWN: Record<string, string> = {
  date: "date",
  timestamp: "date",
  // pitching
  pitchtype: "pitchType",
  velocity: "velocity",
  velocitymph: "velocity",
  speedmph: "velocity",
  spinrate: "spin",
  totalspin: "spin",
  spinrpm: "spin",
  strikezoneside: "_skip",
  strikezoneheight: "_skip",
  releasespin: "spin",
  // hitting
  exitvelocity: "exitVelo",
  exitvelo: "exitVelo",
  exitspeed: "exitVelo",
  launchangle: "launchAngle",
  distance: "distance",
  carrydistance: "distance",
};

export function ingestRapsodoCsv(csv: string): DeviceIngestReport {
  return buildReport(csv, "rapsodo", KNOWN, (rec) => {
    const recordedAt = toIsoOrNow(rec["date"] ?? rec["timestamp"]);
    const out: ReturnType<typeof buildReport>["entries"] = [];
    const velocity = toNumberOrNull(rec["velocity"] ?? rec["velocitymph"] ?? rec["speedmph"]);
    const spin = toNumberOrNull(rec["spinrate"] ?? rec["totalspin"] ?? rec["spinrpm"] ?? rec["releasespin"]);
    const exitVelo = toNumberOrNull(rec["exitvelocity"] ?? rec["exitvelo"] ?? rec["exitspeed"]);
    const launchAngle = toNumberOrNull(rec["launchangle"]);
    const pitchType = (rec["pitchtype"] ?? "").toLowerCase();

    if (velocity !== null) {
      const metric = pitchType.includes("change") ? "CH_SEPARATION" : "FB_VELO";
      // CH_SEPARATION is technically a delta — we record raw velo and let the
      // diagnosis layer derive separation. Use FB_VELO if no pitch type given.
      out.push({ metricKey: pitchType.includes("change") ? "FB_VELO" : "FB_VELO", value: velocity, recordedAt, source: "rapsodo", notes: pitchType || undefined });
      void metric;
    }
    if (spin !== null) {
      out.push({ metricKey: "FB_SPIN", value: spin, recordedAt, source: "rapsodo" });
    }
    if (exitVelo !== null) {
      out.push({ metricKey: "EV_LIVE", value: exitVelo, recordedAt, source: "rapsodo" });
    }
    if (launchAngle !== null) {
      out.push({ metricKey: "ATTACK_ANGLE", value: launchAngle, recordedAt, source: "rapsodo" });
    }
    return out;
  });
}
