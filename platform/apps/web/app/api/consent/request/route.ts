import { NextResponse, type NextRequest } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../lib/session";
import { userCanManageTeam } from "../../../lib/teams";
import { requestParentalConsent, revokeConsent } from "../../../lib/consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  playerId?: string;
  parentEmail?: string;
  /** "request" (default) re-sends the consent email; "revoke" withdraws it. */
  action?: "request" | "revoke";
}

/**
 * Coach/admin re-sends (or revokes) a parental-consent request for a child.
 * Used when the original email bounced or a parent asks to start over.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const playerId = (body.playerId ?? "").trim();
  if (!playerId) return NextResponse.json({ error: "playerId required" }, { status: 400 });

  const repos = getRepos();
  const player = await repos.players.byId(playerId);
  if (!player) return NextResponse.json({ error: "player not found" }, { status: 404 });

  // Only a coach who manages the player's team (or an admin) can act.
  const isManager =
    session.user.role === "admin" ||
    (player.teamId ? await userCanManageTeam(session.user.id, player.teamId) : false);
  if (!isManager) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (body.action === "revoke") {
    if (!player.consentId) {
      return NextResponse.json({ error: "no consent on file" }, { status: 404 });
    }
    const revoked = await revokeConsent(player.consentId, session.user.id);
    return NextResponse.json({ ok: true, consent: revoked });
  }

  const parentEmail = (body.parentEmail ?? "").trim();
  if (!parentEmail.includes("@") || parentEmail.length > 200) {
    return NextResponse.json({ error: "valid parentEmail required" }, { status: 400 });
  }

  const parent = await repos.users.upsert({ email: parentEmail, role: "parent" });
  const result = await requestParentalConsent({
    playerId,
    teamId: player.teamId,
    parentEmail,
    parentUserId: parent.id,
    requestedByUserId: session.user.id,
  });

  return NextResponse.json({ ok: true, consentId: result.consent.id, devLink: result.devLink });
}
