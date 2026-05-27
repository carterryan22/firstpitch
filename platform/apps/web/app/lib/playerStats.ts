/**
 * Player game-stats helpers: kind rating, season aggregation, highlight
 * extraction. Pure functions — no I/O. Tested under
 * `apps/web/app/lib/playerStats.test.ts`.
 *
 * Design notes:
 *  - The per-game rating is intentionally *kind*. Youth players (and parents)
 *    see this; we never want a sub-3 rating except for clearly absent /
 *    non-participating players. Average game floats around 4.0.
 *  - We compose the rating from whichever stat blocks are present (batting,
 *    pitching, fielding) and weight by participation; a kid who only fielded
 *    can still earn a 5.0.
 */

import type {
  PlayerGameBattingStats,
  PlayerGameFieldingStats,
  PlayerGamePitchingStats,
  PlayerGameStatsRecord,
  Position,
} from "@platform/storage";

export interface GameRatingResult {
  score: number; // 1.0 - 5.0
  label: string;
  highlights: string[];
}

const RATING_LABELS: Array<[number, string]> = [
  [4.85, "Star performance!"],
  [4.55, "Great game!"],
  [4.2, "Solid effort"],
  [3.8, "Good hustle"],
  [3.3, "Showed up & competed"],
  [2.5, "Tough day — kept battling"],
  [0, "Missed you out there"],
];

function labelFor(score: number): string {
  for (const [floor, label] of RATING_LABELS) {
    if (score >= floor) return label;
  }
  return RATING_LABELS[RATING_LABELS.length - 1]?.[1] ?? "Showed up";
}

function num(n: number | undefined): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/** Hitting score 1.0-5.0; baseline 4.0 then nudged by efficiency / production. */
function ratingFromBatting(b: PlayerGameBattingStats): { score: number; highlights: string[] } {
  const highlights: string[] = [];
  let score = 4.0;
  const ab = num(b.ab);
  const pa = num(b.pa) || ab + num(b.bb) + num(b.hbp) + num(b.sac) + num(b.sf);
  const h = num(b.h);
  const bb = num(b.bb);
  const so = num(b.so);
  const hbp = num(b.hbp);
  const rbi = num(b.rbi);
  const r = num(b.r);
  const hr = num(b.hr);
  const xbh = num(b["2b"]) + num(b["3b"]) + hr;
  const sb = num(b.sb);
  const qab = num(b.qab);

  // Reach base (OBP analog) — biggest lever, capped contribution +0.8
  const onBase = h + bb + hbp;
  if (pa > 0) {
    const obp = onBase / pa;
    score += Math.min(0.8, obp * 1.3); // .500 OBP → +0.65
  }
  // Production
  if (rbi >= 1) { score += 0.15 * Math.min(rbi, 3); highlights.push(`${rbi} RBI`); }
  if (r >= 1) { score += 0.05 * Math.min(r, 3); }
  if (hr >= 1) { score += 0.4; highlights.push(hr === 1 ? "Home run! 🎉" : `${hr} HRs!`); }
  else if (xbh >= 1) { score += 0.15; highlights.push("Extra-base hit"); }
  else if (h >= 1) { highlights.push(h > 1 ? `${h}-for-${ab}` : "Got a hit"); }
  if (bb >= 1) { score += 0.1; if (bb >= 2) highlights.push(`${bb} walks — great eye`); }
  if (sb >= 1) { score += 0.1; highlights.push(`${sb} SB`); }
  if (qab >= 1) { score += 0.05 * Math.min(qab, 3); }
  // Strikeouts only ding lightly, and only if dominant
  if (ab > 0 && so / ab >= 0.67) score -= 0.2;

  return { score, highlights };
}

/** Pitching score; emphasizes strike-throwing > Ks at youth levels. */
function ratingFromPitching(p: PlayerGamePitchingStats): { score: number; highlights: string[] } {
  const highlights: string[] = [];
  let score = 4.0;
  const ip = num(p.ip);
  const bf = num(p.bf) || Math.round(ip * 4.3);
  const bb = num(p.bb);
  const so = num(p.so);
  const er = num(p.er);
  const wp = num(p.wp);
  const hbp = num(p.hbp);
  const pitches = num(p.pitches);

  if (bf > 0) {
    const bbRate = bb / bf;
    if (bbRate <= 0.10) { score += 0.5; highlights.push("Pounded the zone"); }
    else if (bbRate <= 0.18) score += 0.25;
    else if (bbRate >= 0.30) score -= 0.3;
  }
  if (so >= 2) { score += 0.15 * Math.min(so, 4); highlights.push(`${so} K`); }
  if (ip >= 1 && er === 0) { score += 0.3; highlights.push("No earned runs"); }
  else if (ip >= 1 && er / Math.max(ip, 0.5) >= 2) score -= 0.25;
  if (pitches > 0 && ip > 0) {
    const ppi = pitches / ip;
    if (ppi <= 15) { score += 0.15; highlights.push("Efficient — low pitch count"); }
    else if (ppi >= 25) score -= 0.1;
  }
  if (wp + hbp >= 3) score -= 0.15;
  if (ip >= 1) highlights.unshift(`${ip} IP`);

  return { score, highlights };
}

