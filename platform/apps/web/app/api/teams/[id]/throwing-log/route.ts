import { NextResponse, type NextRequest } from "next/server";
import { getRepos, type ThrowingLogRecord } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIVITIES: ReadonlyArray<ThrowingLogRecord["activity"]> = [
  "game",
  "bullpen",
  "long_toss",
  "lesson",
  "practice",
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface PostBody {
  playerId?: string;
  date?: string;
  activity?: string;
  pitches?: unknown;
  throws?: unknown;
  catcherInnings?: unknown;
  intensity?: unknown;
  external?: unknown;
  soreness1to10?: unknown;
  notes?: unknown;
}

/** Clamp a non-negative integer field, or undefined to drop it. */
function int(v: unknown, max: number): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.min(Math.round(n), max);
}

/**
 * Log a non-game throwing exposure (bullpen, long toss, lesson, practice, or
 * innings caught) for a player so the Pitch Load Passport reflects TOTAL arm
 * load — not just game pitches. Coach/admin only.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: teamId } = await ctx.params;
  if (!(await userCanManageTeam(session.user.id, teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as PostBody;

  const repos = getRepos();
  const player = body.playerId ? await repos.players.byId(body.playerId) : undefined;
  if (!player || player.teamId !== teamId) {
    return NextResponse.json({ error: "player_not_on_team" }, { status: 422 });
  }

  const activity = ACTIVITIES.includes(body.activity as ThrowingLogRecord["activity"])
    ? (body.activity as ThrowingLogRecord["activity"])
    : null;
  if (!activity) return NextResponse.json({ error: "invalid_activity" }, { status: 422 });

  const date =
    typeof body.date === "string" && DATE_RE.test(body.date)
      ? body.date
      : new Date().toISOString().slice(0, 10);

  const pitches = int(body.pitches, 200);
  const throws = int(body.throws, 500);
  const catcherInnings = int(body.catcherInnings, 15);
  if (!pitches && !throws && !catcherInnings) {
    return NextResponse.json({ error: "no_load_recorded" }, { status: 422 });
  }

  const intensityRaw = int(body.intensity, 10);
  const intensity = intensityRaw && intensityRaw >= 1 ? intensityRaw : undefined;
  const sorenessRaw = int(body.soreness1to10, 10);
  const soreness1to10 = sorenessRaw && sorenessRaw >= 1 ? sorenessRaw : undefined;
  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim().slice(0, 500)
      : undefined;

  const rec = await repos.throwingLogs.create({
    teamId,
    playerId: player.id,
    date,
    activity,
    pitches,
    throws,
    catcherInnings,
    intensity,
    external: body.external === true || body.external === "true",
    soreness1to10,
    notes,
    createdByUserId: session.user.id,
  });

  await repos.audit.log({
    userId: session.user.id,
    action: "throwing_logged",
    resource: `player:${player.id}`,
    metadata: { teamId, activity, date, pitches, throws, catcherInnings },
  });

  return NextResponse.json({ ok: true, log: rec });
}

/** Remove a throwing-log entry. Coach/admin only; must belong to this team. */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: teamId } = await ctx.params;
  if (!(await userCanManageTeam(session.user.id, teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const logId = new URL(req.url).searchParams.get("logId");
  if (!logId) return NextResponse.json({ error: "missing_log_id" }, { status: 400 });

  const repos = getRepos();
  const log = await repos.throwingLogs.byId(logId);
  if (!log || log.teamId !== teamId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await repos.throwingLogs.delete(logId);
  await repos.audit.log({
    userId: session.user.id,
    action: "throwing_log_deleted",
    resource: `player:${log.playerId}`,
    metadata: { teamId, logId },
  });

  return NextResponse.json({ ok: true });
}
