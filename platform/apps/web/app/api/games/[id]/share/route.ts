import { NextResponse } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { pressBoxPath } from "../../../../lib/pressBox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.user.role !== "coach" && session.user.role !== "admin") {
    return NextResponse.json({ error: "Coach only" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const repos = getRepos();
  const game = await repos.games.byId(id);
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  if (!(await userCanManageTeam(session.user.id, game.teamId))) {
    return NextResponse.json({ error: "Not your team" }, { status: 403 });
  }
  let body: { enabled?: boolean } = {};
  try {
    body = (await req.json()) as { enabled?: boolean };
  } catch {
    /* empty body = toggle */
  }
  const next = typeof body.enabled === "boolean" ? body.enabled : !game.shareEnabled;
  const updated = await repos.games.update(id, { shareEnabled: next });
  await repos.audit.log({
    userId: session.user.id,
    action: next ? "press_box_enabled" : "press_box_disabled",
    resource: `game:${id}`,
  });
  return NextResponse.json({
    ok: true,
    shareEnabled: !!updated?.shareEnabled,
    path: updated?.shareEnabled ? pressBoxPath(id) : null,
  });
}
