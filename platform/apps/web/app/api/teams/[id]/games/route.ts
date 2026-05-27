import { NextResponse, type NextRequest } from "next/server";
import { getRepos, type HomeAway } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam, userCanReadTeam } from "../../../../lib/teams";
import { gamesForTeam } from "../../../../lib/games";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: teamId } = await ctx.params;
  if (!(await userCanReadTeam(session.user.id, teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ games: await gamesForTeam(teamId) });
}

interface CreateBody {
  opponent?: string;
  startsAt?: string;
  venue?: string;
  homeAway?: HomeAway;
  innings?: number;
  notes?: string;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: teamId } = await ctx.params;
  if (!(await userCanManageTeam(session.user.id, teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as CreateBody;
  const opponent = (body.opponent ?? "").trim();
  if (!opponent || !body.startsAt) {
    return NextResponse.json({ error: "opponent and startsAt required" }, { status: 400 });
  }
  const startsAt = new Date(body.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "invalid startsAt" }, { status: 400 });
  }
  const repos = getRepos();
  const game = await repos.games.create({
    teamId,
    opponent,
    startsAt: startsAt.toISOString(),
    venue: body.venue?.trim() || undefined,
    homeAway: body.homeAway === "away" ? "away" : "home",
    innings: Number.isFinite(body.innings) ? Math.max(1, Math.min(15, Number(body.innings))) : 6,
    status: "scheduled",
    notes: body.notes?.trim() || undefined,
  });
  await repos.audit.log({
    userId: session.user.id,
    action: "game_created",
    resource: `game:${game.id}`,
    metadata: { teamId },
  });
  return NextResponse.json({ game });
}
