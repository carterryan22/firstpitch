import { NextResponse, type NextRequest } from "next/server";
import { getRepos, POSITIONS, type Position, type Bats, type Throws, type PositionRating } from "@platform/storage";
import { getSession } from "../../../lib/session";
import { userCanManageTeam } from "../../../lib/teams";
import { bandFromDob } from "../../../lib/players";

export const dynamic = "force-dynamic";

const VALID_RATINGS: PositionRating[] = ["preferred", "ok", "avoid"];

interface PatchBody {
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
  archive?: boolean;
  unarchive?: boolean;
}

function cleanRatings(input?: PatchBody["positionRatings"]) {
  if (!input) return undefined;
  const out: Partial<Record<Position, PositionRating>> = {};
  for (const pos of POSITIONS) {
    const v = input[pos];
    if (v && VALID_RATINGS.includes(v)) out[pos] = v;
  }
  return out;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const repos = getRepos();
  const existing = await repos.players.byId(id);
  if (!existing || !existing.teamId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!(await userCanManageTeam(session.user.id, existing.teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as PatchBody;

  if (body.archive) {
    const r = await repos.players.archive(id);
    await repos.audit.log({ userId: session.user.id, action: "player_archived", resource: `player:${id}` });
    return NextResponse.json({ player: r });
  }
  if (body.unarchive) {
    const r = await repos.players.unarchive(id);
    return NextResponse.json({ player: r });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.firstName === "string" && body.firstName.trim()) patch.firstName = body.firstName.trim();
  if (typeof body.lastName === "string" && body.lastName.trim()) patch.lastName = body.lastName.trim();
  if (body.jerseyNumber !== undefined) patch.jerseyNumber = body.jerseyNumber.trim() || undefined;
  if (body.dob !== undefined) {
    patch.dob = body.dob || undefined;
    patch.ageBand = bandFromDob(body.dob, existing.ageBand);
  }
  if (body.bats !== undefined) patch.bats = body.bats;
  if (body.throws !== undefined) patch.throws = body.throws;
  if (body.canPitch !== undefined) patch.canPitch = !!body.canPitch;
  if (body.canCatch !== undefined) patch.canCatch = !!body.canCatch;
  if (body.injured !== undefined) patch.injured = !!body.injured;
  if (body.injuryNote !== undefined) patch.injuryNote = body.injuryNote.trim() || undefined;
  if (body.positionRatings !== undefined) patch.positionRatings = cleanRatings(body.positionRatings);
  if (body.notes !== undefined) patch.notes = body.notes.trim() || undefined;

  const updated = await repos.players.update(id, patch);
  await repos.audit.log({
    userId: session.user.id,
    action: "player_updated",
    resource: `player:${id}`,
    metadata: { fields: Object.keys(patch) },
  });
  return NextResponse.json({ player: updated });
}
