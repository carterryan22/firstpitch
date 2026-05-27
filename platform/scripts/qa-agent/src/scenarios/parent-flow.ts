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
    await ctx.goto("/login");
    await ctx.page.waitForSelector("input#email");
    await ctx.page.locator(`button:has-text("Parent")`).first().click();
    await ctx.page.locator("input#email").pressSequentially(`qa-parent+${Date.now()}@test.local`, { delay: 5 });
    await ctx.page.locator("input#name").pressSequentially("QA Parent", { delay: 5 });
    await ctx.page.locator("form button[type=submit]:not([disabled])").click({ timeout: 10_000 });
    await ctx.page.waitForURL(/\/parent/, { timeout: 10_000 }).catch(() => undefined);

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
