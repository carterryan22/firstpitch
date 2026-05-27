// Cookie-based session auth. HMAC-signed cookie stores the session id;
// session record lives in the storage layer (and gets purged on expiry).
// Pure functions — no Next.js types — so it's reusable + testable.

import * as crypto from "node:crypto";
import type { Repos, Role, UserRecord } from "@platform/storage";

export type { Role } from "@platform/storage";

export const SESSION_COOKIE = "platform_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const s = process.env.PLATFORM_AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error(
      "PLATFORM_AUTH_SECRET must be set in production. Generate 32 bytes of " +
        "random and add it to the Vercel project's environment variables."
    );
  }
  return s ?? "dev-insecure-secret-change-me";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

/** Encode a cookie value: `${sessionId}.${signature}` */
export function encodeCookie(sessionId: string): string {
  return `${sessionId}.${sign(sessionId)}`;
}

/** Verify + return sessionId, or null. */
export function decodeCookie(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const id = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(id);
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return id;
}

export interface AuthSession {
  user: UserRecord;
  sessionId: string;
  cookieValue: string;
}

/** Create or find a user by email + role and mint a session. Dev/local auth. */
export function loginOrRegister(
  repos: Repos,
  input: { email: string; role: Role; name?: string }
): AuthSession {
  if (!input.email.includes("@")) {
    throw new Error("Invalid email");
  }
  const user = repos.users.upsert({ email: input.email, role: input.role, name: input.name });
  const session = repos.sessions.create(user.id, SESSION_TTL_MS);
  repos.audit.log({ userId: user.id, action: "login", resource: `session:${session.id}` });
  return { user, sessionId: session.id, cookieValue: encodeCookie(session.id) };
}

/** Resolve a session from a raw cookie value. Returns null if invalid or expired. */
export function resolveSession(repos: Repos, rawCookie: string | null | undefined): AuthSession | null {
  const id = decodeCookie(rawCookie);
  if (!id) return null;
  const session = repos.sessions.byId(id);
  if (!session) return null;
  if (Date.parse(session.expiresAt) <= Date.now()) {
    repos.sessions.delete(id);
    return null;
  }
  const user = repos.users.byId(session.userId);
  if (!user) return null;
  return { user, sessionId: session.id, cookieValue: encodeCookie(session.id) };
}

export function logout(repos: Repos, sessionId: string): void {
  repos.sessions.delete(sessionId);
  repos.audit.log({ action: "logout", resource: `session:${sessionId}` });
}

export class AuthError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

/** Throws AuthError(401|403) if session missing or role not allowed. */
export function requireRole(session: AuthSession | null, allowed: Role[]): AuthSession {
  if (!session) throw new AuthError("Authentication required", 401);
  if (!allowed.includes(session.user.role)) throw new AuthError("Forbidden", 403);
  return session;
}
