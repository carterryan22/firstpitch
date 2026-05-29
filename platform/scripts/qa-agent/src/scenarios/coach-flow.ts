import type { Scenario, ScenarioContext } from "../types.ts";

/**
 * End-to-end coach happy path through the UI:
 * login → /coach → create team → add roster via API (UI is slow) → lineup page renders.
 */
export const coachFlowScenario: Scenario = {
  name: "coach-happy-path",
  persona: "coach",
  description: "Sign in as a coach, create a team, seed roster, open lineup page, expect a populated field board.",
  async run(ctx) {
    await loginAs(ctx, "coach", `qa-ui-coach+${Date.now()}@test.local`);

    ctx.step("land on coach dashboard");
    await ctx.goto("/coach", { expectPath: "/coach" });
    ctx.expect((await ctx.page.locator("h1").first().count()) > 0, "/coach has no h1");

    ctx.step("create team via form");
    const teamName = `QA UI ${Date.now()}`;
    await ctx.page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await ctx.page.waitForSelector("input#team-name");
    const nameInput = ctx.page.locator("input#team-name");
    await nameInput.waitFor({ state: "visible" });
    // pressSequentially fires keystrokes React's controlled input reliably observes
    // (fill() can race the hydration boundary on a fresh dev compile).
    await nameInput.pressSequentially(teamName, { delay: 5 });
    await ctx.page.locator("select#team-age").selectOption("9-12");
    const submit = ctx.page.locator("form button[type=submit]").first();
    // Auto-waits for enabled; tolerant of slow dev-server hydration.
    await submit.click({ timeout: 20_000 });

    // CreateTeamForm redirects to /coach/teams/[id]
    const navError = await ctx.page
      .waitForURL(/\/coach\/teams\/[\w-]+/, { timeout: 15_000 })
      .then(() => null)
      .catch((e: Error) => e);
    if (!ctx.expect(navError === null, `did not navigate to /coach/teams/:id after creating team: ${navError?.message ?? ""}`, "blocker")) {
      await ctx.snap("create-team-fail");
      return;
    }

    const url = new URL(ctx.page.url());
    const teamId = url.pathname.split("/")[3];
    if (!ctx.expect(!!teamId, "could not parse teamId from url", "blocker")) return;

    ctx.step("seed roster via API (10 players)");
    for (let i = 0; i < 10; i++) {
      const r = await ctx.api(`/api/teams/${teamId}/players`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: `UI${i}`,
          lastName: `QA`,
          jerseyNumber: String(i + 1),
          canPitch: i < 4,
          canCatch: i < 2,
          positionRatings: { P: i < 4 ? "preferred" : "avoid", SS: "ok", "1B": "ok", "2B": "ok", "3B": "ok", LF: "ok", CF: "ok", RF: "ok" },
        }),
      });
      if (!r.ok) {
        ctx.bug({
          kind: "response.error",
          severity: "blocker",
          status: r.status,
          message: `seed player ${i} failed`,
          url: `/api/teams/${teamId}/players`,
        });
        return;
      }
    }

    ctx.step("create game");
    const gameRes = await ctx.api(`/api/teams/${teamId}/games`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ opponent: "QA Tigers", startsAt: new Date(Date.now() + 86_400_000).toISOString(), innings: 6 }),
    });
    if (!ctx.expect(gameRes.ok, `create game failed: ${gameRes.status} ${gameRes.text.slice(0, 200)}`, "major")) return;
    const gameId = (gameRes.json as { game?: { id?: string } } | null)?.game?.id;
    if (!ctx.expect(!!gameId, "create game returned no id")) return;

    ctx.step("open game page (lineup builder)");
    await ctx.goto(`/coach/teams/${teamId}/games/${gameId}`);
    // FieldBoard should render — look for any position labels or player chips.
    await ctx.page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    const hasFieldBoard =
      (await ctx.page.locator("text=/League rules/i").count()) > 0 ||
      (await ctx.page.locator("text=/Inning/i").count()) > 0;
    ctx.expect(hasFieldBoard, "Game page rendered but FieldBoard markers (League rules / Inning) were not found");
    await ctx.snap("lineup-loaded");

    ctx.step("open team baselines");
    await ctx.goto(`/coach/teams/${teamId}/baselines`);
    ctx.expect((await ctx.page.locator("h1, h2").first().count()) > 0, "baselines page has no heading");

    ctx.step("open digest page");
    await ctx.goto(`/coach/teams/${teamId}/digest`);
    ctx.expect((await ctx.page.locator("h1, h2").first().count()) > 0, "digest page has no heading");
  },
};

async function loginAs(ctx: ScenarioContext, role: "coach" | "parent" | "player", email: string): Promise<void> {
  ctx.step(`login as ${role}`);
  // The form is now magic-link only ("send me an email"); QA bypasses it via
  // the legacy dev endpoint (PLATFORM_ALLOW_DEV_LOGIN=1 in prod, always-on in dev).
  // This sets the platform_session cookie on the browser context directly.
  const res = await ctx.page.request.post("/api/auth/login", {
    data: { email, role, name: `QA ${role}` },
    headers: { "content-type": "application/json" },
  });
  if (!res.ok()) {
    ctx.bug({
      kind: "response.error",
      severity: "blocker",
      status: res.status(),
      message: `POST /api/auth/login returned ${res.status()} for role=${role}. Is PLATFORM_ALLOW_DEV_LOGIN=1 set?`,
      url: `/api/auth/login`,
    });
    return;
  }
}
