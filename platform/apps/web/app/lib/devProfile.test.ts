import { describe, expect, it } from "vitest";
import type {
  GameRecord,
  MetricEntryRecord,
  PlanRecord,
  PlayerGameStatsRecord,
} from "@platform/storage";
import { buildDevProfile, type DevProfileInput } from "./devProfile";

const NOW = new Date("2026-06-09T12:00:00.000Z");

function entry(
  metricKey: string,
  value: number,
  verificationState: MetricEntryRecord["verificationState"] = "coach_verified",
): MetricEntryRecord {
  return {
    id: `${metricKey}-${value}`,
    playerId: "p1",
    metricKey,
    value,
    recordedAt: "2026-06-01T00:00:00.000Z",
    verificationState,
  };
}

type PlayerInput = DevProfileInput["player"];

function player(overrides: Partial<PlayerInput> = {}): PlayerInput {
  return {
    id: "p1",
    firstName: "Hudson",
    lastName: "Reyes",
    ageBand: "9-12",
    positions: [],
    ...overrides,
  };
}

describe("buildDevProfile", () => {
  it("returns five pillars in canonical order", () => {
    const profile = buildDevProfile({ player: player(), metrics: [], now: NOW });
    expect(profile.pillars.map((p) => p.pillar)).toEqual([
      "skill",
      "athleticism",
      "baseball_iq",
      "compete",
      "durability",
    ]);
  });

  it("marks pillars unknown with no data and tells the coach to baseline", () => {
    const profile = buildDevProfile({ player: player(), metrics: [], now: NOW });
    const skill = profile.pillars.find((p) => p.pillar === "skill")!;
    expect(skill.score).toBeNull();
    expect(skill.band).toBe("unknown");
    expect(skill.confidence).toBe("none");
    expect(profile.recommendation.headline).toMatch(/baseline/i);
    expect(profile.confidenceNote).toMatch(/not a ranking/i);
  });

  it("scores strong measurables high and suggests a stretch (premium) position", () => {
    const profile = buildDevProfile({
      player: player(),
      metrics: [
        entry("exit_velo_tee", 80), // elite for 9-12
        entry("bat_speed", 70), // elite
        entry("throw_velo_if", 72), // elite
        entry("home_to_first", 4.2), // elite (lower is better)
      ],
      now: NOW,
    });
    const skill = profile.pillars.find((p) => p.pillar === "skill")!;
    const ath = profile.pillars.find((p) => p.pillar === "athleticism")!;
    expect(skill.band).toBe("standout");
    expect(ath.band).toBe("standout");
    expect(profile.recommendation.headline).toMatch(/ready for more/i);
    expect(profile.recommendation.actions.join(" ")).toMatch(/SS|CF|3B|C|2B/);
  });

  it("does not suggest a position the player is rated to avoid", () => {
    const profile = buildDevProfile({
      player: player({ positionRatings: { SS: "avoid" } }),
      metrics: [entry("exit_velo_tee", 80), entry("home_to_first", 4.2)],
      now: NOW,
    });
    const stretch = profile.recommendation.actions.find((a) => /Ready for more reps/.test(a));
    expect(stretch).toBeTruthy();
    expect(stretch).not.toMatch(/\bSS\b/);
  });

  it("flags an injured player as rest and leads the recommendation with safety", () => {
    const profile = buildDevProfile({
      player: player({ injured: true, injuryNote: "elbow soreness" }),
      metrics: [entry("exit_velo_tee", 80)],
      now: NOW,
    });
    const dur = profile.pillars.find((p) => p.pillar === "durability")!;
    expect(dur.readiness).toBe("rest");
    expect(profile.recommendation.safetyNote).toBeTruthy();
    expect(profile.recommendation.safetyNote).toMatch(/elbow soreness/);
  });

  it("puts a recently-pitched arm in monitor with an arm-load safety note", () => {
    const games: GameRecord[] = [
      {
        id: "g1",
        teamId: "t1",
        opponent: "Hawks",
        startsAt: "2026-06-08T18:00:00.000Z", // yesterday
        homeAway: "home",
        innings: 6,
        status: "completed",
        pitchCounts: { p1: { pitches: 60, innings: 3, recordedAt: "2026-06-08T20:00:00.000Z" } },
        createdAt: "2026-06-08T00:00:00.000Z",
      },
    ];
    const profile = buildDevProfile({
      player: player({ canPitch: true }),
      metrics: [],
      games,
      now: NOW,
    });
    const dur = profile.pillars.find((p) => p.pillar === "durability")!;
    expect(dur.readiness).toBe("monitor");
    expect(profile.recommendation.safetyNote).toMatch(/arm load/i);
  });

  it("scores compete from attendance + finished missions", () => {
    const plans: PlanRecord[] = [
      planWith({ p1: "present" }),
      planWith({ p1: "present" }),
      planWith({ p1: "absent" }),
    ];
    const profile = buildDevProfile({
      player: player(),
      metrics: [],
      plans,
      missionAssignments: [
        { id: "a1", teamId: "t1", playerId: "p1", missionId: "m1", assignedByUserId: "c1", assignedAt: "x", completedAt: "y" },
        { id: "a2", teamId: "t1", playerId: "p1", missionId: "m2", assignedByUserId: "c1", assignedAt: "x" },
      ],
      now: NOW,
    });
    const compete = profile.pillars.find((p) => p.pillar === "compete")!;
    expect(compete.score).not.toBeNull();
    expect(compete.drivers.join(" ")).toMatch(/Attendance/);
    expect(compete.drivers.join(" ")).toMatch(/Missions 1\/2/);
  });

  it("names the weakest known pillar as the growth lever", () => {
    const plans: PlanRecord[] = [planWith({ p1: "absent" }), planWith({ p1: "absent" })];
    const profile = buildDevProfile({
      player: player(),
      metrics: [entry("exit_velo_tee", 80)], // skill standout
      plans, // compete = 0
      now: NOW,
    });
    expect(profile.recommendation.headline).toMatch(/Compete/);
  });

  it("derives Baseball IQ from quality at-bats", () => {
    const gameStats: PlayerGameStatsRecord[] = [
      statWith({ pa: 12, qab: 8, kLooking: 1 }),
      statWith({ pa: 8, qab: 5, kLooking: 0 }),
    ];
    const profile = buildDevProfile({ player: player(), metrics: [], gameStats, now: NOW });
    const iq = profile.pillars.find((p) => p.pillar === "baseball_iq")!;
    expect(iq.score).not.toBeNull();
    expect(iq.drivers.join(" ")).toMatch(/Quality AB/);
    // box-score IQ is never high-confidence
    expect(["low", "medium"]).toContain(iq.confidence);
  });
});

function planWith(attendance: Record<string, "present" | "absent">): PlanRecord {
  return {
    id: `plan-${Math.random()}`,
    name: "Practice",
    ageBand: "9-12",
    durationMin: 90,
    blocks: [],
    createdByUserId: "c1",
    teamId: "t1",
    attendance,
    createdAt: "2026-06-01T00:00:00.000Z",
  };
}

function statWith(batting: PlayerGameStatsRecord["batting"]): PlayerGameStatsRecord {
  return {
    id: `s-${Math.random()}`,
    playerId: "p1",
    teamId: "t1",
    gameId: "g1",
    batting,
    rating: 3,
    ratingLabel: "Solid",
    highlights: [],
    source: "manual",
    createdAt: "2026-06-01T00:00:00.000Z",
  };
}
