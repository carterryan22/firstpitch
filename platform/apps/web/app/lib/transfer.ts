/**
 * Transfer Score — the "is practice showing up in games?" engine (§15.5–§15.8
 * of player-development-metric-schema.md). Pure functions, no I/O. Tested under
 * `apps/web/app/lib/transfer.test.ts`.
 *
 * Given a training-block window (start/end dates) and a player's per-game
 * stats, we split games into a pre-window (before the block) and a post-window
 * (during/after the block), aggregate the role-appropriate game metrics for
 * each window, and report:
 *   - per-metric pre→post deltas (with which direction is "better"),
 *   - a calibrated confidence tier from the post-window sample size,
 *   - a single plain-English interpretation insight, role-scaled for
 *     coach / parent / kid audiences.
 *
 * We never draw a conclusion from one game: small samples are surfaced as
 * "insufficient" with a concrete "need ~N more" message.
 */

import type {
  PlayerGameBattingStats,
  PlayerGameFieldingStats,
  PlayerGamePitchingStats,
} from "@platform/storage";

export type TransferRole = "hitting" | "pitching" | "fielding";

export type TransferConfidence = "low" | "medium" | "strong" | "very_strong";

export type TransferResult =
  | "strong" // practice ↑ + game ↑ (sufficient sample)
  | "practice_only" // practice ↑ + game flat
  | "game_only" // game ↑ + practice flat
  | "improving" // game ↑, practice trend unknown
  | "flat" // game flat/declined
  | "insufficient"; // not enough game data to judge

/** One per-game slice of stats with the date the game was played. */
export interface TransferGame {
  /** ISO date (or datetime) the game was played. */
  date: string;
  batting?: PlayerGameBattingStats;
  pitching?: PlayerGamePitchingStats;
  fielding?: PlayerGameFieldingStats[];
}

export interface TransferMetricDelta {
  key: string;
  label: string;
  pre: number;
  post: number;
  /** post - pre. */
  delta: number;
  /** Which direction counts as improvement for this metric. */
  better: "up" | "down";
  improved: boolean;
  format: "pct" | "rate3";
}

export interface TransferWindow {
  games: number;
  /** Role-appropriate sample unit: PA (hitting), BF (pitching), chances (fielding). */
  sample: number;
  sampleLabel: string;
}

export interface TransferAnalysis {
  role: TransferRole;
  pre: TransferWindow;
  post: TransferWindow;
  metrics: TransferMetricDelta[];
  confidence: TransferConfidence;
  confidenceReason: string;
  result: TransferResult;
  /** Coach-facing one-liner. */
  insight: string;
  /** Plain-language, no stat dump. */
  parentInsight: string;
  /** Motivational, no scary percentages. */
  kidInsight: string;
}

export interface AnalyzeTransferInput {
  role: TransferRole;
  /** ISO date — inclusive start of the training block. */
  blockStart: string;
  /** ISO date — inclusive end of the training block. */
  blockEnd: string;
  games: TransferGame[];
  /**
   * Optional practice-side signal: did the player's practice metric improve
   * over the block? When provided it sharpens the interpretation per §15.7.
   */
  practiceImproved?: boolean;
  /** Player display name for the role-scaled copy. Defaults to "This player". */
  playerName?: string;
}

function num(n: number | undefined): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function round1pct(n: number): number {
  return Math.round(n * 1000) / 10; // ratio → percentage with 1 decimal
}

/** Day key (YYYY-MM-DD) so time-of-day and TZ noise don't split a day. */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

// ── batting aggregation ──────────────────────────────────────────────────────

interface BattingAgg {
  pa: number;
  ab: number;
  h: number;
  bb: number;
  so: number;
  hbp: number;
  qab: number;
  tb: number;
}

function aggBatting(games: TransferGame[]): BattingAgg {
  const a: BattingAgg = { pa: 0, ab: 0, h: 0, bb: 0, so: 0, hbp: 0, qab: 0, tb: 0 };
  for (const g of games) {
    const b = g.batting;
    if (!b) continue;
    const ab = num(b.ab);
    const bb = num(b.bb);
    const hbp = num(b.hbp);
    const sac = num(b.sac);
    const sf = num(b.sf);
    a.pa += num(b.pa) || ab + bb + hbp + sac + sf;
    a.ab += ab;
    a.h += num(b.h);
    a.bb += bb;
    a.so += num(b.so);
    a.hbp += hbp;
    a.qab += num(b.qab);
    const singles = num(b["1b"]) || Math.max(0, num(b.h) - num(b["2b"]) - num(b["3b"]) - num(b.hr));
    a.tb += singles + 2 * num(b["2b"]) + 3 * num(b["3b"]) + 4 * num(b.hr);
  }
  return a;
}

