/**
 * Data-subject export (GDPR/CCPA/COPPA). Assembles everything we hold that is
 * tied to a user: their account, the players they own/parent, the teams they
 * run, their plans/goals, and the metrics for their children. Read-only.
 */
import { getRepos, type Role } from "@platform/storage";

export interface DataExportBundle {
  generatedAt: string;
  subject: { id: string; email: string; role: Role; name?: string };
  account: unknown;
  players: unknown[];
  teamsOwned: unknown[];
  memberships: unknown[];
  plansCreated: unknown[];
  goals: unknown[];
  metricEntries: unknown[];
  consents: unknown[];
  notice: string;
}

export async function buildDataExport(userId: string): Promise<DataExportBundle | null> {
  const repos = getRepos();
  const user = await repos.users.byId(userId);
  if (!user) return null;

  // Players this user parents, plus players on teams they own.
  const parented = await repos.players.byParent(userId);
  const allTeams = await repos.teams.list();
  const teamsOwned = allTeams.filter((t) => t.ownerCoachUserId === userId);
  const ownedTeamPlayers = (
    await Promise.all(teamsOwned.map((t) => repos.players.byTeam(t.id, { includeArchived: true })))
  ).flat();

  const playerMap = new Map<string, (typeof parented)[number]>();
  for (const p of [...parented, ...ownedTeamPlayers]) playerMap.set(p.id, p);
  const players = [...playerMap.values()];
  const playerIds = players.map((p) => p.id);

  const memberships = await repos.teamMemberships.list({ userId });
  const plansCreated = await repos.plans.list({ createdByUserId: userId });
  const goals = (
    await Promise.all(playerIds.map((pid) => repos.goals.list({ playerId: pid })))
  ).flat();
  const metricEntries = playerIds.length
    ? await repos.metricEntries.list({ playerIds })
    : [];
  const consents = (
    await Promise.all(playerIds.map((pid) => repos.consents.list({ playerId: pid })))
  ).flat();

  return {
    generatedAt: new Date().toISOString(),
    subject: { id: user.id, email: user.email, role: user.role, name: user.name },
    account: user,
    players,
    teamsOwned,
    memberships,
    plansCreated,
    goals,
    metricEntries,
    consents,
    notice:
      "This file contains the personal data First Pitch associates with your account. " +
      "To request correction or deletion, see /policy/data-requests or email privacy@firstpitch.app.",
  };
}
