import { describe, it, expect } from "vitest";
import { parseSearchIntent, classifyIntent, MockProvider } from "./index";

describe("parseSearchIntent", () => {
  it("parses the headline example: 60 min practice plan for u-10 select", () => {
    const intent = parseSearchIntent("I need a 60 min practice plan for u-10 select baseball");
    expect(intent.kind).toBe("practice_plan");
    expect(intent.durationMin).toBe(60);
    expect(intent.age).toBe(9); // u-10 → typical oldest players are 9
    expect(intent.ageBand).toBe("9-12");
    expect(intent.level).toBe("select");
    expect(intent.confidence).toBe("high");
    expect(intent.action.href).toContain("/practice/new?");
    expect(intent.action.href).toContain("age=9");
    expect(intent.action.href).toContain("duration=60");
  });

  it("extracts focus areas and builds a focus query param", () => {
    const intent = parseSearchIntent("90 minute practice plan, hitting and fielding for 12u");
    expect(intent.kind).toBe("practice_plan");
    expect(intent.durationMin).toBe(90);
    expect(intent.focus).toEqual(expect.arrayContaining(["hitting", "fielding"]));
    expect(intent.action.href).toContain("focus=hitting%2Cfielding");
  });

  it("classifies a drill search and maps environment to a tier", () => {
    const intent = parseSearchIntent("infield drills for the cage");
    expect(intent.kind).toBe("find_drills");
    expect(intent.focus).toContain("fielding");
    expect(intent.environmentTier).toBe("T2_cage_gym");
    expect(intent.action.href).toBe("/drills?topic=fielding&tier=T2_cage_gym");
  });

  it("classifies a lineup request", () => {
    const intent = parseSearchIntent("build a fair batting order for my team");
    expect(intent.kind).toBe("build_lineup");
    expect(intent.action.href).toBe("/coach");
  });

  it("classifies a coach question and routes to chat", () => {
    const intent = parseSearchIntent("how many pitches can an 11 year old throw?");
    expect(intent.kind).toBe("coach_question");
    expect(intent.age).toBe(11);
    expect(intent.action.href).toBe("/coach/chat");
  });

  it("parses hour-based durations", () => {
    expect(parseSearchIntent("an hour practice for 8 year olds").durationMin).toBe(60);
    expect(parseSearchIntent("hour and a half session").durationMin).toBe(90);
    expect(parseSearchIntent("half hour backyard workout").durationMin).toBe(30);
  });

  it("handles unknown input gracefully", () => {
    const intent = parseSearchIntent("hello there");
    expect(intent.kind).toBe("unknown");
    expect(intent.confidence).toBe("low");
    expect(intent.action.href).toBe("/drills");
  });
});

describe("classifyIntent (LLM-assisted, mock provider)", () => {
  it("matches the heuristic when the mock provider is non-committal", async () => {
    const provider = new MockProvider();
    const heuristic = parseSearchIntent("I need a 60 min practice plan for u-10 select baseball");
    const assisted = await classifyIntent(provider, "I need a 60 min practice plan for u-10 select baseball");
    expect(assisted.kind).toBe(heuristic.kind);
    expect(assisted.durationMin).toBe(heuristic.durationMin);
    expect(assisted.age).toBe(heuristic.age);
    expect(assisted.action.href).toBe(heuristic.action.href);
  });

  it("never throws on a misbehaving provider", async () => {
    const bad = { name: "bad", async complete() { return "not json at all"; } };
    const intent = await classifyIntent(bad, "60 min hitting practice for 10u");
    expect(intent.kind).toBe("practice_plan");
    expect(intent.durationMin).toBe(60);
  });
});
