import { describe, it, expect, vi } from "vitest";
import { MockProvider, OpenAIProvider, safeCall, getDefaultProvider } from "./provider";

const env = {
  userRole: "coach" as const,
  ageBand: "9-12",
  sport: "baseball" as const,
  applicableRules: [],
  retrievedRecordIds: [],
  retrievedSnippets: [],
};

describe("MockProvider", () => {
  it("produces a clean practice plan JSON", async () => {
    const r = await safeCall(new MockProvider(), {
      promptId: "PRACTICE_PLAN",
      env,
      userMessage: "60 min for 11U field practice",
    });
    expect(r.blocked).toBe(false);
    expect(r.text.length).toBeGreaterThan(0);
    const parsed = JSON.parse(r.text) as { blocks: unknown[] };
    expect(Array.isArray(parsed.blocks)).toBe(true);
  });
  it("coach Q&A cites a rule and survives postFilter", async () => {
    const r = await safeCall(new MockProvider(), {
      promptId: "COACH_QA",
      env,
      userMessage: "What's the daily max for 11-12?",
    });
    expect(r.blocked).toBe(false);
    expect(r.text).toMatch(/PITCH_SMART_9_12|Pitch Smart/);
  });
  it("player message has no forbidden patterns", async () => {
    const r = await safeCall(new MockProvider(), {
      promptId: "PLAYER_MESSAGE",
      env,
      userMessage: "Encourage Alex",
    });
    expect(r.blocked).toBe(false);
  });
});

describe("OpenAIProvider", () => {
  it("posts to /v1/chat/completions with bearer auth", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    ) as unknown as typeof fetch;
    const p = new OpenAIProvider({ apiKey: "sk-test", fetchImpl: fetchMock });
    const out = await p.complete({ system: "s", user: "u" });
    expect(out).toBe("ok");
    const call = (fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]!;
    expect(call[0]).toContain("/v1/chat/completions");
    const init = call[1] as RequestInit;
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer sk-test");
  });
  it("throws on non-2xx", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 429 })) as unknown as typeof fetch;
    const p = new OpenAIProvider({ apiKey: "sk-test", fetchImpl: fetchMock });
    await expect(p.complete({ system: "s", user: "u" })).rejects.toThrow(/429/);
  });
  it("falls back to mock if no api key", async () => {
    const p = new OpenAIProvider({ apiKey: "" });
    const out = await p.complete({ system: "s", user: "u" });
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("getDefaultProvider", () => {
  it("returns MockProvider when OPENAI_API_KEY unset", () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    expect(getDefaultProvider().name).toBe("mock");
    if (prev) process.env.OPENAI_API_KEY = prev;
  });
});
