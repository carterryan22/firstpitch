import type { Scenario } from "../types.ts";

/**
 * Parent-side smoke: log in as parent, hit /parent, ensure no SSR crash and
 * that the empty-state copy is sensible (no raw `undefined`/`[object Object]`).
 */
export const parentFlowScenario: Scenario = {
  name: "parent-dashboard",
  persona: "parent",
  description: "Sign in as a parent with no linked child and ensure the dashboard renders an empty state cleanly.",
  async run(ctx) {
    ctx.step("login");
    const loginRes = await ctx.page.request.post("/api/auth/login", {
      data: { email: `qa-parent+${Date.now()}@test.local`, role: "parent", name: "QA Parent" },
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

    ctx.step("parent dashboard");
    await ctx.goto("/parent");
    const body = (await ctx.page.locator("body").innerText()).toLowerCase();
    ctx.expect(!body.includes("undefined"), "parent dashboard contains literal text 'undefined'");
    ctx.expect(!body.includes("[object object]"), "parent dashboard contains '[object Object]'");

    ctx.step("favorites + missions accessible");
    await ctx.goto("/favorites");
    await ctx.goto("/missions");
  },
};
