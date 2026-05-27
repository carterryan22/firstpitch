import { describe, expect, it } from "vitest";
import type {
  GameRecord,
  GoalRecord,
  MetricEntryRecord,
  PlanRecord,
  PlayerRecord,
  TeamRecord,
} from "@platform/storage";
import { buildTeamDigest } from "./digest";

const now = new Date("2026-05-25T12:00:00.000Z");

const team: TeamRecord = {
  id: "tm1",
  name: "Sharks",
  slug: "sharks",
  ageBand: "9-12",
  ownerCoachUserId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function player(id: string, over: Partial<PlayerRecord> = {}): PlayerRecord {
  return {
    id,
    teamId: team.id,
    firstName: id.toUpperCase(),
    lastName: "Player",
    ageBand: "9-12",
    sport: "baseball",
    positions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("buildTeamDigest", () => {
  it("returns empty digest for an empty team", () => {
    const d = buildTeamDigest({
      team, players: [], games: [], plans: [], goals: [], metricEntries: [], now,
    });
    expect(d.upcomingGames).toEqual([]);
    expect(d.upcomingPractices).toEqual([]);
    expect(d.pitcherReturns).toEqual([]);
    expect(d.staleBaselines).toEqual([]);
    expect(d.goalsAtRisk).toEqual([]);
    expect(d.goalsAchievedThisWeek).toEqual([]);
    expect(d.teamId).toBe(team.id);
  });

  it("includes upcoming games within the window, excludes completed", () => {
    const games: GameRecord[] = [
      { id: "g1", teamId: team.id, opponent: "A", startsAt: "2026-05-27T18:00:00.000Z", homeAway: "home", innings: 6, status: "scheduled", createdAt: "" },
      { id: "g2", teamId: team.id, opponent: "B", startsAt: "2026-05-26T18:00:00.000Z", homeAway: "away", innings: 6, status: "completed", createdAt: "" },
      { id: "g3", teamId: team.id, opponent: "C", startsAt: "2026-06-10T18:00:00.000Z", homeAway: "home", innings: 6, status: "scheduled", createdAt: "" },
    ];
    const d = buildTeamDigest({ team, players: [player("p1")], games, plans: [], goals: [], metricEntries: [], now });
    expect(d.upcomingGames.map((g) => g.id)).toEqual(["g1"]);
  });

  it("includes upcoming practices within the window", () => {
    const plans: PlanRecord[] = [
      { id: "pl1", name: "Tues", ageBand: "9-12", durationMin: 60, blocks: [], createdByUserId: "u1", teamId: team.id, scheduledAt: "2026-05-26T22:00:00.000Z", createdAt: "" },
      { id: "pl2", name: "Old", ageBand: "9-12", durationMin: 60, blocks: [], createdByUserId: "u1", teamId: team.id, scheduledAt: "2026-04-01T22:00:00.000Z", createdAt: "" },
    ];
    const d = buildTeamDigest({ team, players: [], games: [], plans, goals: [], metricEntries: [], now });
    expect(d.upcomingPractices.map((p) => p.id)).toEqual(["pl1"]);
  });

  it("flags players with no recent metric entries as stale", () => {
    const players = [player("p1"), player("p2")];
    const metricEntries: MetricEntryRecord[] = [
      {
        id: "me1",
        playerId: "p1",
        metricKey: "exit_velo_tee",
        value: 45,
        recordedAt: "2026-05-20T00:00:00.000Z",
        verificationState: "coach_verified",
      },
    ];
    const d = buildTeamDigest({ team, players, games: [], plans: [], goals: [], metricEntries, now });
    expect(d.staleBaselines.map((s) => s.playerId)).toEqual(["p2"]);
  });

  it("collects achieved goals from this week and at-risk active goals", () => {
    const players = [player("p1")];
    const goals: GoalRecord[] = [
      {
        id: "go1", playerId: "p1", metricKey: "exit_velo_tee", type: "absolute",
        target: 60, baseline: 40, status: "achieved", achievedAt: "2026-05-24T00:00:00.000Z",
        createdByUserId: "u1", createdAt: "2026-05-01T00:00:00.000Z",
      },
    ];
    const d = buildTeamDigest({ team, players, games: [], plans: [], goals, metricEntries: [], now });
    expect(d.goalsAchievedThisWeek.map((g) => g.goalId)).toEqual(["go1"]);
  });
});
