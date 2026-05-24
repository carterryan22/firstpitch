// Soft-policy defaults that complement Tier 1 rules. Tunable per-org later.

export const policy = {
  /** Warn if a plan would push the player above this fraction of daily max. */
  pitchDailySoftCapFraction: 0.8,
  /** Soft cap on rolling 7-day pitch counts (cumulative, warn-and-label). */
  rollingWeekSoftCap: 200,
  /** Max consecutive throwing days before recovery is forced. */
  maxContinuousThrowingDays: 4,
  /** Catcher innings on a day that block same-day pitching. */
  catcherInningsBlocksPitchingAt: 3,
  /** Heat-index °F at or above which the heat-day workflow auto-triggers. */
  heatIndexThresholdF: 85,
  /** Hydration deficit % above which we hard-warn. */
  hydrationDeficitWarnPct: 2,
} as const;

export type Policy = typeof policy;
