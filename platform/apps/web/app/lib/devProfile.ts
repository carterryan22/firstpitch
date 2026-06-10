/**
 * Five-Pillar Development Profile — the "where is this player now?" engine
 * (§5–§6 of the product thesis: the "strong player" model). Pure functions,
 * no I/O. Tested under `apps/web/app/lib/devProfile.test.ts`.
 *
 * A strong youth player is not just the kid with the highest exit velo, so we
 * never reduce a player to one number or a ranking. We score five development
 * pillars from data the platform already captures and render them as a profile
 * shape (radar) + plain-English signals + ONE actionable, position-aware
 * recommendation:
 *
 *   1. Skill          (30%) — sport-specific execution measurables
 *   2. Athleticism    (20%) — raw movement / speed
 *   3. Baseball IQ    (20%) — situational decision signals from games
 *   4. Compete        (15%) — effort: attendance + finished home missions
 *   5. Durability     (15%) — throwing load + readiness (the safety pillar)
 *
 * Honesty rules baked in:
 *   - Every pillar carries a confidence level. Sparse data → low confidence,
 *     surfaced to the coach instead of hidden.
 *   - A pillar with no backing data is `unknown` (never a fake zero "grade").
 *   - Durability is the safety pillar: an injury or Pitch-Smart rest flag
 *     always dominates, and the recommendation leads with the safety note.
 */

import { canPitchToday } from "@platform/safety";
import type {
  GameRecord,
  MetricEntryRecord,
  MissionAssignmentRecord,
  MissionCompletionRecord,
  PlanRecord,
  PlayerGameStatsRecord,
  PlayerRecord,
} from "@platform/storage";
import { metricByKey, tierFor, type MetricKey, type Tier } from "./metrics";
import { ageFromDob } from "./players";

export type Pillar = "skill" | "athleticism" | "baseball_iq" | "compete" | "durability";

export type PillarBand =
  | "unknown"
  | "emerging"
  | "developing"
  | "on_track"
  | "strong"
  | "standout";

export type Confidence = "none" | "low" | "medium" | "high";

/** Durability-only readiness flag (green / yellow / red). */
export type Readiness = "ready" | "monitor" | "rest";

export interface PillarScore {
  pillar: Pillar;
  label: string;
  /** 0–100 normalized strength. `null` when there's no data behind the pillar. */
  score: number | null;
  band: PillarBand;
  confidence: Confidence;
  /** Plain-English signals that fed the pillar (metric short-labels / observations). */
  drivers: string[];
  /** One short signal line, e.g. "Speed trending up" / "Monitor throwing load". */
  note: string;
  /** Durability only: availability status surfaced as a chip. */
  readiness?: Readiness;
}

export interface DevProfileRecommendation {
  /** The single highest-leverage focus, framed positively (never shaming). */
  headline: string;
  /** Concrete, position-aware actions (≤3). */
  actions: string[];
  /** Safety-first note when durability is monitor/rest. Render it FIRST. */
  safetyNote?: string;
}

export interface DevProfile {
  player: string;
  ageBand: string;
  /** Always five pillars, in canonical order. */
  pillars: PillarScore[];
  /** Top strength vs next step, no single number. */
  shapeSummary: string;
  /** Overall confidence caveat sentence. */
  confidenceNote: string;
  recommendation: DevProfileRecommendation;
}

export interface DevProfileInput {
  player: Pick<
    PlayerRecord,
    | "id"
    | "firstName"
    | "lastName"
    | "ageBand"
    | "dob"
    | "canPitch"
    | "canCatch"
    | "injured"
    | "injuryNote"
    | "positions"
    | "positionRatings"
  >;
  /** All metric entries for the player; we take the latest per key. */
  metrics: MetricEntryRecord[];
  /** Per-game box-score stats for the player (Baseball IQ signals). */
  gameStats?: PlayerGameStatsRecord[];
  /** Team games (attendance for Compete + pitch-count load for Durability). */
  games?: GameRecord[];
  /** Practice plans (attendance for Compete). */
  plans?: PlanRecord[];
  /** Coach-issued mission assignments (Compete). */
  missionAssignments?: MissionAssignmentRecord[];
  /** Logged mission completions (Compete, fallback when no assignments). */
  missionCompletions?: MissionCompletionRecord[];
  now?: Date;
}

