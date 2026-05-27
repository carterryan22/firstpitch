import type { Journey, JourneyContext } from "../types.ts";

const POST_LOGIN: Record<"coach" | "parent" | "player", RegExp> = {
  coach: /\/coach(\b|\/)/,
  parent: /\/parent(\b|$|\?)/,
  player: /\/missions(\b|$|\?)/,
};

/** Light helper for clean login across journeys. */
export async function loginAs(ctx: JourneyContext, role: "coach" | "parent" | "player", email: string, name: string): Promise<void> {
  await ctx.goto("/login");
  await ctx.page.waitForSelector("input#email", { timeout: 8_000 }).catch(() => undefined);
  // Click the persona button — Title Cased role. Use ctx.click so the click
  // counter stays accurate (matches what a real user would experience).
  const title = role[0]!.toUpperCase() + role.slice(1);
  const selector = `button:has-text("${title}")`;
  if (await ctx.page.locator(selector).count() > 0) {
    await ctx.click(selector);
  }
  await ctx.type("input#email", email);
  await ctx.type("input#name", name);
  // Give React's controlled-state validation a beat to enable the submit.
  await ctx.page.locator("form button[type=submit]:not([disabled])").waitFor({ timeout: 10_000 }).catch(() => undefined);
  await ctx.click("form button[type=submit]:not([disabled])", { timeout: 10_000 });
  // Wait for the role-specific landing page; this is the only reliable signal
  // that the session cookie has been planted before the next step uses APIs.
  await ctx.page.waitForURL(POST_LOGIN[role], { timeout: 15_000 }).catch(() => undefined);
}
