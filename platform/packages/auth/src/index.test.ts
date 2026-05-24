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
  it("creates user + session and resolves", () => {
    const repos = fresh();
    const s = loginOrRegister(repos, { email: "coach@x.com", role: "coach" });
    const resolved = resolveSession(repos, s.cookieValue);
    expect(resolved?.user.email).toBe("coach@x.com");
    expect(resolved?.user.role).toBe("coach");
  });
  it("rejects invalid email", () => {
    const repos = fresh();
    expect(() => loginOrRegister(repos, { email: "bad", role: "coach" })).toThrow();
  });
  it("logout invalidates session", () => {
    const repos = fresh();
    const s = loginOrRegister(repos, { email: "c@x.com", role: "coach" });
    logout(repos, s.sessionId);
    expect(resolveSession(repos, s.cookieValue)).toBe(null);
  });
  it("requireRole enforces allowed roles", () => {
    const repos = fresh();
    const s = loginOrRegister(repos, { email: "p@x.com", role: "parent" });
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
