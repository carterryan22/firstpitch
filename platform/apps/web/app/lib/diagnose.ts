// Bridge between the platform's stored metric entries and the diagnosis engine.
// The diagnosis engine speaks its own metric keys (EV_TEE, HOME_TO_FIRST, ...);
// our storage uses snake_case keys (exit_velo_tee, home_to_first, ...). This
// helper translates and assembles expected ranges from the existing age-band
// TIERS table so a coach can run diagnose() without re-keying anything.

import { diagnose, type DiagnoseResult, type MetricEntry, type VerificationLevel } from "@platform/diagnosis";
import type { MetricEntryRecord } from "@platform/storage";
import { TIERS, metricByKey, type MetricKey } from "./metrics";

/** Storage key → engine key. Only metrics we currently capture are mapped. */
const STORAGE_TO_DRIVER: Partial<Record<MetricKey, string>> = {
  exit_velo_tee: "EV_TEE",
  exit_velo_live: "EV_FRONT_TOSS",
  bat_speed: "BAT_SPEED",
  home_to_first: "HOME_TO_FIRST",
  pop_time: "POP_TIME",
};

const DRIVER_TO_STORAGE: Record<string, MetricKey> = Object.fromEntries(
  Object.entries(STORAGE_TO_DRIVER).map(([k, v]) => [v, k as MetricKey]),
) as Record<string, MetricKey>;

/** Outcome metric options the UI should expose for this player. */
export function diagnosableOutcomes(): Array<{ driverKey: string; label: string }> {
  return [
    { driverKey: "EV_TEE", label: "Tee exit velocity" },
    { driverKey: "EV_FRONT_TOSS", label: "Live exit velocity" },
    { driverKey: "HOME_TO_FIRST", label: "Home-to-first time" },
    { driverKey: "POP_TIME", label: "Catcher pop time" },
  ];
}

/**
 * Build a DiagnoseResult from the player's stored entries.
 * `expectedRanges` are derived from the age-band TIERS table: the "on-track"
 * threshold becomes the floor (or ceiling for lower-is-better metrics).
 */
export function diagnosePlayer(opts: {
  outcomeDriverKey: string;
  ageBand: string;
  entries: MetricEntryRecord[];
  minVerification?: VerificationLevel;
}): DiagnoseResult {
  const { outcomeDriverKey, ageBand, entries, minVerification } = opts;

  // Translate storage entries to engine entries (only those with a mapping).
  const engineEntries: MetricEntry[] = entries
    .map((e) => {
      const driverKey = STORAGE_TO_DRIVER[e.metricKey as MetricKey];
      if (!driverKey) return null;
      return {
        metricKey: driverKey,
        value: e.value,
        recordedAt: new Date(e.recordedAt),
        verification: e.verificationState as VerificationLevel,
      } satisfies MetricEntry;
    })
    .filter((x): x is MetricEntry => x !== null);

  // Build expected ranges from TIERS using the on-track band as the floor/ceiling.
  const expectedRanges = Object.entries(DRIVER_TO_STORAGE).flatMap(([driverKey, storageKey]) => {
    const table = TIERS[storageKey];
    if (!table) return [];
    const row = table[ageBand];
    if (!row) return [];
    const def = metricByKey(storageKey);
    const [, onTrack] = row;
    if (def?.lowerIsBetter) {
      return [{ metricKey: driverKey, min: 0, max: onTrack }];
    }
    return [{ metricKey: driverKey, min: onTrack, max: Number.POSITIVE_INFINITY }];
  });

  return diagnose({
    outcomeMetric: outcomeDriverKey,
    entries: engineEntries,
    expectedRanges,
    minVerification: minVerification ?? "self_entered",
  });
}