/** Fielding rolls up across positions played. */
function ratingFromFielding(rows: PlayerGameFieldingStats[]): { score: number; highlights: string[] } {
  const highlights: string[] = [];
  let score = 4.0;
  if (rows.length === 0) return { score, highlights };
  const totalInn = rows.reduce((s, r) => s + num(r.innings), 0);
  const totalE = rows.reduce((s, r) => s + num(r.e), 0);
  const totalPO = rows.reduce((s, r) => s + num(r.po), 0);
  const totalA = rows.reduce((s, r) => s + num(r.a), 0);
  const totalDP = rows.reduce((s, r) => s + num(r.dp), 0);
  const totalCS = rows.reduce((s, r) => s + num(r.cs), 0);

  if (totalE === 0 && totalInn >= 2) { score += 0.3; highlights.push("Clean defense"); }
  else if (totalE >= 2) score -= 0.15; // small ding only — be kind
  if (totalA >= 2) { score += 0.15; highlights.push(`${totalA} assists`); }
  if (totalDP >= 1) { score += 0.2; highlights.push("Turned a DP"); }
  if (totalCS >= 1) { score += 0.15; highlights.push("Caught a runner stealing"); }
  if (totalPO >= 5) score += 0.1;
  // Variety bonus (touched 3+ positions)
  const distinctPos = new Set(rows.map((r) => r.position));
  if (distinctPos.size >= 3) { score += 0.1; highlights.push("Played multiple positions"); }

  return { score, highlights };
}

/**
 * Compose a kind 1.0-5.0 rating for one player's game.
 * If no stat blocks are present at all → 3.5 + "Showed up" (no negative
 * default for an empty slate; the coach simply hasn't entered data).
 */
export function computeGameRating(input: {
  batting?: PlayerGameBattingStats;
  pitching?: PlayerGamePitchingStats;
  fielding?: PlayerGameFieldingStats[];
  /** "absent" yields the lowest, gentlest label. */
  attendance?: "present" | "absent";
}): GameRatingResult {
  if (input.attendance === "absent") {
    return { score: 2.0, label: "Missed you out there", highlights: [] };
  }
  const parts: Array<{ score: number; highlights: string[]; weight: number }> = [];
  if (input.batting && Object.keys(input.batting).length > 0) {
    parts.push({ ...ratingFromBatting(input.batting), weight: 1.0 });
  }
  if (input.pitching && Object.keys(input.pitching).length > 0) {
    parts.push({ ...ratingFromPitching(input.pitching), weight: 1.0 });
  }
  if (input.fielding && input.fielding.length > 0) {
    parts.push({ ...ratingFromFielding(input.fielding), weight: 0.6 });
  }
  if (parts.length === 0) {
    return { score: 3.5, label: "Showed up & competed", highlights: [] };
  }
  const totalW = parts.reduce((s, p) => s + p.weight, 0);
  const raw = parts.reduce((s, p) => s + p.score * p.weight, 0) / totalW;
  const score = Math.max(1.0, Math.min(5.0, Math.round(raw * 10) / 10));
  const highlights = parts.flatMap((p) => p.highlights).slice(0, 4);
  return { score, label: labelFor(score), highlights };
}

// ────────────────────────────────────────────────────────────────────────────
// Season aggregation
// ────────────────────────────────────────────────────────────────────────────

export interface SeasonBatting {
  gp: number; pa: number; ab: number; h: number; bb: number; so: number;
  hbp: number; r: number; rbi: number; sb: number; hr: number; xbh: number;
  avg: number; obp: number; slg: number; ops: number;
}

export interface SeasonPitching {
  gp: number; ip: number; bf: number; pitches: number;
  bb: number; so: number; er: number; r: number; h: number;
  era: number; whip: number; pitchesPerInning: number;
}

export interface SeasonFielding {
  /** Innings played at each position. */
  positionInnings: Partial<Record<Position, number>>;
  totalInnings: number;
  e: number; po: number; a: number; dp: number;
  fpct: number;
  /** Catcher rollups. */
  pb: number; sbAgainst: number; cs: number;
}

export interface SeasonStatsSummary {
  gamesPlayed: number;
  averageRating: number;
  mostPlayedPosition?: Position;
  batting?: SeasonBatting;
  pitching?: SeasonPitching;
  fielding?: SeasonFielding;
  perGame: Array<{
    gameId: string;
    rating: number;
    ratingLabel: string;
    highlights: string[];
  }>;
}

