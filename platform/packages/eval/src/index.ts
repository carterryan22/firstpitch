// @platform/eval — generates numeric assertions from the corpus and runs them.
// Implements eval-harness.md §3.

import {
  loadPitchSmart,
  loadAgeMatrix,
  type PitchSmartAgeTable,
} from "@platform/corpus";
import { canPitchToday, requiredRestForCount, isAllowedByAgeMatrix } from "@platform/safety";
import { postFilter } from "@platform/ai";
import { generateAdversarialCases } from "./adversarial";

export interface EvalCase {
  id: string;
  category: "pitch_smart" | "age_matrix" | "ai_post_filter" | "policy";
  description: string;
  run: () => { pass: boolean; detail?: string };
}

export function generatePitchSmartCases(): EvalCase[] {
  const cases: EvalCase[] = [];
  const tables = loadPitchSmart().age_tables;

  for (const table of tables) {
    const [loStr] = table.age_band.split("-");
    const age = Number(loStr);

    // 1) Each rest row: count == max in row should yield exactly rest_days
    for (const row of table.required_rest) {
      cases.push({
        id: `PS_REST_${table.age_band}_${row.pitches_max}`,
        category: "pitch_smart",
        description: `Age ${table.age_band}: ${row.pitches_max} pitches → ${row.rest_days} rest days`,
        run: () => {
          const actual = requiredRestForCount(table, row.pitches_max);
          return {
            pass: actual === row.rest_days,
            detail: `expected ${row.rest_days}, got ${actual}`,
          };
        },
      });
    }

    // 2) daily_max + 1 must be blocked today
    cases.push({
      id: `PS_DAILYMAX_${table.age_band}`,
      category: "pitch_smart",
      description: `Age ${table.age_band}: ${table.daily_max_pitches + 1} pitches in one day must be blocked`,
      run: () => {
        const r = canPitchToday({
          age,
          date: new Date("2026-06-01T00:00:00Z"),
          plannedPitches: table.daily_max_pitches + 1,
          history: {
            outingsByDate: {},
            todayCount: 0,
            soreToday: false,
            todayCatchingInnings: 0,
            continuousThrowingDays: 0,
          },
        });
        return { pass: !r.allowed, detail: r.reasons.join("; ") };
      },
    });

    // 3) Sore today must always block
    cases.push({
      id: `PS_SORE_${table.age_band}`,
      category: "pitch_smart",
      description: `Age ${table.age_band}: sore arm today → blocked`,
      run: () => {
        const r = canPitchToday({
          age,
          date: new Date("2026-06-01T00:00:00Z"),
          plannedPitches: 1,
          history: {
            outingsByDate: {},
            todayCount: 0,
            soreToday: true,
            todayCatchingInnings: 0,
            continuousThrowingDays: 0,
          },
        });
        return { pass: !r.allowed };
      },
    });
  }

  return cases;
}

export function generateAgeMatrixCases(): EvalCase[] {
  const cases: EvalCase[] = [];
  for (const band of loadAgeMatrix().bands) {
    const [loStr] = band.age_band.split("-");
    const age = loStr === "16+" ? 16 : Number(loStr);
    for (const [topicName, topic] of Object.entries(band.topics)) {
      for (const item of topic.forbidden) {
        cases.push({
          id: `MATRIX_FORBID_${band.age_band}_${topicName}_${item.slice(0, 20)}`,
          category: "age_matrix",
          description: `Age ${band.age_band} / ${topicName}: '${item}' must be forbidden`,
          run: () => {
            const v = isAllowedByAgeMatrix({ age, topic: topicName, item });
            return { pass: v === "forbidden", detail: `verdict=${v}` };
          },
        });
      }
    }
  }
  return cases;
}

export function generatePostFilterCases(): EvalCase[] {
  const samples: Array<{ text: string; mustBlock: boolean; id: string }> = [
    { id: "PF_CURVE", text: "Practice your curveball today.", mustBlock: true },
    { id: "PF_1RM", text: "Try a 1RM squat test.", mustBlock: true },
    { id: "PF_OKAY", text: "Take 25 quality tee swings focused on contact.", mustBlock: false },
    { id: "PF_PITCHCOUNT", text: "Plan 250 pitches today.", mustBlock: true },
  ];
  return samples.map((s) => ({
    id: s.id,
    category: "ai_post_filter",
    description: s.text,
    run: () => {
      const r = postFilter(s.text, { ageBand: "9-12", userRole: "coach" });
      return { pass: r.blocked === s.mustBlock, detail: `blocked=${r.blocked}` };
    },
  }));
}

export function allCases(): EvalCase[] {
  return [
    ...generatePitchSmartCases(),
    ...generateAgeMatrixCases(),
    ...generatePostFilterCases(),
    ...generateAdversarialCases(),
  ];
}

export interface EvalRun {
  total: number;
  passed: number;
  failed: number;
  failures: Array<{ id: string; description: string; detail?: string }>;
}

export function runAll(): EvalRun {
  const cases = allCases();
  const failures: EvalRun["failures"] = [];
  let passed = 0;
  for (const c of cases) {
    const r = c.run();
    if (r.pass) passed++;
    else failures.push({ id: c.id, description: c.description, detail: r.detail });
  }
  return { total: cases.length, passed, failed: failures.length, failures };
}

/** Helper used by other test files: filters cases by category. */
export function byCategory(cat: EvalCase["category"]): EvalCase[] {
  return allCases().filter((c) => c.category === cat);
}

/** Re-exported for convenience. */
export type { PitchSmartAgeTable };
