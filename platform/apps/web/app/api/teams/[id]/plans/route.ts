import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/session";
import { plansForTeam, userCanReadTeam } from "../../../../lib/teams";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: teamId } = await ctx.params;
  if (!userCanReadTeam(session.user.id, teamId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ plans: plansForTeam(teamId) });
}
