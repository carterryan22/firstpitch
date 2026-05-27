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
    // Players should now be redirected to /missions automatically.
    ctx.endStep(/\/missions/.test(ctx.page.url()));

    ctx.startStep("landing on missions");
    await ctx.audit();
    const drillHrefCount = await ctx.page.locator("a[href^='/drills/']").count();
    const missionTextCount = await ctx.page.getByText(/today|drill|mission/i).count();
    const hasMission = drillHrefCount > 0 || missionTextCount > 0;
    if (!hasMission) {
      ctx.flag({
        kind: "empty-state", severity: "major", url: ctx.page.url(),
        message: "Player landing has no clear 'today's drill' card or link.",
        suggestion: "Pin one big Today's Drill card on /missions (or a dedicated /player home) so kids never need to navigate.",
      });
    }
    ctx.endStep(hasMission);

    ctx.startStep("open a drill");
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
    const kidPhrases = /try it|your job|let's|imagine|like a|easy|what good looks like/i.test(text);
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
