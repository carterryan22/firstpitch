import { NextResponse, type NextRequest } from "next/server";
import { getRepos, POSITIONS, type Position, type Bats, type Throws, type PositionRating } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { bandFromDob } from "../../../../lib/players";
import { requestParentalConsent, requiresParentalConsent } from "../../../../lib/consent";

export const dynamic = "force-dynamic";

interface CreateBody {
  firstName?: string;
  lastName?: string;
  jerseyNumber?: string;
  dob?: string;
  bats?: Bats;
  throws?: Throws;
  gender?: "M" | "F" | "X";
  battingSkill?: number;
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
  if (firstName.length > 40 || lastName.length > 40) {
    return NextResponse.json({ error: "name must be 40 characters or fewer" }, { status: 400 });
  }
  if ((body.parentEmail ?? "").length > 200) {
    return NextResponse.json({ error: "parentEmail too long" }, { status: 400 });
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
    gender:
      body.gender === "M" || body.gender === "F" || body.gender === "X"
        ? body.gender
        : undefined,
    battingSkill:
      body.battingSkill !== undefined &&
      Math.round(Number(body.battingSkill)) >= 1 &&
      Math.round(Number(body.battingSkill)) <= 5
        ? (Math.round(Number(body.battingSkill)) as 1 | 2 | 3 | 4 | 5)
        : undefined,
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

  // COPPA: a child under 13 needs verifiable parental consent before the
  // profile is treated as active. If we have a parent email, kick off the
  // verification flow now; otherwise mark the profile as needing consent.
  let consent: { devLink?: string; pending: boolean; emailSent?: boolean } | undefined;
  if (requiresParentalConsent(player)) {
    if (parentUserId && body.parentEmail) {
      const result = await requestParentalConsent({
        playerId: player.id,
        teamId,
        parentEmail: body.parentEmail.trim(),
        parentUserId,
        requestedByUserId: session.user.id,
      });
      consent = { devLink: result.devLink, pending: true, emailSent: result.delivery.ok };
    } else {
      await repos.players.update(player.id, { consentStatus: "pending" });
      consent = { pending: true };
    }
  }

  const refreshed = (await repos.players.byId(player.id)) ?? player;
  return NextResponse.json({ player: refreshed, consent });
}
