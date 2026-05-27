// Metric registry. Subset of player-development-metric-schema.md focused on
// the core "baseline-able" measurables that drive personalized diagnosis and
// progress charts.

export type MetricClass = "measurable" | "skill" | "guardrail";
export type MetricKey =
  | "exit_velo_tee"
  | "exit_velo_live"
  | "bat_speed"
  | "home_to_first"
  | "throw_velo_of"
  | "throw_velo_if"
  | "fb_velo"
  | "pop_time"
  | "sixty_yd";

export interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
  /** Lower is better for time metrics. */
  lowerIsBetter?: boolean;
  cls: MetricClass;
  /** Sport scope. */
  sports: Array<"baseball" | "softball" | "both">;
  /** Suggested re-test cadence days. */
  cadenceDays: number;
  short?: string;
}

export const METRICS: MetricDef[] = [
  {
    key: "exit_velo_tee",
    label: "Exit velocity (tee)",
    short: "EV tee",
    unit: "mph",
    cls: "measurable",
    sports: ["both"],
    cadenceDays: 21,
  },
  {
    key: "exit_velo_live",
    label: "Exit velocity (live)",
    short: "EV live",
    unit: "mph",
    cls: "measurable",
    sports: ["both"],
    cadenceDays: 30,
  },
  {
    key: "bat_speed",
    label: "Bat speed",
    unit: "mph",
    cls: "measurable",
    sports: ["both"],
    cadenceDays: 30,
  },
  {
    key: "home_to_first",
    label: "Home to first",
    short: "H→1",
    unit: "s",
    cls: "measurable",
    sports: ["both"],
    cadenceDays: 30,
    lowerIsBetter: true,
  },
  {
    key: "throw_velo_of",
    label: "Outfield throw velo",
    short: "OF velo",
    unit: "mph",
    cls: "measurable",
    sports: ["both"],
    cadenceDays: 30,
  },
  {
    key: "throw_velo_if",
    label: "Infield throw velo",
    short: "IF velo",
    unit: "mph",
    cls: "measurable",
    sports: ["both"],
    cadenceDays: 30,
  },
  {
    key: "fb_velo",
    label: "Fastball velo",
    short: "FB",
    unit: "mph",
    cls: "measurable",
    sports: ["both"],
    cadenceDays: 21,
  },
  {
    key: "pop_time",
    label: "Catcher pop time",
    short: "Pop",
    unit: "s",
    cls: "measurable",
    sports: ["both"],
    cadenceDays: 30,
    lowerIsBetter: true,
  },
  {
    key: "sixty_yd",
    label: "60-yard dash",
    short: "60yd",
    unit: "s",
    cls: "measurable",
    sports: ["baseball"],
    cadenceDays: 60,
    lowerIsBetter: true,
  },
];

export function metricByKey(key: string): MetricDef | undefined {
  return METRICS.find((m) => m.key === key);
}

// Tier thresholds. Per Player Dev Metric Schema (🟡 directional). Each row =
// the upper bound of [developing, on-track, advanced]. Anything above is elite.
// For lower-is-better the meaning flips (developing > on-track > ...).
export type Tier = "developing" | "on-track" | "advanced" | "elite";

type TierTable = Record<string, [number, number, number]>;

export const TIERS: Partial<Record<MetricKey, TierTable>> = {
  exit_velo_tee: {
    "6-8": [40, 48, 55],
    "9-12": [58, 68, 76],
    "13-15": [68, 80, 90],
    "16+": [85, 95, 102],
  },
  fb_velo: {
    "6-8": [40, 48, 55],
    "9-12": [55, 65, 72],
    "13-15": [70, 80, 87],
    "16+": [82, 88, 92],
  },
  throw_velo_of: {
    "6-8": [35, 45, 55],
    "9-12": [55, 65, 73],
    "13-15": [68, 78, 86],
    "16+": [78, 86, 92],
  },
  throw_velo_if: {
    "6-8": [35, 45, 53],
    "9-12": [50, 60, 68],
    "13-15": [65, 75, 82],
    "16+": [75, 82, 88],
  },
  home_to_first: {
    // higher number = worse for time
    "6-8": [5.4, 5.0, 4.7],
    "9-12": [4.8, 4.5, 4.3],
    "13-15": [4.6, 4.4, 4.2],
    "16+": [4.4, 4.2, 4.0],
  },
  sixty_yd: {
    "6-8": [9.5, 8.8, 8.2],
    "9-12": [8.5, 8.0, 7.5],
    "13-15": [7.8, 7.4, 7.0],
    "16+": [7.4, 7.0, 6.7],
  },
  pop_time: {
    "6-8": [3.4, 3.1, 2.9],
    "9-12": [3.0, 2.8, 2.5],
    "13-15": [2.6, 2.4, 2.2],
    "16+": [2.4, 2.2, 2.0],
  },
};

export function tierFor(
  metricKey: string,
  ageBand: string,
  value: number,
): Tier | null {
  const table = TIERS[metricKey as MetricKey];
  if (!table) return null;
  const row = table[ageBand];
  if (!row) return null;
  const def = metricByKey(metricKey);
  const lower = def?.lowerIsBetter;
  const [a, b, c] = row;
  if (lower) {
    if (value > a) return "developing";
    if (value > b) return "on-track";
    if (value > c) return "advanced";
    return "elite";
  }
  if (value < a) return "developing";
  if (value < b) return "on-track";
  if (value < c) return "advanced";
  return "elite";
}

export const TIER_BADGE: Record<Tier, string> = {
  developing: "badge-warn",
  "on-track": "badge-info",
  advanced: "badge-ok",
  elite: "badge-ok",
};

export const VERIFICATION_LABEL: Record<string, { label: string; cls: string; rank: number }> = {
  self_entered: { label: "Self", cls: "badge-warn", rank: 1 },
  video_attached: { label: "Video", cls: "badge-info", rank: 2 },
  device_captured: { label: "Device", cls: "badge-info", rank: 3 },
  coach_verified: { label: "Coach", cls: "badge-ok", rank: 4 },
  facility_verified: { label: "Facility", cls: "badge-ok", rank: 5 },
  event_verified: { label: "Event", cls: "badge-ok", rank: 6 },
};
