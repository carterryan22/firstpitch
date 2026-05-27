import { NextResponse, type NextRequest } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";

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
  const notes = await repos.gameNotes.list({ gameId: id });
  notes.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json({ notes });
}

interface CreateBody {
  playerId?: string;
  body?: string;
  playLabel?: string;
  inningIdx?: number;
  shareWithParents?: boolean;
  shareWithPlayer?: boolean;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const repos = getRepos();
  const game = await repos.games.byId(id);
  if (!game) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await userCanManageTeam(session.user.id, game.teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as CreateBody;
  if (!body.playerId || !body.body?.trim()) {
    return NextResponse.json({ error: "playerId and body are required" }, { status: 400 });
  }
  const player = await repos.players.byId(body.playerId);
  if (!player || player.teamId !== game.teamId) {
    return NextResponse.json({ error: "player_not_on_team" }, { status: 400 });
  }
  const note = await repos.gameNotes.create({
    gameId: id,
    teamId: game.teamId,
    playerId: body.playerId,
    authorUserId: session.user.id,
    body: body.body.trim().slice(0, 2000),
    playLabel: body.playLabel?.trim().slice(0, 120) || undefined,
    inningIdx:
      typeof body.inningIdx === "number" && body.inningIdx >= 0 ? body.inningIdx : undefined,
    shareWithParents: !!body.shareWithParents,
    shareWithPlayer: !!body.shareWithPlayer,
  });
  await repos.audit.log({
    userId: session.user.id,
    action: "game_note_created",
    resource: `game_note:${note.id}`,
    metadata: {
      gameId: id,
      playerId: body.playerId,
      shareWithParents: note.shareWithParents,
      shareWithPlayer: note.shareWithPlayer,
    },
  });
  return NextResponse.json({ note }, { status: 201 });
}
