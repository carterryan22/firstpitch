import { NextResponse, type NextRequest } from "next/server";
import { getRepos, type MetricEntryRecord } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { metricByKey } from "../../../../lib/metrics";

export const dynamic = "force-dynamic";

const VALID_VERIFICATION: MetricEntryRecord["verificationState"][] = [
  "self_entered",
  "video_attached",
  "device_captured",
  "coach_verified",
  "facility_verified",
  "event_verified",
];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const repos = getRepos();
  const player = await repos.players.byId(id);
  if (!player) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Same-team coach / the parent of this player / the player themself can read.
  const allowed =
    (player.teamId && (await userCanManageTeam(session.user.id, player.teamId))) ||
    player.parentUserId === session.user.id;
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const entries = await repos.metricEntries.list({ playerId: id });
  return NextResponse.json({ entries });
}

interface PostBody {
  metricKey?: string;
  value?: number;
  verificationState?: MetricEntryRecord["verificationState"];
  source?: string;
  notes?: string;
  recordedAt?: string;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as PostBody;
  const def = body.metricKey ? metricByKey(body.metricKey) : undefined;
  if (!def) return NextResponse.json({ error: "unknown_metric" }, { status: 400 });
  if (typeof body.value !== "number" || !Number.isFinite(body.value)) {
    return NextResponse.json({ error: "value_required" }, { status: 400 });
  }
  const verification = body.verificationState && VALID_VERIFICATION.includes(body.verificationState)
    ? body.verificationState
    : "self_entered";

  const repos = getRepos();
  const player = await repos.players.byId(id);
  if (!player) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const allowed =
    (player.teamId && (await userCanManageTeam(session.user.id, player.teamId))) ||
    player.parentUserId === session.user.id;
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const entry = await repos.metricEntries.create({
    playerId: id,
    metricKey: def.key,
    value: body.value,
    recordedAt: body.recordedAt ?? new Date().toISOString(),
    verificationState: verification,
    source: body.source,
    notes: body.notes,
  });
  await repos.audit.log({
    userId: session.user.id,
    action: "metric_recorded",
    resource: `player:${id}`,
    metadata: { metricKey: def.key, value: body.value, verificationState: verification },
  });
  return NextResponse.json({ entry });
}
