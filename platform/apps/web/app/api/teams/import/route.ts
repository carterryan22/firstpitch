import { NextRequest, NextResponse } from "next/server";
import { getRepos } from "@platform/storage";
import { rosterFromGameChangerCsv } from "@platform/ingest";
import { getSession } from "../../../lib/session";
import { slugify, uniqueSlug } from "../../../lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGE_BANDS = ["6-8", "9-12", "13-15", "16+"] as const;
type AgeBand = (typeof AGE_BANDS)[number];

interface ImportBody {
  name?: string;
  ageBand?: AgeBand;
  csv?: string;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "coach" && session.user.role !== "admin") {
    return NextResponse.json({ error: "only coaches can create teams" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as ImportBody | null;
  if (!body) return NextResponse.json({ error: "invalid JSON" }, { status: 400 });

  const name = body.name?.trim();
  const ageBand = body.ageBand;
  const csv = body.csv;
  if (!name || !ageBand) {
    return NextResponse.json({ error: "name and ageBand are required" }, { status: 400 });
  }
  if (name.length > 80) {
    return NextResponse.json({ error: "name must be 80 characters or fewer" }, { status: 400 });
  }
  if (!AGE_BANDS.includes(ageBand)) {
    return NextResponse.json({ error: "invalid ageBand" }, { status: 400 });
  }
  if (typeof csv !== "string" || !csv.trim()) {
    return NextResponse.json({ error: "csv is required" }, { status: 400 });
  }
  if (csv.length > 5_000_000) {
    return NextResponse.json({ error: "csv too large (max 5MB)" }, { status: 413 });
  }

  const parsed = rosterFromGameChangerCsv(csv);
  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "No players found in CSV. Make sure it has a Player or Name column." },
      { status: 422 },
    );
  }

  const repos = getRepos();
  const team = await repos.teams.create({
    name,
    slug: await uniqueSlug(slugify(name)),
    ageBand,
    ownerCoachUserId: session.user.id,
  });
  await repos.teamMemberships.upsert({ teamId: team.id, userId: session.user.id, role: "coach" });

  const created = [];
  for (const p of parsed) {
    const firstName = (p.firstName || p.lastName).slice(0, 40);
    const lastName = (p.lastName || "").slice(0, 40);
    if (!firstName) continue;
    const player = await repos.players.create({
      teamId: team.id,
      firstName,
      lastName,
      jerseyNumber: p.jerseyNumber?.trim() || undefined,
      ageBand,
      sport: "baseball",
      positions: [],
    });
    created.push(player);
  }

  await repos.audit.log({
    userId: session.user.id,
    action: "team_created",
    resource: `team:${team.id}`,
    metadata: { from: "gamechanger_import", players: created.length },
  });

  return NextResponse.json({ team, createdCount: created.length });
}