// ── pillar constants ─────────────────────────────────────────────────────────

export const PILLAR_ORDER: Pillar[] = [
  "skill",
  "athleticism",
  "baseball_iq",
  "compete",
  "durability",
];

export const PILLAR_LABEL: Record<Pillar, string> = {
  skill: "Skill",
  athleticism: "Athleticism",
  baseball_iq: "Baseball IQ",
  compete: "Compete",
  durability: "Durability",
};

/** Thesis weights — used to prioritize the recommendation, never shown as a grade. */
export const PILLAR_WEIGHT: Record<Pillar, number> = {
  skill: 0.3,
  athleticism: 0.2,
  baseball_iq: 0.2,
  compete: 0.15,
  durability: 0.15,
};

/** Sport-specific execution measurables (any present entry counts). */
const SKILL_METRICS: MetricKey[] = [
  "exit_velo_tee",
  "exit_velo_live",
  "bat_speed",
  "throw_velo_of",
  "throw_velo_if",
  "fb_velo",
  "pop_time",
];

/** Raw movement measurables. */
const ATHLETIC_METRICS: MetricKey[] = ["home_to_first", "sixty_yd"];

const TIER_POINTS: Record<Tier, number> = {
  developing: 35,
  "on-track": 60,
  advanced: 80,
  elite: 95,
};

const VERIFIED_STATES = new Set([
  "device_captured",
  "coach_verified",
  "facility_verified",
  "event_verified",
]);

/** High-demand positions for stretch development reps. */
const PREMIUM_POS = ["SS", "CF", "3B", "C", "2B"];
/** Lower-pressure positions for confidence reps. */
const CONFIDENCE_POS = ["1B", "RF", "LF"];

const PILLAR_ACTION: Record<Exclude<Pillar, "durability">, string> = {
  skill:
    "Run a focused skills station (tee/contact + throwing accuracy) and retest the weakest measurable in ~2–3 weeks.",
  athleticism:
    "Add two game-speed baserunning starts each practice; retest home-to-first in two weeks.",
  baseball_iq:
    "Two situational-decision reps each practice (cutoffs, force plays, baserunning reads), then tag them in games.",
  compete:
    "Set one effort goal and celebrate attendance + finished home missions. Keep it fun, never a punishment.",
};

const BAND_LABEL: Record<PillarBand, string> = {
  unknown: "no data yet",
  emerging: "emerging",
  developing: "developing",
  on_track: "on track",
  strong: "strong",
  standout: "standout",
};

export function bandLabel(band: PillarBand): string {
  return BAND_LABEL[band];
}

// ── small helpers ────────────────────────────────────────────────────────────

function num(n: number | undefined): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function round(n: number): number {
  return Math.round(n);
}

function ageBandCenter(band: string): number {
  if (band === "6-8") return 8;
  if (band === "9-12") return 11;
  if (band === "13-15") return 14;
  return 16;
}

function bandFromScore(score: number | null): PillarBand {
  if (score === null) return "unknown";
  if (score >= 85) return "standout";
  if (score >= 68) return "strong";
  if (score >= 50) return "on_track";
  if (score >= 33) return "developing";
  return "emerging";
}

function confFrom(count: number, hasVerified: boolean): Confidence {
  if (count <= 0) return "none";
  if (count === 1) return hasVerified ? "medium" : "low";
  if (count === 2) return hasVerified ? "high" : "medium";
  return "high";
}

const CONF_ORDER: Confidence[] = ["none", "low", "medium", "high"];
function capConf(c: Confidence, cap: Confidence): Confidence {
  return CONF_ORDER.indexOf(c) <= CONF_ORDER.indexOf(cap) ? c : cap;
}

