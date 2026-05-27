import { canPitchToday } from "@platform/safety";
import type {
  GameRecord,
  GoalRecord,
  MetricEntryRecord,
  PlanRecord,
  PlayerRecord,
  TeamRecord,
} from "@platform/storage";
import { ageFromDob, fullName } from "./players";
import { computeGoalProgress } from "./goals";

export interface DigestUpcomingGame {
  id: string;
  opponent: string;
  startsAt: string;
  venue?: string;
  homeAway: GameRecord["homeAway"];
  rsvpYes: number;
  rsvpNo: number;
  rsvpMaybe: number;
  rsvpUnknown: number;
}

export interface DigestUpcomingPractice {
  id: string;
  name: string;
  scheduledAt: string;
  durationMin: number;
  location?: string;
}

export interface DigestPitcherReturn {
  playerId: string;
  name: string;
  availableOn: string;
  reason: string;
}

export interface DigestStaleBaseline {
  playerId: string;
  name: string;
  metricKey: string;
  lastRecordedAt?: string;
  daysSince: number;
}

export interface DigestGoalAtRisk {
  goalId: string;
  playerId: string;
  name: string;
  metricKey: string;
  fraction: number;
  status: "achieved" | "on-pace" | "behind" | "regression" | "no-data";
  targetDate?: string;
}

export interface TeamDigest {
  teamId: string;
  teamName: string;
  windowStart: string;
  windowEnd: string;
  upcomingGames: DigestUpcomingGame[];
  upcomingPractices: DigestUpcomingPractice[];
  pitcherReturns: DigestPitcherReturn[];
  staleBaselines: DigestStaleBaseline[];
  goalsAtRisk: DigestGoalAtRisk[];
  goalsAchievedThisWeek: DigestGoalAtRisk[];
}

function ageBandCenter(band: string): number {
  if (band.startsWith("6-8")) return 8;
  if (band.startsWith("9-12")) return 11;
  if (band.startsWith("13-15")) return 14;
  return 16;
}

const DAY_MS = 24 * 3600 * 1000;

export interface BuildDigestInput {
  team: TeamRecord;
  players: PlayerRecord[];
  games: GameRecord[];
  plans: PlanRecord[];
  goals: GoalRecord[];
  metricEntries: MetricEntryRecord[];
  now?: Date;
  windowDays?: number;
  staleAfterDays?: number;
  pitcherLookaheadDays?: number;
}

