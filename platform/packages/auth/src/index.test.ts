import { describe, it, expect } from "vitest";
import { InMemoryStore, makeRepos } from "@platform/storage";
import {
  AuthError,
  decodeCookie,
  encodeCookie,
  loginOrRegister,
  logout,
  requireRole,
  resolveSession,
  issueLoginToken,
  consumeLoginToken,
  hashToken,
  LOGIN_TOKEN_TTL_MS,
} from "./index";

function fresh() {
  return makeRepos(new InMemoryStore());
}

describe("cookie sign/verify", () => {
  it("round-trips", () => {
    const id = "sess_abc";
    const c = encodeCookie(id);
    expect(decodeCookie(c)).toBe(id);
  });
  it("rejects tampered cookie", () => {
    const c = encodeCookie("sess_abc");
    expect(decodeCookie(c.replace(/.$/, "X"))).toBe(null);
  });
  it("rejects garbage", () => {
    expect(decodeCookie(null)).toBe(null);
    expect(decodeCookie("nodot")).toBe(null);
    expect(decodeCookie(".sig")).toBe(null);
  });
});

describe("login/resolve/logout", () => {
  it("creates user + session and resolves", async () => {
    const repos = fresh();
    const s = await loginOrRegister(repos, { email: "coach@x.com", role: "coach" });
    const resolved = await resolveSession(repos, s.cookieValue);
    expect(resolved?.user.email).toBe("coach@x.com");
    expect(resolved?.user.role).toBe("coach");
  });
  it("rejects invalid email", async () => {
    const repos = fresh();
    await expect(loginOrRegister(repos, { email: "bad", role: "coach" })).rejects.toThrow();
  });
  it("logout invalidates session", async () => {
    const repos = fresh();
    const s = await loginOrRegister(repos, { email: "c@x.com", role: "coach" });
    await logout(repos, s.sessionId);
    expect(await resolveSession(repos, s.cookieValue)).toBe(null);
  });
  it("requireRole enforces allowed roles", async () => {
    const repos = fresh();
    const s = await loginOrRegister(repos, { email: "p@x.com", role: "parent" });
    expect(() => requireRole(s, ["coach"])).toThrowError(AuthError);
    expect(requireRole(s, ["parent", "coach"]).user.role).toBe("parent");
  });
  it("requireRole rejects null session with 401", () => {
    try {
      requireRole(null, ["coach"]);
    } catch (e) {
      expect((e as AuthError).status).toBe(401);
      return;
    }
    throw new Error("should have thrown");
  });
});

describe("magic-link tokens", () => {
  it("issues a token (plaintext returned, hash persisted)", async () => {
    const repos = fresh();
    const issued = await issueLoginToken(repos, { email: "P@X.com  ", role: "parent" });
    expect(issued.token.length).toBeGreaterThan(20);
    expect(Date.parse(issued.expiresAt)).toBeGreaterThan(Date.now() + LOGIN_TOKEN_TTL_MS - 5_000);
    const rec = await repos.loginTokens.byHash(hashToken(issued.token));
    expect(rec?.email).toBe("p@x.com");
    expect(rec?.role).toBe("parent");
    // Never store plaintext.
    expect(rec?.tokenHash).not.toContain(issued.token);
  });

  it("consume mints a session, normalizes email + creates user", async () => {
    const repos = fresh();
    const issued = await issueLoginToken(repos, { email: "Coach@X.com", role: "coach", name: "C" });
    const out = await consumeLoginToken(repos, issued.token);
    expect(out).not.toBeNull();
    expect(out!.user.email).toBe("coach@x.com");
    expect(out!.user.role).toBe("coach");
    // Cookie resolves to a real session.
    const resolved = await resolveSession(repos, out!.cookieValue);
    expect(resolved?.user.id).toBe(out!.user.id);
  });

  it("rejects unknown, double-consumed, and expired tokens", async () => {
    const repos = fresh();
    expect(await consumeLoginToken(repos, "not-a-real-token")).toBeNull();

    const issued = await issueLoginToken(repos, { email: "x@y.com", role: "player" });
    const first = await consumeLoginToken(repos, issued.token);
    expect(first).not.toBeNull();
    const second = await consumeLoginToken(repos, issued.token);
    expect(second).toBeNull();

    // Synthesize an already-expired record and ensure consume rejects it.
    const expired = await repos.loginTokens.create({
      tokenHash: hashToken("expired-test-token"),
      email: "z@y.com",
      role: "parent",
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(expired.id).toBeTruthy();
    expect(await consumeLoginToken(repos, "expired-test-token")).toBeNull();
  });

  it("issueLoginToken validates email + role", async () => {
    const repos = fresh();
    await expect(issueLoginToken(repos, { email: "bad", role: "coach" })).rejects.toThrowError(AuthError);
    await expect(
      issueLoginToken(repos, { email: "a@b.com", role: "boss" as never }),
    ).rejects.toThrowError(AuthError);
  });

  it("preserves redirectTo through to the consumed session", async () => {
    const repos = fresh();
    const issued = await issueLoginToken(repos, {
      email: "a@b.com",
      role: "parent",
      redirectTo: "/parent?team=t1",
    });
    const out = await consumeLoginToken(repos, issued.token);
    expect(out?.redirectTo).toBe("/parent?team=t1");
  });
});
