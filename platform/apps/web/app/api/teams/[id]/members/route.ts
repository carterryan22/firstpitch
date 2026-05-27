import { NextRequest, NextResponse } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: teamId } = await ctx.params;
  if (!userCanManageTeam(session.user.id, teamId)) {
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
  // Auto-provision the user so an invite works before they ever sign in.
  const user = repos.users.upsert({ email, name: body.name, role });
  const membership = repos.teamMemberships.upsert({
    teamId,
    userId: user.id,
    role,
    playerId: body.playerId,
  });
  repos.audit.log({
    userId: session.user.id,
    action: "team_member_added",
    resource: `team:${teamId}`,
    metadata: { memberUserId: user.id, role },
  });
  return NextResponse.json({ membership, user });
}
