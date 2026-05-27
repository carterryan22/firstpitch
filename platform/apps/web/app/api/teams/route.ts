import { NextRequest, NextResponse } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../lib/session";
import { getTeamsForUser, slugify, uniqueSlug } from "../../lib/teams";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const teams = getTeamsForUser(session.user.id);
  return NextResponse.json({ teams });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "coach" && session.user.role !== "admin") {
    return NextResponse.json({ error: "only coaches can create teams" }, { status: 403 });
  }
  let body: { name?: string; ageBand?: "6-8" | "9-12" | "13-15" | "16+" };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const name = body.name?.trim();
  const ageBand = body.ageBand;
  if (!name || !ageBand) {
    return NextResponse.json({ error: "name and ageBand are required" }, { status: 400 });
  }
  const repos = getRepos();
  const team = repos.teams.create({
    name,
    slug: uniqueSlug(slugify(name)),
    ageBand,
    ownerCoachUserId: session.user.id,
  });
  repos.teamMemberships.upsert({ teamId: team.id, userId: session.user.id, role: "coach" });
  repos.audit.log({ userId: session.user.id, action: "team_created", resource: `team:${team.id}` });
  return NextResponse.json({ team });
}
