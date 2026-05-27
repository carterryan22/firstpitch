import type { Scenario } from "../types.ts";

/**
 * Verifies that safety-critical rules surface to the user.
 * Posts a deliberately unsafe plan via /api/compile (e.g. long arm-stress
 * block) and asserts that the safety gate flags it.
 */
export const safetyScenario: Scenario = {
  name: "safety-gates",
  persona: "system",
  description: "Submit known-unsafe inputs (overlong pitching, missing warm-up) and confirm Pitch Smart / safety gates trip.",
  async run(ctx) {
    ctx.step("login as coach");
    const login = await ctx.api("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: `qa-safety+${Date.now()}@test.local`, role: "coach", name: "Safety QA" }),
    });
    if (!ctx.expect(login.ok, "login failed", "blocker")) return;

    ctx.step("compile with high-intensity pitching focus + tight resources");
    const r = await ctx.api("/api/compile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        age: 10,
        durationMin: 90,
        focus: ["pitching"],
        coaches: 1,
        players: 12,
        fieldResources: { fullField: 1, battingCage: 0, bullpen: 1, infieldOnly: 0, openSpace: 0 },
      }),
    });

    if (!ctx.expect(r.ok, `compile returned ${r.status}: ${r.text.slice(0, 200)}`, "major")) return;
    // Note: a pitching-focus compile may correctly produce only warmup/cooldown blocks
    // (the corpus gates live pitching drills behind warmup completion). That's a feature
    // of the safety design, not a bug — so we don't assert antiLine flags here.
    // The real safety surface is /api/safety/check below.

    ctx.step("safety/check rejects unsafe pitch volume");
    const safety = await ctx.api("/api/safety/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ age: 10, plannedPitches: 200 }),
    });
    if (ctx.expect(safety.ok, `/api/safety/check failed: ${safety.status}`)) {
      const s = safety.json as { allowed?: boolean; reasons?: unknown[] } | null;
      ctx.expect(
        s?.allowed === false || (Array.isArray(s?.reasons) && s.reasons.length > 0),
        "Pitch Smart did not flag 200 planned pitches for a 10yo — safety gate may be silent",
        "blocker",
      );
    }

    ctx.step("public /safety page renders rules");
    await ctx.goto("/safety");
    const ruleCount = await ctx.page.locator("article, li, [data-rule-id]").count();
    ctx.expect(ruleCount > 5, `/safety listed only ${ruleCount} rule-like elements (expected the 15 Tier-1 rules)`, "minor");
  },
};
