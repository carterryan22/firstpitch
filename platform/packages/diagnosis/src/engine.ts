import { DRIVERS, driversForOutcome, type Driver, type VerificationLevel } from "./driverCatalog";

export interface MetricEntry {
  metricKey: string;
  value: number;
  recordedAt: Date;
  verification: VerificationLevel;
}

export interface ExpectedRange {
  metricKey: string;
  min: number;
  max: number;
}

export interface DiagnosisInput {
  outcomeMetric: string;
  entries: MetricEntry[];
  /** Age-band-appropriate expected ranges. Caller supplies, engine doesn't guess. */
  expectedRanges: ExpectedRange[];
  /** Minimum verification level to count an entry. */
  minVerification?: VerificationLevel;
}

const LEVEL_RANK: Record<VerificationLevel, number> = {
  self_entered: 0,
  video_attached: 1,
  device_captured: 2,
  coach_verified: 3,
  facility_verified: 4,
  event_verified: 5,
};

export interface Diagnosis {
  outcomeMetric: string;
  driver: Driver;
  confidence: "low" | "medium" | "high";
  evidence: Array<{ metricKey: string; value: number; expected: ExpectedRange; verification: VerificationLevel }>;
  recommendedDrillIds: string[];
  rationale: string;
}

export interface DiagnoseResult {
  diagnoses: Diagnosis[];
  /** Reasons we couldn't produce a diagnosis (helps UI explain "need more data"). */
  insufficientData: string[];
}

/** Pure diagnosis function. Returns empty if no verified evidence supports any driver. */
export function diagnose(input: DiagnosisInput): DiagnoseResult {
  const min = input.minVerification ?? "coach_verified";
  const minRank = LEVEL_RANK[min];

  const verified = input.entries.filter((e) => LEVEL_RANK[e.verification] >= minRank);
  const rangesByKey = new Map(input.expectedRanges.map((r) => [r.metricKey, r] as const));

  const candidates = driversForOutcome(input.outcomeMetric);
  if (candidates.length === 0) {
    return { diagnoses: [], insufficientData: [`No drivers registered for outcome ${input.outcomeMetric}`] };
  }

  const insufficient: string[] = [];
  const diagnoses: Diagnosis[] = [];

  for (const driver of candidates) {
    const evidence: Diagnosis["evidence"] = [];
    let triggered = 0;
    let missingIndicators = 0;
    for (const ind of driver.indicators) {
      const entry = latest(verified, ind.metricKey);
      const range = rangesByKey.get(ind.metricKey);
      if (!entry || !range) {
        missingIndicators++;
        continue;
      }
      const isBelow = entry.value < range.min;
      const isAbove = entry.value > range.max;
      const fires = (ind.when === "below" && isBelow) || (ind.when === "above" && isAbove);
      if (fires) {
        triggered++;
        evidence.push({ metricKey: ind.metricKey, value: entry.value, expected: range, verification: entry.verification });
      }
    }

    if (triggered === 0) continue;

    const totalIndicators = driver.indicators.length;
    const coverage = (totalIndicators - missingIndicators) / totalIndicators;
    const fireRate = triggered / totalIndicators;
    const topLevel = Math.max(...evidence.map((e) => LEVEL_RANK[e.verification]));
    const confidence: Diagnosis["confidence"] =
      fireRate >= 0.75 && topLevel >= LEVEL_RANK.coach_verified && coverage >= 0.75
        ? "high"
        : fireRate >= 0.5
        ? "medium"
        : "low";

    diagnoses.push({
      outcomeMetric: input.outcomeMetric,
      driver,
      confidence,
      evidence,
      recommendedDrillIds: driver.recommendedDrillIds,
      rationale:
        `Driver '${driver.label}' fired on ${triggered}/${totalIndicators} indicator(s). ` +
        evidence.map((e) => `${e.metricKey}=${e.value} (expected ${e.expected.min}-${e.expected.max})`).join("; "),
    });
  }

  if (diagnoses.length === 0) {
    insufficient.push(
      `No driver triggered for ${input.outcomeMetric} at verification ≥ ${min}. ` +
        "Collect more verified entries or lower the verification floor."
    );
  }

  // Sort: high → medium → low; then by triggered count
  const order: Record<Diagnosis["confidence"], number> = { high: 3, medium: 2, low: 1 };
  diagnoses.sort((a, b) => order[b.confidence] - order[a.confidence] || b.evidence.length - a.evidence.length);

  return { diagnoses, insufficientData: insufficient };
}

function latest(entries: MetricEntry[], key: string): MetricEntry | undefined {
  return entries
    .filter((e) => e.metricKey === key)
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0];
}

/** Convenience: enumerate every outcome metric that has drivers. */
export function knownOutcomeMetrics(): string[] {
  return Array.from(new Set(DRIVERS.map((d) => d.outcomeMetric)));
}
