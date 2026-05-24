// Blast Motion bat-sensor CSV → MetricEntry stream.
// Common columns: Equipment, Swing Details, Date, Bat Speed (mph), Attack Angle,
// Time to Contact (sec), Peak Hand Speed, On Plane Efficiency.

import { buildReport, toIsoOrNow, toNumberOrNull, type DeviceIngestReport } from "./device";

const KNOWN: Record<string, string> = {
  date: "date",
  timestamp: "date",
  swingtimestamp: "date",
  batspeed: "batSpeed",
  batspeedmph: "batSpeed",
  attackangle: "attackAngle",
  timetocontact: "timeToContact",
  timetocontactsec: "timeToContact",
  peakhandspeed: "peakHandSpeed",
  peakhandspeedmph: "peakHandSpeed",
  onplaneefficiency: "_skip",
};

export function ingestBlastCsv(csv: string): DeviceIngestReport {
  return buildReport(csv, "blast", KNOWN, (rec) => {
    const recordedAt = toIsoOrNow(rec["date"] ?? rec["timestamp"] ?? rec["swingtimestamp"]);
    const out: ReturnType<typeof buildReport>["entries"] = [];
    const batSpeed = toNumberOrNull(rec["batspeed"] ?? rec["batspeedmph"]);
    const attackAngle = toNumberOrNull(rec["attackangle"]);
    const timeToContact = toNumberOrNull(rec["timetocontact"] ?? rec["timetocontactsec"]);
    if (batSpeed !== null) out.push({ metricKey: "BAT_SPEED", value: batSpeed, recordedAt, source: "blast" });
    if (attackAngle !== null) out.push({ metricKey: "ATTACK_ANGLE", value: attackAngle, recordedAt, source: "blast" });
    if (timeToContact !== null) {
      out.push({
        metricKey: "REACTION_MS",
        value: Math.round(timeToContact * 1000),
        recordedAt,
        source: "blast",
        notes: "derived from time-to-contact",
      });
    }
    return out;
  });
}
