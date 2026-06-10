import { NextResponse, type NextRequest } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { getTeamRoster, userCanManageTeam } from "../../../../lib/teams";
import { gamesForTeam, splitUpcomingPast } from "../../../../lib/games";
import { buildSnackRotation, type SnackVolunteer } from "../../../../lib/snackRotation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  /** Optional explicit volunteer pool; defaults to the team's parents. */
  volunteers?: Array<{ id: string; name: string }>;
  /** When true, leave games that already have a snackDuty untouched. */
  keepExisting?: boolean;
}

/**
 * Auto-balance snack duty across all upcoming games (game-day ref §3.12). Pulls the
 * volunteer pool from the team's parents unless the body overrides it, runs the
 * deterministic balancer, and persists `snackDuty` on each upcoming game.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: teamId } = await ctx.params;
  if (!(await userCanManageTeam(session.user.id, teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as Body;

  let volunteers: SnackVolunteer[];
  if (body.volunteers?.length) {
    volunteers = body.volunteers
      .filter((v) => v.name?.trim())
      .map((v) => ({ id: v.id.slice(0, 120), name: v.name.trim().slice(0, 80) }));
  } else {
    const { parents } = await getTeamRoster(teamId);
    volunteers = parents.map((p) => ({
      id: p.user.id,
      name: p.user.name || p.user.email || "Parent",
    }));
  }
  if (volunteers.length === 0) {
    return NextResponse.json({ error: "no_volunteers" }, { status: 422 });
  }

  const all = await gamesForTeam(teamId);
  const { upcoming, past } = splitUpcomingPast(all);

  // Seed prior counts from past games so the season stays balanced over time.
  const priorCounts: Record<string, number> = {};
  for (const g of past) {
    const vid = g.snackDuty?.volunteerId;
    if (vid) priorCounts[vid] = (priorCounts[vid] ?? 0) + 1;
  }

  const rotation = buildSnackRotation({
    games: upcoming.map((g) => ({
      id: g.id,
      startsAt: g.startsAt,
      lockedVolunteerId:
        body.keepExisting && g.snackDuty?.volunteerId ? g.snackDuty.volunteerId : undefined,
    })),
    volunteers,
    priorCounts,
  });

  const repos = getRepos();
  await Promise.all(
    rotation.map((a) =>
      repos.games.update(a.gameId, {
        snackDuty: { volunteerId: a.volunteerId, name: a.volunteerName },
      }),
    ),
  );
  await repos.audit.log({
    userId: session.user.id,
    action: "snack_rotation_assigned",
    resource: `team:${teamId}`,
    metadata: { games: rotation.length, volunteers: volunteers.length },
  });

  return NextResponse.json({ ok: true, assignments: rotation });
}
