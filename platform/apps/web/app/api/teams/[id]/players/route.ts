import { NextResponse, type NextRequest } from "next/server";
import { getRepos, POSITIONS, type Position, type Bats, type Throws, type PositionRating } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { bandFromDob } from "../../../../lib/players";

export const dynamic = "force-dynamic";

interface CreateBody {
  firstName?: string;
  lastName?: string;
  jerseyNumber?: string;
  dob?: string;
  bats?: Bats;
  throws?: Throws;
  canPitch?: boolean;
  canCatch?: boolean;
  injured?: boolean;
  injuryNote?: string;
  positionRatings?: Partial<Record<Position, PositionRating>>;
  notes?: string;
  parentEmail?: string;
}

const VALID_RATINGS: PositionRating[] = ["preferred", "ok", "avoid"];

function cleanRatings(input?: CreateBody["positionRatings"]) {
  if (!input) return undefined;
  const out: Partial<Record<Position, PositionRating>> = {};
  for (const pos of POSITIONS) {
    const v = input[pos];
    if (v && VALID_RATINGS.includes(v)) out[pos] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: teamId } = await ctx.params;
  if (!(await userCanManageTeam(session.user.id, teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const repos = getRepos();
  const team = await repos.teams.byId(teamId);
  if (!team) return NextResponse.json({ error: "team not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as CreateBody;
  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "firstName and lastName required" }, { status: 400 });
  }

  let parentUserId: string | undefined;
  if (body.parentEmail && body.parentEmail.includes("@")) {
    const parent = await repos.users.upsert({ email: body.parentEmail.trim(), role: "parent" });
    parentUserId = parent.id;
    await repos.teamMemberships.upsert({
      teamId,
      userId: parent.id,
      role: "parent",
    });
  }

  const player = await repos.players.create({
    teamId,
    firstName,
    lastName,
    jerseyNumber: body.jerseyNumber?.trim() || undefined,
    dob: body.dob || undefined,
    ageBand: bandFromDob(body.dob, team.ageBand),
    sport: "baseball",
    positions: [],
    bats: body.bats,
    throws: body.throws,
    canPitch: !!body.canPitch,
    canCatch: !!body.canCatch,
    injured: !!body.injured,
    injuryNote: body.injuryNote?.trim() || undefined,
    positionRatings: cleanRatings(body.positionRatings),
    notes: body.notes?.trim() || undefined,
    parentUserId,
  });

  if (parentUserId) {
    await repos.teamMemberships.upsert({
      teamId,
      userId: parentUserId,
      role: "parent",
      playerId: player.id,
    });
  }

  await repos.audit.log({
    userId: session.user.id,
    action: "player_created",
    resource: `player:${player.id}`,
    metadata: { teamId },
  });
  return NextResponse.json({ player });
}
