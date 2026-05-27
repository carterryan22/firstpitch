import { NextResponse, type NextRequest } from "next/server";
import { getRepos, type GoalRecord } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { metricByKey } from "../../../../lib/metrics";

export const dynamic = "force-dynamic";

interface PostBody {
  metricKey?: string;
  type?: GoalRecord["type"];
  target?: number;
  baseline?: number;
  targetDate?: string;
  notes?: string;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const repos = getRepos();
  const player = await repos.players.byId(id);
  if (!player) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const allowed =
    (player.teamId && (await userCanManageTeam(session.user.id, player.teamId))) ||
    player.parentUserId === session.user.id;
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const goals = await repos.goals.list({ playerId: id });
  return NextResponse.json({ goals });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as PostBody;
  const def = body.metricKey ? metricByKey(body.metricKey) : undefined;
  if (!def) return NextResponse.json({ error: "unknown_metric" }, { status: 400 });
  if (def.cls === "guardrail") {
    return NextResponse.json({ error: "metric_not_goalable" }, { status: 400 });
  }
  const type = body.type === "absolute" ? "absolute" : "delta";
  if (typeof body.target !== "number" || !Number.isFinite(body.target)) {
    return NextResponse.json({ error: "target_required" }, { status: 400 });
  }
  if (typeof body.baseline !== "number" || !Number.isFinite(body.baseline)) {
    return NextResponse.json({ error: "baseline_required" }, { status: 400 });
  }

  const repos = getRepos();
  const player = await repos.players.byId(id);
  if (!player) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!player.teamId || !(await userCanManageTeam(session.user.id, player.teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const goal = await repos.goals.create({
    playerId: id,
    metricKey: def.key,
    type,
    target: body.target,
    baseline: body.baseline,
    targetDate: body.targetDate,
    status: "active",
    createdByUserId: session.user.id,
    notes: body.notes,
  });
  await repos.audit.log({
    userId: session.user.id,
    action: "goal_created",
    resource: `player:${id}`,
    metadata: { goalId: goal.id, metricKey: def.key, type, target: body.target, baseline: body.baseline },
  });
  return NextResponse.json({ goal });
}