function battingMetrics(pre: BattingAgg, post: BattingAgg): TransferMetricDelta[] {
  const obp = (x: BattingAgg) => (x.pa > 0 ? (x.h + x.bb + x.hbp) / x.pa : 0);
  const kPct = (x: BattingAgg) => (x.pa > 0 ? x.so / x.pa : 0);
  const qabPct = (x: BattingAgg) => (x.pa > 0 ? x.qab / x.pa : 0);
  const bbPct = (x: BattingAgg) => (x.pa > 0 ? x.bb / x.pa : 0);
  const slg = (x: BattingAgg) => (x.ab > 0 ? x.tb / x.ab : 0);
  return [
    metric("qab", "QAB%", qabPct(pre), qabPct(post), "up", "pct"),
    metric("k", "K%", kPct(pre), kPct(post), "down", "pct"),
    metric("bb", "BB%", bbPct(pre), bbPct(post), "up", "pct"),
    metric("obp", "OBP", obp(pre), obp(post), "up", "rate3"),
    metric("slg", "SLG", slg(pre), slg(post), "up", "rate3"),
  ];
}

// ── pitching aggregation ─────────────────────────────────────────────────────

interface PitchingAgg {
  bf: number;
  pitches: number;
  strikes: number;
  bb: number;
  so: number;
  h: number;
  ip: number;
}

function aggPitching(games: TransferGame[]): PitchingAgg {
  const a: PitchingAgg = { bf: 0, pitches: 0, strikes: 0, bb: 0, so: 0, h: 0, ip: 0 };
  for (const g of games) {
    const p = g.pitching;
    if (!p) continue;
    const ip = num(p.ip);
    a.ip += ip;
    a.bf += num(p.bf) || Math.round(ip * 4.3);
    a.pitches += num(p.pitches);
    a.strikes += num(p.strikes);
    a.bb += num(p.bb);
    a.so += num(p.so);
    a.h += num(p.h);
  }
  return a;
}

function pitchingMetrics(pre: PitchingAgg, post: PitchingAgg): TransferMetricDelta[] {
  const strikePct = (x: PitchingAgg) => (x.pitches > 0 ? x.strikes / x.pitches : 0);
  const bbRate = (x: PitchingAgg) => (x.bf > 0 ? x.bb / x.bf : 0);
  const kRate = (x: PitchingAgg) => (x.bf > 0 ? x.so / x.bf : 0);
  const whip = (x: PitchingAgg) => (x.ip > 0 ? (x.bb + x.h) / x.ip : 0);
  return [
    metric("strike", "Strike%", strikePct(pre), strikePct(post), "up", "pct"),
    metric("bb", "BB rate", bbRate(pre), bbRate(post), "down", "pct"),
    metric("k", "K rate", kRate(pre), kRate(post), "up", "pct"),
    metric("whip", "WHIP", whip(pre), whip(post), "down", "rate3"),
  ];
}

// ── fielding aggregation ─────────────────────────────────────────────────────

interface FieldingAgg {
  chances: number;
  e: number;
  po: number;
  a: number;
  cs: number;
  sbAgainst: number;
}

function aggFielding(games: TransferGame[]): FieldingAgg {
  const f: FieldingAgg = { chances: 0, e: 0, po: 0, a: 0, cs: 0, sbAgainst: 0 };
  for (const g of games) {
    for (const row of g.fielding ?? []) {
      const po = num(row.po);
      const a = num(row.a);
      const e = num(row.e);
      f.po += po;
      f.a += a;
      f.e += e;
      f.chances += num(row.tc) || po + a + e;
      f.cs += num(row.cs);
      f.sbAgainst += num(row.sbAgainst);
    }
  }
  return f;
}