function unknownPillar(pillar: Pillar, note: string): PillarScore {
  return {
    pillar,
    label: PILLAR_LABEL[pillar],
    score: null,
    band: "unknown",
    confidence: "none",
    drivers: [],
    note,
  };
}

/** Latest entry per metric key (entries may arrive unsorted). */
function latestByMetric(entries: MetricEntryRecord[]): Map<string, MetricEntryRecord> {
  const sorted = [...entries].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));
  const map = new Map<string, MetricEntryRecord>();
  for (const e of sorted) if (!map.has(e.metricKey)) map.set(e.metricKey, e);
  return map;
}

// ── per-pillar scorers ───────────────────────────────────────────────────────

function scoreMeasurablePillar(
  pillar: Pillar,
  keys: MetricKey[],
  ageBand: string,
  latest: Map<string, MetricEntryRecord>,
  emptyNote: string,
): PillarScore {
  const points: number[] = [];
  const drivers: string[] = [];
  let verified = false;
  for (const key of keys) {
    const entry = latest.get(key);
    if (!entry) continue;
    const tier = tierFor(key, ageBand, entry.value);
    if (!tier) continue;
    points.push(TIER_POINTS[tier]);
    drivers.push(metricByKey(key)?.short ?? metricByKey(key)?.label ?? key);
    if (VERIFIED_STATES.has(entry.verificationState)) verified = true;
  }
  if (points.length === 0) return unknownPillar(pillar, emptyNote);
  const score = round(clamp(mean(points)));
  const band = bandFromScore(score);
  return {
    pillar,
    label: PILLAR_LABEL[pillar],
    score,
    band,
    confidence: confFrom(points.length, verified),
    drivers,
    note: measurableNote(pillar, band, points.length),
  };
}

function measurableNote(pillar: Pillar, band: PillarBand, count: number): string {
  const tested = `${count} measurable${count === 1 ? "" : "s"} on file`;
  if (band === "standout" || band === "strong")
    return pillar === "athleticism" ? `Clear athletic edge: ${tested}.` : `Real strength: ${tested}.`;
  if (band === "on_track") return `Right on track: ${tested}.`;
  return pillar === "athleticism"
    ? `Speed is the next step: ${tested}.`
    : `Room to grow the skills: ${tested}.`;
}

function scoreBaseballIq(
  gameStats: PlayerGameStatsRecord[] | undefined,
): PillarScore {
  const stats = gameStats ?? [];
  let pa = 0;
  let qab = 0;
  let kLooking = 0;
  let so = 0;
  let dp = 0;
  let chances = 0;
  for (const s of stats) {
    const b = s.batting;
    if (b) {
      pa += num(b.pa);
      qab += num(b.qab);
      kLooking += num(b.kLooking);
      so += num(b.so);
    }
    for (const f of s.fielding ?? []) {
      dp += num(f.dp);
      chances += num(f.tc);
    }
  }
  if (pa < 4 && chances < 6) {
    return unknownPillar(
      "baseball_iq",
      "Tag a few game decisions (quality at-bats, cutoffs, reads) to read this.",
    );
  }

  const hasQab = qab > 0 && pa > 0;
  let score: number;
  const drivers: string[] = [];
  let conf: Confidence;
  if (hasQab) {
    const qabRate = qab / pa;
    score = 30 + qabRate * 85;
    const kRate = pa > 0 ? kLooking / pa : 0;
    score -= Math.min(12, kRate * 40);
    score += Math.min(6, dp * 3);
    drivers.push(`Quality AB ${round(qabRate * 100)}%`);
    if (kLooking > 0) drivers.push(`${kLooking} K looking`);
    conf = capConf(pa >= 12 ? "high" : "medium", "medium");
  } else {
    // Fall back to plate discipline only — weaker signal, lower confidence.
    const kRate = pa > 0 ? so / pa : 0;
    score = 70 - kRate * 60 + Math.min(6, dp * 3);
    drivers.push(pa > 0 ? `Strikeout rate ${round(kRate * 100)}%` : `${dp} double plays`);
    conf = "low";
  }
  score = round(clamp(score));
  const band = bandFromScore(score);
  return {
    pillar: "baseball_iq",
    label: PILLAR_LABEL.baseball_iq,
    score,
    band,
    confidence: conf,
    drivers,
    note:
      conf === "low"
        ? "Best measured with game-decision tags. Add them to sharpen this."
        : band === "strong" || band === "standout"
          ? "Makes good decisions at game speed."
          : "Sharpen reads with situational reps.",
  };
}

