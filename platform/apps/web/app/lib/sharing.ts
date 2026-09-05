import type { PlayerRecord, TeamRecord } from "@platform/storage";

/** Legacy teams are private unless a coach explicitly publishes the page. */
export function isPublicTeamPageEnabled(team: Pick<TeamRecord, "publicPageEnabled">): boolean {
  return team.publicPageEnabled === true;
}

/**
 * Player-identifying data may only leave authenticated team surfaces after a
 * parent/guardian has explicitly granted consent. Undefined legacy state is
 * deliberately treated as no consent.
 */
export function hasPublicPlayerSharingConsent(
  player: Pick<PlayerRecord, "consentStatus" | "archivedAt">,
): boolean {
  return !player.archivedAt && player.consentStatus === "granted";
}

export function filterPlayersSafeForPublicSharing<T extends Pick<PlayerRecord, "consentStatus" | "archivedAt">>(
  players: T[],
): T[] {
  return players.filter(hasPublicPlayerSharingConsent);
}
