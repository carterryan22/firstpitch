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

export function uniqueSlug(base: string): string {
  const repos = getRepos();
  let candidate = base || "team";
  let n = 1;
  while (repos.teams.bySlug(candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

export interface TeamWithRoster {
  team: TeamRecord;
  membership: TeamMembershipRecord;
  coaches: Array<{ user: UserRecord; membership: TeamMembershipRecord }>;
  players: Array<{ user: UserRecord; membership: TeamMembershipRecord }>;
  parents: Array<{ user: UserRecord; membership: TeamMembershipRecord }>;
}

export function getTeamsForUser(userId: string): TeamRecord[] {
  const repos = getRepos();
  const ids = new Set(repos.teamMemberships.list({ userId }).map((m) => m.teamId));
  return repos.teams.list().filter((t) => ids.has(t.id));
}

export function getTeamRoster(teamId: string): {
  team: TeamRecord | undefined;
  coaches: Array<{ user: UserRecord; membership: TeamMembershipRecord }>;
  players: Array<{ user: UserRecord; membership: TeamMembershipRecord }>;
  parents: Array<{ user: UserRecord; membership: TeamMembershipRecord }>;
} {
  const repos = getRepos();
  const team = repos.teams.byId(teamId);
  const memberships = repos.teamMemberships.list({ teamId });
  const hydrate = (role: "coach" | "player" | "parent") =>
    memberships
      .filter((m) => m.role === role)
      .map((m) => ({ user: repos.users.byId(m.userId)!, membership: m }))
      .filter((row) => row.user);
  return {
    team,
    coaches: hydrate("coach"),
    players: hydrate("player"),
    parents: hydrate("parent"),
  };
}

export function userCanReadTeam(userId: string, teamId: string): boolean {
  const repos = getRepos();
  return repos.teamMemberships.list({ teamId, userId }).length > 0;
}

export function userCanManageTeam(userId: string, teamId: string): boolean {
  const repos = getRepos();
  const m = repos.teamMemberships.list({ teamId, userId });
  return m.some((row) => row.role === "coach");
}

export function plansForUser(userId: string): PlanRecord[] {
  const repos = getRepos();
  const teamIds = repos.teamMemberships.list({ userId }).map((m) => m.teamId);
  if (teamIds.length === 0) return [];
  return repos.plans
    .list({ teamIds })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function plansForTeam(teamId: string): PlanRecord[] {
  return getRepos()
    .plans.list({ teamId })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
