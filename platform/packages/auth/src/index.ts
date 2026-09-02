// Cookie-based session auth. HMAC-signed cookie stores the session id;
// session record lives in the storage layer (and gets purged on expiry).
// Pure functions — no Next.js types — so it's reusable + testable.

import * as crypto from "node:crypto";
import type { Repos, Role, UserRecord } from "@platform/storage";

export type { Role } from "@platform/storage";

export const SESSION_COOKIE = "platform_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
export const LOGIN_TOKEN_TTL_MS = 1000 * 60 * 15; // 15 min
export const LOGIN_TOKEN_BYTES = 32; // 256 bits of entropy

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

async function authenticationUser(
  repos: Repos,
  input: { email: string; role: Role; name?: string },
): Promise<UserRecord> {
  const email = input.email.toLowerCase().trim();
  const existing = await repos.users.byEmail(email);
  if (existing) return existing;
  return repos.users.upsert({ email, role: input.role, name: input.name?.trim() || undefined });
}

/** Create or find a user by email + role and mint a session. Dev/local auth. */
export async function loginOrRegister(
  repos: Repos,
  input: { email: string; role: Role; name?: string }
): Promise<AuthSession> {
  if (!input.email.includes("@")) {
    throw new Error("Invalid email");
  }
  const user = await authenticationUser(repos, input);
  const session = await repos.sessions.create(user.id, SESSION_TTL_MS);
  await repos.audit.log({ userId: user.id, action: "login", resource: `session:${session.id}` });
  return { user, sessionId: session.id, cookieValue: encodeCookie(session.id) };
}

/** Hash a magic-link token so we never persist plaintext. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("base64url");
}

export interface IssuedLoginToken {
  /** Random plaintext token to embed in the magic link. NEVER persisted. */
  token: string;
  expiresAt: string;
  /** The record we stored (with hash, not plaintext). */
  recordId: string;
}

/**
 * Create a one-time magic-link login token. Caller is responsible for sending
 * the email containing `${baseUrl}/api/auth/verify?token=${token}`.
 */
export async function issueLoginToken(
  repos: Repos,
  input: { email: string; role: Role; name?: string; redirectTo?: string },
): Promise<IssuedLoginToken> {
  if (!input.email.includes("@")) {
    throw new AuthError("Invalid email", 400);
  }
  const validRoles: Role[] = ["coach", "parent", "player", "admin"];
  if (!validRoles.includes(input.role)) {
    throw new AuthError("Invalid role", 400);
  }
  const normalizedEmail = input.email.toLowerCase().trim();
  const existing = await repos.users.byEmail(normalizedEmail);
  const token = crypto.randomBytes(LOGIN_TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_TTL_MS).toISOString();
  const rec = await repos.loginTokens.create({
    tokenHash: hashToken(token),
    email: normalizedEmail,
    // Authentication must never mutate an existing account's authorization.
    role: existing?.role ?? input.role,
    name: existing?.name ?? (input.name?.trim() || undefined),
    redirectTo: input.redirectTo,
    expiresAt,
  });
  await repos.audit.log({ action: "login_token_issued", resource: `email:${rec.email}` });
  return { token, expiresAt, recordId: rec.id };
}

/**
 * Validate and atomically consume a magic-link token. On success, upserts the
 * user and mints a session. Returns null if token is unknown, expired, or
 * already consumed.
 */
export async function consumeLoginToken(
  repos: Repos,
  token: string,
): Promise<(AuthSession & { redirectTo?: string }) | null> {
  if (!token || typeof token !== "string") return null;
  const rec = await repos.loginTokens.consume(hashToken(token));
  if (!rec) return null;
  const user = await authenticationUser(repos, {
    email: rec.email,
    role: rec.role,
    name: rec.name,
  });
  const session = await repos.sessions.create(user.id, SESSION_TTL_MS);
  await repos.audit.log({
    userId: user.id,
    action: "login_token_consumed",
    resource: `session:${session.id}`,
  });
  return {
    user,
    sessionId: session.id,
    cookieValue: encodeCookie(session.id),
    redirectTo: rec.redirectTo,
  };
}

/** Resolve a session from a raw cookie value. Returns null if invalid or expired. */
export async function resolveSession(
  repos: Repos,
  rawCookie: string | null | undefined
): Promise<AuthSession | null> {
  const id = decodeCookie(rawCookie);
  if (!id) return null;
  const session = await repos.sessions.byId(id);
  if (!session) return null;
  if (Date.parse(session.expiresAt) <= Date.now()) {
    await repos.sessions.delete(id);
    return null;
  }
  const user = await repos.users.byId(session.userId);
  if (!user) return null;
  return { user, sessionId: session.id, cookieValue: encodeCookie(session.id) };
}

export async function logout(repos: Repos, sessionId: string): Promise<void> {
  await repos.sessions.delete(sessionId);
  await repos.audit.log({ action: "logout", resource: `session:${sessionId}` });
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
