import { describe, expect, it, beforeAll } from "vitest";

beforeAll(() => {
  process.env.PLATFORM_AUTH_SECRET = "test-secret-do-not-use";
});

describe("pressBox token", () => {
  it("round-trips a gameId", async () => {
    const { signGameId, verifyGameSig } = await import("./pressBox");
    const sig = signGameId("gm_abc");
    expect(verifyGameSig("gm_abc", sig)).toBe(true);
  });

  it("rejects a tampered signature", async () => {
    const { signGameId, verifyGameSig } = await import("./pressBox");
    const sig = signGameId("gm_abc");
    expect(verifyGameSig("gm_xyz", sig)).toBe(false);
    expect(verifyGameSig("gm_abc", sig.slice(0, -1) + "A")).toBe(false);
  });

  it("produces a stable URL path", async () => {
    const { pressBoxPath } = await import("./pressBox");
    expect(pressBoxPath("gm_1")).toMatch(/^\/p\/g\/gm_1\/[A-Za-z0-9_-]+$/);
  });
});