function scoreCompete(input: DevProfileInput): PillarScore {
  const pid = input.player.id;
  let present = 0;
  let marks = 0;
  for (const pl of input.plans ?? []) {
    const a = pl.attendance?.[pid];
    if (a === "present") {
      present++;
      marks++;
    } else if (a === "absent") marks++;
  }
  for (const g of input.games ?? []) {
    const a = g.attendance?.[pid];
    if (a === "present") {
      present++;
      marks++;
    } else if (a === "absent") marks++;
  }

  const assigns = input.missionAssignments ?? [];
  const completedAssigns = assigns.filter(
    (a) => a.completedAt || a.status === "completed",
  ).length;
  const completions = (input.missionCompletions ?? []).length;

  const hasAttendance = marks > 0;
  const hasMissions = assigns.length > 0 || completions > 0;
  if (!hasAttendance && !hasMissions) {
    return unknownPillar(
      "compete",
      "Track attendance + home-mission completion to show effort over time.",
    );
  }

  const parts: number[] = [];
  const weights: number[] = [];
  const drivers: string[] = [];
  if (hasAttendance) {
    const rate = present / marks;
    parts.push(rate * 100);
    weights.push(0.6);
    drivers.push(`Attendance ${round(rate * 100)}%`);
  }
  if (hasMissions) {
    let rate: number;
    if (assigns.length > 0) {
      rate = completedAssigns / assigns.length;
      drivers.push(`Missions ${completedAssigns}/${assigns.length}`);
    } else {
      rate = Math.min(1, completions / 5);
      drivers.push(`${completions} missions done`);
    }
    parts.push(rate * 100);
    weights.push(0.4);
  }
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  const score = round(
    clamp(parts.reduce((acc, p, i) => acc + p * (weights[i] ?? 0), 0) / wsum),
  );
  const band = bandFromScore(score);
  const conf: Confidence =
    marks >= 6 || assigns.length >= 4
      ? "high"
      : marks >= 2 || assigns.length >= 1 || completions >= 2
        ? "medium"
        : "low";
  return {
    pillar: "compete",
    label: PILLAR_LABEL.compete,
    score,
    band,
    confidence: conf,
    drivers,
    note:
      band === "strong" || band === "standout"
        ? "Shows up and finishes the work."
        : band === "on_track"
          ? "Building steady habits."
          : "Let's build the show-up-and-compete habit.",
  };
}

