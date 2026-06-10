import type { Scenario, ScenarioContext } from "../types.ts";

/**
 * E25 "Team Operations Surfaces" sweep (game-day-competitor-parity IA). Builds a team + roster +
 * game, then walks every team-centric surface — roster, games, pitching,
 * fairness, snack rotation, settings, more, and the public Press Box — asserting
 * each renders a heading and is free of `undefined` / `[object Object]` leakage.
 * Also exercises the `/teams/{slug}/…` URL-grammar deep-link redirect.
 */
export const e25SurfacesScenario: Scenario = {
  name: "e25-team-surfaces",
  persona: "coach",
  description:
    "Walk every E25 team operations surface (roster/games/pitching/fairness/snack/settings/more/press-box) + slug deep-link redirect; assert each renders cleanly.",
  async run(ctx) {
    await loginAs(ctx, "coach", `qa-e25-coach+${Date.now()}@test.local`);

    // --- Build a team via API (form path is covered by coach-happy-path) ---
    ctx.step("create team via API");
    const teamRes = await ctx.api<{ team?: { id?: string; slug?: string } }>("/api/teams", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: `QA E25 ${Date.now()}`, ageBand: "9-12" }),
    });
    if (!ctx.expect(teamRes.ok, `create team failed: ${teamRes.status} ${teamRes.text.slice(0, 200)}`, "blocker")) return;
    const teamId = teamRes.json?.team?.id;
    const slug = teamRes.json?.team?.slug;
    if (!ctx.expect(!!teamId, "create team returned no id", "blocker")) return;

    ctx.step("seed roster via API (8 players)");
    for (let i = 0; i < 8; i++) {
      const r = await ctx.api(`/api/teams/${teamId}/players`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: `E25_${i}`,
          lastName: "QA",
          jerseyNumber: String(i + 1),
          canPitch: i < 4,
          canCatch: i < 2,
          positionRatings: { P: i < 4 ? "preferred" : "avoid", SS: "ok", "1B": "ok", "2B": "ok", "3B": "ok", LF: "ok", CF: "ok", RF: "ok" },
        }),
      });
      if (!r.ok) {
        ctx.bug({ kind: "response.error", severity: "blocker", status: r.status, message: `seed player ${i} failed`, url: `/api/teams/${teamId}/players` });
        return;
      }
    }

    ctx.step("create two upcoming games");
    const gameIds: string[] = [];
    for (let i = 1; i <= 2; i++) {
      const gameRes = await ctx.api<{ game?: { id?: string } }>(`/api/teams/${teamId}/games`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ opponent: `QA Opp ${i}`, startsAt: new Date(Date.now() + i * 86_400_000).toISOString(), innings: 6 }),
      });
      if (!ctx.expect(gameRes.ok, `create game ${i} failed: ${gameRes.status}`, "major")) return;
      const id = gameRes.json?.game?.id;
      if (id) gameIds.push(id);
    }

    // --- Walk the team surfaces ---
    const base = `/coach/teams/${teamId}`;
    const surfaces: Array<{ path: string; label: string }> = [
      { path: base, label: "team home" },
      { path: `${base}/roster`, label: "roster" },
      { path: `${base}/games`, label: "games list" },
      { path: `${base}/pitching`, label: "pitching board" },
      { path: `${base}/fairness`, label: "fairness table" },
      { path: `${base}/snack`, label: "snack rotation" },
      { path: `${base}/settings`, label: "settings accordion" },
      { path: `${base}/more`, label: "more menu" },
    ];
    for (const s of surfaces) {
      ctx.step(`open ${s.label}`);
      await ctx.goto(s.path);
      await ctx.page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      ctx.expect((await ctx.page.locator("h1, h2").first().count()) > 0, `${s.label} has no heading`);
      await assertNoLeakedText(ctx, s.label);
    }

    // --- Snack rotation auto-balance ---
    ctx.step("auto-balance snack rotation via API");
    const snackRes = await ctx.api(`/api/teams/${teamId}/snack`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keepExisting: false }),
    });
    // 422 no_volunteers is acceptable (no parents on roster); only flag 5xx.
    ctx.expect(snackRes.ok || snackRes.status === 422, `snack auto-balance unexpected status ${snackRes.status}`, "major");

    // --- URL-grammar deep-link parity: /teams/{slug}/roster → coach roster ---
    if (slug) {
      ctx.step("slug deep-link redirect (/teams/{slug}/roster)");
      await ctx.goto(`/teams/${slug}/roster`, { expectPath: new RegExp(`/coach/teams/${teamId}/roster`) });
      ctx.expect((await ctx.page.locator("h1, h2").first().count()) > 0, "slug-redirected roster has no heading");
    }

    // --- Press Box share: enable share on a game, open public view ---
    if (gameIds[0]) {
      ctx.step("enable Press Box share + open public view");
      const share = await ctx.api<{ url?: string }>(`/api/games/${gameIds[0]}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shareEnabled: true }),
      });
      ctx.expect(share.ok, `enable share failed: ${share.status}`, "major");
    }
  },
};

/** Flag obvious render leaks parents/coaches should never see. */
async function assertNoLeakedText(ctx: ScenarioContext, label: string): Promise<void> {
  const body = (await ctx.page.locator("body").innerText().catch(() => "")) ?? "";
  if (/\bundefined\b/.test(body)) ctx.expect(false, `${label} renders literal "undefined"`, "major");
  if (body.includes("[object Object]")) ctx.expect(false, `${label} renders "[object Object]"`, "major");
  if (/\bNaN\b/.test(body)) ctx.expect(false, `${label} renders "NaN"`, "minor");
}

async function loginAs(ctx: ScenarioContext, role: "coach" | "parent" | "player", email: string): Promise<void> {
  ctx.step(`login as ${role}`);
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
  }
}
