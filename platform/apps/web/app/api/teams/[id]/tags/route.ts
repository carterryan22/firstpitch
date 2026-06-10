import { NextResponse, type NextRequest } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { isValidQuickTagCode } from "../../../../lib/quickTags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  /** Single tag code, or use `codes` for several at once (Fix-Last-Game). */
  code?: string;
  codes?: string[];
  /** Player the tag is about. Omit for a team-wide game symptom. */
  playerId?: string;
  /** Game the tag was captured from. */
  gameId?: string;
  note?: string;
}

/**
 * Record one or more quick-tags (one-tap coach observations). Coach-only. A tag
 * may be player-scoped (Coach Memory), team-scoped (a game symptom for
 * Fix-Last-Game), or both. Unknown codes are rejected so the taxonomy stays the
 * single source of truth.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: teamId } = await ctx.params;
  if (!(await userCanManageTeam(session.user.id, teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const rawCodes = body.codes?.length ? body.codes : body.code ? [body.code] : [];
  const codes = Array.from(new Set(rawCodes.filter(isValidQuickTagCode))).slice(0, 20);
  if (codes.length === 0) {
    return NextResponse.json({ error: "no_valid_codes" }, { status: 422 });
  }

  const repos = getRepos();

  // A player-scoped tag must reference a player on this team.
  let playerId: string | undefined;
  if (body.playerId) {
    const player = await repos.players.byId(body.playerId);
    if (!player || player.teamId !== teamId) {
      return NextResponse.json({ error: "player_not_on_team" }, { status: 422 });
    }
    playerId = player.id;
  }

  // A game-scoped tag must reference a game on this team.
  let gameId: string | undefined;
  if (body.gameId) {
    const game = await repos.games.byId(body.gameId);
    if (!game || game.teamId !== teamId) {
      return NextResponse.json({ error: "game_not_on_team" }, { status: 422 });
    }
    gameId = game.id;
  }

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 280) : undefined;

  const created = [];
  for (const code of codes) {
    created.push(
      await repos.quickTags.create({
        teamId,
        playerId,
        gameId,
        code,
        note: note || undefined,
        createdByUserId: session.user.id,
      }),
    );
  }

  await repos.audit.log({
    userId: session.user.id,
    action: "quick_tags_added",
    resource: `team:${teamId}`,
    metadata: { count: created.length, codes, playerId, gameId },
  });

  return NextResponse.json({ ok: true, tags: created });
}
