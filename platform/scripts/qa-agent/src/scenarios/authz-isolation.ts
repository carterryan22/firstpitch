import type { Scenario, ScenarioContext } from "../types.ts";
import type { BrowserContext } from "playwright";

/**
 * Live authorization / multi-tenant isolation probe — the dynamic counterpart
 * to the static `authz` analyzer in the Security Review Agent. Where the static
 * pass asks "is there an auth gate in the source?", this asks at runtime:
 * **can Coach B (or an anonymous/parent caller) actually touch Coach A's data?**
 *
 * Grounded in OWASP API Security Top 10: API1 (Broken Object-Level Auth / IDOR)
 * and API5 (Broken Function-Level Auth). Every assertion here is a launch
 * blocker if it fails — a 200/ok on a cross-tenant write means the wrong person
 * can alter another team's roster.
 *
 * Strategy:
 *   1. Coach A logs in, builds Team A + one player (the "victim" objects).
 *   2. Coach B logs in (separate browser context) — a real coach, but NOT of A.
 *   3. An anonymous context (no session) and Coach B both attempt to read/mutate
 *      Team A's objects by id. Each MUST be rejected (401/403/404) and the
 *      response body MUST NOT leak the victim player's name.
 */
export const authzIsolationScenario: Scenario = {
  name: "authz-isolation",
  persona: "security",
  description:
    "Cross-tenant + anonymous authorization probe: Coach B / anon cannot read or mutate Coach A's team, players, settings, or snack rotation (IDOR / BOLA / BFLA).",
  async run(ctx) {
    // ── Coach A: build the victim team + player ──
    await loginAs(ctx.page, ctx, "coach", `qa-authz-A+${Date.now()}@test.local`);

    ctx.step("Coach A creates Team A");
    const teamRes = await ctx.api<{ team?: { id?: string; slug?: string } }>("/api/teams", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: `Authz Victim ${Date.now()}`, ageBand: "9-12" }),
    });
    if (!ctx.expect(teamRes.ok, `Coach A create team failed: ${teamRes.status}`, "blocker")) return;
    const teamA = teamRes.json?.team?.id;
    if (!ctx.expect(!!teamA, "Coach A team has no id", "blocker")) return;

    ctx.step("Coach A adds a player (the victim object)");
    const victimFirst = `Victim${Date.now()}`;
    const playerRes = await ctx.api<{ player?: { id?: string } }>(`/api/teams/${teamA}/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ firstName: victimFirst, lastName: "QA", jerseyNumber: "7" }),
    });
    if (!ctx.expect(playerRes.ok, `Coach A add player failed: ${playerRes.status}`, "blocker")) return;
    const playerA = playerRes.json?.player?.id;
    if (!ctx.expect(!!playerA, "Coach A player has no id", "blocker")) return;

    // The cross-tenant mutating endpoints under test, keyed off Team A's ids.
    const probes: Array<{ label: string; path: string; method: string; body?: unknown }> = [
      { label: "read full Team A roster", path: `/api/teams/${teamA}/players`, method: "GET" },
      { label: "add player to Team A", path: `/api/teams/${teamA}/players`, method: "POST", body: { firstName: "Intruder", lastName: "X", jerseyNumber: "99" } },
      { label: "edit Team A's player", path: `/api/players/${playerA}`, method: "PATCH", body: { firstName: "HACKED" } },
      { label: "archive Team A's player", path: `/api/players/${playerA}`, method: "PATCH", body: { archive: true } },
      { label: "rewrite Team A's settings", path: `/api/teams/${teamA}/settings`, method: "PATCH", body: { leagueRules: { minFieldInnings: 0 } } },
      { label: "auto-balance Team A's snack rotation", path: `/api/teams/${teamA}/snack`, method: "POST", body: { keepExisting: false } },
    ];

    // ── Coach B: a real coach, but not a member of Team A ──
    const ctxB = await newSession(ctx, "coach", `qa-authz-B+${Date.now()}@test.local`);
    if (ctxB) {
      ctx.step("Coach B attempts cross-tenant writes on Team A");
      for (const p of probes) {
        await expectBlocked(ctx, ctxB, p, victimFirst, "Coach B");
      }
      await ctxB.close();
    }

    // ── Anonymous: no session at all ──
    const ctxAnon = await newSession(ctx, null, "");
    if (ctxAnon) {
      ctx.step("Anonymous caller attempts writes on Team A");
      for (const p of probes) {
        await expectBlocked(ctx, ctxAnon, p, victimFirst, "Anonymous", /* anon */ true);
      }
      await ctxAnon.close();
    }

    // Membership and linkage to a child must not grant coach-only access.
    for (const role of ["parent", "player"] as const) {
      const email = `qa-authz-${role}+${Date.now()}@test.local`;
      const membership = await ctx.api(`/api/teams/${teamA}/members`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role, playerId: playerA }),
      });
      if (!ctx.expect(membership.ok, `Could not link ${role} to Team A`, "blocker")) continue;
      const family = await newSession(ctx, role, email);
      if (!family) continue;
      ctx.step(`Linked ${role} attempts full roster read and coach-only writes`);
      for (const probe of probes) {
        await expectBlocked(ctx, family, probe, victimFirst, `Linked ${role}`);
      }
      await family.close();
    }

    // ── Confirm the victim player was never actually mutated ──
    // Re-read through Coach A's authenticated roster page: the
    // victim's original name must still be present and the "HACKED" rewrite
    // attempted by the probes must be absent.
    ctx.step("Coach A re-reads roster page — victim unchanged");
    const nav = await ctx.page.goto(`${ctx.baseUrl}/coach/teams/${teamA}/roster`, { waitUntil: "domcontentloaded" }).catch(() => null);
    if (ctx.expect(!!nav && nav.ok(), `Coach A could not load own roster page (HTTP ${nav?.status() ?? "n/a"})`, "major")) {
      const body = await ctx.page.textContent("body").catch(() => "");
      ctx.expect(
        !!body && body.includes(victimFirst),
        `victim player "${victimFirst}" missing from Coach A's roster after the probes — it may have been archived/deleted by an unauthorized caller`,
        "blocker",
      );
      ctx.expect(
        !body || !body.includes("HACKED"),
        `Coach A's roster shows "HACKED" — an unauthorized PATCH actually mutated the victim player`,
        "blocker",
      );
    }
  },
};

