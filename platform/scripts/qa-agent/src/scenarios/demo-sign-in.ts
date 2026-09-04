import type { Scenario } from "../types.ts";

/** Opt-in because demo shortcuts must not be available in normal production. */
export const demoSignInScenario: Scenario = {
  name: "demo-persona-sign-in",
  persona: "coach / parent / player",
  description: "Submit each seeded persona's real login form, verify the persisted session, and check linked team data.",
  async run(ctx) {
    for (const account of [
      { label: "Coach Riley", email: "coach1@firstpitch.test", role: "coach", path: "/coach", teams: 4 },
      { label: "Parent demo", email: "parent1@firstpitch.test", role: "parent", path: "/parent", teams: 1 },
      { label: "Athlete demo", email: "athlete1@firstpitch.test", role: "player", path: "/missions", teams: 1 },
    ]) {
      ctx.step(`${account.role} form sign-in`);
      await ctx.context.clearCookies();
      await ctx.goto("/login");
      await Promise.all([
        ctx.page.waitForURL((url) => url.pathname === account.path, { timeout: 30_000 }),
        ctx.page.getByRole("button", { name: account.label, exact: true }).click(),
      ]);
      await ctx.page.reload({ waitUntil: "domcontentloaded" });
      const session = await ctx.api<{ user?: { email: string; role: string } }>("/api/auth/session");
      ctx.expect(session.ok && session.json?.user?.email === account.email && session.json?.user?.role === account.role,
        `${account.role} form did not persist the expected session`, "blocker");
      const teams = await ctx.api<{ teams?: Array<{ id: string; name: string }> }>("/api/teams");
      ctx.expect(teams.ok && teams.json?.teams?.length === account.teams,
        `${account.role} does not see the expected seeded teams`, "blocker");
      if (account.role === "coach") {
        for (const team of teams.json?.teams ?? []) {
          const roster = await ctx.api<{ players?: unknown[] }>(`/api/teams/${team.id}/players`);
          ctx.expect(roster.ok && roster.json?.players?.length === 12, `${team.name} does not have 12 players`, "blocker");
        }
      }
      if (account.role === "parent") {
        ctx.expect((await ctx.page.locator("body").innerText()).includes("Mason"), "Seeded parent cannot see their linked child", "blocker");
      }
    }
  },
};
