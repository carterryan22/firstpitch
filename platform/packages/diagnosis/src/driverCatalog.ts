// Driver catalog — minimal seed mapping core metrics → candidate drivers.
// Each driver has indicator metrics; if those metrics carry verified-enough entries
// outside the expected range, the driver becomes a diagnosis candidate.

export type VerificationLevel =
  | "self_entered"
  | "video_attached"
  | "device_captured"
  | "coach_verified"
  | "facility_verified"
  | "event_verified";

export interface Driver {
  key: string;
  label: string;
  /** Metric whose underperformance this driver explains. */
  outcomeMetric: string;
  /** Metrics that, when off, point at this driver. */
  indicators: Array<{
    metricKey: string;
    /** Direction relative to expected band that triggers this indicator. */
    when: "below" | "above";
  }>;
  /** Suggested intervention drill IDs from the corpus drill library. */
  recommendedDrillIds: string[];
}

// Core §9 — partial seed, expansion deferred to E10.1 follow-up.
export const DRIVERS: Driver[] = [
  {
    key: "BAT_SPEED_DEFICIT",
    label: "Below-band bat speed limiting exit velo",
    outcomeMetric: "EV_TEE",
    indicators: [{ metricKey: "BAT_SPEED", when: "below" }],
    recommendedDrillIds: ["TEE_5BALL_PROGRESSION", "FRONT_TOSS_DECISION_5"],
  },
  {
    key: "CONTACT_QUALITY",
    label: "Inconsistent contact point",
    outcomeMetric: "EV_FRONT_TOSS",
    indicators: [{ metricKey: "EV_TEE", when: "below" }],
    recommendedDrillIds: ["TEE_5BALL_PROGRESSION"],
  },
  {
    key: "FIRST_STEP_QUICKNESS",
    label: "Slow acceleration limiting home-to-first",
    outcomeMetric: "HOME_TO_FIRST",
    indicators: [
      { metricKey: "SPRINT_10", when: "above" },
      { metricKey: "REACTION_MS", when: "above" },
    ],
    recommendedDrillIds: ["ACC_SPRINT_10_20", "REACTION_BALL_PARTNER"],
  },
  {
    key: "TRANSFER_MECHANICS",
    label: "Slow exchange/transfer driving pop time",
    outcomeMetric: "POP_TIME",
    indicators: [{ metricKey: "POP_TIME", when: "above" }],
    recommendedDrillIds: ["C_POP_TIME_BLOCKS"],
  },
  {
    key: "READ_RECOGNITION",
    label: "Visual read latency on contact",
    outcomeMetric: "FIELDING_FIRST_STEP",
    indicators: [{ metricKey: "REACTION_MS", when: "above" }],
    recommendedDrillIds: ["FIELDING_TRIANGLE_READ", "REACTION_BALL_PARTNER"],
  },
];

export function driversForOutcome(metricKey: string): Driver[] {
  return DRIVERS.filter((d) => d.outcomeMetric === metricKey);
}
