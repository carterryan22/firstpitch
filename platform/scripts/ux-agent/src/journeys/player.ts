import type { Journey } from "../types.ts";
import { loginAs } from "./_login.ts";

/**
 * Player (youth) goal (mobile): "what's my drill today?" — sign in, find a
 * drill explained in kid-friendly language. Reading level + tap-target
 * heuristics matter a lot for this persona.
 */
export const playerDailyDrill: Journey = {
  name: "player-find-todays-drill",
  persona: "player",
  goal: "Sign in as a player and reach a single, age-appropriate drill explanation.",
  budgetMs: 30_000,
  clickBudget: 6,
  viewport: { width: 390, height: 844 },
  async run(ctx) {
    ctx.startStep("login");
    await loginAs(ctx, "player", `ux-player+${Date.now()}@test.local`, "UX Player");
    ctx.endStep(true);

    ctx.startStep("landing");
    // Players currently route to "/" — make sure that page has SOMETHING for them
    await ctx.goto("/");
    await ctx.audit();
    const hasPlayerHook = (await ctx.page.locator("a:has-text('Drill'), a:has-text('Mission'), a:has-text('Today'), a[href='/missions'], a[href='/drills']").count()) > 0;
    if (!hasPlayerHook) {
      ctx.flag({
        kind: "navigation-cost", severity: "major", url: ctx.page.url(),
        message: "After login the player lands on the marketing home with no obvious 'my drill today' entry.",
        suggestion: "Route players to a dedicated /player home with one big 'Today's Drill' card. Don't drop kids on the marketing landing page.",
      });
    }
    ctx.endStep(true);

    ctx.startStep("reach a drill");
    await ctx.goto("/drills");
    await ctx.audit();
    const drillLink = ctx.page.locator("a[href^='/drills/']").first();
    if (await drillLink.count() === 0) {
      ctx.flag({
        kind: "empty-state", severity: "major", url: ctx.page.url(),
        message: "/drills shows no individual drill links.",
        suggestion: "Render at least a few starter drills with thumbnails and a one-tap entry.",
      });
      ctx.endStep(false); return;
    }
    await drillLink.click().catch(() => undefined);
    await ctx.page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await ctx.audit();

    // Kid-friendly copy check
    const text = (await ctx.page.locator("main, body").first().innerText()).slice(0, 2000);
    const kidPhrases = /try it|your job|let's|imagine|like a|easy/i.test(text);
    if (!kidPhrases) {
      ctx.flag({
        kind: "reading-level", severity: "minor", url: ctx.page.url(),
        message: "Drill page doesn't surface any of the kid_friendly.explain phrasing.",
        suggestion: "Promote `drill.kid_friendly.explain` above the coaching cues on the player-facing view so kids see their version first.",
      });
    }
    ctx.endStep(true);
  },
};

export const playerJourneys: Journey[] = [playerDailyDrill];
