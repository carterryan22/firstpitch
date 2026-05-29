import { NextResponse, type NextRequest } from "next/server";
import { getRepos } from "@platform/storage";
import { loginOrRegister, SESSION_COOKIE, SESSION_TTL_MS } from "@platform/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * LEGACY password-less login. Kept for local dev + QA/UX agent automation.
 * Disabled in production unless `PLATFORM_ALLOW_DEV_LOGIN=1` is explicitly set.
 * Production users go through magic-link auth via `/api/auth/request-link`.
 */
export async function POST(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const devAllow = process.env.PLATFORM_ALLOW_DEV_LOGIN === "1";
  if (isProd && !devAllow) {
    return NextResponse.json(
      { error: "Password-less login disabled. Request a magic link." },
      { status: 410 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { email?: string; role?: string; name?: string };
  if (!body.email || !body.role) {
    return NextResponse.json({ error: "email and role required" }, { status: 400 });
  }
  const validRoles = ["parent", "coach", "player", "admin"] as const;
  if (!validRoles.includes(body.role as (typeof validRoles)[number])) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }
  try {
    const session = await loginOrRegister(getRepos(), {
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
      // Secure required for iOS WKWebView (Capacitor shell loads over https)
      // and for any modern browser when SameSite=Lax is set on cross-site
      // redirects. Disabled in dev so localhost still works.
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
