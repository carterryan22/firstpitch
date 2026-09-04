import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetReposForTests, getRepos, kvKeyForEnvironment } from "./index";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); __resetReposForTests(); });

describe("KV environment isolation", () => {
  it("preserves the existing production key", () => {
    expect(kvKeyForEnvironment({ VERCEL_ENV: "production" })).toBe("platform:db");
    expect(kvKeyForEnvironment({})).toBe("platform:db");
  });

  it.each([undefined, "platform:db", "platform:demo:", "arbitrary-key"])("rejects unsafe preview key %s", (key) => {
    expect(() => kvKeyForEnvironment({ VERCEL_ENV: "preview", PLATFORM_KV_KEY: key })).toThrow();
  });

  it.each(["platform:demo:firstpitch-september", "platform:preview:feature-a"])("accepts explicit isolated key %s", (key) => {
    expect(kvKeyForEnvironment({ VERCEL_ENV: "preview", PLATFORM_KV_KEY: key, PLATFORM_ALLOW_DEV_LOGIN: "1" })).toBe(key);
  });

  it("rejects local demo access to the default remote production blob", () => {
    expect(() => kvKeyForEnvironment({ PLATFORM_ALLOW_DEV_LOGIN: "1" })).toThrow(/isolated/);
  });

  it("rejects demo settings in Vercel Production", () => {
    expect(() => kvKeyForEnvironment({ VERCEL_ENV: "production", PLATFORM_KV_KEY: "platform:demo:test" })).toThrow(/forbidden/);
    expect(() => kvKeyForEnvironment({ VERCEL_ENV: "production", PLATFORM_ALLOW_DEV_LOGIN: "1" })).toThrow(/forbidden/);
  });

  it.each(["", " platform:demo:test", "platform:demo:test/other", "platform:demo:test\n"])("rejects malformed namespaces %s", (key) => {
    expect(() => kvKeyForEnvironment({ PLATFORM_KV_KEY: key })).toThrow();
  });

  it("wires the isolated namespace into the real repository factory", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://kv.example.test");
    vi.stubEnv("KV_REST_API_TOKEN", "test-only-token");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("PLATFORM_KV_KEY", "platform:demo:factory-test");
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: null })));
    vi.stubGlobal("fetch", request);
    __resetReposForTests();
    expect(await getRepos().teams.list()).toEqual([]);
    expect(request.mock.calls[0]?.[0]).toBe("https://kv.example.test/get/platform%3Ademo%3Afactory-test");
  });
});
