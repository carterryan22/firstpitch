import { NextResponse, type NextRequest } from "next/server";
import { getRepos, type Attendance, type GameStatus, type HomeAway, type PitchEntry, type SnackDuty } from "@platform/storage";
import { getSession } from "../../../lib/session";
import { userCanManageTeam } from "../../../lib/teams";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const repos = getRepos();
  const game = await repos.games.byId(id);
  if (!game) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await userCanManageTeam(session.user.id, game.teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ game });
}

interface PatchBody {
  opponent?: string;
  startsAt?: string;
  venue?: string;
  homeAway?: HomeAway;
  innings?: number;
  notes?: string;
  status?: GameStatus;
  attendance?: Record<string, Attendance>;
  lineup?: Array<Record<string, string>>;
  battingOrder?: string[];
  pitchCounts?: Record<string, PitchEntry>;
  finalScore?: { us: number; them: number };
  markCompleted?: boolean;
  resetLineup?: boolean;
  revertToDraft?: boolean;
  isScrimmage?: boolean;
  snackDuty?: SnackDuty | null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const repos = getRepos();
  const existing = await repos.games.byId(id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await userCanManageTeam(session.user.id, existing.teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as PatchBody;

  const patch: Record<string, unknown> = {};
  if (typeof body.opponent === "string" && body.opponent.trim()) patch.opponent = body.opponent.trim();
  if (typeof body.startsAt === "string") {
    const d = new Date(body.startsAt);
    if (!Number.isNaN(d.getTime())) patch.startsAt = d.toISOString();
  }
  if (body.venue !== undefined) patch.venue = body.venue.trim() || undefined;
  if (body.homeAway) patch.homeAway = body.homeAway === "away" ? "away" : "home";
  if (typeof body.innings === "number") patch.innings = Math.max(1, Math.min(15, body.innings));
  if (body.notes !== undefined) patch.notes = body.notes.trim() || undefined;
  if (body.status) patch.status = body.status;
  if (body.attendance) patch.attendance = body.attendance;
  if (body.lineup) patch.lineup = body.lineup;
  if (body.battingOrder) patch.battingOrder = body.battingOrder;
  if (body.pitchCounts) patch.pitchCounts = body.pitchCounts;
  if (body.finalScore) patch.finalScore = body.finalScore;
  if (body.resetLineup) {
    patch.lineup = [];
    patch.battingOrder = [];
  }
  if (body.markCompleted) {
    patch.status = "completed";
    patch.completedAt = new Date().toISOString();
  }
  if (body.revertToDraft) {
    patch.status = "scheduled";
    patch.completedAt = undefined;
  }
  if (typeof body.isScrimmage === "boolean") {
    patch.isScrimmage = body.isScrimmage;
  }
  if (body.snackDuty !== undefined) {
    if (body.snackDuty === null || !body.snackDuty.name?.trim()) {
      patch.snackDuty = undefined;
    } else {
      patch.snackDuty = {
        name: body.snackDuty.name.trim().slice(0, 80),
        volunteerId: body.snackDuty.volunteerId?.slice(0, 120) || undefined,
      };
    }
  }

  const updated = await repos.games.update(id, patch);
  await repos.audit.log({
    userId: session.user.id,
    action: "game_updated",
    resource: `game:${id}`,
    metadata: { fields: Object.keys(patch) },
  });
  return NextResponse.json({ game: updated });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const repos = getRepos();
  const existing = await repos.games.byId(id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await userCanManageTeam(session.user.id, existing.teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await repos.games.delete(id);
  await repos.audit.log({
    userId: session.user.id,
    action: "game_deleted",
    resource: `game:${id}`,
  });
  return NextResponse.json({ ok: true });
}