export function buildTeamDigest(input: BuildDigestInput): TeamDigest {
  const now = input.now ?? new Date();
  const windowDays = input.windowDays ?? 7;
  const staleAfterDays = input.staleAfterDays ?? 30;
  const pitcherLookaheadDays = input.pitcherLookaheadDays ?? 7;
  const windowEnd = new Date(now.getTime() + windowDays * DAY_MS);
  const playerById = new Map(input.players.map((p) => [p.id, p]));
  const activePlayers = input.players.filter((p) => !p.archivedAt);
  const fallbackAge = ageBandCenter(input.team.ageBand);

  const upcomingGames: DigestUpcomingGame[] = input.games
    .filter((g) => g.startsAt && new Date(g.startsAt) >= now && new Date(g.startsAt) <= windowEnd)
    .filter((g) => g.status !== "completed")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((g) => {
      const rsvp = g.rsvp ?? {};
      let yes = 0,
        no = 0,
        maybe = 0;
      for (const p of activePlayers) {
        const v = rsvp[p.id];
        if (v === "yes") yes++;
        else if (v === "no") no++;
        else if (v === "maybe") maybe++;
      }
      return {
        id: g.id,
        opponent: g.opponent,
        startsAt: g.startsAt,
        venue: g.venue,
        homeAway: g.homeAway,
        rsvpYes: yes,
        rsvpNo: no,
        rsvpMaybe: maybe,
        rsvpUnknown: activePlayers.length - yes - no - maybe,
      };
    });

  const upcomingPractices: DigestUpcomingPractice[] = input.plans
    .filter((p) => p.scheduledAt && new Date(p.scheduledAt) >= now && new Date(p.scheduledAt) <= windowEnd)
    .filter((p) => p.status !== "canceled" && p.status !== "completed")
    .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""))
    .map((p) => ({
      id: p.id,
      name: p.name,
      scheduledAt: p.scheduledAt!,
      durationMin: p.durationMin,
      location: p.location,
    }));

  // Pitcher returns: players currently unavailable today who become available
  // within the lookahead window.
  const pitcherReturns: DigestPitcherReturn[] = [];
  for (const p of activePlayers) {
    if (!p.canPitch) continue;
    const outingsByDate: Record<string, number> = {};
    for (const g of input.games) {
      const entry = g.pitchCounts?.[p.id];
      if (!entry?.pitches) continue;
      const day = (g.startsAt ?? "").slice(0, 10);
      if (!day) continue;
      outingsByDate[day] = (outingsByDate[day] ?? 0) + entry.pitches;
    }
    const age = p.dob ? ageFromDob(p.dob) : fallbackAge;
    const checkToday = canPitchToday({
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
    if (checkToday.allowed) continue;
    for (let d = 1; d <= pitcherLookaheadDays; d++) {
      const dt = new Date(now.getTime() + d * DAY_MS);
      const check = canPitchToday({
        age,
        date: dt,
        plannedPitches: 1,
        history: {
          outingsByDate,
          todayCount: 0,
          soreToday: false,
          todayCatchingInnings: 0,
          continuousThrowingDays: 0,
        },
      });
      if (check.allowed) {
        pitcherReturns.push({
          playerId: p.id,
          name: fullName(p),
          availableOn: dt.toISOString().slice(0, 10),
          reason: checkToday.reasons[0] ?? "rest required",
        });
        break;
      }
    }
  }

  // Stale baselines: roster players with no metricEntry in the last N days.
  const latestEntryAt = new Map<string, string>();
  for (const e of input.metricEntries) {
    const prev = latestEntryAt.get(e.playerId);
    if (!prev || e.recordedAt > prev) latestEntryAt.set(e.playerId, e.recordedAt);
  }
  const staleBaselines: DigestStaleBaseline[] = [];
  for (const p of activePlayers) {
    const last = latestEntryAt.get(p.id);
    const daysSince = last
      ? Math.floor((now.getTime() - new Date(last).getTime()) / DAY_MS)
      : Number.POSITIVE_INFINITY;
    if (daysSince >= staleAfterDays) {
      staleBaselines.push({
        playerId: p.id,
        name: fullName(p),
        metricKey: "*",
        lastRecordedAt: last,
        daysSince: Number.isFinite(daysSince) ? daysSince : 999,
      });
    }
  }

  // Goals at risk / achieved this week.
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const goalsAtRisk: DigestGoalAtRisk[] = [];
  const goalsAchievedThisWeek: DigestGoalAtRisk[] = [];
  for (const g of input.goals) {
    const player = playerById.get(g.playerId);
    if (!player) continue;
    const entries = input.metricEntries.filter(
      (e) => e.playerId === g.playerId && e.metricKey === g.metricKey,
    );
    const prog = computeGoalProgress(g, entries, now);
    const summary: DigestGoalAtRisk = {
      goalId: g.id,
      playerId: g.playerId,
      name: fullName(player),
      metricKey: g.metricKey,
      fraction: Number(prog.fraction.toFixed(2)),
      status: prog.status,
      targetDate: g.targetDate,
    };
    if (g.status === "active" && (prog.status === "behind" || prog.status === "regression")) {
      goalsAtRisk.push(summary);
    }
    if (g.status === "achieved" && g.achievedAt && new Date(g.achievedAt) >= weekAgo) {
      goalsAchievedThisWeek.push(summary);
    }
  }

  return {
    teamId: input.team.id,
    teamName: input.team.name,
    windowStart: now.toISOString(),
    windowEnd: windowEnd.toISOString(),
    upcomingGames,
    upcomingPractices,
    pitcherReturns,
    staleBaselines,
    goalsAtRisk,
    goalsAchievedThisWeek,
  };
}
