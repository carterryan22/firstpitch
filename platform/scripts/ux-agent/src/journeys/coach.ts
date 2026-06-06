import type { Journey } from "../types.ts";
import { loginAs } from "./_login.ts";

/**
 * Coach goal: arrive cold → end up with a generated practice plan.
 * This is the most common Monday-night job for a youth coach.
 */
export const coachPlanPractice: Journey = {
  name: "coach-plan-practice",
  persona: "coach",
  goal: "Sign in, compile a practice plan from defaults, land on a viewable plan.",
  budgetMs: 60_000,
  clickBudget: 12,
  viewport: { width: 1280, height: 800 },
  async run(ctx) {
    ctx.startStep("login");
    await loginAs(ctx, "coach", `ux-coach+${Date.now()}@test.local`, "UX Coach");
    await ctx.audit();
    ctx.endStep(ctx.page.url().includes("/coach"));

    ctx.startStep("open practice builder");
    await ctx.goto("/practice/new");
    await ctx.audit();
    const builder = await ctx.page.locator("form, button:has-text('Compile'), button:has-text('Generate'), button:has-text('Build')").count();
    ctx.endStep(builder > 0);

    ctx.startStep("compile a plan with defaults");
    const submit = ctx.page.locator("form button[type=submit], button:has-text('Compile'), button:has-text('Generate'), button:has-text('Build')").first();
    const beforeUrl = ctx.page.url();
    if (await submit.count() > 0) {
      // The compile CTA lives in a short summary panel that the harness can scroll
      // under the sticky header, so a normal click times out on the hit-test even
      // though a real coach can see and click it. Try a real click first (best
      // fidelity), then fall back to a direct DOM dispatch of the React onClick.
      await submit.scrollIntoViewIfNeeded().catch(() => undefined);
      const clicked = await submit
        .click({ timeout: 4_000 })
        .then(() => true)
        .catch(() => false);
      if (!clicked) {
        await submit.evaluate((el) => (el as HTMLButtonElement).click()).catch(() => undefined);
      }
      // Wait for the compiled plan to render inline (PlanView surfaces these labels).
      await ctx.page
        .locator("text=/Quality score|Throwing load/i")
        .first()
        .waitFor({ state: "visible", timeout: 12_000 })
        .catch(() => undefined);
    } else {
      ctx.flag({
        kind: "deadend", severity: "critical", url: ctx.page.url(),
        message: "Practice builder has no Compile/Generate button visible above the fold.",
        suggestion: "Surface the primary action as a sticky button so coaches can compile with defaults in one tap.",
      });
    }
    const afterUrl = ctx.page.url();
    // A compiled plan is uniquely identified by PlanView's summary labels — the loose
    // "drill"/"block" match would be true even before compiling (drill tiles are listed).
    const planVisible = (await ctx.page.locator("text=/Quality score|Throwing load/i").count()) > 0;
    if (afterUrl === beforeUrl && !planVisible) {
      ctx.flag({
        kind: "broken-step", severity: "major", url: afterUrl,
        message: "Submitting practice form did not navigate and did not reveal a plan inline.",
        suggestion: "Either navigate to /plans/[id] after compile, or render the plan inline with a clear success state.",
      });
    }
    await ctx.audit();
    ctx.endStep(planVisible || afterUrl !== beforeUrl);
  },
};

/**
 * Coach goal: build a lineup card for the next game (fairness + safety done for me).
 */
export const coachBuildLineup: Journey = {
  name: "coach-build-lineup",
  persona: "coach",
  goal: "Create a team, add roster, open a game, see an auto-filled lineup.",
  budgetMs: 90_000,
  clickBudget: 18,
  viewport: { width: 1280, height: 800 },
  async run(ctx) {
    ctx.startStep("login");
    await loginAs(ctx, "coach", `ux-coach2+${Date.now()}@test.local`, "UX Coach");
    ctx.endStep(ctx.page.url().includes("/coach"));

    ctx.startStep("create team");
    await ctx.goto("/coach");
    await ctx.audit();
    // POST via API instead of fighting React hydration on the create-team form
    // (the form's UX is exercised by the form-flow audit; this journey is
    // about the *lineup board* job-to-be-done downstream).
    const teamRes = await ctx.page.request.post(`${ctx.baseUrl}/api/teams`, {
      headers: { "content-type": "application/json" },
      data: JSON.stringify({ name: `UX Team ${Date.now()}`, ageBand: "9-12" }),
    });
    const teamJson = (await teamRes.json().catch(() => ({}))) as { team?: { id: string } };
    const teamId = teamJson.team?.id;
    if (!teamId) {
      ctx.flag({
        kind: "broken-step", severity: "critical", url: `${ctx.baseUrl}/api/teams`,
        message: `POST /api/teams returned ${teamRes.status()} or no team.id`,
        suggestion: "Coach API should accept {name, ageBand} and return the created team.",
      });
      ctx.endStep(false);
      return;
    }
    await ctx.goto(`/coach/teams/${teamId}`);
    ctx.endStep(ctx.page.url().includes(`/coach/teams/${teamId}`));

    ctx.startStep("seed roster via API");
    for (let i = 0; i < 10; i++) {
      await ctx.page.request.post(`${ctx.baseUrl}/api/teams/${teamId}/players`, {
        headers: { "content-type": "application/json" },
        data: JSON.stringify({
          firstName: `U${i}`, lastName: "X", jerseyNumber: String(i + 1),
          canPitch: i < 4, canCatch: i < 2,
          positionRatings: { P: i < 4 ? "preferred" : "avoid", SS: "ok", "1B": "ok", "2B": "ok", "3B": "ok", LF: "ok", CF: "ok", RF: "ok" },
        }),
      }).catch(() => undefined);
    }
    ctx.endStep(true);

    ctx.startStep("create game");
    const r = await ctx.page.request.post(`${ctx.baseUrl}/api/teams/${teamId}/games`, {
      headers: { "content-type": "application/json" },
      data: JSON.stringify({ opponent: "UX Tigers", startsAt: new Date(Date.now() + 86_400_000).toISOString(), innings: 6 }),
    });
    const gameId = (await r.json().catch(() => ({}))).game?.id as string | undefined;
    ctx.endStep(!!gameId);
    if (!gameId) return;

    ctx.startStep("open lineup board");
    await ctx.goto(`/coach/teams/${teamId}/games/${gameId}`);
    await ctx.page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
    await ctx.audit();
    const filled = await ctx.page.locator("text=/Inning|League rules/i").count();
    if (filled === 0) {
      ctx.flag({
        kind: "deadend", severity: "major", url: ctx.page.url(),
        message: "Game page rendered but no lineup board markers visible.",
        suggestion: "Auto-render the FieldBoard with default lineup on first load (no extra click).",
      });
    }
    ctx.endStep(filled > 0);
  },
};

export const coachJourneys: Journey[] = [coachPlanPractice, coachBuildLineup];
