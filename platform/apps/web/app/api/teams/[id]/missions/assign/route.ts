import { NextResponse } from "next/server";
import { getRepos } from "@platform/storage";
import { MISSIONS } from "@platform/missions";
import { getSession } from "../../../../../lib/session";
import { userCanManageTeam } from "../../../../../lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  missionId?: string;
  playerIds?: string[];
  all?: boolean;
  dueAt?: string;
  notes?: string;
  planId?: string;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.user.role !== "coach" && session.user.role !== "admin") {
    return NextResponse.json({ error: "Coach only" }, { status: 403 });
  }
  const { id: teamId } = await ctx.params;
  if (!(await userCanManageTeam(session.user.id, teamId))) {
    return NextResponse.json({ error: "Not your team" }, { status: 403 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.missionId) {
    return NextResponse.json({ error: "missionId required" }, { status: 400 });
  }
  if (!body.all && (!Array.isArray(body.playerIds) || body.playerIds.length === 0)) {
    return NextResponse.json({ error: "playerIds required (or set all:true)" }, { status: 400 });
  }
  if (!MISSIONS.some((m) => m.id === body.missionId)) {
    return NextResponse.json({ error: "Unknown missionId" }, { status: 400 });
  }
  if (body.playerIds && body.playerIds.length > 50) {
    return NextResponse.json({ error: "Too many players in one assign call" }, { status: 400 });
  }
  if (body.notes && body.notes.length > 500) {
    return NextResponse.json({ error: "notes too long" }, { status: 400 });
  }
  if (body.dueAt && Number.isNaN(Date.parse(body.dueAt))) {
    return NextResponse.json({ error: "dueAt must be ISO date" }, { status: 400 });
  }

  const repos = getRepos();
  const teamPlayers = (await repos.players.byTeam(teamId)).filter((p) => !p.archivedAt);
  const teamPlayerIds = new Set(teamPlayers.map((p) => p.id));
  const requestedIds = body.all
    ? teamPlayers.map((p) => p.id)
    : (body.playerIds ?? []).filter((pid) => teamPlayerIds.has(pid));
  const validIds = requestedIds.slice(0, 50);
  if (validIds.length === 0) {
    return NextResponse.json({ error: "No valid players on this team" }, { status: 400 });
  }

  const created = await repos.missionAssignments.bulkCreate(
    validIds.map((pid) => ({
      teamId,
      playerId: pid,
      missionId: body.missionId!,
      assignedByUserId: session.user.id,
      dueAt: body.dueAt,
      planId: body.planId,
      notes: body.notes,
    })),
  );
  await repos.audit.log({
    userId: session.user.id,
    action: "mission_assigned",
    resource: `team:${teamId}`,
    metadata: { missionId: body.missionId, count: created.length },
  });
  return NextResponse.json({ ok: true, assignments: created });
}
