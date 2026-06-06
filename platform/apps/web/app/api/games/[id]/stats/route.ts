import { NextResponse, type NextRequest } from "next/server";
import { getRepos, type PlayerGameStatsRecord } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { parseGameChangerCsv, type ParsedPlayerRow } from "../../../../lib/gamechangerParse";
import { computeGameRating } from "../../../../lib/playerStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImportBody =
  | { format: "gamechanger"; csv: string }
  | { format: "manual"; entries: Array<Pick<PlayerGameStatsRecord, "playerId" | "batting" | "pitching" | "fielding">> };

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: gameId } = await ctx.params;
  const repos = getRepos();
  const game = await repos.games.byId(gameId);
  if (!game) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await userCanManageTeam(session.user.id, game.teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as ImportBody | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const roster = await repos.players.byTeam(game.teamId);
  const rosterLite = roster.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    jerseyNumber: p.jerseyNumber,
  }));

  let parsed: ParsedPlayerRow[] = [];
  let warnings: string[] = [];
  let kind = "manual";

  if (body.format === "gamechanger") {
    if (!body.csv || typeof body.csv !== "string") {
      return NextResponse.json({ error: "missing_csv" }, { status: 400 });
    }
    const result = parseGameChangerCsv(body.csv, rosterLite);
    parsed = result.rows;
    warnings = result.warnings;
    kind = result.kind;
  } else if (body.format === "manual") {
    parsed = (body.entries ?? []).map((e) => ({
      playerId: e.playerId,
      match: "exact" as const,
      raw: {},
      batting: e.batting,
      pitching: e.pitching,
      fielding: e.fielding,
    }));
  } else {
    return NextResponse.json({ error: "unknown_format" }, { status: 400 });
  }

  const attendance = game.attendance ?? {};
  const upserted: PlayerGameStatsRecord[] = [];
  for (const row of parsed) {
    if (!row.playerId) continue;
    // Merge with existing record so editing one block (e.g. pitching) doesn't wipe another (e.g. batting).
    const existing = (await repos.playerGameStats.list({ gameId, playerId: row.playerId }))[0];
    const merged = {
      batting: row.batting ?? existing?.batting,
      pitching: row.pitching ?? existing?.pitching,
      fielding: row.fielding ?? existing?.fielding,
    };
    const rating = computeGameRating({
      batting: merged.batting,
      pitching: merged.pitching,
      fielding: merged.fielding,
      attendance: attendance[row.playerId] === "absent" ? "absent" : "present",
    });
    const rec = await repos.playerGameStats.upsert({
      playerId: row.playerId,
      teamId: game.teamId,
      gameId,
      batting: merged.batting,
      pitching: merged.pitching,
      fielding: merged.fielding,
      rating: rating.score,
      ratingLabel: rating.label,
      highlights: rating.highlights,
      source: body.format === "gamechanger" ? "gamechanger" : "manual",
    });
    upserted.push(rec);
  }

  await repos.audit.log({
    userId: session.user.id,
    action: "game_stats_imported",
    resource: `game:${gameId}`,
    metadata: {
      format: body.format,
      kind,
      rows: parsed.length,
      upserted: upserted.length,
      unmatched: parsed.length - upserted.length,
    },
  });

  return NextResponse.json({
    kind,
    upsertedCount: upserted.length,
    unmatchedCount: parsed.filter((r) => !r.playerId).length,
    warnings,
    upserted,
  });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: gameId } = await ctx.params;
  const repos = getRepos();
  const game = await repos.games.byId(gameId);
  if (!game) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await userCanManageTeam(session.user.id, game.teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const stats = await repos.playerGameStats.list({ gameId });
  return NextResponse.json({ stats });
}