function fieldingMetrics(pre: FieldingAgg, post: FieldingAgg): TransferMetricDelta[] {
  const fpct = (x: FieldingAgg) => (x.chances > 0 ? (x.po + x.a) / x.chances : 0);
  const csPct = (x: FieldingAgg) => {
    const att = x.cs + x.sbAgainst;
    return att > 0 ? x.cs / att : 0;
  };
  const metrics = [metric("fpct", "Fielding%", fpct(pre), fpct(post), "up", "rate3")];
  // Only surface caught-stealing transfer when there were stolen-base attempts.
  if (pre.cs + pre.sbAgainst > 0 || post.cs + post.sbAgainst > 0) {
    metrics.push(metric("cs", "CS%", csPct(pre), csPct(post), "up", "pct"));
  }
  return metrics;
}

function metric(
  key: string,
  label: string,
  pre: number,
  post: number,
  better: "up" | "down",
  format: "pct" | "rate3",
): TransferMetricDelta {
  const p = format === "pct" ? round1pct(pre) : round3(pre);
  const q = format === "pct" ? round1pct(post) : round3(post);
  const delta = Math.round((q - p) * 1000) / 1000;
  const improved = better === "up" ? delta > 0 : delta < 0;
  return { key, label, pre: p, post: q, delta, better, improved, format };
}

// ── confidence ───────────────────────────────────────────────────────────────

/** Calibrated post-window confidence tiers from §15.5. */
function confidenceFor(role: TransferRole, games: number, sample: number): TransferConfidence {
  if (role === "hitting") {
    if (games >= 10 && sample >= 25) return "very_strong";
    if (games >= 6 && sample >= 15) return "strong";
    if (games >= 3 && sample >= 8) return "medium";
    return "low";
  }
  if (role === "pitching") {
    if (sample >= 75) return "very_strong";
    if (sample >= 40) return "strong";
    if (sample >= 20) return "medium";
    return "low";
  }
  // fielding — sample = chances
  if (sample >= 12) return "strong";
  if (sample >= 5) return "medium";
  return "low";
}

/** How many more sample units are needed to reach the next meaningful tier. */
function moreNeeded(role: TransferRole, sample: number): { unit: string; need: number } {
  if (role === "hitting") return { unit: "PA", need: Math.max(1, 15 - sample) };
  if (role === "pitching") return { unit: "batters faced", need: Math.max(1, 20 - sample) };
  return { unit: "chances", need: Math.max(1, 5 - sample) };
}

function sampleLabel(role: TransferRole, n: number): string {
  if (role === "hitting") return `${n} PA`;
  if (role === "pitching") return `${n} BF`;
  return `${n} chances`;
}

// ── main ─────────────────────────────────────────────────────────────────────

export function analyzeTransfer(input: AnalyzeTransferInput): TransferAnalysis {
  const { role, blockStart, blockEnd } = input;
  const startKey = dayKey(blockStart);
  const endKey = dayKey(blockEnd);
  const name = input.playerName?.trim() || "This player";

  const preGames: TransferGame[] = [];
  const postGames: TransferGame[] = [];
  for (const g of input.games) {
    const k = dayKey(g.date);
    if (k < startKey) preGames.push(g);
    else if (k <= endKey) postGames.push(g);
    // games after the block end are ignored — the block defines the window.
  }

  let metrics: TransferMetricDelta[];
  let preSample: number;
  let postSample: number;
  if (role === "hitting") {
    const pre = aggBatting(preGames);
    const post = aggBatting(postGames);
    metrics = battingMetrics(pre, post);
    preSample = pre.pa;
    postSample = post.pa;
  } else if (role === "pitching") {
    const pre = aggPitching(preGames);
    const post = aggPitching(postGames);
    metrics = pitchingMetrics(pre, post);
    preSample = pre.bf;
    postSample = post.bf;
  } else {
    const pre = aggFielding(preGames);
    const post = aggFielding(postGames);
    metrics = fieldingMetrics(pre, post);
    preSample = pre.chances;
    postSample = post.chances;
  }

  const preWindow: TransferWindow = {
    games: preGames.length,
    sample: preSample,
    sampleLabel: sampleLabel(role, preSample),
  };
  const postWindow: TransferWindow = {
    games: postGames.length,
    sample: postSample,
    sampleLabel: sampleLabel(role, postSample),
  };

  const confidence = confidenceFor(role, postGames.length, postSample);

  // Game direction: count how many primary metrics improved vs regressed.
  const improvedCount = metrics.filter((m) => m.improved && m.delta !== 0).length;
  const regressedCount = metrics.filter((m) => !m.improved && m.delta !== 0).length;
  const gameImproved = improvedCount > regressedCount;

  // Build result + insights.
  const headline = metrics.find((m) => m.improved && m.delta !== 0) ?? metrics[0];
  const { result, insight, parentInsight, kidInsight, confidenceReason } = interpret({
    role,
    name,
    confidence,
    postWindow,
    gameImproved,
    practiceImproved: input.practiceImproved,
    headline,
  });

  return {
    role,
    pre: preWindow,
    post: postWindow,
    metrics,
    confidence,
    confidenceReason,
    result,
    insight,
    parentInsight,
    kidInsight,
  };
}

