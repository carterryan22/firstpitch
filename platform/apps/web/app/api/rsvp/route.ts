import { NextResponse, type NextRequest } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../lib/session";
import { userCanManageTeam } from "../../lib/teams";

export const dynamic = "force-dynamic";

type RsvpStatus = "yes" | "no" | "maybe";
const VALID: RsvpStatus[] = ["yes", "no", "maybe"];

interface Body {
  kind?: "game" | "practice";
  id?: string;
  playerId?: string;
  status?: RsvpStatus;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.kind || !body.id || !body.playerId || !body.status) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!VALID.includes(body.status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const repos = getRepos();
  const player = await repos.players.byId(body.playerId);
  if (!player) return NextResponse.json({ error: "player_not_found" }, { status: 404 });
  const isParent = player.parentUserId === session.user.id;
  const isCoach = player.teamId && (await userCanManageTeam(session.user.id, player.teamId));
  if (!isParent && !isCoach) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (body.kind === "game") {
    const game = await repos.games.byId(body.id);
    if (!game || game.teamId !== player.teamId) {
      return NextResponse.json({ error: "game_not_found" }, { status: 404 });
    }
    const rsvp = { ...(game.rsvp ?? {}), [body.playerId]: body.status };
    await repos.games.update(body.id, { rsvp });
  } else {
    const plan = await repos.plans.byId(body.id);
    if (!plan || plan.teamId !== player.teamId) {
      return NextResponse.json({ error: "practice_not_found" }, { status: 404 });
    }
    const rsvp = { ...(plan.rsvp ?? {}), [body.playerId]: body.status };
    await repos.plans.update(body.id, { rsvp });
  }
  await repos.audit.log({
    userId: session.user.id,
    action: "rsvp_set",
    resource: `${body.kind}:${body.id}`,
    metadata: { playerId: body.playerId, status: body.status },
  });
  return NextResponse.json({ ok: true });
}
