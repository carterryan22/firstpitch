// HitTrax cage-tracking CSV → MetricEntry stream.
// Common columns: Date, Velo, Dist, LA (launch angle), Result, Spray Angle, Pitch Type.

import { buildReport, toIsoOrNow, toNumberOrNull, type DeviceIngestReport } from "./device";

const KNOWN: Record<string, string> = {
  date: "date",
  timestamp: "date",
  velo: "exitVelo",
  exitvelocity: "exitVelo",
  exitvelo: "exitVelo",
  dist: "distance",
  distance: "distance",
  la: "launchAngle",
  launchangle: "launchAngle",
  result: "result",
  sprayangle: "_skip",
  pitchtype: "_skip",
};

export function ingestHitTraxCsv(csv: string): DeviceIngestReport {
  return buildReport(csv, "hittrax", KNOWN, (rec) => {
    const recordedAt = toIsoOrNow(rec["date"] ?? rec["timestamp"]);
    const out: ReturnType<typeof buildReport>["entries"] = [];
    const ev = toNumberOrNull(rec["velo"] ?? rec["exitvelocity"] ?? rec["exitvelo"]);
    const la = toNumberOrNull(rec["la"] ?? rec["launchangle"]);
    const dist = toNumberOrNull(rec["dist"] ?? rec["distance"]);
    const result = (rec["result"] ?? "").toLowerCase();
    if (ev !== null) {
      // HitTrax is cage-tracked live — treat as EV_LIVE.
      out.push({ metricKey: "EV_LIVE", value: ev, recordedAt, source: "hittrax", notes: result || undefined });
    }
    if (la !== null) out.push({ metricKey: "ATTACK_ANGLE", value: la, recordedAt, source: "hittrax" });
    // Batted-ball carry distance (ft). Headline HitTrax/Boost leaderboard stat;
    // negatives are foul/backspin artifacts, so only keep non-negative carry.
    if (dist !== null && dist >= 0) {
      out.push({ metricKey: "DISTANCE", value: dist, recordedAt, source: "hittrax" });
    }
    // Hard-hit % is derived: per Statcast convention, EV >= 95 mph.
    // Adapter doesn't aggregate; consumer can compute over the entry list.
    return out;
  });
}

/** Derive HARD_HIT_PCT from a HitTrax / Rapsodo entry stream. */
export function deriveHardHitPct(entries: Array<{ metricKey: string; value: number }>): number {
  const ev = entries.filter((e) => e.metricKey === "EV_LIVE");
  if (ev.length === 0) return 0;
  const hard = ev.filter((e) => e.value >= 95).length;
  return Number(((hard / ev.length) * 100).toFixed(1));
}
