import { NextResponse, type NextRequest } from "next/server";
import { getRepos } from "@platform/storage";
import {
  gameChangerScheduleFromIcs,
  diffSchedule,
  type ExistingGameForDiff,
} from "@platform/ingest";
import { getSession } from "../../../../../lib/session";
import { userCanManageTeam } from "../../../../../lib/teams";
import { gamesForTeam } from "../../../../../lib/games";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ICS_BYTES = 2_000_000; // 2 MB

interface ImportBody {
  ics?: string;
  commit?: boolean;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: teamId } = await ctx.params;
  if (!(await userCanManageTeam(session.user.id, teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as ImportBody;
  const ics = (body.ics ?? "").trim();
  if (!ics) return NextResponse.json({ error: "ics is required" }, { status: 400 });
  if (ics.length > MAX_ICS_BYTES) {
    return NextResponse.json({ error: "calendar file is too large" }, { status: 413 });
  }

  const repos = getRepos();
  const team = await repos.teams.byId(teamId);
  if (!team) return NextResponse.json({ error: "team not found" }, { status: 404 });

  const parsed = gameChangerScheduleFromIcs(ics, team.name);
  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "No games found in that calendar. Export the schedule (.ics) from GameChanger and try again." },
      { status: 422 },
    );
  }

  const existing = await gamesForTeam(teamId);
  const existingForDiff: ExistingGameForDiff[] = existing.map((g) => ({
    id: g.id,
    sourceUid: g.sourceUid,
    opponent: g.opponent,
    startsAt: g.startsAt,
    venue: g.venue,
    homeAway: g.homeAway,
  }));

  const diff = diffSchedule(existingForDiff, parsed);
  const summary = {
    created: diff.created.length,
    updated: diff.updated.length,
    unchanged: diff.unchanged.length,
    detached: diff.detached.length,
  };

  // Preview only — show the coach the diff before anything is written.
  if (!body.commit) {
    return NextResponse.json({ committed: false, summary, diff });
  }

  let created = 0;
  let updated = 0;
  for (const g of diff.created) {
    await repos.games.create({
      teamId,
      opponent: g.opponent.slice(0, 80),
      startsAt: g.startsAt,
      venue: g.venue?.slice(0, 120) || undefined,
      homeAway: g.homeAway,
      innings: 6,
      status: "scheduled",
      sourceUid: g.uid,
    });
    created += 1;
  }
  for (const u of diff.updated) {
    await repos.games.update(u.existingId, {
      opponent: u.after.opponent.slice(0, 80),
      startsAt: u.after.startsAt,
      venue: u.after.venue?.slice(0, 120) || undefined,
      homeAway: u.after.homeAway,
    });
    updated += 1;
  }
  // Detached games are reported but never deleted — the coach may have added
  // post-game data (lineups, stats) we must not destroy on a feed change.

  await repos.audit.log({
    userId: session.user.id,
    action: "schedule_imported",
    resource: `team:${teamId}`,
    metadata: { source: "gamechanger_ics", created, updated, detached: diff.detached.length },
  });

  return NextResponse.json({
    committed: true,
    summary: { ...summary, created, updated },
  });
}
