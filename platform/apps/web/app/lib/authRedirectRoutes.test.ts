import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getRepos, __resetReposForTests } from "@platform/storage";
import { issueLoginToken, resolveSession, SESSION_COOKIE } from "@platform/auth";
import { POST } from "../api/auth/login/route";
import { GET as verifyLink } from "../api/auth/verify/route";

describe("authentication redirect routes", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PLATFORM_AUTH_SECRET", "test-only-auth-secret");
    vi.stubEnv("PLATFORM_ALLOW_DEV_LOGIN", "1");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");
    vi.stubEnv("PLATFORM_DATA_DIR", "");
    __resetReposForTests();
  });
  afterEach(() => { vi.unstubAllEnvs(); __resetReposForTests(); });

  it.each(["/\\outside.example", "/\n/outside.example", "/.//outside.example", "/a/..//outside.example", "/%2e//outside.example"])("keeps demo form redirect %s on this application", async (redirectTo) => {
    const response = await POST(new NextRequest("https://demo.example/api/auth/login", {
      method: "POST", body: new URLSearchParams({ email: "coach@example.test", role: "coach", redirectTo }),
    }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://demo.example/coach");
    const cookie = response.cookies.get(SESSION_COOKIE)?.value;
    expect((await resolveSession(getRepos(), cookie))?.user.email).toBe("coach@example.test");
  });

  it("revalidates redirects in previously issued magic links", async () => {
    const issued = await issueLoginToken(getRepos(), { email: "parent@example.test", role: "parent", redirectTo: "/\\outside.example" });
    const response = await verifyLink(new NextRequest(`https://demo.example/api/auth/verify?token=${issued.token}`));
    expect(response.headers.get("location")).toBe("https://demo.example/parent");
  });

  it("keeps legacy form sign-in disabled in production without explicit opt-in", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PLATFORM_ALLOW_DEV_LOGIN", "0");
    const response = await POST(new NextRequest("https://demo.example/api/auth/login", {
      method: "POST", body: new URLSearchParams({ email: "coach@example.test", role: "coach" }),
    }));
    expect(response.status).toBe(410);
    expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it("never enables passwordless demo sign-in in Vercel Production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("PLATFORM_ALLOW_DEV_LOGIN", "1");
    const response = await POST(new NextRequest("https://app.example/api/auth/login", {
      method: "POST", body: new URLSearchParams({ email: "coach@example.test", role: "coach" }),
    }));
    expect(response.status).toBe(410);
    expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
    expect(await getRepos().users.list()).toEqual([]);
  });
});
