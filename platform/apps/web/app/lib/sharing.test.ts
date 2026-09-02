import { describe, expect, it } from "vitest";
import {
  filterPlayersSafeForPublicSharing,
  hasPublicPlayerSharingConsent,
  isPublicTeamPageEnabled,
} from "./sharing";

describe("public sharing privacy gates", () => {
  it("keeps legacy and explicitly private team pages private", () => {
    expect(isPublicTeamPageEnabled({})).toBe(false);
    expect(isPublicTeamPageEnabled({ publicPageEnabled: false })).toBe(false);
    expect(isPublicTeamPageEnabled({ publicPageEnabled: true })).toBe(true);
  });

  it("requires explicit granted consent for player-identifying data", () => {
    expect(hasPublicPlayerSharingConsent({})).toBe(false);
    expect(hasPublicPlayerSharingConsent({ consentStatus: "pending" })).toBe(false);
    expect(hasPublicPlayerSharingConsent({ consentStatus: "revoked" })).toBe(false);
    expect(hasPublicPlayerSharingConsent({ consentStatus: "granted" })).toBe(true);
    expect(
      hasPublicPlayerSharingConsent({ consentStatus: "granted", archivedAt: "2026-01-01T00:00:00Z" }),
    ).toBe(false);
  });

  it("filters a public roster fail-closed", () => {
    const players = [
      { id: "legacy" },
      { id: "pending", consentStatus: "pending" as const },
      { id: "allowed", consentStatus: "granted" as const },
      { id: "archived", consentStatus: "granted" as const, archivedAt: "2026-01-01" },
    ];
    expect(filterPlayersSafeForPublicSharing(players).map((p) => p.id)).toEqual(["allowed"]);
  });
});
