// E13.1, E13.4 — season-aware workload accounting (multi-day pitcher + catcher carryover).

import { getPitchTableForAge, type PitchSmartAgeTable } from "@platform/corpus";

export type SeasonState = "preseason" | "in_season" | "tournament" | "postseason" | "offseason";

export interface DayLoad {
  date: string; // YYYY-MM-DD
  pitches: number;
  catcherInnings: number;
  highIntensityThrows: number;
}

export interface WorkloadBudget {
  age: number;
  history: DayLoad[];
  /** Today's planned outing details. */
  planned: { pitches: number; catcherInnings: number };
  season: SeasonState;
}

export interface BudgetResult {
  withinBudget: boolean;
  reasons: string[];
  recommendations: string[];
  /** Rolling 7-day pitch sum including planned. */
  rollingWeekPitches: number;
  /** Acute:chronic workload ratio (7d : 28d). */
  acuteChronicRatio: number;
}

const SEASON_SOFT_CAPS: Record<SeasonState, number> = {
  preseason: 150,
  in_season: 220,
  tournament: 250,
  postseason: 200,
  offseason: 80,
};

function sumPitches(history: DayLoad[], from: Date, to: Date): number {
  return history
    .filter((d) => {
      const x = new Date(d.date + "T00:00:00Z");
      return x >= from && x <= to;
    })
    .reduce((s, d) => s + d.pitches, 0);
}

export function evaluateWorkload(input: WorkloadBudget): BudgetResult {
  const today = new Date();
  const sevenAgo = new Date(today);
  sevenAgo.setUTCDate(sevenAgo.getUTCDate() - 7);
  const twentyEightAgo = new Date(today);
  twentyEightAgo.setUTCDate(twentyEightAgo.getUTCDate() - 28);

  const rollingWeekPitches = sumPitches(input.history, sevenAgo, today) + input.planned.pitches;
  const month = sumPitches(input.history, twentyEightAgo, today) + input.planned.pitches;
  const chronicAvgWeek = month / 4;
  const acuteChronicRatio = chronicAvgWeek > 0 ? rollingWeekPitches / chronicAvgWeek : 0;

  const reasons: string[] = [];
  const recommendations: string[] = [];

  const seasonCap = SEASON_SOFT_CAPS[input.season];
  if (rollingWeekPitches > seasonCap) {
    reasons.push(`Rolling 7-day pitches ${rollingWeekPitches} exceeds ${input.season} cap ${seasonCap}.`);
    recommendations.push("Skip the pitching block today; schedule a recovery day.");
  }

  if (acuteChronicRatio > 1.5 && chronicAvgWeek > 50) {
    reasons.push(
      `Acute:chronic workload ratio ${acuteChronicRatio.toFixed(2)} exceeds 1.5 — spike risk.`
    );
    recommendations.push("Reduce week's planned volume by 30%.");
  }

  // Catcher → pitcher same-day carryover (handled also in pitchSmart canPitchToday;
  // here we surface forward-looking catcher load on the planned day).
  if (input.planned.catcherInnings >= 3 && input.planned.pitches > 0) {
    reasons.push(
      `Player is planned to catch ${input.planned.catcherInnings} innings AND pitch — Pitch Smart blocks combined load.`
    );
    recommendations.push("Pick one role today; the other is auto-blocked.");
  }

  // Age table sanity
  const table: PitchSmartAgeTable | undefined = getPitchTableForAge(input.age);
  if (table && input.planned.pitches > table.daily_max_pitches) {
    reasons.push(
      `Planned ${input.planned.pitches} pitches exceeds age ${input.age} daily max ${table.daily_max_pitches}.`
    );
  }

  return {
    withinBudget: reasons.length === 0,
    reasons,
    recommendations,
    rollingWeekPitches,
    acuteChronicRatio: Number(acuteChronicRatio.toFixed(2)),
  };
}
