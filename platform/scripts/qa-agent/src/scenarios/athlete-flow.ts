import type { Scenario } from "../types.ts";

/** Optional binding to a seeded player account. */
function personaEmail(): string | undefined {
  return process.env.PERSONA_PLAYER_EMAIL?.trim() || undefined;
}

/** Player daily loop: sign in, find age-appropriate work, and open the drill library. */
export const athleteFlowScenario: Scenario = {
  name: "athlete-daily-drill",
  persona: "player",
  description:
    "Sign in as a player, land on the mission catalog, and confirm today's work is reachable and age-appropriate.",
  async run(ctx) {
    const seeded = personaEmail();

    ctx.step("login");
    const loginRes = await ctx.page.request.post("/api/auth/login", {
      data: {
        email: seeded ?? `qa-athlete+${Date.now()}@test.local`,
        role: "player",
        name: "QA Athlete",
      },
      headers: { "content-type": "application/json" },
    });
    if (!loginRes.ok()) {
      ctx.bug({
        kind: "response.error",
        severity: "blocker",
        status: loginRes.status(),
        message: `POST /api/auth/login returned ${loginRes.status()}. Is PLATFORM_ALLOW_DEV_LOGIN=1 set?`,
        url: "/api/auth/login",
      });
      return;
    }

    ctx.step("mission catalog");
    await ctx.goto("/missions");
    const body = (await ctx.page.locator("body").innerText()).toLowerCase();
    ctx.expect(!body.includes("undefined"), "missions page contains literal text 'undefined'");
    ctx.expect(!body.includes("[object object]"), "missions page contains '[object Object]'");
    ctx.expect(!body.includes("{{"), "missions page leaks an unrendered template placeholder");
    ctx.expect(/mission|drill|today/i.test(body), "missions page shows no recognizable mission or drill content");

    ctx.step("age-banded catalog");
    for (const age of [8, 11, 14, 17]) {
      await ctx.goto(`/missions?age=${age}`);
      const count = await ctx.page.locator("article, li, [data-mission]").count();
      ctx.expect(count > 0, `/missions?age=${age} renders an empty catalog for that age band`);
    }

    ctx.step("drill library reachable from player view");
    await ctx.goto("/drills");
    const drills = await ctx.api<{ drills?: unknown[] }>("/api/drills");
    ctx.expect(drills.ok, `GET /api/drills returned ${drills.status}`);
    ctx.expect(
      Array.isArray(drills.json?.drills) && (drills.json?.drills?.length ?? 0) > 0,
      "GET /api/drills returned no drills for a signed-in player",
    );

    if (seeded) {
      ctx.step("seeded player personalization");
      await ctx.goto("/favorites");
      const favorites = (await ctx.page.locator("body").innerText()).toLowerCase();
      ctx.expect(!favorites.includes("undefined"), "favorites page contains literal text 'undefined'");
    }
  },
};