function fmtMetric(m: TransferMetricDelta | undefined): string {
  if (!m) return "";
  const fmt = (v: number) => (m.format === "pct" ? `${v}%` : v.toFixed(3).replace(/^0/, ""));
  const arrow = m.delta > 0 ? "↑" : m.delta < 0 ? "↓" : "→";
  return `${m.label} ${fmt(m.pre)}→${fmt(m.post)} ${arrow}`;
}

const CONFIDENCE_LABEL: Record<TransferConfidence, string> = {
  low: "low",
  medium: "medium",
  strong: "strong",
  very_strong: "very strong",
};

function interpret(args: {
  role: TransferRole;
  name: string;
  confidence: TransferConfidence;
  postWindow: TransferWindow;
  gameImproved: boolean;
  practiceImproved?: boolean;
  headline: TransferMetricDelta | undefined;
}): {
  result: TransferResult;
  insight: string;
  parentInsight: string;
  kidInsight: string;
  confidenceReason: string;
} {
  const { role, name, confidence, postWindow, gameImproved, practiceImproved, headline } = args;
  const conf = CONFIDENCE_LABEL[confidence];
  const confidenceReason = `${conf} confidence · ${postWindow.games} ${
    postWindow.games === 1 ? "game" : "games"
  }, ${postWindow.sampleLabel} in the post-block window`;

  // Insufficient sample — never conclude.
  if (confidence === "low") {
    const { unit, need } = moreNeeded(role, postWindow.sample);
    return {
      result: "insufficient",
      insight: `Not enough game data yet — need ~${need} more ${unit} before we can judge transfer.`,
      parentInsight: `We need a few more games before we can tell if ${name}'s training is showing up. Keep tracking — about ${need} more ${unit} should do it.`,
      kidInsight: `Keep logging your games! A few more and we'll see your training pay off. 💪`,
      confidenceReason,
    };
  }

  const head = fmtMetric(headline);

  if (gameImproved && practiceImproved === true) {
    return {
      result: "strong",
      insight: `Strong transfer: practice gains are showing up in games (${head}). Confidence: ${conf}.`,
      parentInsight: `${name}'s work is paying off — it's showing up in real games (${head}). Confidence: ${conf}, over ${postWindow.games} games.`,
      kidInsight: `Your hard work is showing up in games — keep it going! 🔥`,
      confidenceReason,
    };
  }
  if (gameImproved) {
    return {
      result: "game_only",
      insight: `Game numbers are up (${head}) over ${postWindow.games} games. Confidence: ${conf}.`,
      parentInsight: `${name}'s game numbers are trending up (${head}). Could be the training clicking — let's keep tracking to be sure.`,
      kidInsight: `Your game numbers are climbing — nice work! Keep stacking good reps. 📈`,
      confidenceReason,
    };
  }
  if (practiceImproved === true) {
    return {
      result: "practice_only",
      insight: `Practice is improving but it hasn't shown up in games yet — next focus: live timing / pitch-recognition reps.`,
      parentInsight: `${name} is getting better in practice, but it hasn't reached game day yet. That usually means timing or seeing it live — totally normal, we'll bridge it.`,
      kidInsight: `Your practice is looking great — next step is taking it into games. You've got this! 🎯`,
      confidenceReason,
    };
  }
  return {
    result: "flat",
    insight: `Game numbers are flat so far (${head}). Keep tracking — could be small-sample noise or opponent level.`,
    parentInsight: `${name}'s game numbers are about the same so far. That can just be small samples or tough opponents — we'll keep watching.`,
    kidInsight: `Steady as you go — keep showing up and putting in the reps. 🙌`,
    confidenceReason,
  };
}
