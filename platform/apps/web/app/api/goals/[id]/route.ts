import { NextResponse, type NextRequest } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../lib/session";
import { userCanManageTeam } from "../../../lib/teams";

export const dynamic = "force-dynamic";

interface PatchBody {
  status?: "active" | "achieved" | "archived";
  targetDate?: string;
  target?: number;
  notes?: string;
}

async function authorize(goalId: string, userId: string) {
  const repos = getRepos();
  const goal = await repos.goals.byId(goalId);
  if (!goal) return { error: "not_found" as const };
  const player = await repos.players.byId(goal.playerId);
  if (!player?.teamId) return { error: "forbidden" as const };
  const ok = await userCanManageTeam(userId, player.teamId);
  if (!ok) return { error: "forbidden" as const };
  return { goal, repos };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const auth = await authorize(id, session.user.id);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.error === "not_found" ? 404 : 403 });
  }
  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const patch: Record<string, unknown> = {};
  if (body.status) {
    patch.status = body.status;
    if (body.status === "achieved") patch.achievedAt = new Date().toISOString();
    if (body.status === "archived") patch.archivedAt = new Date().toISOString();
  }
  if (typeof body.target === "number" && Number.isFinite(body.target)) patch.target = body.target;
  if (body.targetDate !== undefined) patch.targetDate = body.targetDate || undefined;
  if (body.notes !== undefined) patch.notes = body.notes;
  const updated = await auth.repos.goals.update(id, patch);
  await auth.repos.audit.log({
    userId: session.user.id,
    action: "goal_updated",
    resource: `goal:${id}`,
    metadata: patch,
  });
  return NextResponse.json({ goal: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const auth = await authorize(id, session.user.id);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.error === "not_found" ? 404 : 403 });
  }
  await auth.repos.goals.delete(id);
  await auth.repos.audit.log({
    userId: session.user.id,
    action: "goal_deleted",
    resource: `goal:${id}`,
  });
  return NextResponse.json({ ok: true });
}
