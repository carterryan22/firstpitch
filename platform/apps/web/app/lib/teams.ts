// Server-side helpers for team scoping: who can see what, and resolve memberships.

import { getRepos } from "@platform/storage";
import type { TeamMembershipRecord, TeamRecord, PlanRecord, UserRecord } from "@platform/storage";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function uniqueSlug(base: string): Promise<string> {
  const repos = getRepos();
  let candidate = base || "team";
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await repos.teams.bySlug(candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

export async function getTeamsForUser(userId: string): Promise<TeamRecord[]> {
  const repos = getRepos();
  const memberships = await repos.teamMemberships.list({ userId });
  const ids = new Set(memberships.map((m) => m.teamId));
  const all = await repos.teams.list();
  return all.filter((t) => ids.has(t.id));
}

export async function getTeamRoster(teamId: string): Promise<{
  team: TeamRecord | undefined;
  coaches: Array<{ user: UserRecord; membership: TeamMembershipRecord }>;
  players: Array<{ user: UserRecord; membership: TeamMembershipRecord }>;
  parents: Array<{ user: UserRecord; membership: TeamMembershipRecord }>;
}> {
  const repos = getRepos();
  const team = await repos.teams.byId(teamId);
  const memberships = await repos.teamMemberships.list({ teamId });
  const userIds = Array.from(new Set(memberships.map((m) => m.userId)));
  const users = new Map<string, UserRecord>();
  await Promise.all(
    userIds.map(async (id) => {
      const u = await repos.users.byId(id);
      if (u) users.set(id, u);
    })
  );
  const hydrate = (role: "coach" | "player" | "parent") =>
    memberships
      .filter((m) => m.role === role)
      .map((m) => ({ user: users.get(m.userId)!, membership: m }))
      .filter((row) => row.user);
  return {
    team,
    coaches: hydrate("coach"),
    players: hydrate("player"),
    parents: hydrate("parent"),
  };
}

export async function userCanReadTeam(userId: string, teamId: string): Promise<boolean> {
  const repos = getRepos();
  const m = await repos.teamMemberships.list({ teamId, userId });
  return m.length > 0;
}

export async function userCanManageTeam(userId: string, teamId: string): Promise<boolean> {
  const repos = getRepos();
  const m = await repos.teamMemberships.list({ teamId, userId });
  return m.some((row) => row.role === "coach");
}

export async function plansForUser(userId: string): Promise<PlanRecord[]> {
  const repos = getRepos();
  const memberships = await repos.teamMemberships.list({ userId });
  const teamIds = memberships.map((m) => m.teamId);
  if (teamIds.length === 0) return [];
  const plans = await repos.plans.list({ teamIds });
  return plans.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function plansForTeam(teamId: string): Promise<PlanRecord[]> {
  const plans = await getRepos().plans.list({ teamId });
  return plans.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