/**
 * Assert a caller is rejected on a cross-tenant/forbidden write. A successful
 * (2xx) response, or any body that echoes the victim's name, is a P0 — the
 * wrong person can alter another team's data.
 */
async function expectBlocked(
  ctx: ScenarioContext,
  callerCtx: BrowserContext,
  probe: { label: string; path: string; method: string; body?: unknown },
  victimFirst: string,
  who: string,
  anon = false,
): Promise<void> {
  const page = callerCtx.pages()[0] ?? (await callerCtx.newPage());
  const resp = await page.request
    .fetch(`${ctx.baseUrl}${probe.path}`, {
      method: probe.method,
      headers: { "content-type": "application/json" },
      data: probe.body ? JSON.stringify(probe.body) : undefined,
    })
    .catch(() => null);

  if (!resp) {
    ctx.expect(false, `${who} → ${probe.label}: request threw (could not verify rejection)`, "major");
    return;
  }

  const status = resp.status();
  const ok = resp.ok();
  // Anonymous → must be 401 (or a redirect to login = 3xx). Authenticated wrong
  // user → 401/403/404 are all acceptable "you can't touch this" outcomes.
  const allowed = anon ? status === 401 || (status >= 300 && status < 400) : [401, 403, 404].includes(status);
  ctx.expect(
    !ok && allowed,
    `${who} → ${probe.label}: expected rejection (got HTTP ${status}). Cross-tenant/role write must not succeed.`,
    "blocker",
  );

  const text = await resp.text().catch(() => "");
  if (text.includes(victimFirst)) {
    ctx.expect(false, `${who} → ${probe.label}: response body leaked the victim player's name "${victimFirst}".`, "blocker");
  }
}

/** Spin up an isolated browser context and (optionally) log it in as `role`. */
async function newSession(
  ctx: ScenarioContext,
  role: "coach" | "parent" | "player" | null,
  email: string,
): Promise<BrowserContext | null> {
  const browser = ctx.context.browser();
  if (!browser) {
    ctx.expect(false, "could not obtain browser handle for an isolated session", "major");
    return null;
  }
  const c = await browser.newContext({ baseURL: ctx.baseUrl });
  const page = await c.newPage();
  if (role) await loginAs(page, ctx, role, email);
  return c;
}

async function loginAs(
  page: import("playwright").Page,
  ctx: ScenarioContext,
  role: "coach" | "parent" | "player",
  email: string,
): Promise<void> {
  const res = await page.request.post(`${ctx.baseUrl}/api/auth/login`, {
    data: { email, role, name: `QA authz ${role}` },
    headers: { "content-type": "application/json" },
  });
  if (!res.ok()) {
    ctx.bug({
      kind: "response.error",
      severity: "blocker",
      status: res.status(),
      message: `POST /api/auth/login returned ${res.status()} for role=${role}. Is PLATFORM_ALLOW_DEV_LOGIN=1 set?`,
      url: "/api/auth/login",
    });
  }
}
