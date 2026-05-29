import { NextResponse } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../../lib/session";
import { userCanReadTeam, userCanManageTeam } from "../../../../../lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await ctx.params;
  const repos = getRepos();
  const assignment = await repos.missionAssignments.byId(id);
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Coach on the team, the player themselves, or the linked parent may complete.
  const player = await repos.players.byId(assignment.playerId);
  const isCoach = await userCanManageTeam(session.user.id, assignment.teamId);
  const isPlayerOrParent =
    (await userCanReadTeam(session.user.id, assignment.teamId)) &&
    (session.user.id === player?.parentUserId ||
      // player accounts: match via team membership where role=player AND playerId matches
      (
        await repos.teamMemberships.list({ userId: session.user.id, teamId: assignment.teamId })
      ).some((m) => m.role === "player" && m.playerId === assignment.playerId));
  if (!isCoach && !isPlayerOrParent) {
    return NextResponse.json({ error: "Not permitted" }, { status: 403 });
  }

  let body: { evidence?: string } = {};
  try {
    body = (await req.json()) as { evidence?: string };
  } catch {
    /* empty */
  }

  if (assignment.completedAt) {
    return NextResponse.json({ ok: true, assignment, alreadyComplete: true });
  }

  const [updated] = await Promise.all([
    repos.missionAssignments.complete(id),
    repos.missionCompletions.create({
      playerId: assignment.playerId,
      missionId: assignment.missionId,
      completedAt: new Date().toISOString(),
      evidence: body.evidence,
    }),
  ]);
  await repos.audit.log({
    userId: session.user.id,
    action: "mission_completed",
    resource: `assignment:${id}`,
  });
  return NextResponse.json({ ok: true, assignment: updated });
}
