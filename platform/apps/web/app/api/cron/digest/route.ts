import { NextRequest, NextResponse } from "next/server";
import { getRepos } from "@platform/storage";
import { buildTeamDigest, type TeamDigest } from "../../../lib/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function buildAll(teamIdFilter?: string): Promise<TeamDigest[]> {
  const repos = getRepos();
  const allTeams = await repos.teams.list();
  const teams = teamIdFilter ? allTeams.filter((t) => t.id === teamIdFilter) : allTeams;
  const digests: TeamDigest[] = [];
  for (const team of teams) {
    const [players, games, allPlans, goals, metricEntries] = await Promise.all([
      repos.players.byTeam(team.id),
      repos.games.list({ teamId: team.id }),
      repos.plans.list({}),
      repos.goals.list({ teamId: team.id }),
      repos.metricEntries.list({}),
    ]);
    const plans = allPlans.filter((p) => p.teamId === team.id);
    const playerIds = new Set(players.map((p) => p.id));
    const teamMetricEntries = metricEntries.filter((e) => playerIds.has(e.playerId));
    digests.push(
      buildTeamDigest({ team, players, games, plans, goals, metricEntries: teamMetricEntries }),
    );
  }
  return digests;
}

function authorizeCron(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // No secret configured = open for local dev.
  const header = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === expected;
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const teamId = url.searchParams.get("teamId") ?? undefined;
  const digests = await buildAll(teamId);

  await getRepos().audit.log({
    action: "cron_digest",
    resource: teamId ? `team:${teamId}` : "all",
    metadata: { count: digests.length },
  });

  return NextResponse.json({ digests, generatedAt: new Date().toISOString() });
}
