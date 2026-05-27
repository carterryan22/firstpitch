import { NextResponse } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../lib/session";
import { userCanReadTeam } from "../../../lib/teams";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const plan = getRepos().plans.byId(id);
  if (!plan) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!plan.teamId || !userCanReadTeam(session.user.id, plan.teamId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ plan });
}
