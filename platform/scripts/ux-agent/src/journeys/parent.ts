import type { Journey } from "../types.ts";
import { loginAs } from "./_login.ts";

/**
 * Parent goal (mobile): "what does my kid need to do today?" — sign in, land on
 * the dashboard, find today's home mission in <3 taps.
 */
export const parentDailyMission: Journey = {
  name: "parent-find-today-mission",
  persona: "parent",
  goal: "Sign in and reach today's home mission with at most a few taps.",
  budgetMs: 45_000,
  clickBudget: 8,
  viewport: { width: 390, height: 844 },
  async run(ctx) {
    ctx.startStep("login");
    await loginAs(ctx, "parent", `ux-parent+${Date.now()}@test.local`, "UX Parent");
    ctx.endStep(ctx.page.url().includes("/parent") || ctx.page.url().endsWith("/"));

    ctx.startStep("parent dashboard");
    await ctx.goto("/parent");
    await ctx.audit();
    const body = (await ctx.page.locator("body").innerText()).toLowerCase();
    if (body.includes("undefined") || body.includes("[object object]")) {
      ctx.flag({
        kind: "broken-step", severity: "critical", url: ctx.page.url(),
        message: "Parent dashboard prints raw 'undefined' or '[object Object]'.",
        suggestion: "Render an empty-state component when the parent has no linked child instead of leaking undefined values into the template.",
      });
    }
    const missionLinkCount = await ctx.page.locator("a:has-text('Mission'), a:has-text('Today'), a[href*='/missions']").count();
    if (missionLinkCount === 0) {
      ctx.flag({
        kind: "navigation-cost", severity: "major", url: ctx.page.url(),
        message: "Parent dashboard has no direct link to today's mission.",
        suggestion: "Pin a 'Today's Mission' card at the top of /parent with the drill name + a single Start button.",
      });
    }
    ctx.endStep(true);

    ctx.startStep("open today's mission");
    await ctx.goto("/missions");
    await ctx.audit();
    const has = (await ctx.page.locator("text=/today|mission|drill/i").count()) > 0;
    if (!has) {
      ctx.flag({
        kind: "empty-state", severity: "major", url: ctx.page.url(),
        message: "/missions has no recognizable 'today' or 'drill' content.",
        suggestion: "Show at minimum: today's drill name, 1 sentence kid-friendly goal, and a big 'Done' button.",
      });
    }
    ctx.endStep(has);
  },
};

/**
 * Parent goal (mobile): see my child's progress at a glance — sign in, find a
 * recent baseline or chart without going through the coach pages.
 */
export const parentSeeProgress: Journey = {
  name: "parent-see-progress",
  persona: "parent",
  goal: "Find an at-a-glance view of my child's recent progress.",
  budgetMs: 45_000,
  clickBudget: 8,
  viewport: { width: 390, height: 844 },
  async run(ctx) {
    ctx.startStep("login");
    await loginAs(ctx, "parent", `ux-parent2+${Date.now()}@test.local`, "UX Parent");
    ctx.endStep(true);

    ctx.startStep("dashboard scan for child card");
    await ctx.goto("/parent");
    await ctx.audit();
    const childCardCount = await ctx.page.locator("[data-child], h2, h3").count();
    ctx.endStep(childCardCount > 0);

    ctx.startStep("favorites accessible from nav");
    await ctx.goto("/favorites");
    await ctx.audit();
    const ok = (await ctx.page.locator("h1, h2").count()) > 0;
    if (!ok) {
      ctx.flag({
        kind: "deadend", severity: "minor", url: ctx.page.url(),
        message: "Favorites page lacks a heading.",
        suggestion: "Give /favorites an <h1> so parents know they're in the right place.",
      });
    }
    ctx.endStep(ok);
  },
};

export const parentJourneys: Journey[] = [parentDailyMission, parentSeeProgress];
