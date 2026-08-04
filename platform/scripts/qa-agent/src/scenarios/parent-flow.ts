import type { Scenario } from "../types.ts";

/**
 * Optional binding to a seeded account (scripts/seed-test-accounts/seed.mjs).
 * Unset, this signs in as a throwaway parent and can only assert that the EMPTY
 * state renders cleanly. Set, it signs in as a parent with a linked child and
 * additionally asserts the populated dashboard actually shows that child.
 */
function personaEmail(): string | undefined {
  return process.env.PERSONA_PARENT_EMAIL?.trim() || undefined;
}

/**
 * Parent-side smoke: log in as parent, hit /parent, ensure no SSR crash and
 * that the copy is sensible (no raw `undefined`/`[object Object]`).
 */
export const parentFlowScenario: Scenario = {
  name: "parent-dashboard",
  persona: "parent",
  description:
    "Sign in as a parent and ensure the dashboard renders cleanly — empty state when unlinked, or the linked child when PERSONA_PARENT_EMAIL binds a seeded account.",
  async run(ctx) {
    const seeded = personaEmail();

    ctx.step("login");
    const loginRes = await ctx.page.request.post("/api/auth/login", {
      data: { email: seeded ?? `qa-parent+${Date.now()}@test.local`, role: "parent", name: "QA Parent" },
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
    ctx.expect(!body.includes("nan"), "parent dashboard contains 'NaN'");

    if (seeded) {
      // A bound parent MUST see their child; a bare empty state here means the
      // parent -> player link is broken, which is invisible to a throwaway run.
      const childCard = await ctx.page.locator("h1, h2, h3, [data-child]").count();
      ctx.expect(childCard > 0, "seeded parent sees no child heading on /parent");
      ctx.expect(
        !/no children|not linked to a player|no linked/i.test(body),
        "seeded parent still sees the 'no linked child' empty state — parent→player link is broken",
      );
    }

    ctx.step("favorites + missions accessible");
    await ctx.goto("/favorites");
    await ctx.goto("/missions");
  },
};
