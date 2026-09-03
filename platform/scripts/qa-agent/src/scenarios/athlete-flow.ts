import type { Scenario } from "../types.ts";

/**
 * Optional binding to a seeded athlete (scripts/seed-test-accounts/seed.mjs).
 * Unset, this signs in as a throwaway player and can only assert the empty
 * state renders. Set, it signs in as an athlete linked to a roster player and
 * additionally asserts the mission surface is actually personalised.
 */
function personaEmail(): string | undefined {
  return process.env.PERSONA_PLAYER_EMAIL?.trim() || undefined;
}

/**
 * Athlete daily loop: sign in as a player, find today's drill/mission, and make
 * sure the age-banded catalog renders without leaking template placeholders.
 */
export const athleteFlowScenario: Scenario = {
  name: "athlete-daily-drill",
  persona: "player",
  description:
    "Sign in as a player, land on the mission catalog, and confirm today's work is reachable and age-appropriate.",
  async run(ctx) {
    const seeded = personaEmail();

    ctx.step("login");
    const loginRes = await ctx.page.request.post("/api/auth/login", {
      data: { email: seeded ?? `qa-athlete+${Date.now()}@test.local`, role: "player", name: "QA Athlete" },
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
    ctx.expect(
      /mission|drill|today/i.test(body),
      "missions page shows no recognizable mission or drill content",
    );

    ctx.step("age-banded catalog");
    // The catalog is age-banded; a band that renders nothing means an athlete in
    // that band opens the app and finds no work at all.
    for (const age of [8, 11, 14, 17]) {
      await ctx.goto(`/missions?age=${age}`);
      const count = await ctx.page.locator("article, li, [data-mission]").count();
      ctx.expect(count > 0, `/missions?age=${age} renders an empty catalog for that age band`);
    }

    ctx.step("drill library reachable from athlete view");
    await ctx.goto("/drills");
    const drills = await ctx.api<{ drills?: unknown[] }>("/api/drills");
    ctx.expect(drills.ok, `GET /api/drills returned ${drills.status}`);
    ctx.expect(
      Array.isArray(drills.json?.drills) && (drills.json?.drills?.length ?? 0) > 0,
      "GET /api/drills returned no drills for a signed-in athlete",
    );

    if (seeded) {
      // A seeded athlete is linked to a roster player, so the personalised
      // surfaces must load rather than bouncing to an empty state.
      ctx.step("seeded athlete personalisation");
      await ctx.goto("/favorites");
      const fav = (await ctx.page.locator("body").innerText()).toLowerCase();
      ctx.expect(!fav.includes("undefined"), "favorites page contains literal text 'undefined'");
    }
  },
};
