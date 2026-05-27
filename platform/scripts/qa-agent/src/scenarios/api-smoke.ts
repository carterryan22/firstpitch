import type { Scenario } from "../types.ts";

/**
 * Hits every critical API route directly so we surface server-side regressions
 * without depending on UI selectors. Mirrors the cookie-jar pattern used by
 * the team's existing playwright e2e.
 */
export const apiSmokeScenario: Scenario = {
  name: "api-smoke",
  persona: "coach (via API)",
  description: "Hit core API endpoints (auth, teams, players, retrieve, compile, drills, safety) and assert shapes.",
  async run(ctx) {
    ctx.step("unauthenticated /api/teams should 401");
    const unauthed = await ctx.api("/api/teams");
    ctx.expect(unauthed.status === 401, `unauth /api/teams expected 401, got ${unauthed.status}`);

    ctx.step("login as coach");
    const login = await ctx.api("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: `qa-coach+${Date.now()}@test.local`, role: "coach", name: "QA Coach" }),
    });
    if (!ctx.expect(login.ok, `login failed: ${login.status} ${login.text.slice(0, 200)}`, "blocker")) return;

    ctx.step("create team");
    const teamRes = await ctx.api("/api/teams", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: `QA Team ${Date.now()}`, ageBand: "9-12" }),
    });
    if (!ctx.expect(teamRes.ok, `create team failed: ${teamRes.status} ${teamRes.text.slice(0, 200)}`, "blocker")) return;
    const teamId = (teamRes.json as { team?: { id?: string } } | null)?.team?.id;
    if (!ctx.expect(!!teamId, "team response missing id", "blocker")) return;

    ctx.step("add 10 players");
    for (let i = 0; i < 10; i++) {
      const r = await ctx.api(`/api/teams/${teamId}/players`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: `Player${i}`,
          lastName: `QA`,
          jerseyNumber: String(i + 1),
          canPitch: i < 4,
          canCatch: i < 2,
          positionRatings: { P: i < 4 ? "preferred" : "avoid", SS: "ok" },
        }),
      });
      if (!r.ok) {
        ctx.bug({
          kind: "response.error",
          severity: "blocker",
          url: `/api/teams/${teamId}/players`,
          status: r.status,
          message: `add player ${i} failed: ${r.text.slice(0, 200)}`,
        });
        return;
      }
    }

    ctx.step("retrieve corpus");
    const retrieve = await ctx.api("/api/retrieve?q=" + encodeURIComponent("warm-up routine for 10 year olds") + "&k=5");
    ctx.expect(retrieve.ok, `/api/retrieve failed: ${retrieve.status}`);
    if (retrieve.ok) {
      const r = retrieve.json as { count?: number } | null;
      ctx.expect((r?.count ?? 0) > 0, "/api/retrieve returned zero results for a real corpus query");
    }

    ctx.step("compile a practice plan");
    const compile = await ctx.api("/api/compile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        age: 10,
        durationMin: 90,
        focus: ["hitting", "fielding"],
        coaches: 2,
        players: 10,
        fieldResources: { fullField: 1, battingCage: 1, bullpen: 0, infieldOnly: 0, openSpace: 1 },
      }),
    });
    ctx.expect(compile.ok, `/api/compile failed: ${compile.status} ${compile.text.slice(0, 200)}`);
    if (compile.ok) {
      const payload = compile.json as { blocks?: unknown[]; plan?: { blocks?: unknown[] } } | null;
      const blocks = payload?.blocks ?? payload?.plan?.blocks;
      ctx.expect(
        Array.isArray(blocks) && blocks.length > 0,
        "compile returned no plan blocks",
      );
    }

    ctx.step("safety/check pitch-smart sanity");
    const safety = await ctx.api("/api/safety/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ age: 10, plannedPitches: 50 }),
    });
    ctx.expect(safety.ok, `/api/safety/check failed: ${safety.status} ${safety.text.slice(0, 200)}`);

    ctx.step("logout");
    const logout = await ctx.api("/api/auth/logout", { method: "POST" });
    ctx.expect(logout.ok || logout.status === 204, `logout failed: ${logout.status}`);
  },
};
