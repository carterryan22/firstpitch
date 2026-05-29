// Server-side helper to resolve the current session from the cookie.
// Uses next/headers cookies() inside route handlers / server components.

import { cookies } from "next/headers";
import { getRepos } from "@platform/storage";
import { SESSION_COOKIE, resolveSession, type AuthSession, type Role, requireRole as requireRoleCore, AuthError } from "@platform/auth";

export async function getSession(): Promise<AuthSession | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  return resolveSession(getRepos(), raw);
}

export async function requireSession(allowed?: Role[]): Promise<AuthSession> {
  const s = await getSession();
  return requireRoleCore(s, allowed ?? ["coach", "parent", "player", "admin"]);
}

export { AuthError };
