import { NextResponse, type NextRequest } from "next/server";
import { getRepos } from "@platform/storage";
import { loginOrRegister, SESSION_COOKIE, SESSION_TTL_MS } from "@platform/auth";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; role?: string; name?: string };
  if (!body.email || !body.role) {
    return NextResponse.json({ error: "email and role required" }, { status: 400 });
  }
  const validRoles = ["parent", "coach", "player", "clinician", "admin"] as const;
  if (!validRoles.includes(body.role as (typeof validRoles)[number])) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }
  try {
    const session = loginOrRegister(getRepos(), {
      email: body.email,
      role: body.role as (typeof validRoles)[number],
      name: body.name,
    });
    const res = NextResponse.json({
      ok: true,
      user: { id: session.user.id, email: session.user.email, role: session.user.role, name: session.user.name },
    });
    res.cookies.set(SESSION_COOKIE, session.cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