function scoreDurability(input: DevProfileInput, now: Date): PillarScore {
  const p = input.player;
  if (p.injured) {
    return {
      pillar: "durability",
      label: PILLAR_LABEL.durability,
      score: 22,
      band: bandFromScore(22),
      confidence: "high",
      readiness: "rest",
      drivers: ["Marked injured"],
      note: p.injuryNote
        ? `Injured: ${p.injuryNote}. Follow return-to-play steps.`
        : "Marked injured. Follow return-to-play steps before activity.",
    };
  }

  if (p.canPitch) {
    const age = p.dob ? ageFromDob(p.dob, now) : ageBandCenter(p.ageBand);
    const outingsByDate: Record<string, number> = {};
    for (const g of input.games ?? []) {
      const entry = g.pitchCounts?.[p.id];
      if (!entry?.pitches) continue;
      const day = (g.startsAt ?? "").slice(0, 10);
      if (!day) continue;
      outingsByDate[day] = (outingsByDate[day] ?? 0) + entry.pitches;
    }
    const hasHistory = Object.keys(outingsByDate).length > 0;
    const check = canPitchToday({
      age,
      date: now,
      plannedPitches: 1,
      history: {
        outingsByDate,
        todayCount: 0,
        soreToday: false,
        todayCatchingInnings: 0,
        continuousThrowingDays: 0,
      },
    });
    if (!check.allowed) {
      const d = check.requiredRestDaysRemaining;
      return {
        pillar: "durability",
        label: PILLAR_LABEL.durability,
        score: 55,
        band: bandFromScore(55),
        confidence: "high",
        readiness: "monitor",
        drivers: ["Recent pitching load"],
        note:
          d > 0
            ? `Resting ${d} more day${d === 1 ? "" : "s"} before pitching (Pitch Smart).`
            : (check.reasons[0] ?? "Manage arm load before the next outing."),
      };
    }
    return {
      pillar: "durability",
      label: PILLAR_LABEL.durability,
      score: 88,
      band: bandFromScore(88),
      confidence: hasHistory ? "high" : "medium",
      readiness: "ready",
      drivers: hasHistory ? ["Pitch counts on file"] : ["No recent load flags"],
      note: "Available. Arm load looks managed.",
    };
  }

  if (p.canCatch) {
    return {
      pillar: "durability",
      label: PILLAR_LABEL.durability,
      score: 78,
      band: bandFromScore(78),
      confidence: "low",
      readiness: "ready",
      drivers: ["Catcher (watch innings)"],
      note: "Available. Keep an eye on catching innings and throwdowns.",
    };
  }

  return {
    pillar: "durability",
    label: PILLAR_LABEL.durability,
    score: 80,
    band: bandFromScore(80),
    confidence: "low",
    readiness: "ready",
    drivers: ["No injury flags"],
    note: "No load flags on file.",
  };
}

// ── recommendation ───────────────────────────────────────────────────────────

function avoidSet(player: DevProfileInput["player"]): Set<string> {
  const ratings = player.positionRatings ?? {};
  return new Set(
    Object.entries(ratings)
      .filter(([, r]) => r === "avoid")
      .map(([pos]) => pos),
  );
}

function mainPositions(player: DevProfileInput["player"]): Set<string> {
  const ratings = player.positionRatings ?? {};
  const preferred = Object.entries(ratings)
    .filter(([, r]) => r === "preferred")
    .map(([pos]) => pos);
  return new Set(preferred.length > 0 ? preferred : (player.positions ?? []));
}

function positionRep(player: DevProfileInput["player"], stretch: boolean): string {
  const avoid = avoidSet(player);
  const mains = mainPositions(player);
  const pool = stretch ? PREMIUM_POS : CONFIDENCE_POS;
  const pick =
    pool.find((pos) => !avoid.has(pos) && !mains.has(pos)) ??
    pool.find((pos) => !avoid.has(pos));
  if (!pick) {
    return stretch
      ? "Mix in reps at a more demanding position to raise the challenge."
      : "Give confidence reps at a comfortable position to build reads.";
  }
  return stretch
    ? `Ready for more reps at ${pick}. Raise the challenge.`
    : `Confidence reps at ${pick} to build reps and reads.`;
}

function buildRecommendation(
  input: DevProfileInput,
  pillars: PillarScore[],
): DevProfileRecommendation {
  const first = input.player.firstName || "This player";
  const byPillar = new Map(pillars.map((p) => [p.pillar, p]));
  const durability = byPillar.get("durability");

  // Safety always leads.
  let safetyNote: string | undefined;
  if (durability?.readiness === "rest") {
    safetyNote = `Protect the arm first. ${durability.note} No pitching/throwing until cleared.`;
  } else if (durability?.readiness === "monitor") {
    safetyNote = `Manage arm load this week: no extra bullpen, keep throws light, honor rest days. (${durability.note})`;
  }

  const known = pillars.filter(
    (p): p is PillarScore & { score: number } => p.score !== null,
  );
  const growth = known.filter((p) => p.pillar !== "durability");
  const weakest =
    growth.length > 0 ? growth.reduce((a, b) => (b.score < a.score ? b : a)) : null;
  const allStrong = growth.length > 0 && growth.every((p) => p.score >= 68);
  const durabilityReady = durability?.readiness !== "rest";

  const actions: string[] = [];
  if (weakest && !allStrong) {
    actions.push(PILLAR_ACTION[weakest.pillar as Exclude<Pillar, "durability">]);
  }
  actions.push(positionRep(input.player, allStrong && durabilityReady));
  if (actions.length < 3 && weakest && (weakest.pillar === "skill" || weakest.pillar === "athleticism")) {
    actions.push(`Re-test ${weakest.label.toLowerCase()} on a set cadence so progress is visible, not guessed.`);
  }

  let headline: string;
  if (growth.length === 0) {
    headline = `Log a baseline for ${first} to unlock a tailored plan.`;
  } else if (allStrong) {
    headline = `${first} is ready for more. Stretch them.`;
  } else if (weakest) {
    headline = `Biggest growth lever: ${weakest.label}.`;
  } else {
    headline = `Keep the reps balanced and safe.`;
  }

  return { headline, actions: actions.slice(0, 3), safetyNote };
}

