import { NextResponse } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../../lib/session";
import { userCanReadTeam, userCanManageTeam } from "../../../../../lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await ctx.params;
  const repos = getRepos();
  const assignment = await repos.missionAssignments.byId(id);
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const player = await repos.players.byId(assignment.playerId);
  const isCoach = await userCanManageTeam(session.user.id, assignment.teamId);
  const isPlayerOrParent =
    (await userCanReadTeam(session.user.id, assignment.teamId)) &&
    (session.user.id === player?.parentUserId ||
      (
        await repos.teamMemberships.list({ userId: session.user.id, teamId: assignment.teamId })
      ).some((m) => m.role === "player" && m.playerId === assignment.playerId));
  if (!isCoach && !isPlayerOrParent) {
    return NextResponse.json({ error: "Not permitted" }, { status: 403 });
  }

  if (assignment.completedAt) {
    return NextResponse.json({ ok: true, assignment, alreadyComplete: true });
  }

  const updated = await repos.missionAssignments.start(id);
  await repos.audit.log({
    userId: session.user.id,
    action: "mission_started",
    resource: `assignment:${id}`,
  });
  return NextResponse.json({ ok: true, assignment: updated });
}
