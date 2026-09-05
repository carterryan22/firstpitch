import type { Scenario } from "../types.ts";

const DEMO_TEAMS = ["Cascade Comets", "Harbor Hawks", "Summit Sparks", "Valley Vipers"];

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
      // Preserve only Vercel's host-scoped access cookie, not the app session.
      await ctx.context.clearCookies({ name: "platform_session" });
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
      const visibleTeams = teams.json?.teams ?? [];
      if (account.role === "coach") {
        // UX journeys may create additional legitimate teams for this coach.
        // Require each named fixture exactly once without resetting their data.
        ctx.expect(teams.ok && DEMO_TEAMS.every((name) => visibleTeams.filter((team) => team.name === name).length === 1),
          "Coach does not see all four distinct seeded teams", "blocker");
        for (const team of visibleTeams.filter((team) => DEMO_TEAMS.includes(team.name))) {
          const roster = await ctx.api<{ players?: unknown[] }>(`/api/teams/${team.id}/players`);
          ctx.expect(roster.ok && roster.json?.players?.length === 12, `${team.name} does not have 12 players`, "blocker");
        }
      } else {
        ctx.expect(teams.ok && visibleTeams.length === account.teams && visibleTeams[0]?.name === DEMO_TEAMS[0],
          `${account.role} does not see only their linked seeded team`, "blocker");
      }
      if (account.role === "parent") {
        ctx.expect((await ctx.page.locator("body").innerText()).includes("Mason"), "Seeded parent cannot see their linked child", "blocker");
      }
    }
  },
};
