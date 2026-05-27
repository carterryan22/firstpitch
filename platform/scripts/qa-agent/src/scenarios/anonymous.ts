import type { Scenario } from "../types.ts";

/**
 * Walks all public/anonymous pages a brand-new visitor can reach.
 * Catches: server-side render crashes, broken links to corpus pages,
 * console errors on first paint, asset 404s.
 */
export const anonymousScenario: Scenario = {
  name: "anonymous-tour",
  persona: "anonymous",
  description: "Visit every public marketing/library page without signing in. Detect SSR crashes, broken images, console errors.",
  async run(ctx) {
    const publicPaths = [
      "/",
      "/login",
      "/learn",
      "/drills",
      "/safety",
      "/fields",
      "/missions",
    ];

    for (const path of publicPaths) {
      ctx.step(`visit ${path}`);
      await ctx.goto(path);
      // Heuristic: a healthy Next page should have at least <main> or an <h1>.
      const hasContent = await ctx.page.locator("main, h1").first().count();
      ctx.expect(hasContent > 0, `${path} rendered no <main> or <h1>`);
      // Broken image detection (src loaded but naturalWidth=0)
      const broken = await ctx.page.evaluate(() =>
        Array.from(document.images)
          .filter((img) => img.complete && img.naturalWidth === 0 && img.src)
          .map((img) => img.src),
      );
      if (broken.length > 0) {
        ctx.bug({
          kind: "response.error",
          severity: "minor",
          url: ctx.page.url(),
          message: `${broken.length} broken image(s): ${broken.slice(0, 3).join(", ")}`,
        });
      }
    }

    ctx.step("drill filter deep link");
    // /drills doesn't have detail pages — exercise the filter query-string instead.
    await ctx.goto("/drills?topic=throwing");
    ctx.expect(
      (await ctx.page.locator("li").count()) > 0,
      "/drills?topic=throwing rendered no drill items",
    );
  },
};
