import { NextRequest, NextResponse } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: teamId } = await ctx.params;
  if (!(await userCanManageTeam(session.user.id, teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let body: { email?: string; name?: string; role?: "coach" | "player" | "parent"; playerId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  const role = body.role;
  if (!email || !role) {
    return NextResponse.json({ error: "email and role are required" }, { status: 400 });
  }
  const repos = getRepos();

  // When linking a player/parent account to a specific roster player, the
  // player must belong to this team. This link is what lets a player account
  // complete coach-assigned missions and a parent see their child's progress.
  let playerId: string | undefined;
  if (body.playerId && (role === "player" || role === "parent")) {
    const player = await repos.players.byId(body.playerId);
    if (!player || player.teamId !== teamId) {
      return NextResponse.json({ error: "player not on this team" }, { status: 400 });
    }
    playerId = player.id;
  }

  // Auto-provision the user so an invite works before they ever sign in.
  const user = await repos.users.upsert({ email, name: body.name, role });
  const membership = await repos.teamMemberships.upsert({
    teamId,
    userId: user.id,
    role,
    playerId,
  });

  // A parent linked to a child owns that child's profile: set parentUserId so
  // the child surfaces on the parent's /parent dashboard (players.byParent).
  if (role === "parent" && playerId) {
    await repos.players.update(playerId, { parentUserId: user.id });
  }

  await repos.audit.log({
    userId: session.user.id,
    action: "team_member_added",
    resource: `team:${teamId}`,
    metadata: { memberUserId: user.id, role, playerId },
  });
  return NextResponse.json({ membership, user });
}