// ── public API ───────────────────────────────────────────────────────────────

export function buildDevProfile(input: DevProfileInput): DevProfile {
  const now = input.now ?? new Date();
  const ageBand = input.player.ageBand;
  const latest = latestByMetric(input.metrics);

  const pillars: PillarScore[] = [
    scoreMeasurablePillar(
      "skill",
      SKILL_METRICS,
      ageBand,
      latest,
      "Run a baseline (tee EV, throwing velo, pop time) to map skill.",
    ),
    scoreMeasurablePillar(
      "athleticism",
      ATHLETIC_METRICS,
      ageBand,
      latest,
      "Time home-to-first or a 60 to map athleticism.",
    ),
    scoreBaseballIq(input.gameStats),
    scoreCompete(input),
    scoreDurability(input, now),
  ];

  const known = pillars.filter(
    (p): p is PillarScore & { score: number } => p.score !== null,
  );
  let shapeSummary: string;
  if (known.length === 0) {
    shapeSummary = "Run a baseline test to map this player's five-pillar shape.";
  } else {
    const sorted = [...known].sort((a, b) => b.score - a.score);
    const top = sorted[0]!;
    const bottom = sorted[sorted.length - 1]!;
    shapeSummary =
      known.length === 1 || top.pillar === bottom.pillar
        ? `${top.label}: ${bandLabel(top.band)}.`
        : `${top.label} is a strength; ${bottom.label} is the next step.`;
  }

  const knownCount = known.length;
  const overall = knownCount >= 4 ? "solid" : knownCount >= 2 ? "building" : "early";
  const confidenceNote = `Profile confidence is ${overall}, based on ${knownCount} of 5 areas. Add baseline tests and game tags to sharpen it. This is a development profile, not a ranking.`;

  return {
    player: `${input.player.firstName} ${input.player.lastName}`.trim(),
    ageBand,
    pillars,
    shapeSummary,
    confidenceNote,
    recommendation: buildRecommendation(input, pillars),
  };
}

/** Badge class for a pillar band (reuses the global badge palette). */
export function bandBadgeClass(band: PillarBand): string {
  switch (band) {
    case "standout":
    case "strong":
      return "badge-ok";
    case "on_track":
      return "badge-info";
    case "developing":
      return "badge-warn";
    case "emerging":
      return "badge-warn";
    default:
      return "badge";
  }
}

/** Badge class for a confidence level. */
export function confidenceBadgeClass(conf: Confidence): string {
  if (conf === "high") return "badge-ok";
  if (conf === "medium") return "badge-info";
  if (conf === "low") return "badge-warn";
  return "badge";
}

/** Badge class for durability readiness (green / yellow / red). */
export function readinessBadgeClass(readiness: Readiness): string {
  if (readiness === "ready") return "badge-ok";
  if (readiness === "monitor") return "badge-warn";
  return "badge-danger";
}

export const READINESS_LABEL: Record<Readiness, string> = {
  ready: "Available",
  monitor: "Monitor",
  rest: "Rest",
};
