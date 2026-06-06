import { describe, expect, it } from "vitest";
import type { GameRecord, PlayerRecord } from "@platform/storage";
import { playerCapabilityBadges } from "./players";

function player(overrides: Partial<PlayerRecord> = {}): PlayerRecord {
  return {
    id: "p1",
    teamId: "t1",
    firstName: "Sam",
    lastName: "Rivera",
    ageBand: "9-12",
    sport: "baseball",
    positions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function gameWithOuting(playerId: string, dayIso: string, pitches: number): GameRecord {
  return {
    id: `g_${dayIso}`,
    teamId: "t1",
    opponent: "Foes",
    startsAt: `${dayIso}T18:00:00.000Z`,
    homeAway: "home",
    innings: 6,
    status: "completed",
    pitchCounts: { [playerId]: { pitches, innings: 3, recordedAt: `${dayIso}T20:00:00.000Z` } },
    createdAt: `${dayIso}T00:00:00.000Z`,
  };
}

const today = new Date("2026-05-29T12:00:00.000Z");

describe("playerCapabilityBadges", () => {
  it("shows Can pitch / Can catch for a healthy, rested player", () => {
    const badges = playerCapabilityBadges(player({ canPitch: true, canCatch: true }), { today });
    expect(badges.map((b) => b.label)).toEqual(["Can pitch", "Can catch"]);
    expect(badges[0]?.tone).toBe("info");
  });

  it("downgrades to Resting when the pitcher threw a heavy outing yesterday", () => {
    // 50 pitches at age ~11 requires multiple rest days.
    const games = [gameWithOuting("p1", "2026-05-28", 50)];
    const badges = playerCapabilityBadges(player({ canPitch: true }), { games, today });
    const pitch = badges.find((b) => b.label.startsWith("Resting"));
    expect(pitch).toBeTruthy();
    expect(pitch?.tone).toBe("warn");
  });

  it("keeps Can pitch when the last outing was long enough ago", () => {
    const games = [gameWithOuting("p1", "2026-05-01", 50)];
    const badges = playerCapabilityBadges(player({ canPitch: true }), { games, today });
    expect(badges.map((b) => b.label)).toContain("Can pitch");
  });

  it("always shows Injured (danger) and includes the note in the title", () => {
    const badges = playerCapabilityBadges(
      player({ canPitch: true, injured: true, injuryNote: "sore elbow" }),
      { today },
    );
    const injured = badges.find((b) => b.label === "Injured");
    expect(injured?.tone).toBe("danger");
    expect(injured?.title).toContain("sore elbow");
  });

  it("emits no badges when the player has no capabilities set", () => {
    expect(playerCapabilityBadges(player(), { today })).toEqual([]);
  });
});