function div(a: number, b: number): number {
  return b > 0 ? a / b : 0;
}

function round(n: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

export function aggregateSeason(records: PlayerGameStatsRecord[]): SeasonStatsSummary {
  const gp = records.length;
  const perGame = records.map((r) => ({
    gameId: r.gameId,
    rating: r.rating,
    ratingLabel: r.ratingLabel,
    highlights: r.highlights,
  }));
  const averageRating = gp > 0
    ? round(records.reduce((s, r) => s + r.rating, 0) / gp, 2)
    : 0;

  // Batting
  const batRecs = records.filter((r) => r.batting && Object.keys(r.batting).length > 0);
  let batting: SeasonBatting | undefined;
  if (batRecs.length > 0) {
    const b: SeasonBatting = {
      gp: batRecs.length, pa: 0, ab: 0, h: 0, bb: 0, so: 0, hbp: 0,
      r: 0, rbi: 0, sb: 0, hr: 0, xbh: 0,
      avg: 0, obp: 0, slg: 0, ops: 0,
    };
    let tb = 0;
    for (const r of batRecs) {
      const bb2 = r.batting!;
      b.pa += num(bb2.pa); b.ab += num(bb2.ab); b.h += num(bb2.h);
      b.bb += num(bb2.bb); b.so += num(bb2.so); b.hbp += num(bb2.hbp);
      b.r += num(bb2.r); b.rbi += num(bb2.rbi); b.sb += num(bb2.sb);
      b.hr += num(bb2.hr);
      b.xbh += num(bb2["2b"]) + num(bb2["3b"]) + num(bb2.hr);
      const s1 = num(bb2["1b"]) || Math.max(0, num(bb2.h) - num(bb2["2b"]) - num(bb2["3b"]) - num(bb2.hr));
      tb += s1 + 2 * num(bb2["2b"]) + 3 * num(bb2["3b"]) + 4 * num(bb2.hr);
    }
    b.avg = round(div(b.h, b.ab), 3);
    b.obp = round(div(b.h + b.bb + b.hbp, b.pa || b.ab + b.bb + b.hbp), 3);
    b.slg = round(div(tb, b.ab), 3);
    b.ops = round(b.obp + b.slg, 3);
    batting = b;
  }

  // Pitching
  const pitRecs = records.filter((r) => r.pitching && Object.keys(r.pitching).length > 0);
  let pitching: SeasonPitching | undefined;
  if (pitRecs.length > 0) {
    const p: SeasonPitching = {
      gp: pitRecs.length, ip: 0, bf: 0, pitches: 0,
      bb: 0, so: 0, er: 0, r: 0, h: 0,
      era: 0, whip: 0, pitchesPerInning: 0,
    };
    for (const r of pitRecs) {
      const pp = r.pitching!;
      p.ip += num(pp.ip); p.bf += num(pp.bf); p.pitches += num(pp.pitches);
      p.bb += num(pp.bb); p.so += num(pp.so); p.er += num(pp.er);
      p.r += num(pp.r); p.h += num(pp.h);
    }
    p.era = round(div(p.er * 7, p.ip), 2); // youth = 7-inning game default close enough
    p.whip = round(div(p.bb + p.h, p.ip), 2);
    p.pitchesPerInning = round(div(p.pitches, p.ip), 1);
    pitching = p;
  }

  // Fielding
  const fldRecs = records.flatMap((r) => r.fielding ?? []);
  let fielding: SeasonFielding | undefined;
  let mostPlayedPosition: Position | undefined;
  if (fldRecs.length > 0) {
    const f: SeasonFielding = {
      positionInnings: {}, totalInnings: 0,
      e: 0, po: 0, a: 0, dp: 0, fpct: 0,
      pb: 0, sbAgainst: 0, cs: 0,
    };
    for (const row of fldRecs) {
      const inn = num(row.innings);
      f.positionInnings[row.position] = (f.positionInnings[row.position] ?? 0) + inn;
      f.totalInnings += inn;
      f.e += num(row.e); f.po += num(row.po); f.a += num(row.a); f.dp += num(row.dp);
      f.pb += num(row.pb); f.sbAgainst += num(row.sbAgainst); f.cs += num(row.cs);
    }
    const tc = f.po + f.a + f.e;
    f.fpct = tc > 0 ? round((f.po + f.a) / tc, 3) : 0;
    // Most played
    let maxInn = 0;
    for (const [pos, inn] of Object.entries(f.positionInnings) as Array<[Position, number]>) {
      if (inn > maxInn) { maxInn = inn; mostPlayedPosition = pos; }
    }
    fielding = f;
  }

  return { gamesPlayed: gp, averageRating, mostPlayedPosition, batting, pitching, fielding, perGame };
}
