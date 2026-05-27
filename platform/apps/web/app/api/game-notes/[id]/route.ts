import { NextResponse, type NextRequest } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../lib/session";
import { userCanManageTeam } from "../../../lib/teams";

export const dynamic = "force-dynamic";

interface PatchBody {
  body?: string;
  playLabel?: string | null;
  inningIdx?: number | null;
  shareWithParents?: boolean;
  shareWithPlayer?: boolean;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const repos = getRepos();
  const note = await repos.gameNotes.byId(id);
  if (!note) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await userCanManageTeam(session.user.id, note.teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const patch: Record<string, unknown> = {};
  if (typeof body.body === "string" && body.body.trim()) patch.body = body.body.trim().slice(0, 2000);
  if (body.playLabel !== undefined) {
    patch.playLabel = body.playLabel ? body.playLabel.trim().slice(0, 120) : undefined;
  }
  if (body.inningIdx !== undefined) {
    patch.inningIdx = body.inningIdx === null ? undefined : Math.max(0, body.inningIdx);
  }
  if (typeof body.shareWithParents === "boolean") patch.shareWithParents = body.shareWithParents;
  if (typeof body.shareWithPlayer === "boolean") patch.shareWithPlayer = body.shareWithPlayer;
  const updated = await repos.gameNotes.update(id, patch);
  await repos.audit.log({
    userId: session.user.id,
    action: "game_note_updated",
    resource: `game_note:${id}`,
    metadata: { fields: Object.keys(patch) },
  });
  return NextResponse.json({ note: updated });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const repos = getRepos();
  const note = await repos.gameNotes.byId(id);
  if (!note) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await userCanManageTeam(session.user.id, note.teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await repos.gameNotes.delete(id);
  await repos.audit.log({
    userId: session.user.id,
    action: "game_note_deleted",
    resource: `game_note:${id}`,
  });
  return NextResponse.json({ ok: true });
}
