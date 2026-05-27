import { NextResponse } from "next/server";
import { getFieldsRepos } from "../../lib/fields";
import { getSession } from "../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ToggleBody {
  kind?: "field";
  targetId?: string;
}

export async function POST(req: Request) {
  const session = await getSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as ToggleBody;
  const kind = body.kind ?? "field";
  const targetId = body.targetId?.trim();
  if (!targetId) return NextResponse.json({ error: "targetId required" }, { status: 400 });
  if (kind !== "field") return NextResponse.json({ error: "Unsupported kind" }, { status: 400 });

  const repos = await getFieldsRepos();
  const field = await repos.fields.byId(targetId);
  if (!field) return NextResponse.json({ error: "Field not found" }, { status: 404 });

  const result = await repos.favorites.toggle(session.user.id, kind, targetId);
  return NextResponse.json(result);
}

export async function GET() {
  const session = await getSession().catch(() => null);
  if (!session) return NextResponse.json({ favorites: [] });
  const repos = await getFieldsRepos();
  const favs = await repos.favorites.list({ userId: session.user.id });
  return NextResponse.json({ favorites: favs });
}
