import { NextResponse, type NextRequest } from "next/server";
import { getRepos } from "@platform/storage";
import { consumeLoginToken, SESSION_COOKIE, SESSION_TTL_MS } from "@platform/auth";
import { sanitizeRedirect } from "../../../lib/authRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_REDIRECT_BY_ROLE: Record<string, string> = {
  coach: "/coach",
  parent: "/parent",
  player: "/missions",
  admin: "/admin/status",
};

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", req.nextUrl.origin));
  }
  const session = await consumeLoginToken(getRepos(), token);
  if (!session) {
    return NextResponse.redirect(new URL("/login?error=invalid_or_expired", req.nextUrl.origin));
  }
  const redirectPath =
    sanitizeRedirect(session.redirectTo) ?? DEFAULT_REDIRECT_BY_ROLE[session.user.role] ?? "/";
  const res = NextResponse.redirect(new URL(redirectPath, req.nextUrl.origin));
  res.cookies.set(SESSION_COOKIE, session.cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}
