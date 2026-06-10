import { NextResponse } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../lib/session";
import { userCanManageTeam } from "../../../lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Remove a quick-tag (undo a mis-tap). Only a coach who manages the tag's team. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const repos = getRepos();
  const tag = await repos.quickTags.byId(id);
  if (!tag) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await userCanManageTeam(session.user.id, tag.teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await repos.quickTags.delete(id);
  return NextResponse.json({ ok: true });
}
